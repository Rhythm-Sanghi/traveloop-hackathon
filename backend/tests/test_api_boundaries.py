from fastapi.testclient import TestClient

from main import app, _rate_limit_events, save_uploaded_image
from main import StopSchema
import pytest
import asyncio
from io import BytesIO
from pathlib import Path
from starlette.datastructures import UploadFile
from fastapi import HTTPException


client = TestClient(app)


def test_security_headers_and_missing_password_recovery():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]

    recovery = client.post("/api/auth/forgot-password", json={"username": "anyone"})
    assert recovery.status_code == 404


def test_private_routes_require_authentication():
    assert client.get("/api/trips").status_code == 401
    assert client.get("/api/expenses", params={"trip_id": 1}).status_code == 401
    assert client.get("/api/search/places", params={"q": "Tokyo"}).status_code == 401
    assert client.get("/api/admin/overview", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    assert client.post(
        "/api/trips/1/itinerary/stops/1/activities",
        headers={"Authorization": "Bearer not-a-token"},
        json={"name": "x", "cost": 0, "category": "Manual"},
    ).status_code == 401


def test_legacy_activity_write_path_is_disabled():
    response = client.post(
        "/api/stops/1/activities",
        headers={"Authorization": "Bearer not-a-token"},
        json={"name": "Legacy", "cost": 1, "category": "Manual"},
    )
    assert response.status_code == 401


def test_upload_rejects_html_with_image_mime():
    response = client.post(
        "/api/uploads/images",
        files={"file": ("photo.jpg", b"<html>not an image</html>", "image/jpeg")},
    )
    assert response.status_code == 401


def test_invalid_timezone_is_rejected():
    with pytest.raises(ValueError):
        StopSchema(city_name="Nowhere", timezone="Asia/FakeCity")


def test_registration_rate_limit_returns_retry_after(monkeypatch):
    _rate_limit_events.clear()


@pytest.mark.parametrize(
    ("content_type", "filename", "contents"),
    [
        ("image/jpeg", "../../evil.jpg", b"\xff\xd8\xff\x00"),
        ("image/png", "unicode-\u65e5\u672c.png", b"\x89PNG\r\n\x1a\n"),
        ("image/gif", "space name.gif", b"GIF89a"),
        ("image/webp", "wrong-extension.txt", b"RIFFxxxxWEBP"),
    ],
)
def test_valid_uploads_use_safe_generated_names(tmp_path, monkeypatch, content_type, filename, contents):
    monkeypatch.setattr("main.UPLOAD_DIR", str(tmp_path))
    result = asyncio.run(
        save_uploaded_image(
            UploadFile(filename=filename, file=BytesIO(contents), headers={"content-type": content_type})
        )
    )
    saved = Path(result.removeprefix("/uploads/"))
    assert saved.name == Path(saved.name).name
    assert (tmp_path / saved.name).exists()


def test_upload_matrix_rejects_empty_and_oversized(monkeypatch, tmp_path):
    monkeypatch.setattr("main.UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr("main.MAX_UPLOAD_BYTES", 3)
    with pytest.raises(HTTPException) as empty_error:
        asyncio.run(
            save_uploaded_image(
                UploadFile(filename="empty.jpg", file=BytesIO(b""), headers={"content-type": "image/jpeg"})
            )
        )
    assert empty_error.value.status_code == 400
    with pytest.raises(HTTPException) as large_error:
        asyncio.run(
            save_uploaded_image(
                UploadFile(filename="large.jpg", file=BytesIO(b"\xff\xd8\xff\x00"), headers={"content-type": "image/jpeg"})
            )
        )
    assert large_error.value.status_code == 413
    for index in range(10):
        response = client.post(
            "/register",
            json={"username": f"rate-limit-{index}", "password": "StrongPassword123!"},
        )
        assert response.status_code in (201, 400)
    limited = client.post(
        "/register",
        json={"username": "rate-limit-final", "password": "StrongPassword123!"},
    )
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "60"
    _rate_limit_events.clear()
