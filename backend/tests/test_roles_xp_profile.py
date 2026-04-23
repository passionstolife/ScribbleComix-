"""Iteration 6 tests — Admin/Founder roles, XP, Achievements, Profile, Admin endpoints.

We seed users + sessions directly in MongoDB to bypass the external Emergent OAuth dependency.
This mirrors what /api/auth/session would do for allowlisted emails.
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sketch-panels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

FOUNDER_EMAIL = "passionstolife@gmail.com"
COFOUNDER_EMAIL = "cachetito1966@gmail.com"
FREE_EMAIL = "test_regular_iter6@example.com"
PROMOTE_TARGET_EMAIL = "test_promote_target_iter6@example.com"


def _seed_user(db, email: str, role: str, unlimited: bool, credits: int = 20, tier: str = "free",
               xp: int = 10, user_id: str = None) -> dict:
    uid = user_id or f"user_{uuid.uuid4().hex[:12]}"
    tier_expires = None
    if unlimited or tier != "free":
        tier_expires = (datetime.now(timezone.utc) + timedelta(days=365 * 100)).isoformat()
    doc = {
        "user_id": uid,
        "email": email,
        "name": f"Test {role} {email.split('@')[0][-6:]}",
        "picture": "",
        "credits": credits,
        "tier": tier,
        "tier_expires_at": tier_expires,
        "role": role,
        "unlimited": unlimited,
        "xp": xp,
        "level": 1,
        "achievements": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.users.update_one({"email": email}, {"$set": doc}, upsert=True)
    return db.users.find_one({"email": email}, {"_id": 0})


def _seed_session(db, user_id: str) -> str:
    token = f"test_iter6_{uuid.uuid4().hex[:10]}"
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    return token


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    db = c[DB_NAME]
    yield db
    # Cleanup — remove test-created users/sessions/comics
    for email in [FREE_EMAIL, PROMOTE_TARGET_EMAIL]:
        u = db.users.find_one({"email": email})
        if u:
            db.comics.delete_many({"user_id": u["user_id"]})
            db.user_sessions.delete_many({"user_id": u["user_id"]})
            db.users.delete_one({"user_id": u["user_id"]})
    # For founder/cofounder, only clean sessions we created (preserve user records)
    db.user_sessions.delete_many({"session_token": {"$regex": "^test_iter6_"}})
    c.close()


@pytest.fixture(scope="module")
def founder_ctx(mongo):
    u = _seed_user(mongo, FOUNDER_EMAIL, role="founder", unlimited=True, tier="ultimate", credits=0, xp=10)
    token = _seed_session(mongo, u["user_id"])
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return {"user": u, "token": token, "session": s}


@pytest.fixture(scope="module")
def cofounder_ctx(mongo):
    u = _seed_user(mongo, COFOUNDER_EMAIL, role="co_founder", unlimited=True, tier="ultimate", credits=0, xp=10)
    token = _seed_session(mongo, u["user_id"])
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return {"user": u, "token": token, "session": s}


@pytest.fixture(scope="module")
def free_ctx(mongo):
    mongo.users.delete_one({"email": FREE_EMAIL})
    u = _seed_user(mongo, FREE_EMAIL, role="free", unlimited=False, tier="free", credits=20, xp=10)
    token = _seed_session(mongo, u["user_id"])
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return {"user": u, "token": token, "session": s}


# ============ ROLE SEEDING / AUTH ============
class TestRoleSeeding:
    def test_founder_user_has_correct_fields(self, mongo, founder_ctx):
        u = mongo.users.find_one({"email": FOUNDER_EMAIL}, {"_id": 0})
        assert u is not None
        assert u["role"] == "founder"
        assert u["unlimited"] is True
        assert u["tier"] == "ultimate"
        # ~100 years in the future
        exp = datetime.fromisoformat(u["tier_expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        delta_years = (exp - datetime.now(timezone.utc)).days / 365.0
        assert delta_years > 50

    def test_cofounder_user_has_correct_fields(self, mongo, cofounder_ctx):
        u = mongo.users.find_one({"email": COFOUNDER_EMAIL}, {"_id": 0})
        assert u is not None
        assert u["role"] == "co_founder"
        assert u["unlimited"] is True
        assert u["tier"] == "ultimate"

    def test_free_user_defaults(self, mongo, free_ctx):
        u = mongo.users.find_one({"email": FREE_EMAIL}, {"_id": 0})
        assert u["role"] == "free"
        assert u["unlimited"] is False
        assert u["credits"] == 20
        assert u["xp"] == 10  # signup reward


# ============ /profile/me ============
class TestProfileMe:
    def test_requires_auth(self):
        r = requests.get(f"{API}/profile/me")
        assert r.status_code == 401

    def test_founder_profile_fields(self, founder_ctx):
        r = founder_ctx["session"].get(f"{API}/profile/me")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["role", "tier", "unlimited", "xp", "level", "rank_title", "tier_color",
                  "achievements", "achievements_catalog", "stats",
                  "xp_current_threshold", "xp_next_threshold"]:
            assert k in d, f"missing {k}"
        assert d["role"] == "founder"
        assert d["unlimited"] is True
        assert d["tier"] == "ultimate"
        # ultimate_legend + pro_ink auto-unlock for ultimate tier
        assert "pro_ink" in d["achievements"]
        assert "ultimate_legend" in d["achievements"]
        # Catalog shape
        assert "first_steps" in d["achievements_catalog"]
        assert d["achievements_catalog"]["first_steps"]["title"]

    def test_cofounder_profile(self, cofounder_ctx):
        r = cofounder_ctx["session"].get(f"{API}/profile/me")
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "co_founder"
        assert d["unlimited"] is True

    def test_free_profile(self, free_ctx):
        r = free_ctx["session"].get(f"{API}/profile/me")
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "free"
        assert d["unlimited"] is False
        assert d["tier"] == "free"
        assert d["xp"] >= 10
        assert d["level"] >= 1
        assert "pro_ink" not in d["achievements"]


# ============ /profile/public ============
class TestProfilePublic:
    def test_public_no_auth_required_hides_private_fields(self, founder_ctx):
        uid = founder_ctx["user"]["user_id"]
        r = requests.get(f"{API}/profile/public/{uid}")
        assert r.status_code == 200, r.text
        d = r.json()
        # Exposed
        for k in ["name", "role", "level", "rank_title", "achievements", "stats"]:
            assert k in d
        assert "public_comics" in d["stats"]
        # Private fields not exposed
        assert "email" not in d
        assert "credits" not in d

    def test_public_not_found(self):
        r = requests.get(f"{API}/profile/public/user_does_not_exist_xyz")
        assert r.status_code == 404


# ============ XP AWARDS ON COMIC CRUD ============
class TestXPOnComics:
    def test_first_comic_awards_50xp_and_first_steps_achievement(self, free_ctx):
        s = free_ctx["session"]
        # Ensure we're at a clean slate for this user's comics
        # Note: free_ctx is a freshly-seeded user, so count should be 0
        before = s.get(f"{API}/profile/me").json()
        xp_before = before["xp"]

        r = s.post(f"{API}/comics", json={
            "title": "TEST_FirstComic",
            "synopsis": "first",
            "layout": "grid",
            "panels": [],
        })
        assert r.status_code == 200, r.text
        cid_first = r.json()["comic_id"]

        after = s.get(f"{API}/profile/me").json()
        # +50 first_comic  (allow ±small variance if other XP events fire)
        assert after["xp"] >= xp_before + 50, f"xp {xp_before}->{after['xp']}"
        assert "first_steps" in after["achievements"]
        TestXPOnComics.first_comic_id = cid_first
        TestXPOnComics.xp_after_first = after["xp"]

    def test_second_comic_awards_20xp(self, free_ctx):
        s = free_ctx["session"]
        r = s.post(f"{API}/comics", json={
            "title": "TEST_SecondComic", "synopsis": "", "layout": "grid", "panels": [],
        })
        assert r.status_code == 200
        after = s.get(f"{API}/profile/me").json()
        assert after["xp"] >= TestXPOnComics.xp_after_first + 20

    def test_share_first_time_awards_10xp_idempotent(self, free_ctx):
        s = free_ctx["session"]
        cid = TestXPOnComics.first_comic_id
        xp_before = s.get(f"{API}/profile/me").json()["xp"]
        r = s.post(f"{API}/comics/{cid}/share")
        assert r.status_code == 200
        xp_after_share = s.get(f"{API}/profile/me").json()["xp"]
        assert xp_after_share >= xp_before + 10
        # Calling share again should NOT award XP a second time (already public)
        r2 = s.post(f"{API}/comics/{cid}/share")
        assert r2.status_code == 200
        xp_after_share2 = s.get(f"{API}/profile/me").json()["xp"]
        assert xp_after_share2 == xp_after_share, "share should be idempotent on XP"


# ============ PANEL IMAGE CREDIT BYPASS FOR UNLIMITED ============
class TestPanelImageCreditBypass:
    def test_free_user_with_zero_credits_returns_402(self, mongo):
        # Create a dedicated user with 0 credits
        email = "TEST_zero_credits_iter6@example.com"
        mongo.users.delete_one({"email": email})
        u = _seed_user(mongo, email, role="free", unlimited=False, tier="free", credits=0, xp=0)
        token = _seed_session(mongo, u["user_id"])
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        r = s.post(f"{API}/generate/panel-image", json={"prompt": "hi"})
        assert r.status_code == 402, f"expected 402 for zero credits, got {r.status_code}: {r.text}"
        # Cleanup
        mongo.user_sessions.delete_many({"user_id": u["user_id"]})
        mongo.users.delete_one({"user_id": u["user_id"]})

    def test_founder_with_zero_credits_bypasses_402(self, founder_ctx, mongo):
        # Ensure founder credits are 0
        mongo.users.update_one({"user_id": founder_ctx["user"]["user_id"]}, {"$set": {"credits": 0}})
        r = founder_ctx["session"].post(f"{API}/generate/panel-image", json={"prompt": "a test panel"})
        # Either succeeds (200) OR fails for LLM budget (502). MUST NOT be 402.
        assert r.status_code != 402, f"founder got 402 despite unlimited=True: {r.text}"
        assert r.status_code in (200, 502), f"unexpected status {r.status_code}: {r.text[:300]}"


# ============ /admin/promote ============
class TestAdminPromote:
    def test_non_founder_cannot_promote(self, free_ctx):
        r = free_ctx["session"].post(f"{API}/admin/promote",
                                     json={"email": "nobody@x.com", "role": "promoter"})
        assert r.status_code == 403

    def test_promote_nonexistent_email_404(self, founder_ctx):
        r = founder_ctx["session"].post(f"{API}/admin/promote",
                                        json={"email": "nonexistent_iter6_abc@example.com",
                                              "role": "promoter"})
        assert r.status_code == 404

    def test_founder_promotes_to_promoter_sets_unlimited_and_ultimate(self, founder_ctx, mongo):
        # Seed a target user
        mongo.users.delete_one({"email": PROMOTE_TARGET_EMAIL})
        _seed_user(mongo, PROMOTE_TARGET_EMAIL, role="free", unlimited=False, tier="free", credits=20)
        r = founder_ctx["session"].post(f"{API}/admin/promote",
                                        json={"email": PROMOTE_TARGET_EMAIL, "role": "promoter"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "promoter"
        assert d["unlimited"] is True
        # Verify in DB
        fresh = mongo.users.find_one({"email": PROMOTE_TARGET_EMAIL}, {"_id": 0})
        assert fresh["role"] == "promoter"
        assert fresh["unlimited"] is True
        assert fresh["tier"] == "ultimate"
        assert fresh["tier_expires_at"] is not None


# ============ /admin/users ============
class TestAdminUsers:
    def test_non_founder_forbidden(self, free_ctx):
        r = free_ctx["session"].get(f"{API}/admin/users")
        assert r.status_code == 403

    def test_founder_lists_users(self, founder_ctx):
        r = founder_ctx["session"].get(f"{API}/admin/users")
        assert r.status_code == 200
        d = r.json()
        assert "users" in d
        assert "total" in d
        assert isinstance(d["users"], list)
        assert d["total"] >= 1
        # Find our seeded founder user (guaranteed to have role/tier set)
        founder_entries = [u for u in d["users"] if u.get("email") == FOUNDER_EMAIL]
        assert founder_entries, "seeded founder email not present in admin/users list"
        me = founder_entries[0]
        for k in ["email", "role", "tier"]:
            assert k in me, f"missing {k} in founder entry"
        assert me["role"] == "founder"

    def test_cofounder_can_list_users(self, cofounder_ctx):
        r = cofounder_ctx["session"].get(f"{API}/admin/users")
        assert r.status_code == 200


# ============ REGRESSION — existing endpoints still work ============
class TestRegression:
    def test_billing_packages(self):
        r = requests.get(f"{API}/billing/packages")
        assert r.status_code == 200
        assert "packages" in r.json()

    def test_subscriptions_config(self):
        r = requests.get(f"{API}/billing/subscriptions-config")
        assert r.status_code == 200
        assert "recurring_enabled" in r.json()

    def test_comics_list_for_free_user(self, free_ctx):
        r = free_ctx["session"].get(f"{API}/comics")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_public_share_endpoint_still_works(self, free_ctx):
        # We shared in TestXPOnComics. Grab its share_id and hit /public
        s = free_ctx["session"]
        comics = s.get(f"{API}/comics").json()
        shared = [c for c in comics if c.get("is_public") and c.get("share_id")]
        if not shared:
            pytest.skip("No shared comic available")
        share_id = shared[0]["share_id"]
        r = requests.get(f"{API}/public/comics/{share_id}")
        assert r.status_code == 200
        assert "title" in r.json()
