"""Sketch Comic backend API tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sketch-panels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Pre-seeded test token (created via mongosh per /app/auth_testing.md)
TEST_TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_1776677894735_07atn3yysre8")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(client):
    client.headers.update({"Authorization": f"Bearer {TEST_TOKEN}"})
    # sanity: confirm token works
    r = client.get(f"{API}/auth/me")
    if r.status_code != 200:
        pytest.skip(f"Test token invalid: {r.status_code} {r.text}")
    return client


# ==== ROOT ====
def test_root_message(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "Sketch Comic API"


# ==== AUTH ====
def test_auth_me_without_token_returns_401():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_session_missing_session_id_returns_400(client):
    # Avoid carrying Authorization header from fixtures
    r = requests.post(f"{API}/auth/session", json={})
    assert r.status_code == 400


def test_auth_me_with_bearer_returns_user(auth):
    r = auth.get(f"{API}/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert "user_id" in data
    assert "email" in data
    assert data["user_id"].startswith("test-user-")


# ==== COMICS CRUD ====
_comic_id = {"id": None}


def test_list_comics_empty_or_ok(auth):
    r = auth.get(f"{API}/comics")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_comic(auth):
    payload = {
        "title": "TEST_Adventure",
        "synopsis": "A test synopsis.",
        "layout": "grid",
        "panels": [
            {"caption": "p1", "dialogue": "hi!", "image_prompt": "a cat"},
            {"caption": "p2", "dialogue": "", "image_prompt": "a dog"},
        ],
    }
    r = auth.post(f"{API}/comics", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == "TEST_Adventure"
    assert d["layout"] == "grid"
    assert len(d["panels"]) == 2
    assert "comic_id" in d
    _comic_id["id"] = d["comic_id"]


def test_get_comic(auth):
    cid = _comic_id["id"]
    assert cid
    r = auth.get(f"{API}/comics/{cid}")
    assert r.status_code == 200
    assert r.json()["comic_id"] == cid


def test_update_comic(auth):
    cid = _comic_id["id"]
    r = auth.put(f"{API}/comics/{cid}", json={"title": "TEST_Updated", "layout": "webtoon"})
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_Updated"
    assert r.json()["layout"] == "webtoon"
    # verify persisted
    r2 = auth.get(f"{API}/comics/{cid}")
    assert r2.json()["title"] == "TEST_Updated"


def test_list_comics_contains_created(auth):
    r = auth.get(f"{API}/comics")
    assert r.status_code == 200
    ids = [c["comic_id"] for c in r.json()]
    assert _comic_id["id"] in ids


def test_delete_comic(auth):
    cid = _comic_id["id"]
    r = auth.delete(f"{API}/comics/{cid}")
    assert r.status_code == 200
    r2 = auth.get(f"{API}/comics/{cid}")
    assert r2.status_code == 404


# ==== AI GENERATION ====
def test_generate_story(auth):
    r = auth.post(f"{API}/generate/story", json={"prompt": "a robot finds a cat on mars", "num_panels": 4}, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "title" in d and "synopsis" in d and "panels" in d
    assert len(d["panels"]) >= 4
    p0 = d["panels"][0]
    assert "caption" in p0 and "dialogue" in p0 and "image_prompt" in p0


def test_generate_panel_image(auth):
    r = auth.post(
        f"{API}/generate/panel-image",
        json={"prompt": "a cartoon cat waving on mars, hand drawn ink sketch"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert "image_base64" in d
    assert d["image_base64"].startswith("data:image/")
    assert ";base64," in d["image_base64"]
