import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def auth_headers(client, email="a@example.com", password="secret123"):
    client.post("/api/auth/register", json={"email": email, "password": password})
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_register_and_login(client):
    h = auth_headers(client)
    r = client.get("/api/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json()["email"] == "a@example.com"


def test_duplicate_register_fails(client):
    client.post("/api/auth/register", json={"email": "a@example.com", "password": "secret123"})
    r = client.post("/api/auth/register", json={"email": "a@example.com", "password": "secret123"})
    assert r.status_code == 409


def test_wrong_password(client):
    auth_headers(client)
    r = client.post("/api/auth/login", data={"username": "a@example.com", "password": "nope"})
    assert r.status_code == 401


def test_requires_auth(client):
    assert client.get("/api/applications").status_code == 401


def test_crud_flow(client):
    h = auth_headers(client)
    r = client.post("/api/applications", headers=h, json={"company": "Acme", "role": "Backend Dev"})
    assert r.status_code == 201
    app_id = r.json()["id"]

    r = client.patch(f"/api/applications/{app_id}", headers=h, json={"status": "applied"})
    assert r.json()["status"] == "applied"

    assert len(client.get("/api/applications", headers=h).json()) == 1
    assert len(client.get("/api/applications?status=offer", headers=h).json()) == 0
    assert len(client.get("/api/applications?q=acme", headers=h).json()) == 1

    assert client.delete(f"/api/applications/{app_id}", headers=h).status_code == 204
    assert client.get("/api/applications", headers=h).json() == []


def test_users_cannot_touch_each_others_data(client):
    h1 = auth_headers(client, "one@example.com")
    h2 = auth_headers(client, "two@example.com")
    app_id = client.post(
        "/api/applications", headers=h1, json={"company": "X", "role": "Y"}
    ).json()["id"]
    assert client.patch(f"/api/applications/{app_id}", headers=h2, json={"status": "offer"}).status_code == 404
    assert client.delete(f"/api/applications/{app_id}", headers=h2).status_code == 404
    assert client.get("/api/applications", headers=h2).json() == []


def test_invalid_status_rejected(client):
    h = auth_headers(client)
    r = client.post("/api/applications", headers=h, json={"company": "A", "role": "B", "status": "bogus"})
    assert r.status_code == 422


def test_stats(client):
    h = auth_headers(client)
    for company, st in [("A", "wishlist"), ("B", "applied"), ("C", "interview"), ("D", "rejected")]:
        client.post("/api/applications", headers=h, json={"company": company, "role": "Dev", "status": st})
    s = client.get("/api/stats", headers=h).json()
    assert s["total"] == 4
    assert s["by_status"]["interview"] == 1
    assert s["response_rate"] == 33.3
