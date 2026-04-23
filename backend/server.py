from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Cookie
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
# Optional: when set, enables TRUE Stripe subscriptions (recurring) + Customer Portal.
STRIPE_PRICE_PRO = os.environ.get('STRIPE_PRICE_PRO')
STRIPE_PRICE_ULTIMATE = os.environ.get('STRIPE_PRICE_ULTIMATE')

if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

# ================= BILLING PACKAGES (server-authoritative) =================
# Note: pricing and credits are fixed server-side. Frontend cannot alter.
FREE_SIGNUP_CREDITS = 20

# Admin / role seeding. These users automatically receive founder/co_founder role
# with unlimited credits and ultimate tier for 100 years on first login.
FOUNDER_EMAILS = {
    "passionstolife@gmail.com",  # Founder (you)
}
CO_FOUNDER_EMAILS = {
    "cachetito1966@gmail.com",
    "ramonfloridarican12@gmail.com",
    # Roxy's email added later via /api/admin/promote when she joins
}

# XP awarded per action (tunable)
XP_REWARDS = {
    "signup": 10,
    "first_comic": 50,
    "comic_created": 20,
    "comic_shared": 15,
    "comic_made_public": 10,
    "panel_sketched": 2,
    "subscribed_pro": 100,
    "subscribed_ultimate": 250,
    "credit_pack_purchased": 50,
    "got_5_likes": 25,  # future
}

# XP thresholds per level → also maps to badge tier
LEVEL_THRESHOLDS = [
    (1, 0,     "bronze",   "Sketch Novice"),
    (2, 50,    "bronze",   "Sketch Novice"),
    (3, 150,   "silver",   "Ink Apprentice"),
    (4, 350,   "silver",   "Ink Apprentice"),
    (5, 700,   "gold",     "Pen Artisan"),
    (6, 1200,  "gold",     "Pen Artisan"),
    (7, 2000,  "platinum", "Panel Master"),
    (8, 3200,  "platinum", "Panel Master"),
    (9, 5000,  "diamond",  "Comic Legend"),
    (10, 8000, "diamond",  "Comic Legend"),
]

# Achievements catalog
ACHIEVEMENTS = {
    "first_steps":       {"title": "First Steps",       "desc": "Created your first comic",              "icon": "seal_boom",    "color": "highlight"},
    "published_author":  {"title": "Published Author",  "desc": "Shared 3 comics publicly",               "icon": "seal_zap",     "color": "hotpink"},
    "serial_creator":    {"title": "Serial Creator",    "desc": "Created 10 comics",                      "icon": "seal_pow",     "color": "marker"},
    "ink_master":        {"title": "Ink Master",        "desc": "Sketched 50 panels",                     "icon": "seal_amazing", "color": "gold"},
    "supporter":         {"title": "Supporter",         "desc": "Purchased your first credit pack",       "icon": "seal_heart",   "color": "hotpink"},
    "pro_ink":           {"title": "Pro Ink",           "desc": "Became a Pro subscriber",                "icon": "seal_star",    "color": "highlight"},
    "ultimate_legend":   {"title": "Ultimate Legend",   "desc": "Became an Ultimate subscriber",          "icon": "seal_crown",   "color": "gold"},
    "story_spinner":     {"title": "Story Spinner",     "desc": "Generated 5 AI stories",                 "icon": "seal_wow",     "color": "marker"},
    "share_champion":    {"title": "Share Champion",    "desc": "Your comic link was copied 10+ times",   "icon": "seal_whoa",    "color": "hotpink"},
    "night_owl":         {"title": "Night Owl",         "desc": "Created a comic after midnight",         "icon": "seal_moon",    "color": "marker"},
}


def role_for_email(email: str) -> tuple[str, bool]:
    """Returns (role, unlimited) based on email allowlist."""
    e = (email or "").strip().lower()
    if e in {x.lower() for x in FOUNDER_EMAILS}:
        return "founder", True
    if e in {x.lower() for x in CO_FOUNDER_EMAILS}:
        return "co_founder", True
    return "free", False


def compute_level(xp: int) -> tuple[int, str, str]:
    """Given XP, return (level, tier_color, rank_title)."""
    current = LEVEL_THRESHOLDS[0]
    for entry in LEVEL_THRESHOLDS:
        if xp >= entry[1]:
            current = entry
    return current[0], current[2], current[3]

