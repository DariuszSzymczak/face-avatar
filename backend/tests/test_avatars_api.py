# AniEmotion backend regression: auth guard, avatar listing, image download, isolation, upload validation
import os
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
AVATAR_ID = "e9d73202-68ab-405c-8879-a28d7f213ea6"
EMOTIONS = ["neutral", "joy", "sadness", "anger", "surprise", "talking"]


def _token(email):
    return subprocess.check_output(["python", "/app/tests/clerk_token.py", email], text=True).strip()


@pytest.fixture(scope="session")
def owner():
    return {"Authorization": f"Bearer {_token('tester+clerk_test@example.com')}"}


@pytest.fixture(scope="session")
def other():
    return {"Authorization": f"Bearer {_token('other+clerk_test@example.com')}"}


# Health
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200 and r.json()["message"] == "AniEmotion API"


# Auth guard: all protected endpoints 401 without token
@pytest.mark.parametrize("method,path", [
    ("get", "/avatars"), ("get", f"/avatars/{AVATAR_ID}"), ("delete", f"/avatars/{AVATAR_ID}"),
    ("get", f"/avatars/{AVATAR_ID}/image/neutral"), ("post", "/avatars"), ("post", "/speech/analyze"),
])
def test_unauthenticated_401(method, path):
    r = getattr(requests, method)(f"{API}{path}")
    assert r.status_code == 401, f"{method} {path} -> {r.status_code} {r.text[:200]}"


def test_invalid_token_401():
    r = requests.get(f"{API}/avatars", headers={"Authorization": "Bearer garbage.token.value"})
    assert r.status_code == 401


# Listing
def test_list_avatars_owner(owner):
    r = requests.get(f"{API}/avatars", headers=owner)
    assert r.status_code == 200
    data = r.json()
    a = next((x for x in data if x["id"] == AVATAR_ID), None)
    assert a is not None
    assert a["status"] == "ready"
    assert set(a["emotions"]) == set(EMOTIONS)
    assert "user_id" not in a and "_id" not in a and "images" not in a


def test_get_avatar_owner(owner):
    r = requests.get(f"{API}/avatars/{AVATAR_ID}", headers=owner)
    assert r.status_code == 200 and r.json()["id"] == AVATAR_ID


# Image download
@pytest.mark.parametrize("emo", EMOTIONS)
def test_image_png(owner, emo):
    r = requests.get(f"{API}/avatars/{AVATAR_ID}/image/{emo}", headers=owner)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/png")
    assert len(r.content) > 1000


def test_image_unknown_emotion_404(owner):
    r = requests.get(f"{API}/avatars/{AVATAR_ID}/image/bogus", headers=owner)
    assert r.status_code == 404


# Isolation
def test_other_user_isolation(other):
    assert all(a["id"] != AVATAR_ID for a in requests.get(f"{API}/avatars", headers=other).json())
    assert requests.get(f"{API}/avatars/{AVATAR_ID}", headers=other).status_code == 404
    assert requests.get(f"{API}/avatars/{AVATAR_ID}/image/neutral", headers=other).status_code == 404
    assert requests.delete(f"{API}/avatars/{AVATAR_ID}", headers=other).status_code == 404


def test_owner_avatar_still_exists_after_other_delete(owner):
    assert requests.get(f"{API}/avatars/{AVATAR_ID}", headers=owner).status_code == 200


# Upload validation (no valid image submitted - LLM budget exhausted)
def test_upload_non_image_400(owner):
    r = requests.post(f"{API}/avatars", headers=owner, files={"photo": ("a.txt", b"hello", "text/plain")}, data={"style": "classic"})
    assert r.status_code == 400 and "obrazem" in r.json()["detail"]


def test_upload_unknown_style_400(owner):
    r = requests.post(f"{API}/avatars", headers=owner, files={"photo": ("a.txt", b"hello", "text/plain")}, data={"style": "bogus"})
    assert r.status_code == 400 and "styl" in r.json()["detail"].lower()


def test_upload_missing_file_422(owner):
    r = requests.post(f"{API}/avatars", headers=owner, data={"style": "classic"})
    assert r.status_code == 422


def test_get_nonexistent_404(owner):
    assert requests.get(f"{API}/avatars/does-not-exist", headers=owner).status_code == 404
    assert requests.delete(f"{API}/avatars/does-not-exist", headers=owner).status_code == 404


# Speech: tiny chunk short-circuits without LLM call
def test_speech_tiny_chunk(owner):
    r = requests.post(f"{API}/speech/analyze", headers=owner, files={"audio": ("c.webm", b"x" * 100, "audio/webm")})
    assert r.status_code == 200 and r.json() == {"text": "", "emotion": None, "scores": {}}
