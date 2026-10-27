from fastapi import FastAPI, APIRouter, Depends, UploadFile, File, Form, HTTPException, Response, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import re
import json
import base64
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # noqa: E402
from emergentintegrations.llm.openai import OpenAISpeechToText  # noqa: E402

try:
    from backend.storage import init_storage, put_object, get_object, APP_NAME
except ModuleNotFoundError:
    from storage import init_storage, put_object, get_object, APP_NAME

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
IMAGE_MODEL = "gemini-3.1-flash-image-preview"

app = FastAPI()
CLIENT_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def require_user(x_client_id: str = Header(None)) -> dict:
    # No login: each browser gets an anonymous id (localStorage) that scopes its avatars.
    if not x_client_id or not CLIENT_RE.match(x_client_id):
        raise HTTPException(400, "Brak identyfikatora przeglądarki")
    return {"user_id": x_client_id}

api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

EMOTIONS = ["neutral", "joy", "sadness", "anger", "surprise", "talking"]
STYLES = {
    "classic": "classic modern anime (Kyoto Animation style), clean line art, soft cel shading",
    "shonen": "bold shonen anime style, sharp dynamic line art, strong cel shading, vivid colors",
    "pastel": "soft pastel anime style, dreamy light colors, gentle shading",
    "chibi": "cute chibi anime style, big head, big expressive eyes",
}
FRAMING = ("Front-facing head-and-shoulders portrait, face centered and looking straight at the viewer, "
           "plain smooth dark indigo gradient background, square composition, no text, no watermark.")
VARIANT_PROMPTS = {
    "joy": "a big happy joyful smile, cheerful sparkling eyes",
    "sadness": "a sad expression, downturned mouth, teary eyes, eyebrows raised in the middle",
    "anger": "an angry expression, furrowed lowered eyebrows, gritted teeth, intense glare",
    "surprise": "a surprised shocked expression, wide open eyes, raised eyebrows, mouth open in an O shape",
    "talking": "a neutral calm expression but with the mouth open mid-speech as if saying 'ah'",
}


class Avatar(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    style: str
    status: str = "processing"
    progress: int = 0
    error: Optional[str] = None
    images: Dict[str, str] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def public_avatar(a: Avatar) -> dict:
    d = a.model_dump(exclude={"user_id"})
    d["emotions"] = list(a.images.keys())
    d.pop("images")
    return d


async def gen_image(prompt: str, ref_b64: str) -> bytes:
    chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message="You are an expert anime character artist.")
    chat.with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])
    for _ in range(2):
        _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)]))
        if images:
            return base64.b64decode(images[0]["data"])
    raise RuntimeError("Model nie zwrócił obrazu")


async def save_image(avatar: Avatar, emotion: str, data: bytes):
    path = f"{APP_NAME}/avatars/{avatar.user_id}/{avatar.id}/{emotion}.png"
    res = await asyncio.to_thread(put_object, path, data, "image/png")
    avatar.images[emotion] = res["path"]
    avatar.progress = len(avatar.images)
    await db.avatars.update_one({"id": avatar.id}, {"$set": {"images": avatar.images, "progress": avatar.progress}})


async def run_generation(avatar: Avatar, photo_b64: str):
    try:
        style = STYLES[avatar.style]
        base = await gen_image(
            f"Transform the person in this photo into an anime character portrait in {style}. Keep their recognizable "
            f"features: hair style and color, face shape, eye color, skin tone, glasses/beard/accessories if present. "
            f"Neutral relaxed expression with mouth closed. {FRAMING}", photo_b64)
        await save_image(avatar, "neutral", base)
        base_b64 = base64.b64encode(base).decode()

        async def variant(emo):
            data = await gen_image(
                f"Redraw exactly this same anime character with identical style, hair, clothes, colors, framing, head "
                f"size and position and the same background, changing ONLY the facial expression to {VARIANT_PROMPTS[emo]}. "
                f"{FRAMING}", base_b64)
            await save_image(avatar, emo, data)

        results = await asyncio.gather(*(variant(e) for e in VARIANT_PROMPTS), return_exceptions=True)
        errors = [r for r in results if isinstance(r, Exception)]
        for e in errors:
            logger.error(f"variant failed: {e}")
        await db.avatars.update_one({"id": avatar.id}, {"$set": {"status": "ready"}})
    except Exception as e:
        logger.exception("avatar generation failed")
        msg = "Brak środków na kluczu AI — doładuj saldo (Profile → Universal Key → Add Balance)" if "Budget has been exceeded" in str(e) else "Nie udało się wygenerować avatara, spróbuj ponownie"
        await db.avatars.update_one({"id": avatar.id}, {"$set": {"status": "failed", "error": msg}})


