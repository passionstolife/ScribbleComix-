"""Tests for promo codes (INK50) and reference image character consistency."""
import os
import base64
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sketch-panels.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FREE_TOKEN = os.environ.get("TEST_FREE_TOKEN", "test_session_1776681630005")
FREE_USER_ID = "test-user-1776681630005"
ULT_TOKEN = os.environ.get("TEST_ULT_TOKEN", "test_session_ult_1776681630019")
PRO_TOKEN = os.environ.get("TEST_PRO_TOKEN", "test_session_pro_1776682700000")

# Tiny 1x1 transparent PNG
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmM"
    "IQAAAABJRU5ErkJggg=="
)


def _session(token=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _db():
    c = MongoClient(os.environ["MONGO_URL"])
    return c, c[os.environ["DB_NAME"]]


def _clear_paid_sub_pro(user_id):
    c, db = _db()
    db.payment_transactions.delete_many({"user_id": user_id, "package_id": "sub_pro"})
    c.close()


def _insert_paid_sub_pro(user_id):
    from datetime import datetime, timezone
    c, db = _db()
    db.payment_transactions.insert_one({
        "session_id": f"test_paid_{user_id}",
        "user_id": user_id,
        "package_id": "sub_pro",
        "payment_status": "paid",
        "status": "complete",
        "granted": True,
        "amount": 7.99,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    c.close()


# ========= PROMO: valid 50% off sub_pro =========
def test_promo_ink50_applies_to_sub_pro():
    _clear_paid_sub_pro(FREE_USER_ID)
    s = _session(FREE_TOKEN)
    r = s.post(f"{API}/billing/checkout",
               json={"package_id": "sub_pro", "origin_url": BASE_URL, "promo_code": "INK50"},
               timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("promo_applied") == "INK50"
    # 7.99 * 0.5 = 3.995 -> round(.,2) banker's round acceptable (3.99 or 4.0)
    assert d.get("amount") in (3.99, 4.0, 4.00), f"unexpected amount {d.get('amount')}"
    assert "stripe.com" in d.get("url", "")

    # Verify transaction stored with promo_code
    sid = d["session_id"]
    c, db = _db()
    tx = db.payment_transactions.find_one({"session_id": sid}, {"_id": 0})
    c.close()
    assert tx is not None
    assert tx.get("promo_code") == "INK50"
    assert tx.get("original_amount") == 7.99


# ========= PROMO: doesn't apply to ultimate =========
def test_promo_ink50_rejected_for_sub_ultimate():
    s = _session(FREE_TOKEN)
    r = s.post(f"{API}/billing/checkout",
               json={"package_id": "sub_ultimate", "origin_url": BASE_URL, "promo_code": "INK50"},
               timeout=15)
    assert r.status_code == 400, r.text
    assert "promo" in r.text.lower() or "doesn't apply" in r.text.lower() or "apply" in r.text.lower()


def test_promo_ink50_rejected_for_credit_pack():
    s = _session(FREE_TOKEN)
    r = s.post(f"{API}/billing/checkout",
               json={"package_id": "pack_small", "origin_url": BASE_URL, "promo_code": "INK50"},
               timeout=15)
    assert r.status_code == 400


# ========= PROMO: invalid code =========
def test_promo_invalid_code_returns_400():
    s = _session(FREE_TOKEN)
    r = s.post(f"{API}/billing/checkout",
               json={"package_id": "sub_pro", "origin_url": BASE_URL, "promo_code": "BOGUS"},
               timeout=15)
    assert r.status_code == 400
    assert "invalid" in r.text.lower()


# ========= PROMO: first-time only =========
def test_promo_ink50_blocks_after_prior_paid_sub_pro():
    # ensure we start clean, then insert a paid one
    _clear_paid_sub_pro(FREE_USER_ID)
    _insert_paid_sub_pro(FREE_USER_ID)
    try:
        s = _session(FREE_TOKEN)
        r = s.post(f"{API}/billing/checkout",
                   json={"package_id": "sub_pro", "origin_url": BASE_URL, "promo_code": "INK50"},
                   timeout=15)
        assert r.status_code == 400, r.text
        assert "first-time" in r.text.lower() or "first" in r.text.lower()
    finally:
        # cleanup so subsequent test runs start fresh
        _clear_paid_sub_pro(FREE_USER_ID)


# ========= REFERENCE IMAGE — silently ignored for free, works for ultimate =========
def test_panel_image_with_reference_free_user_still_works():
    s = _session(FREE_TOKEN)
    r = s.post(f"{API}/generate/panel-image",
               json={"prompt": "a happy robot on mars", "reference_image_b64": TINY_PNG_B64},
               timeout=120)
    # Free user with credits should still get an image (reference silently ignored)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("image_base64", "").startswith("data:image/")


def test_panel_image_with_reference_ultimate_user():
    s = _session(ULT_TOKEN)
    r = s.post(f"{API}/generate/panel-image",
               json={"prompt": "same robot hero waving on mars", "reference_image_b64": TINY_PNG_B64},
               timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "image_base64" in d and d["image_base64"].startswith("data:image/")
