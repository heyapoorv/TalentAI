import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from services.auth import create_access_token

@pytest.mark.asyncio
async def test_auth_no_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_auth_valid_token():
    token = create_access_token({"sub": "testuser", "role": "candidate"})
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "candidate"
