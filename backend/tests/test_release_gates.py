from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient

from main import _rate_limit_events, app


client = TestClient(app)


def _user():
    username = f"gate-{uuid4().hex}"
    password = "ReleaseGatePassword!123"
    _rate_limit_events.clear()
    assert client.post("/register", json={"username": username, "password": password}).status_code == 201
    token = client.post("/login", data={"username": username, "password": password}).json()["access_token"]
    return username, {"Authorization": f"Bearer {token}"}


def test_stale_itinerary_writer_gets_409_and_first_write_remains():
    _, headers = _user()
    trip = client.post(
        "/api/trips",
        headers=headers,
        json={"name": "Concurrency Gate", "start_date": "2030-01-01", "end_date": "2030-01-02", "total_budget": 10},
    )
    trip_id = trip.json()["trip_id"]
    version = client.get(f"/api/trips/{trip_id}/itinerary", headers=headers).json()["version"]
    payload = {"version": version, "stops": [{"city_name": "First Writer", "activities": []}]}
    assert client.post(f"/api/trips/{trip_id}/itinerary", headers=headers, json=payload).status_code == 200
    stale = client.post(
        f"/api/trips/{trip_id}/itinerary",
        headers=headers,
        json={"version": version, "stops": [{"city_name": "Stale Writer", "activities": []}]},
    )
    assert stale.status_code == 409
    assert client.get(f"/api/trips/{trip_id}/itinerary", headers=headers).json()["stops"][0]["city_name"] == "First Writer"


def test_upload_association_rejects_cross_user_reuse_and_preserves_unique_files():
    _, owner_headers = _user()
    _, attacker_headers = _user()
    image = {"file": ("same.jpg", b"\xff\xd8\xff\x00", "image/jpeg")}
    owner_upload = client.post("/api/uploads/images", headers=owner_headers, files=image)
    assert owner_upload.status_code == 200
    url = owner_upload.json()["url"]
    profile = {
        "first_name": "Attacker", "last_name": "User", "email": "attacker@example.test",
        "phone": "0", "city": "X", "country": "Y", "avatar_url": url,
    }
    assert client.post("/api/profile", headers=attacker_headers, json=profile).status_code == 403
    second = client.post("/api/uploads/images", headers=owner_headers, files=image)
    assert second.status_code == 200
    assert second.json()["filename"] != owner_upload.json()["filename"]


def test_comment_rate_limit_returns_retry_after():
    _, headers = _user()
    _rate_limit_events.clear()
    for index in range(20):
        response = client.post(
            "/api/community/comments",
            headers=headers,
            json={"post_type": "trip", "target_id": 999999, "content": f"comment-{index}"},
        )
        assert response.status_code in (200, 404)
    limited = client.post(
        "/api/community/comments",
        headers=headers,
        json={"post_type": "trip", "target_id": 999999, "content": "limited"},
    )
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "60"
    _rate_limit_events.clear()


def test_paginated_collections_are_bounded_and_authorized():
    _, headers = _user()
    endpoints = [
        "/api/community/feed",
        "/api/community/groups",
        "/api/community/follows",
        "/api/community/discussions",
        "/api/community/bookmarks",
        "/api/community/likes",
    ]
    for endpoint in endpoints:
        for page in (1, 2, 0, -1, 999):
            response = client.get(endpoint, headers=headers, params={"page": page, "page_size": 100000})
            assert response.status_code == 200
            body = response.json()
            values = body if isinstance(body, list) else body.get("items", body.get("trip", []))
            assert len(values) <= 100
    assert client.get("/api/admin/users", headers=headers).status_code == 403
