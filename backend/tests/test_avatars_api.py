# AniEmotion backend regression (no-login): X-Client-Id guard, listing, image download, isolation, upload validation
import os
import uuid
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
OWNER = {"X-Client-Id": "test-client-0001"}
OTHER = {"X-Client-Id": f"TEST-other-{uuid.uuid4().hex[:12]}"}


# Health
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200 and r.json()["message"] == "AniEmotion API"


# Guard: missing X-Client-Id -> 400
@pytest.mark.parametrize("method,path", [
    ("get", "/avatars"), ("get", f"/avatars/{AVATAR_ID}"), ("delete", f"/avatars/{AVATAR_ID}"),
    ("get", f"/avatars/{AVATAR_ID}/image/neutral"), ("post", "/speech/analyze"),
])
def test_missing_client_id_400(method, path):
    r = getattr(requests, method)(f"{API}{path}")
    assert r.status_code == 400, f"{method} {path} -> {r.status_code} {r.text[:200]}"


def test_post_avatars_missing_client_id_400():
    r = requests.post(f"{API}/avatars", files={"photo": ("a.png", b"x", "image/png")}, data={"style": "classic"})
    assert r.status_code == 400


@pytest.mark.parametrize("cid", ["short", "a" * 65, "bad_id!!chars", "has space here"])
def test_invalid_client_id_400(cid):
    r = requests.get(f"{API}/avatars", headers={"X-Client-Id": cid})
    assert r.status_code == 400


# Listing
def test_list_avatars_owner():
    r = requests.get(f"{API}/avatars", headers=OWNER)
    assert r.status_code == 200
    a = next((x for x in r.json() if x["id"] == AVATAR_ID), None)
    assert a is not None and a["status"] == "ready"
    assert set(a["emotions"]) == set(EMOTIONS)
    assert "user_id" not in a and "_id" not in a and "images" not in a


def test_get_avatar_owner():
    r = requests.get(f"{API}/avatars/{AVATAR_ID}", headers=OWNER)
    assert r.status_code == 200 and r.json()["id"] == AVATAR_ID


# Image download
@pytest.mark.parametrize("emo", EMOTIONS)
def test_image_png(emo):
    r = requests.get(f"{API}/avatars/{AVATAR_ID}/image/{emo}", headers=OWNER)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/png")
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n" or len(r.content) > 1000


def test_image_unknown_emotion_404():
    assert requests.get(f"{API}/avatars/{AVATAR_ID}/image/bogus", headers=OWNER).status_code == 404


# Isolation
def test_other_client_isolation():
    r = requests.get(f"{API}/avatars", headers=OTHER)
    assert r.status_code == 200 and r.json() == []
    assert requests.get(f"{API}/avatars/{AVATAR_ID}", headers=OTHER).status_code == 404
    assert requests.get(f"{API}/avatars/{AVATAR_ID}/image/neutral", headers=OTHER).status_code == 404
    assert requests.delete(f"{API}/avatars/{AVATAR_ID}", headers=OTHER).status_code == 404


def test_owner_avatar_still_exists_after_other_delete():
    assert requests.get(f"{API}/avatars/{AVATAR_ID}", headers=OWNER).status_code == 200


# Upload validation (no valid generation - LLM budget exhausted)
def test_upload_non_image_400():
    r = requests.post(f"{API}/avatars", headers=OTHER, files={"photo": ("a.txt", b"hello", "text/plain")}, data={"style": "classic"})
    assert r.status_code == 400 and "obrazem" in r.json()["detail"]


def test_upload_unknown_style_400():
    r = requests.post(f"{API}/avatars", headers=OTHER, files={"photo": ("a.png", b"x", "image/png")}, data={"style": "bogus"})
    assert r.status_code == 400 and "styl" in r.json()["detail"].lower()


def test_upload_missing_file_422():
    assert requests.post(f"{API}/avatars", headers=OTHER, data={"style": "classic"}).status_code == 422


def test_get_nonexistent_404():
    assert requests.get(f"{API}/avatars/does-not-exist", headers=OWNER).status_code == 404
    assert requests.delete(f"{API}/avatars/does-not-exist", headers=OWNER).status_code == 404


# Speech: tiny chunk short-circuits without LLM call
def test_speech_tiny_chunk():
    r = requests.post(f"{API}/speech/analyze", headers=OWNER, files={"audio": ("c.webm", b"x" * 100, "audio/webm")})
    assert r.status_code == 200 and r.json() == {"text": "", "emotion": None, "scores": {}}
