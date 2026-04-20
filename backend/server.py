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
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ================= MODELS =================
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


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
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
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
    await get_current_user(request, session_token, authorization)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    full_prompt = (
        f"{body.prompt}. Render strictly as: {body.style_hint or SKETCH_STYLE}. "
        "A single clean comic panel framed with a rough ink border."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"img-{uuid.uuid4().hex[:8]}",
                   system_message="You create hand-drawn black and white sketch comic panels.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    try:
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=full_prompt))
    except Exception as e:
        logging.exception("image gen failed")
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e}")

    if not images:
        raise HTTPException(status_code=502, detail="No image returned")
    img = images[0]
    mime = img.get("mime_type", "image/png")
    data = img["data"]
    data_url = f"data:{mime};base64,{data}"
    return {"image_base64": data_url}


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
