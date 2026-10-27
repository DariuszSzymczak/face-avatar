# AniEmotion free version: avatar config CRUD scoped by X-Client-Id
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
VALID = {"hairStyle": "spiky", "hairColor": "#112233", "eyeColor": "#AABBCC", "skinColor": "#ffe0cc", "shirtColor": "#8b5cf6", "glasses": True, "beard": False}


def hdr(cid):
    return {"X-Client-Id": cid, "Content-Type": "application/json"}


@pytest.fixture
def cid():
    return f"TEST-{uuid.uuid4().hex[:12]}"


# Health
def test_root():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200 and r.json()["message"] == "AniEmotion API"


# Header validation
@pytest.mark.parametrize("h", [{}, {"X-Client-Id": "short"}, {"X-Client-Id": "bad id with spaces!!"}, {"X-Client-Id": "a" * 65}])
def test_missing_or_bad_header(h):
    r = requests.get(f"{BASE_URL}/api/avatars", headers=h)
    assert r.status_code == 400


# Create -> list -> delete
def test_create_list_delete(cid):
    r = requests.post(f"{BASE_URL}/api/avatars", json={"name": "TEST_av", "config": VALID}, headers=hdr(cid))
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["name"] == "TEST_av" and a["config"] == VALID and isinstance(a["id"], str) and "created_at" in a
    assert "_id" not in a and "user_id" not in a
    lst = requests.get(f"{BASE_URL}/api/avatars", headers=hdr(cid)).json()
    assert [x["id"] for x in lst] == [a["id"]]
    assert "_id" not in lst[0] and "user_id" not in lst[0]
    d = requests.delete(f"{BASE_URL}/api/avatars/{a['id']}", headers=hdr(cid))
    assert d.status_code == 200 and d.json() == {"ok": True}
    assert requests.get(f"{BASE_URL}/api/avatars", headers=hdr(cid)).json() == []
    assert requests.delete(f"{BASE_URL}/api/avatars/{a['id']}", headers=hdr(cid)).status_code == 404


# Sorting newest first
def test_sort_desc(cid):
    ids = [requests.post(f"{BASE_URL}/api/avatars", json={"name": f"TEST_{i}", "config": VALID}, headers=hdr(cid)).json()["id"] for i in range(2)]
    lst = requests.get(f"{BASE_URL}/api/avatars", headers=hdr(cid)).json()
    assert [x["id"] for x in lst] == ids[::-1]
    for i in ids:
        requests.delete(f"{BASE_URL}/api/avatars/{i}", headers=hdr(cid))


# Scoping between clients
def test_scoping(cid):
    other = f"TEST-{uuid.uuid4().hex[:12]}"
    a = requests.post(f"{BASE_URL}/api/avatars", json={"name": "TEST_scope", "config": VALID}, headers=hdr(cid)).json()
    assert requests.get(f"{BASE_URL}/api/avatars", headers=hdr(other)).json() == []
    assert requests.delete(f"{BASE_URL}/api/avatars/{a['id']}", headers=hdr(other)).status_code == 404
    assert len(requests.get(f"{BASE_URL}/api/avatars", headers=hdr(cid)).json()) == 1
    requests.delete(f"{BASE_URL}/api/avatars/{a['id']}", headers=hdr(cid))


# Validation 422
@pytest.mark.parametrize("payload", [
    {"name": "", "config": VALID},
    {"name": "x" * 41, "config": VALID},
    {"name": "ok", "config": {**VALID, "hairStyle": "mohawk"}},
    {"name": "ok", "config": {**VALID, "hairColor": "red"}},
    {"name": "ok", "config": {**VALID, "eyeColor": "#12345"}},
    {"name": "ok", "config": {**VALID, "skinColor": "#GGGGGG"}},
    {"name": "ok", "config": {k: v for k, v in VALID.items() if k != "shirtColor"}},
    {"name": "ok"},
])
def test_validation(cid, payload):
    r = requests.post(f"{BASE_URL}/api/avatars", json=payload, headers=hdr(cid))
    assert r.status_code == 422
    assert requests.get(f"{BASE_URL}/api/avatars", headers=hdr(cid)).json() == []


def test_name_40_ok(cid):
    r = requests.post(f"{BASE_URL}/api/avatars", json={"name": "x" * 40, "config": VALID}, headers=hdr(cid))
    assert r.status_code == 200
    requests.delete(f"{BASE_URL}/api/avatars/{r.json()['id']}", headers=hdr(cid))
