# test_manual.py (buat file sementara)
import asyncio
from bot import daily_reminder_job, AdminPB

class FakeCtx:
    class bot:
        @staticmethod
        async def send_message(chat_id, text, parse_mode=None):
            print(f"[SEND] → {chat_id}: {text[:100]}...")

async def main():
    await daily_reminder_job(FakeCtx)

asyncio.run(main())