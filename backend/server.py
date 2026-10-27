from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

CLIENT_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")
HEX = r"^#[0-9a-fA-F]{6}$"


def require_user(x_client_id: str = Header(None)) -> dict:
    # No login: each browser gets an anonymous id (localStorage) that scopes its avatars.
    if not x_client_id or not CLIENT_RE.match(x_client_id):
        raise HTTPException(400, "Brak identyfikatora przeglądarki")
    return {"user_id": x_client_id}


class AvatarConfig(BaseModel):
    hairStyle: Literal["short", "long", "spiky", "bob", "ponytail"]
    hairColor: str = Field(pattern=HEX)
    eyeColor: str = Field(pattern=HEX)
    skinColor: str = Field(pattern=HEX)
    shirtColor: str = Field(pattern=HEX)
    glasses: bool = False
    beard: bool = False


class AvatarIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    config: AvatarConfig


class Avatar(AvatarIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@api_router.get("/")
async def root():
    return {"message": "AniEmotion API"}


@api_router.post("/avatars")
async def create_avatar(body: AvatarIn, user: dict = Depends(require_user)):
    avatar = Avatar(**body.model_dump())
    await db.avatar_configs.insert_one({**avatar.model_dump(), "user_id": user["user_id"]})
    return avatar.model_dump()


@api_router.get("/avatars")
async def list_avatars(user: dict = Depends(require_user)):
    docs = await db.avatar_configs.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(200)
    return [Avatar(**d).model_dump() for d in docs]


@api_router.delete("/avatars/{avatar_id}")
async def delete_avatar(avatar_id: str, user: dict = Depends(require_user)):
    res = await db.avatar_configs.delete_one({"id": avatar_id, "user_id": user["user_id"]})
    if not res.deleted_count:
        raise HTTPException(404, "Nie znaleziono")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
