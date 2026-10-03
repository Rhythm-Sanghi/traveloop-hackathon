import sqlite3

import auth


def test_password_hash_round_trip():
    hashed = auth.get_password_hash("Correct Horse Battery Staple")

    assert auth.verify_password("Correct Horse Battery Staple", hashed)
    assert not auth.verify_password("wrong password", hashed)


def test_user_registration_rejects_duplicate_user(monkeypatch, tmp_path):
    database_path = tmp_path / "auth.sqlite3"
    monkeypatch.setattr(auth, "DB_PATH", str(database_path))
    auth.init_db()

    assert auth.register_user("traveler", "password-one")
    assert not auth.register_user("traveler", "password-two")

    with sqlite3.connect(database_path) as connection:
        row = connection.execute(
            "SELECT username, hashed_password FROM users WHERE username = ?",
            ("traveler",),
        ).fetchone()

    assert row[0] == "traveler"
    assert auth.verify_password("password-one", row[1])


def test_password_update_replaces_hash(monkeypatch, tmp_path):
    database_path = tmp_path / "auth.sqlite3"
    monkeypatch.setattr(auth, "DB_PATH", str(database_path))
    auth.init_db()
    assert auth.register_user("traveler", "password-one")

    assert auth.reset_user_password("traveler", "password-two")
    assert auth.verify_password("password-two", auth.get_user_by_username("traveler")["hashed_password"])