PACKAGES: Dict[str, Dict] = {
    # Credit packs (one-time)
    "pack_small":  {"kind": "credits", "label": "Starter Pack",  "amount": 3.99,  "credits": 50,  "desc": "50 sketch credits"},
    "pack_value":  {"kind": "credits", "label": "Value Pack",    "amount": 8.99,  "credits": 150, "desc": "150 sketch credits"},
    "pack_mega":   {"kind": "credits", "label": "Mega Pack",     "amount": 17.99, "credits": 400, "desc": "400 sketch credits"},
    # Monthly tiers (one-time charges valid 30 days — user renews manually)
    "sub_pro":     {"kind": "tier", "tier": "pro",      "label": "Pro Monthly",       "amount": 7.99,  "credits": 300, "desc": "300 credits + character consistency + priority"},
    "sub_ultimate":{"kind": "tier", "tier": "ultimate", "label": "Ultimate Monthly",  "amount": 15.99, "credits": 0,   "desc": "Unlimited sketches + PDF + priority + everything"},
}

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ================= MODELS =================
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    credits: int = 0
    tier: Literal["free", "pro", "ultimate"] = "free"
    tier_expires_at: Optional[str] = None
    role: Literal["founder", "co_founder", "promoter", "ultimate", "pro", "free"] = "free"
    xp: int = 0
    level: int = 1
    achievements: List[str] = Field(default_factory=list)
    unlimited: bool = False  # founders/promoters/co-founders bypass credit checks


class Panel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    caption: Optional[str] = ""
    dialogue: Optional[str] = ""
    image_prompt: Optional[str] = ""
    image_base64: Optional[str] = None  # data URL style


class Comic(BaseModel):
    comic_id: str
    user_id: str
    title: str
    synopsis: Optional[str] = ""
    layout: Literal["grid", "webtoon"] = "grid"
    panels: List[Panel] = []
    created_at: str
    updated_at: str
    share_id: Optional[str] = None  # present when sharing is enabled
    is_public: bool = False
    author_name: Optional[str] = None


class GenerateStoryRequest(BaseModel):
    prompt: str
    num_panels: int = 6
    style: Optional[str] = "adventure"


class GeneratePanelImageRequest(BaseModel):
    prompt: str
    style_hint: Optional[str] = None
    reference_image_b64: Optional[str] = None  # previous panel as reference for character consistency (Pro/Ultimate)


class CreateComicRequest(BaseModel):
    title: str
    synopsis: Optional[str] = ""
    layout: Literal["grid", "webtoon"] = "grid"
    panels: List[Panel] = []


class UpdateComicRequest(BaseModel):
    title: Optional[str] = None
    synopsis: Optional[str] = None
    layout: Optional[Literal["grid", "webtoon"]] = None
    panels: Optional[List[Panel]] = None


# ================= TIER HELPER =================
def get_effective_tier(user: User) -> str:
    """Returns 'ultimate' | 'pro' | 'free' based on active subscription expiry."""
    tier = user.tier or "free"
    if tier == "free":
        return "free"
    exp = user.tier_expires_at
    if not exp:
        return "free"
    try:
        exp_dt = datetime.fromisoformat(exp)
    except Exception:
        return "free"
    if exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    if exp_dt < datetime.now(timezone.utc):
        return "free"
    return tier


# ================= AUTH HELPERS =================
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> User:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# ================= AUTH ROUTES =================
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15.0) as http:
        resp = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = resp.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    role, is_unlimited = role_for_email(email)
    if existing:
        user_id = existing["user_id"]
        update_fields = {"name": data.get("name"), "picture": data.get("picture")}
        # Always re-apply founder/co_founder from allowlist (covers future promotions)
        if role in ("founder", "co_founder"):
            update_fields["role"] = role
            update_fields["unlimited"] = True
            update_fields["tier"] = "ultimate"
            update_fields["tier_expires_at"] = (datetime.now(timezone.utc) + timedelta(days=365 * 100)).isoformat()
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
        # Backfill missing fields for old users
        backfill = {}
        for k, v in [("credits", FREE_SIGNUP_CREDITS), ("tier", "free"), ("role", "free"),
                     ("xp", 0), ("level", 1), ("achievements", []), ("unlimited", False)]:
            if k not in existing:
                backfill[k] = v
        if backfill:
            await db.users.update_one({"user_id": user_id}, {"$set": backfill})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_ultimate_on_signup = role in ("founder", "co_founder")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "credits": FREE_SIGNUP_CREDITS,
            "tier": "ultimate" if is_ultimate_on_signup else "free",
            "tier_expires_at": ((datetime.now(timezone.utc) + timedelta(days=365 * 100)).isoformat()
                                 if is_ultimate_on_signup else None),
            "role": role,
            "unlimited": is_unlimited,
            "xp": XP_REWARDS["signup"],
            "level": 1,
            "achievements": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": User(**user_doc).model_dump(), "session_token": session_token}


