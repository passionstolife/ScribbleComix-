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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# ================= BILLING PACKAGES (server-authoritative) =================
# Note: pricing and credits are fixed server-side. Frontend cannot alter.
FREE_SIGNUP_CREDITS = 20

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
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
        # Backfill missing fields for old users
        if "credits" not in existing:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"credits": FREE_SIGNUP_CREDITS, "tier": "free"}},
            )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "credits": FREE_SIGNUP_CREDITS,
            "tier": "free",
            "tier_expires_at": None,
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

    # Credit / tier gating
    effective_tier = get_effective_tier(u)
    if effective_tier != "ultimate":
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

    # Deduct credit after success (ultimate users don't)
    remaining = u.credits
    if effective_tier != "ultimate":
        await db.users.update_one({"user_id": u.user_id}, {"$inc": {"credits": -1}})
        remaining = max(0, (u.credits or 0) - 1)

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

    stripe_checkout = _stripe_client(request)
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logging.exception("stripe status fetch failed")
        raise HTTPException(status_code=502, detail=f"Could not fetch status: {e}")

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    # Grant credits/tier if paid (idempotent)
    if status.payment_status == "paid":
        await _grant_if_paid(session_id)

    fresh_user = await db.users.find_one({"user_id": u.user_id}, {"_id": 0}) or {}
    return {
        "session_id": session_id,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
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