@api_router.get("/")
async def root():
    return {"message": "AniEmotion API"}


@api_router.post("/avatars")
async def create_avatar(photo: UploadFile = File(...), style: str = Form("classic"), user: dict = Depends(require_user)):
    if style not in STYLES:
        raise HTTPException(400, "Nieznany styl")
    if not (photo.content_type or "").startswith("image/"):
        raise HTTPException(400, "Plik musi być obrazem")
    data = await photo.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Zdjęcie jest za duże (max 10 MB)")
    avatar = Avatar(user_id=user["user_id"], style=style)
    await asyncio.to_thread(put_object, f"{APP_NAME}/photos/{avatar.user_id}/{avatar.id}.img", data, photo.content_type)
    await db.avatars.insert_one(avatar.model_dump())
    asyncio.create_task(run_generation(avatar, base64.b64encode(data).decode()))
    return public_avatar(avatar)


@api_router.get("/avatars")
async def list_avatars(user: dict = Depends(require_user)):
    docs = await db.avatars.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [public_avatar(Avatar(**d)) for d in docs]


async def get_own(avatar_id: str, user_id: str) -> Avatar:
    doc = await db.avatars.find_one({"id": avatar_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Nie znaleziono")
    return Avatar(**doc)


@api_router.get("/avatars/{avatar_id}")
async def get_avatar(avatar_id: str, user: dict = Depends(require_user)):
    return public_avatar(await get_own(avatar_id, user["user_id"]))


@api_router.delete("/avatars/{avatar_id}")
async def delete_avatar(avatar_id: str, user: dict = Depends(require_user)):
    await get_own(avatar_id, user["user_id"])
    await db.avatars.delete_one({"id": avatar_id})
    return {"ok": True}


@api_router.get("/avatars/{avatar_id}/image/{emotion}")
async def avatar_image(avatar_id: str, emotion: str, user: dict = Depends(require_user)):
    avatar = await get_own(avatar_id, user["user_id"])
    path = avatar.images.get(emotion)
    if not path:
        raise HTTPException(404, "Brak obrazu")
    data, _ = await asyncio.to_thread(get_object, path)
    return Response(content=data, media_type="image/png", headers={"Cache-Control": "private, max-age=86400"})


SPEECH_SYSTEM = ("You analyze the emotional tone of short spoken Polish (or other language) utterances. "
                 "Reply ONLY with JSON: {\"emotion\": one of neutral|joy|sadness|anger|surprise, "
                 "\"scores\": {\"neutral\":0-1,\"joy\":0-1,\"sadness\":0-1,\"anger\":0-1,\"surprise\":0-1}}")


@api_router.post("/speech/analyze")
async def analyze_speech(audio: UploadFile = File(...), user: dict = Depends(require_user)):
    data = await audio.read()
    if len(data) < 2000:
        return {"text": "", "emotion": None, "scores": {}}
    buf = io.BytesIO(data)
    buf.name = "chunk.webm"
    stt = OpenAISpeechToText(api_key=LLM_KEY)
    try:
        tr = await stt.transcribe(file=buf, model="whisper-1", response_format="json", language="pl")
    except Exception as e:
        logger.error(f"stt failed: {e}")
        if "Budget has been exceeded" in str(e):
            raise HTTPException(402, "Brak środków na kluczu AI — doładuj saldo")
        raise HTTPException(502, "Nie udało się rozpoznać mowy")
    text = (tr.text or "").strip()
    if len(text) < 2:
        return {"text": "", "emotion": None, "scores": {}}
    chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message=SPEECH_SYSTEM).with_model("openai", "gpt-5.4")
    try:
        raw = await chat.send_message(UserMessage(text=text))
        parsed = json.loads(re.search(r"\{.*\}", raw, re.S).group(0))
        emotion = parsed.get("emotion") if parsed.get("emotion") in EMOTIONS[:5] else "neutral"
        scores = {k: float(parsed.get("scores", {}).get(k, 0)) for k in EMOTIONS[:5]}
    except Exception as e:
        logger.error(f"emotion classify failed: {e}")
        emotion, scores = "neutral", {}
    return {"text": text, "emotion": emotion, "scores": scores}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.avatars.update_many({"status": "processing"}, {"$set": {"status": "failed", "error": "Przerwano generowanie"}})
    try:
        await asyncio.to_thread(init_storage)
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
