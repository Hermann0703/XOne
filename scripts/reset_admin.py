from passlib.context import CryptContext
import asyncpg
import asyncio
import os

async def main():
    pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
    hashed = pwd_ctx.hash('admin123')
    print(f"Hash: {hashed[:30]}...")

    conn = await asyncpg.connect(
        host=os.environ.get('POSTGRES_HOST', 'postgres'),
        port=os.environ.get('POSTGRES_PORT', 5432),
        user=os.environ.get('POSTGRES_USER', 'xone'),
        password=os.environ.get('POSTGRES_PASSWORD', ''),
        database=os.environ.get('POSTGRES_DB', 'xone'),
    )

    await conn.execute('''
        INSERT INTO users (username, email, hashed_password, display_name, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO UPDATE
        SET hashed_password = $3, updated_at = now()
    ''', 'admin', 'admin@xone.local', hashed, 'Administrator', True)

    row = await conn.fetchrow("SELECT id, username, email, is_active FROM users WHERE username='admin'")
    print(f"User: {row}")
    await conn.close()

asyncio.run(main())
