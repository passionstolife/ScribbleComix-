"""
Iteration 7 backend tests:
- Discover feed with is_liked/is_saved flags
- Like / Save toggles
- Collection (user's saved comics)
- Events CRUD + submit
- Regression on auth/me, comics list, profile/me, admin/users, share
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sketch-panels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FOUNDER_TOKEN = "testsess_4deb2750750e4a67b538d205a649ac4c"
FOUNDER_USER_ID = "user_b2b30b44f107"
FOUNDER_EMAIL = "passionstolife@gmail.com"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def founder_headers():
    return {"Authorization": f"Bearer {FOUNDER_TOKEN}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def free_user(mongo):
    """Seed a non-founder 'free' user + session for 403 + ownership tests."""
    uid = f"TEST_iter7_free_{uuid.uuid4().hex[:6]}"
    tok = f"TEST_iter7_tok_{uuid.uuid4().hex[:10]}"
    mongo.users.insert_one({
        "user_id": uid,
        "email": f"{uid}@test.com",
        "name": "Iter7 Free",
        "picture": "",
        "role": "free",
        "tier": "free",
        "unlimited": False,
        "credits": 5,
        "xp": 0,
        "level": 1,
        "achievements": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": uid,
        "session_token": tok,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": uid, "token": tok, "headers": {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}}
    # cleanup
    mongo.users.delete_one({"user_id": uid})
    mongo.user_sessions.delete_many({"user_id": uid})
    mongo.comics.delete_many({"user_id": uid})
    mongo.comic_likes.delete_many({"user_id": uid})
    mongo.collections.delete_many({"user_id": uid})


@pytest.fixture(scope="module")
def public_comic(mongo):
    """Seed one public comic owned by the founder (no LLM call needed)."""
    cid = f"TEST_iter7_comic_{uuid.uuid4().hex[:8]}"
    sid = f"TEST_s_{uuid.uuid4().hex[:8]}"
    mongo.comics.insert_one({
        "comic_id": cid,
        "user_id": FOUNDER_USER_ID,
        "author_name": "Founder Test",
        "title": "TEST Iter7 Comic",
        "synopsis": "A tiny testing comic.",
        "layout": "grid",
        "panels": [{"panel_id": "p1", "caption": "hi", "image_base64": "data:image/png;base64,AAA"}],
        "is_public": True,
        "share_id": sid,
        "like_count": 0,
        "save_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"comic_id": cid, "share_id": sid}
    mongo.comics.delete_one({"comic_id": cid})
    mongo.comic_likes.delete_many({"comic_id": cid})
    mongo.collections.delete_many({"comic_id": cid})


# ---------- regression: auth ----------
class TestRegressionAuth:
    def test_auth_me_with_founder_token(self, founder_headers):
        r = requests.get(f"{API}/auth/me", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == FOUNDER_EMAIL
        assert d["role"] == "founder"
        assert d.get("unlimited") is True

    def test_auth_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- discover ----------
class TestDiscover:
    def test_discover_unauth_returns_items(self, public_comic):
        r = requests.get(f"{API}/discover", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        # Our seeded comic should be in there
        ids = [c["comic_id"] for c in data["items"]]
        assert public_comic["comic_id"] in ids
        sample = next(c for c in data["items"] if c["comic_id"] == public_comic["comic_id"])
        # Required fields
        for k in ["comic_id", "title", "cover_image", "author_name", "like_count", "save_count"]:
            assert k in sample, f"missing key {k}"
        # Unauth => flags False
        assert sample["is_saved"] is False
        assert sample["is_liked"] is False

    def test_discover_auth_attaches_flags(self, founder_headers, public_comic):
        r = requests.get(f"{API}/discover", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        sample = next((c for c in items if c["comic_id"] == public_comic["comic_id"]), None)
        assert sample is not None
        assert "is_liked" in sample and "is_saved" in sample

    def test_discover_sort_popular(self, founder_headers):
        r = requests.get(f"{API}/discover?sort=popular&limit=10", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        assert "items" in r.json()


# ---------- like / save toggle ----------
class TestLikeSave:
    def test_like_requires_auth(self, public_comic):
        r = requests.post(f"{API}/comics/{public_comic['comic_id']}/like", timeout=15)
        assert r.status_code == 401

    def test_like_toggle_twice(self, founder_headers, public_comic):
        cid = public_comic["comic_id"]
        r1 = requests.post(f"{API}/comics/{cid}/like", headers=founder_headers, timeout=15)
        assert r1.status_code == 200
        d1 = r1.json()
        assert "liked" in d1 and "like_count" in d1
        assert d1["liked"] is True
        first_count = d1["like_count"]

        r2 = requests.post(f"{API}/comics/{cid}/like", headers=founder_headers, timeout=15)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["liked"] is False
        assert d2["like_count"] == first_count - 1

    def test_like_unknown_comic_404(self, founder_headers):
        r = requests.post(f"{API}/comics/TEST_nonexistent/like", headers=founder_headers, timeout=15)
        assert r.status_code == 404

    def test_save_requires_auth(self, public_comic):
        r = requests.post(f"{API}/comics/{public_comic['comic_id']}/save", timeout=15)
        assert r.status_code == 401

    def test_save_toggle_twice(self, founder_headers, public_comic):
        cid = public_comic["comic_id"]
        r1 = requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)
        assert r1.status_code == 200
        assert r1.json()["saved"] is True
        r2 = requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["saved"] is False


# ---------- collection ----------
class TestCollection:
    def test_collection_requires_auth(self):
        r = requests.get(f"{API}/collection/me", timeout=15)
        assert r.status_code == 401

    def test_collection_reflects_saved(self, founder_headers, public_comic):
        cid = public_comic["comic_id"]
        # Ensure saved
        requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)
        r = requests.get(f"{API}/collection/me", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(c["comic_id"] == cid for c in items)
        # every item has is_saved True
        assert all(c.get("is_saved") is True for c in items)
        # Unsave and verify removed
        requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)
        r2 = requests.get(f"{API}/collection/me", headers=founder_headers, timeout=15)
        assert r2.status_code == 200
        ids = [c["comic_id"] for c in r2.json()["items"]]
        assert cid not in ids

    def test_collection_isolation_between_users(self, founder_headers, free_user, public_comic, mongo):
        # Free user's collection should NOT contain founder's saves
        # First force a save by founder
        cid = public_comic["comic_id"]
        requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)
        r = requests.get(f"{API}/collection/me", headers=free_user["headers"], timeout=15)
        assert r.status_code == 200
        ids = [c["comic_id"] for c in r.json()["items"]]
        assert cid not in ids
        # cleanup
        requests.post(f"{API}/comics/{cid}/save", headers=founder_headers, timeout=15)


# ---------- events ----------
class TestEvents:
    _created_event_id = None

    def test_list_events_public(self):
        r = requests.get(f"{API}/events", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and isinstance(data["items"], list)
        if data["items"]:
            assert "submission_count" in data["items"][0]

    def test_create_event_non_founder_forbidden(self, free_user):
        payload = {"title": "TEST Free Event", "description": "d", "emoji": "🎉", "banner_color": "hotpink"}
        r = requests.post(f"{API}/events", json=payload, headers=free_user["headers"], timeout=15)
        assert r.status_code == 403

    def test_create_event_unauth(self):
        r = requests.post(f"{API}/events", json={"title": "x"}, timeout=15)
        assert r.status_code == 401

    def test_create_event_founder(self, founder_headers):
        payload = {
            "title": f"TEST Iter7 Event {uuid.uuid4().hex[:6]}",
            "description": "testing event",
            "emoji": "🎃",
            "banner_color": "hotpink",
        }
        r = requests.post(f"{API}/events", json=payload, headers=founder_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["banner_color"] == "hotpink"
        assert d["emoji"] == "🎃"
        assert d["submission_count"] == 0
        assert "event_id" in d
        TestEvents._created_event_id = d["event_id"]

    def test_get_event_detail(self, founder_headers):
        eid = TestEvents._created_event_id
        assert eid, "create test must run first"
        r = requests.get(f"{API}/events/{eid}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "event" in d and "submissions" in d
        assert d["event"]["event_id"] == eid
        assert isinstance(d["submissions"], list)

    def test_submit_to_event_requires_owned_comic(self, founder_headers, free_user):
        eid = TestEvents._created_event_id
        # Submit a comic_id not owned by founder => 404
        r = requests.post(
            f"{API}/events/{eid}/submit",
            json={"comic_id": "TEST_not_yours_xyz", "tint": "peach"},
            headers=founder_headers,
            timeout=15,
        )
        assert r.status_code == 404

    def test_submit_to_event_ok_attaches_and_publishes(self, founder_headers, public_comic, mongo):
        eid = TestEvents._created_event_id
        cid = public_comic["comic_id"]
        r = requests.post(
            f"{API}/events/{eid}/submit",
            json={"comic_id": cid, "tint": "peach"},
            headers=founder_headers,
            timeout=15,
        )
        assert r.status_code == 200
        # Verify in DB
        doc = mongo.comics.find_one({"comic_id": cid})
        assert doc["event_id"] == eid
        assert doc["is_public"] is True
        assert doc.get("tint") == "peach"

        # Discover filter by event_id
        rr = requests.get(f"{API}/discover?event_id={eid}", timeout=15)
        assert rr.status_code == 200
        ids = [c["comic_id"] for c in rr.json()["items"]]
        assert cid in ids

    def test_delete_event_non_founder_forbidden(self, free_user):
        # create another event to delete
        # free user can't even create, so just attempt delete of existing id with non-founder
        eid = TestEvents._created_event_id
        r = requests.delete(f"{API}/events/{eid}", headers=free_user["headers"], timeout=15)
        assert r.status_code == 403

    def test_delete_event_founder_detaches_submissions(self, founder_headers, public_comic, mongo):
        eid = TestEvents._created_event_id
        r = requests.delete(f"{API}/events/{eid}", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        # Event gone
        r2 = requests.get(f"{API}/events/{eid}", timeout=15)
        assert r2.status_code == 404
        # Comic still exists but event_id unset
        doc = mongo.comics.find_one({"comic_id": public_comic["comic_id"]})
        assert doc is not None
        assert "event_id" not in doc or doc.get("event_id") in (None, "")

    def test_delete_event_404(self, founder_headers):
        r = requests.delete(f"{API}/events/ev_nonexistent_xyz", headers=founder_headers, timeout=15)
        assert r.status_code == 404


# ---------- regression: comics + profile + admin + public share ----------
class TestRegressionExisting:
    def test_comics_list(self, founder_headers):
        r = requests.get(f"{API}/comics", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_profile_me(self, founder_headers):
        r = requests.get(f"{API}/profile/me", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "xp" in d and "level" in d
        assert "achievements" in d

    def test_admin_users_founder(self, founder_headers):
        r = requests.get(f"{API}/admin/users", headers=founder_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Accept either {users:[...]} or [...]
        users = data["users"] if isinstance(data, dict) and "users" in data else data
        assert isinstance(users, list)

    def test_admin_users_forbidden_for_free(self, free_user):
        r = requests.get(f"{API}/admin/users", headers=free_user["headers"], timeout=15)
        assert r.status_code == 403

    def test_public_share_reads(self, public_comic):
        r = requests.get(f"{API}/public/comics/{public_comic['share_id']}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST Iter7 Comic"