@api_router.get("/auth/me")
async def me(user: User = None, request: Request = None,
             session_token: Optional[str] = Cookie(None),
             authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    return u.model_dump()


@api_router.post("/auth/logout")
async def logout(response: Response,
                 session_token: Optional[str] = Cookie(None),
                 authorization: Optional[str] = Header(None)):
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ================= AI GENERATION =================
SKETCH_STYLE = (
    "black and white hand-drawn ink sketch comic panel, "
    "loose pen strokes, crosshatching, halftone dots, expressive linework, "
    "white paper background, no color, cartoon style, playful and dynamic composition"
)


@api_router.post("/generate/story")
async def generate_story(
    body: GenerateStoryRequest,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    await get_current_user(request, session_token, authorization)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    sys_msg = (
        "You are a playful comic book writer. Given a user prompt, produce a short comic story "
        f"broken into exactly {body.num_panels} panels. Return STRICT JSON (no markdown fences) with keys: "
        '"title" (short, catchy), "synopsis" (1-2 sentences), "panels" (array). Each panel must have: '
        '"caption" (narration, 1 short sentence), "dialogue" (quoted character line or empty), '
        '"image_prompt" (a vivid visual description for a black and white ink sketch illustrator, 1 sentence, no style keywords).'
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"story-{uuid.uuid4().hex[:8]}", system_message=sys_msg)
    chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=f"Comic prompt: {body.prompt}\nGenre/style hint: {body.style or 'adventure'}.")
    try:
        raw = await chat.send_message(msg)
    except Exception as e:
        logging.exception("story gen failed")
        raise HTTPException(status_code=502, detail=f"Story generation failed: {e}")

    import json
    import re
    text = raw.strip()
    # strip markdown fences if any
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    # extract JSON object
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        text = match.group(0)
    try:
        parsed = json.loads(text)
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid story JSON from model")

    panels_out = []
    for p in parsed.get("panels", []):
        panels_out.append({
            "id": str(uuid.uuid4()),
            "caption": p.get("caption", ""),
            "dialogue": p.get("dialogue", ""),
            "image_prompt": p.get("image_prompt", ""),
            "image_base64": None,
        })
    return {
        "title": parsed.get("title", "Untitled Comic"),
        "synopsis": parsed.get("synopsis", ""),
        "panels": panels_out,
    }


@api_router.post("/generate/panel-image")
async def generate_panel_image(
    body: GeneratePanelImageRequest,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    u = await get_current_user(request, session_token, authorization)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    # Credit / tier gating — unlimited users (founders/co_founders/promoters) bypass entirely
    effective_tier = get_effective_tier(u)
    if not u.unlimited and effective_tier != "ultimate":
        if (u.credits or 0) < 1:
            raise HTTPException(
                status_code=402,
                detail="Out of credits. Upgrade to Ultimate for unlimited or buy a credit pack.",
            )

    full_prompt = (
        f"{body.prompt}. Render strictly as: {body.style_hint or SKETCH_STYLE}. "
        "A single clean comic panel framed with a rough ink border."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"img-{uuid.uuid4().hex[:8]}",
                   system_message="You create hand-drawn black and white sketch comic panels.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    # Reference-image (character consistency) — Pro/Ultimate perk
    file_contents = None
    if body.reference_image_b64 and effective_tier in ("pro", "ultimate"):
        ref = body.reference_image_b64
        # strip data URL prefix if present
        if "," in ref and ref.startswith("data:"):
            ref = ref.split(",", 1)[1]
        file_contents = [ImageContent(ref)]
        full_prompt = (
            f"Keep the same character(s), outfits, and overall style as the reference image. "
            f"New scene: {body.prompt}. Render strictly as: {body.style_hint or SKETCH_STYLE}."
        )

    try:
        msg = UserMessage(text=full_prompt, file_contents=file_contents) if file_contents else UserMessage(text=full_prompt)
        _text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logging.exception("image gen failed")
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e}")

    if not images:
        raise HTTPException(status_code=502, detail="No image returned")

    # Deduct credit after success (ultimate / unlimited users don't)
    remaining = u.credits
    if not u.unlimited and effective_tier != "ultimate":
        await db.users.update_one({"user_id": u.user_id}, {"$inc": {"credits": -1}})
        remaining = max(0, (u.credits or 0) - 1)

    # XP for every sketched panel
    await _award_xp(u.user_id, "panel_sketched")

    img = images[0]
    mime = img.get("mime_type", "image/png")
    data = img["data"]
    data_url = f"data:{mime};base64,{data}"
    return {"image_base64": data_url, "credits_remaining": remaining, "tier": effective_tier}


# ================= COMIC CRUD =================
@api_router.get("/comics", response_model=List[Comic])
async def list_comics(request: Request,
                       session_token: Optional[str] = Cookie(None),
                       authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    docs = await db.comics.find({"user_id": u.user_id}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return [Comic(**d) for d in docs]


@api_router.post("/comics", response_model=Comic)
async def create_comic(body: CreateComicRequest, request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    now = datetime.now(timezone.utc).isoformat()
    # First-comic bonus
    existing_count = await db.comics.count_documents({"user_id": u.user_id})
    comic = Comic(
        comic_id=f"comic_{uuid.uuid4().hex[:12]}",
        user_id=u.user_id,
        title=body.title,
        synopsis=body.synopsis or "",
        layout=body.layout,
        panels=body.panels or [],
        created_at=now,
        updated_at=now,
    )
    await db.comics.insert_one(comic.model_dump())
    # XP + achievements
    await _award_xp(u.user_id, "first_comic" if existing_count == 0 else "comic_created")
    await _check_achievements(u.user_id)
    return comic


@api_router.get("/comics/{comic_id}", response_model=Comic)
async def get_comic(comic_id: str, request: Request,
                     session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    doc = await db.comics.find_one({"comic_id": comic_id, "user_id": u.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Comic not found")
    return Comic(**doc)


@api_router.put("/comics/{comic_id}", response_model=Comic)
async def update_comic(comic_id: str, body: UpdateComicRequest, request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "panels" in updates:
        updates["panels"] = [p if isinstance(p, dict) else p for p in updates["panels"]]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.comics.update_one({"comic_id": comic_id, "user_id": u.user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comic not found")
    doc = await db.comics.find_one({"comic_id": comic_id}, {"_id": 0})
    return Comic(**doc)


@api_router.delete("/comics/{comic_id}")
async def delete_comic(comic_id: str, request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    result = await db.comics.delete_one({"comic_id": comic_id, "user_id": u.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comic not found")
    return {"ok": True}


# ================= PUBLIC SHARE =================
@api_router.post("/comics/{comic_id}/share")
async def enable_share(comic_id: str, request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    doc = await db.comics.find_one({"comic_id": comic_id, "user_id": u.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Comic not found")
    share_id = doc.get("share_id") or f"s_{uuid.uuid4().hex[:10]}"
    newly_public = not doc.get("is_public", False)
    await db.comics.update_one(
        {"comic_id": comic_id},
        {"$set": {"share_id": share_id, "is_public": True, "author_name": u.name}},
    )
    if newly_public:
        await _award_xp(u.user_id, "comic_made_public")
        await _check_achievements(u.user_id)
    return {"share_id": share_id, "is_public": True}


@api_router.post("/comics/{comic_id}/unshare")
async def disable_share(comic_id: str, request: Request,
                         session_token: Optional[str] = Cookie(None),
                         authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    result = await db.comics.update_one(
        {"comic_id": comic_id, "user_id": u.user_id},
        {"$set": {"is_public": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comic not found")
    return {"is_public": False}


class PublicComic(BaseModel):
    title: str
    synopsis: Optional[str] = ""
    layout: Literal["grid", "webtoon"] = "grid"
    panels: List[Panel] = []
    author_name: Optional[str] = None
    created_at: str


@api_router.get("/public/comics/{share_id}", response_model=PublicComic)
async def get_public_comic(share_id: str):
    doc = await db.comics.find_one({"share_id": share_id, "is_public": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Comic not found or private")
    return PublicComic(
        title=doc["title"],
        synopsis=doc.get("synopsis", ""),
        layout=doc.get("layout", "grid"),
        panels=doc.get("panels", []),
        author_name=doc.get("author_name"),
        created_at=doc.get("created_at", ""),
    )


# ================= BILLING =================
class CheckoutBody(BaseModel):
    package_id: str
    origin_url: str
    promo_code: Optional[str] = None


# Promo codes: server-authoritative. Only first pro sub gets 50% off.
PROMO_CODES = {
    "INK50": {"applies_to": ["sub_pro"], "percent_off": 50, "first_time_only": True},
}


@api_router.get("/billing/packages")
async def list_packages():
    return {
        "packages": [
            {"id": pid, **{k: v for k, v in p.items()}} for pid, p in PACKAGES.items()
        ],
        "free_signup_credits": FREE_SIGNUP_CREDITS,
    }


@api_router.get("/billing/me")
async def billing_me(request: Request,
                      session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    return {
        "credits": u.credits,
        "tier": get_effective_tier(u),
        "tier_expires_at": u.tier_expires_at,
    }


def _stripe_client(request: Request) -> StripeCheckout:
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.post("/billing/checkout")
async def create_billing_checkout(body: CheckoutBody, request: Request,
                                   session_token: Optional[str] = Cookie(None),
                                   authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    if body.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = PACKAGES[body.package_id]

    amount = float(pkg["amount"])
    promo_applied = None
    if body.promo_code:
        code = body.promo_code.strip().upper()
        promo = PROMO_CODES.get(code)
        if not promo:
            raise HTTPException(status_code=400, detail="Invalid promo code")
        if body.package_id not in promo["applies_to"]:
            raise HTTPException(status_code=400, detail=f"Promo doesn't apply to {pkg['label']}")
        if promo.get("first_time_only"):
            prior = await db.payment_transactions.find_one(
                {"user_id": u.user_id, "package_id": body.package_id, "payment_status": "paid"},
                {"_id": 0},
            )
            if prior:
                raise HTTPException(status_code=400, detail="Promo only for first-time purchase")
        amount = round(amount * (100 - promo["percent_off"]) / 100, 2)
        promo_applied = code

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/billing"

    stripe_checkout = _stripe_client(request)
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": u.user_id,
            "email": u.email,
            "package_id": body.package_id,
            "kind": pkg["kind"],
            "promo": promo_applied or "",
        },
    )
    session = await stripe_checkout.create_checkout_session(req)

    # Store pending transaction
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": u.user_id,
        "email": u.email,
        "package_id": body.package_id,
        "kind": pkg["kind"],
        "amount": amount,
        "original_amount": float(pkg["amount"]),
        "promo_code": promo_applied,
        "currency": "usd",
        "credits": pkg.get("credits", 0),
        "tier": pkg.get("tier"),
        "payment_status": "pending",
        "status": "initiated",
        "granted": False,
        "metadata": {"user_id": u.user_id, "package_id": body.package_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id, "amount": amount, "promo_applied": promo_applied}


async def _grant_if_paid(session_id: str) -> dict:
    """Idempotently grant credits/tier when Stripe reports paid."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("granted"):
        return tx
    if tx.get("payment_status") != "paid":
        return tx
    pkg_id = tx["package_id"]
    pkg = PACKAGES.get(pkg_id)
    if not pkg:
        return tx
    user_id = tx["user_id"]
    update: Dict = {}
    if pkg["kind"] == "credits":
        await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": pkg["credits"]}})
        await _award_xp(user_id, "credit_pack_purchased")
    elif pkg["kind"] == "tier":
        # Extend or set tier for 30 days from now (or from current expiry if still active)
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0}) or {}
        now = datetime.now(timezone.utc)
        current_exp_str = user_doc.get("tier_expires_at")
        base = now
        if current_exp_str:
            try:
                cur = datetime.fromisoformat(current_exp_str)
                if cur.tzinfo is None:
                    cur = cur.replace(tzinfo=timezone.utc)
                if cur > now and user_doc.get("tier") == pkg["tier"]:
                    base = cur
            except Exception:
                pass
        new_exp = (base + timedelta(days=30)).isoformat()
        update = {"tier": pkg["tier"], "tier_expires_at": new_exp}
        if pkg.get("credits", 0) > 0:
            await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": pkg["credits"]}})
        await db.users.update_one({"user_id": user_id}, {"$set": update})
        # Tier XP
        if pkg.get("tier") == "ultimate":
            await _award_xp(user_id, "subscribed_ultimate")
        elif pkg.get("tier") == "pro":
            await _award_xp(user_id, "subscribed_pro")
        await _check_achievements(user_id)

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"granted": True, "granted_at": datetime.now(timezone.utc).isoformat()}},
    )
    return await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})


@api_router.get("/billing/status/{session_id}")
async def billing_status(session_id: str, request: Request,
                          session_token: Optional[str] = Cookie(None),
                          authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("user_id") != u.user_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    try:
        session = await stripe.checkout.Session.retrieve_async(session_id)
    except Exception as e:
        logging.exception("stripe status fetch failed")
        raise HTTPException(status_code=502, detail=f"Could not fetch status: {e}")

    payment_status = session.payment_status  # 'paid' | 'unpaid' | 'no_payment_required'
    status_val = session.status  # 'open' | 'complete' | 'expired'

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status_val,
            "payment_status": payment_status,
            "amount_total": session.amount_total,
            "currency": session.currency,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    # Grant credits/tier if paid (idempotent)
    if payment_status == "paid":
        await _grant_if_paid(session_id)

    fresh_user = await db.users.find_one({"user_id": u.user_id}, {"_id": 0}) or {}
    return {
        "session_id": session_id,
        "status": status_val,
        "payment_status": payment_status,
        "amount_total": session.amount_total,
        "currency": session.currency,
        "package_id": tx.get("package_id"),
        "credits": fresh_user.get("credits"),
        "tier": get_effective_tier(User(**fresh_user)) if fresh_user else "free",
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    stripe_checkout = _stripe_client(request)
    try:
        evt = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logging.exception("webhook verification failed")
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    if evt.session_id and evt.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": evt.session_id},
            {"$set": {"payment_status": "paid", "status": "complete", "webhook_at": datetime.now(timezone.utc).isoformat()}},
        )
        await _grant_if_paid(evt.session_id)
    return {"received": True}


# ================= TRUE SUBSCRIPTIONS (recurring) + CUSTOMER PORTAL =================
# These endpoints use the official stripe SDK for mode='subscription' since emergentintegrations'
# CheckoutSessionRequest only supports one-time payments. They are ENABLED only when the user
# has configured STRIPE_PRICE_PRO / STRIPE_PRICE_ULTIMATE env vars pointing at recurring prices
# in their Stripe account. Falls back gracefully when not configured.

class SubscribeBody(BaseModel):
    tier: Literal["pro", "ultimate"]
    origin_url: str


@api_router.get("/billing/subscriptions-config")
async def subscriptions_config():
    return {
        "recurring_enabled": bool(STRIPE_PRICE_PRO and STRIPE_PRICE_ULTIMATE),
        "pro_price_id": STRIPE_PRICE_PRO,
        "ultimate_price_id": STRIPE_PRICE_ULTIMATE,
    }


async def _get_or_create_stripe_customer(u: User) -> str:
    """Return the Stripe customer_id for this user, creating one if needed."""
    doc = await db.users.find_one({"user_id": u.user_id}, {"_id": 0})
    if doc and doc.get("stripe_customer_id"):
        return doc["stripe_customer_id"]
    try:
        cust = await stripe.Customer.create_async(
            email=u.email,
            name=u.name,
            metadata={"user_id": u.user_id},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe customer create failed: {e}")
    await db.users.update_one({"user_id": u.user_id}, {"$set": {"stripe_customer_id": cust.id}})
    return cust.id


@api_router.post("/billing/subscribe")
async def create_subscription(body: SubscribeBody, request: Request,
                               session_token: Optional[str] = Cookie(None),
                               authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    if not (STRIPE_PRICE_PRO and STRIPE_PRICE_ULTIMATE):
        raise HTTPException(
            status_code=501,
            detail="True subscription mode not configured. Set STRIPE_PRICE_PRO and STRIPE_PRICE_ULTIMATE env vars in Stripe live mode, or use the one-time /billing/checkout flow.",
        )
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    price_id = STRIPE_PRICE_PRO if body.tier == "pro" else STRIPE_PRICE_ULTIMATE
    customer_id = await _get_or_create_stripe_customer(u)
    origin = body.origin_url.rstrip("/")
    try:
        session = await stripe.checkout.Session.create_async(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&sub=1",
            cancel_url=f"{origin}/billing",
            metadata={
                "user_id": u.user_id,
                "email": u.email,
                "tier": body.tier,
                "kind": "subscription",
            },
            allow_promotion_codes=True,
        )
    except Exception as e:
        logging.exception("subscribe failed")
        raise HTTPException(status_code=502, detail=f"Could not start subscription: {e}")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": u.user_id,
        "email": u.email,
        "package_id": f"sub_{body.tier}",
        "kind": "subscription",
        "tier": body.tier,
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "granted": False,
        "is_recurring": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.id}


@api_router.post("/billing/portal")
async def customer_portal(request: Request,
                           session_token: Optional[str] = Cookie(None),
                           authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    customer_id = await _get_or_create_stripe_customer(u)
    body = await request.json() if (await request.body()) else {}
    return_url = (body.get("return_url") if isinstance(body, dict) else None) or ""
    try:
        portal = await stripe.billing_portal.Session.create_async(
            customer=customer_id,
            return_url=return_url or "https://stripe.com",
        )
    except Exception as e:
        logging.exception("portal failed")
        raise HTTPException(status_code=502, detail=f"Could not open portal: {e}")
    return {"url": portal.url}


# ================= XP, LEVELS, ACHIEVEMENTS =================
async def _award_xp(user_id: str, event: str, amount: Optional[int] = None) -> dict:
    """Grant XP for an event, update level, record side effects. Returns dict of what changed."""
    gained = amount if amount is not None else XP_REWARDS.get(event, 0)
    if gained <= 0:
        return {"gained": 0}
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"gained": 0}
    old_xp = doc.get("xp", 0)
    new_xp = old_xp + gained
    old_level, _, _ = compute_level(old_xp)
    new_level, _, _ = compute_level(new_xp)
    await db.users.update_one({"user_id": user_id}, {"$set": {"xp": new_xp, "level": new_level}})
    return {"gained": gained, "xp": new_xp, "level": new_level, "leveled_up": new_level > old_level}


async def _unlock_achievement(user_id: str, key: str) -> bool:
    """Idempotently unlock an achievement. Returns True if newly unlocked."""
    if key not in ACHIEVEMENTS:
        return False
    result = await db.users.update_one(
        {"user_id": user_id, "achievements": {"$ne": key}},
        {"$addToSet": {"achievements": key}},
    )
    return result.modified_count > 0


async def _check_achievements(user_id: str):
    """Evaluate common achievements after an event. Cheap + safe to call often."""
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0}) or {}
    already = set(doc.get("achievements", []))
    # first_steps
    if "first_steps" not in already:
        n = await db.comics.count_documents({"user_id": user_id})
        if n >= 1:
            await _unlock_achievement(user_id, "first_steps")
    # serial_creator
    if "serial_creator" not in already:
        n = await db.comics.count_documents({"user_id": user_id})
        if n >= 10:
            await _unlock_achievement(user_id, "serial_creator")
    # published_author
    if "published_author" not in already:
        n = await db.comics.count_documents({"user_id": user_id, "is_public": True})
        if n >= 3:
            await _unlock_achievement(user_id, "published_author")
    # ink_master — count panels with images across all user comics
    if "ink_master" not in already:
        agg = await db.comics.aggregate([
            {"$match": {"user_id": user_id}},
            {"$unwind": "$panels"},
            {"$match": {"panels.image_base64": {"$ne": None}}},
            {"$count": "n"},
        ]).to_list(1)
        if agg and agg[0].get("n", 0) >= 50:
            await _unlock_achievement(user_id, "ink_master")
    # pro_ink / ultimate_legend
    tier = get_effective_tier(User(**{**doc, "achievements": doc.get("achievements", [])}))
    if tier in ("pro", "ultimate") and "pro_ink" not in already:
        await _unlock_achievement(user_id, "pro_ink")
    if tier == "ultimate" and "ultimate_legend" not in already:
        await _unlock_achievement(user_id, "ultimate_legend")
    # night_owl — last comic created between 00:00–04:00 local-UTC
    if "night_owl" not in already:
        latest = await db.comics.find_one(
            {"user_id": user_id},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)],
        )
        if latest and latest.get("created_at"):
            try:
                hr = datetime.fromisoformat(latest["created_at"]).hour
                if 0 <= hr < 5:
                    await _unlock_achievement(user_id, "night_owl")
            except Exception:
                pass
    # supporter
    if "supporter" not in already:
        paid = await db.payment_transactions.count_documents(
            {"user_id": user_id, "payment_status": "paid", "kind": "credits"}
        )
        if paid >= 1:
            await _unlock_achievement(user_id, "supporter")


@api_router.get("/profile/me")
async def my_profile(request: Request,
                      session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    await _check_achievements(u.user_id)
    fresh = await db.users.find_one({"user_id": u.user_id}, {"_id": 0}) or {}
    level, tier_color, rank_title = compute_level(fresh.get("xp", 0))
    # Compute XP progress to next level
    cur_thresh = next_thresh = 0
    for entry in LEVEL_THRESHOLDS:
        if entry[0] == level:
            cur_thresh = entry[1]
        if entry[0] == level + 1:
            next_thresh = entry[1]
    comics_count = await db.comics.count_documents({"user_id": u.user_id})
    public_count = await db.comics.count_documents({"user_id": u.user_id, "is_public": True})
    return {
        "user_id": fresh["user_id"],
        "name": fresh.get("name"),
        "email": fresh.get("email"),
        "picture": fresh.get("picture"),
        "role": fresh.get("role", "free"),
        "tier": get_effective_tier(User(**fresh)),
        "credits": fresh.get("credits", 0),
        "unlimited": bool(fresh.get("unlimited")),
        "xp": fresh.get("xp", 0),
        "level": level,
        "tier_color": tier_color,
        "rank_title": rank_title,
        "xp_current_threshold": cur_thresh,
        "xp_next_threshold": next_thresh or cur_thresh,
        "achievements": fresh.get("achievements", []),
        "achievements_catalog": ACHIEVEMENTS,
        "stats": {
            "comics": comics_count,
            "public_comics": public_count,
        },
    }


@api_router.get("/profile/public/{user_id}")
async def public_profile(user_id: str):
    fresh = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not fresh:
        raise HTTPException(status_code=404, detail="User not found")
    level, tier_color, rank_title = compute_level(fresh.get("xp", 0))
    public_count = await db.comics.count_documents({"user_id": user_id, "is_public": True})
    return {
        "user_id": fresh["user_id"],
        "name": fresh.get("name"),
        "picture": fresh.get("picture"),
        "role": fresh.get("role", "free"),
        "level": level,
        "tier_color": tier_color,
        "rank_title": rank_title,
        "xp": fresh.get("xp", 0),
        "achievements": fresh.get("achievements", []),
        "achievements_catalog": ACHIEVEMENTS,
        "stats": {"public_comics": public_count},
    }


# ================= ADMIN =================
class PromoteBody(BaseModel):
    email: str
    role: Literal["promoter", "co_founder", "ultimate", "pro", "free"]


@api_router.post("/admin/promote")
async def admin_promote(body: PromoteBody, request: Request,
                         session_token: Optional[str] = Cookie(None),
                         authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    if u.role not in ("founder", "co_founder"):
        raise HTTPException(status_code=403, detail="Founder/co-founder access only")
    target = await db.users.find_one({"email": body.email.strip().lower()}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="That user hasn't signed up yet")
    unlimited = body.role in ("founder", "co_founder", "promoter")
    updates = {"role": body.role, "unlimited": unlimited}
    if unlimited:
        updates["tier"] = "ultimate"
        updates["tier_expires_at"] = (datetime.now(timezone.utc) + timedelta(days=365 * 100)).isoformat()
    await db.users.update_one({"user_id": target["user_id"]}, {"$set": updates})
    return {"ok": True, "user_id": target["user_id"], "role": body.role, "unlimited": unlimited}


@api_router.get("/admin/users")
async def admin_users(request: Request,
                       session_token: Optional[str] = Cookie(None),
                       authorization: Optional[str] = Header(None)):
    u = await get_current_user(request, session_token, authorization)
    if u.role not in ("founder", "co_founder"):
        raise HTTPException(status_code=403, detail="Founder/co-founder access only")
    docs = await db.users.find({}, {"_id": 0, "email": 1, "name": 1, "user_id": 1, "role": 1, "tier": 1, "credits": 1, "xp": 1, "level": 1, "created_at": 1}).sort("created_at", -1).to_list(500)
    return {"users": docs, "total": len(docs)}


@api_router.get("/")
async def root():
    return {"message": "Sketch Comic API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
