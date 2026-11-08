import asyncio
from api.db import db_client
from sqlalchemy import text

async def main():
    async with db_client.async_session() as session:
        # Check if already exists
        res = await session.execute(
            text("SELECT id FROM telephony_phone_numbers WHERE address = '+17372508034' AND telephony_configuration_id = 6")
        )
        row = res.fetchone()
        if not row:
            await session.execute(
                text("""
                    INSERT INTO telephony_phone_numbers (
                        organization_id, telephony_configuration_id, address, address_normalized,
                        address_type, country_code, label, inbound_workflow_id,
                        is_active, is_default_caller_id, extra_metadata, created_at, updated_at
                    ) VALUES (
                        2, 6, '+17372508034', '+17372508034',
                        'pstn', 'US', 'Twilio Number', 3,
                        true, true, '{}'::json, NOW(), NOW()
                    )
                """)
            )
            await session.commit()
            print("Successfully inserted +17372508034 for config 6")
        else:
            print("Already exists")

if __name__ == "__main__":
    asyncio.run(main())

