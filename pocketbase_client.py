"""
HTTP Client wrapper untuk PocketBase v0.22.x
Dilengkapi retry otomatis untuk koneksi flaky (Cloudflare tunnel, idle reset, dll.)
"""
import os
import time
import requests
from typing import Optional, Dict, Any, List

from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter


class PocketBaseError(Exception):
    def __init__(self, message: str, status_code: int = 500, data: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.data = data


# Transient error yang layak di-retry
_RETRYABLE_EXC = (
    requests.exceptions.ConnectionError,
    requests.exceptions.ChunkedEncodingError,
    requests.exceptions.Timeout,
    requests.exceptions.ContentDecodingError,
)


class PocketBaseClient:
    # Retry config
    MAX_ATTEMPTS = 4          # 1 percobaan + 3 retry
    BACKOFF_BASE = 0.5        # 0.5s, 1s, 2s
    CONNECT_TIMEOUT = 10      # detik
    READ_TIMEOUT = 60         # detik (PB via internet kadang lambat)

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self.base_url = (base_url or os.getenv("PB_URL", "https://acer-pb.gwan.my.id")).rstrip("/")
        self.token = token
        self._session = self._build_session()

    # ------------------------------------------------------------------ #
    # Internal
    # ------------------------------------------------------------------ #
    def _build_session(self) -> requests.Session:
        """
        Session dengan HTTPAdapter + urllib3 Retry untuk handle
        connection pool errors (keep-alive race, DNS flake).
        """
        s = requests.Session()
        retry = Retry(
            total=2,
            connect=2,
            read=2,
            status=2,
            backoff_factor=0.3,
            status_forcelist=[502, 503, 504],
            allowed_methods=frozenset(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
            raise_on_status=False,
            respect_retry_after_header=True,
        )
        adapter = HTTPAdapter(
            max_retries=retry,
            pool_connections=10,
            pool_maxsize=20,
        )
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        return s

    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {}) or {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        # Timeout default: (connect, read). Bisa di-override caller.
        kwargs.setdefault("timeout", (self.CONNECT_TIMEOUT, self.READ_TIMEOUT))

        last_exc: Optional[Exception] = None
        resp: Optional[requests.Response] = None

        for attempt in range(self.MAX_ATTEMPTS):
            try:
                resp = self._session.request(method, url, headers=headers, **kwargs)
                break
            except _RETRYABLE_EXC as e:
                last_exc = e
                if attempt < self.MAX_ATTEMPTS - 1:
                    sleep_s = self.BACKOFF_BASE * (2 ** attempt)
                    time.sleep(sleep_s)
                    continue
                raise PocketBaseError(
                    f"Gagal konek ke PocketBase setelah {self.MAX_ATTEMPTS} percobaan: {e}",
                    502,
                )
            except requests.RequestException as e:
                # Error non-retryable (mis. InvalidURL, MissingSchema)
                raise PocketBaseError(f"Request error: {e}", 502)

        if resp is None:
            raise PocketBaseError(f"Gagal konek ke PocketBase: {last_exc}", 502)

        if resp.status_code >= 400:
            try:
                payload = resp.json()
                msg = payload.get("message", f"HTTP {resp.status_code}")
                data = payload.get("data")

                # Detail per-field dari PocketBase
                if isinstance(data, dict) and data:
                    details = []
                    for k, v in data.items():
                        if isinstance(v, dict):
                            details.append(f"{k}: {v.get('message', v)}")
                        else:
                            details.append(f"{k}: {v}")
                    if details:
                        msg = f"{msg} — {'; '.join(details)}"
            except Exception:
                msg = (resp.text or f"HTTP {resp.status_code}")[:300]
                data = None
            raise PocketBaseError(msg, resp.status_code, data)

        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    # ------------------------------------------------------------------ #
    # Auth
    # ------------------------------------------------------------------ #
    def auth_with_password(self, identity: str, password: str) -> Dict:
        return self._request(
            "POST",
            "/api/collections/users/auth-with-password",
            json={"identity": identity, "password": password},
        )

    def auth_refresh(self) -> Dict:
        return self._request("POST", "/api/collections/users/auth-refresh")

    def register_user(self, email: str, password: str, password_confirm: str, name: str = "") -> Dict:
        return self._request(
            "POST",
            "/api/collections/users/records",
            json={
                "email": email,
                "password": password,
                "passwordConfirm": password_confirm,
                "name": name,
                "emailVisibility": True,
            },
        )

    # ------------------------------------------------------------------ #
    # Generic CRUD
    # ------------------------------------------------------------------ #
    def list_records(self, collection: str, **params) -> Dict:
        return self._request("GET", f"/api/collections/{collection}/records", params=params)

    def get_record(self, collection: str, record_id: str, **params) -> Dict:
        return self._request(
            "GET",
            f"/api/collections/{collection}/records/{record_id}",
            params=params,
        )

    def create_record(self, collection: str, data: Dict, files: Optional[List] = None) -> Dict:
        path = f"/api/collections/{collection}/records"
        if files:
            return self._request("POST", path, data=data, files=files)
        return self._request("POST", path, json=data)

    def update_record(self, collection: str, record_id: str, data: Dict,
                      files: Optional[List] = None) -> Dict:
        path = f"/api/collections/{collection}/records/{record_id}"
        if files:
            return self._request("PATCH", path, data=data, files=files)
        return self._request("PATCH", path, json=data)

    def delete_record(self, collection: str, record_id: str) -> None:
        return self._request("DELETE", f"/api/collections/{collection}/records/{record_id}")