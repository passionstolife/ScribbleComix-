"""Tests for iteration 5 additions:
- Public share links (POST /api/comics/{id}/share, /unshare, GET /api/public/comics/{share_id})
- True subscriptions config + fallback (GET /api/billing/subscriptions-config, POST /api/billing/subscribe, /billing/portal)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sketch-panels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FREE_TOKEN = "test_session_1776681630005"
ULT_TOKEN = "test_session_ult_1776681630019"


@pytest.fixture(scope="module")
def free_client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {FREE_TOKEN}", "Content-Type": "application/json"})
    r = s.get(f"{API}/auth/me")
    if r.status_code != 200:
        pytest.skip("Free token invalid")
    return s


@pytest.fixture(scope="module")
def other_client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {ULT_TOKEN}", "Content-Type": "application/json"})
    r = s.get(f"{API}/auth/me")
    if r.status_code != 200:
        pytest.skip("Ultimate token invalid")
    return s


@pytest.fixture(scope="module")
def shared_comic_id(free_client):
    """Create a fresh comic owned by the FREE user for share tests."""
    r = free_client.post(f"{API}/comics", json={
        "title": "TEST_Shareable",
        "synopsis": "For sharing",
        "layout": "grid",
        "panels": [
            {"caption": "p1", "dialogue": "hey", "image_prompt": "a robot"},
            {"caption": "p2", "dialogue": "", "image_prompt": "a cat"},
        ],
    })
    assert r.status_code == 200, r.text
    cid = r.json()["comic_id"]
    yield cid
    # Teardown
    free_client.delete(f"{API}/comics/{cid}")


# ==== SHARE FLOW ====
class TestShare:
    def test_share_requires_auth(self, shared_comic_id):
        r = requests.post(f"{API}/comics/{shared_comic_id}/share")
        assert r.status_code == 401

    def test_enable_share_returns_share_id(self, free_client, shared_comic_id):
        r = free_client.post(f"{API}/comics/{shared_comic_id}/share")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "share_id" in data
        assert data["is_public"] is True
        assert isinstance(data["share_id"], str)
        assert len(data["share_id"]) > 0
        # Stash on class for next test
        TestShare.first_share_id = data["share_id"]

    def test_enable_share_idempotent(self, free_client, shared_comic_id):
        r = free_client.post(f"{API}/comics/{shared_comic_id}/share")
        assert r.status_code == 200
        assert r.json()["share_id"] == TestShare.first_share_id

    def test_share_other_user_comic_returns_404(self, other_client, shared_comic_id):
        r = other_client.post(f"{API}/comics/{shared_comic_id}/share")
        assert r.status_code == 404

    def test_public_get_returns_comic(self):
        # No auth
        r = requests.get(f"{API}/public/comics/{TestShare.first_share_id}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST_Shareable"
        assert data["layout"] == "grid"
        assert len(data["panels"]) == 2
        assert "author_name" in data
        assert data["author_name"]  # set on share

    def test_public_get_unknown_share_id_returns_404(self):
        r = requests.get(f"{API}/public/comics/s_does_not_exist_123")
        assert r.status_code == 404

    def test_unshare_sets_is_public_false(self, free_client, shared_comic_id):
        r = free_client.post(f"{API}/comics/{shared_comic_id}/unshare")
        assert r.status_code == 200
        assert r.json()["is_public"] is False

    def test_public_get_returns_404_after_unshare(self):
        r = requests.get(f"{API}/public/comics/{TestShare.first_share_id}")
        assert r.status_code == 404

    def test_reshare_keeps_same_share_id(self, free_client, shared_comic_id):
        r = free_client.post(f"{API}/comics/{shared_comic_id}/share")
        assert r.status_code == 200
        assert r.json()["share_id"] == TestShare.first_share_id
        assert r.json()["is_public"] is True


# ==== SUBSCRIPTIONS CONFIG ====
class TestSubscriptionsConfig:
    def test_config_returns_disabled_when_no_price_env(self):
        r = requests.get(f"{API}/billing/subscriptions-config")
        assert r.status_code == 200
        data = r.json()
        assert data["recurring_enabled"] is False
        assert data["pro_price_id"] in (None, "")
        assert data["ultimate_price_id"] in (None, "")


# ==== SUBSCRIBE (501 when not configured) ====
class TestSubscribe:
    def test_subscribe_requires_auth(self):
        r = requests.post(f"{API}/billing/subscribe", json={"tier": "pro", "origin_url": "https://example.com"})
        assert r.status_code == 401

    def test_subscribe_returns_501_when_not_configured(self, free_client):
        r = free_client.post(f"{API}/billing/subscribe", json={"tier": "pro", "origin_url": "https://example.com"})
        assert r.status_code == 501
        detail = r.json().get("detail", "")
        assert "True subscription mode not configured" in detail

    def test_subscribe_ultimate_also_501(self, free_client):
        r = free_client.post(f"{API}/billing/subscribe", json={"tier": "ultimate", "origin_url": "https://example.com"})
        assert r.status_code == 501


# ==== PORTAL ====
class TestPortal:
    def test_portal_requires_auth(self):
        r = requests.post(f"{API}/billing/portal", json={"return_url": "https://example.com"})
        assert r.status_code == 401

    def test_portal_reachable_no_500_code_bug(self, free_client):
        r = free_client.post(f"{API}/billing/portal", json={"return_url": "https://example.com"})
        # Accept 200 (if portal is activated) or 502 (portal not activated in Stripe dashboard).
        # We must NOT see 500 (code bug) or 401.
        assert r.status_code in (200, 502), f"Unexpected: {r.status_code} {r.text}"
        if r.status_code == 200:
            assert "url" in r.json()
        else:
            # 502 should have a detail message, not a stack trace
            assert "detail" in r.json()
