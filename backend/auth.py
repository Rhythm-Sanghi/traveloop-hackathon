import sqlite3
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from jwt import InvalidTokenError
from dotenv import load_dotenv
import hashlib
import secrets

#Load variables from .env file into the environment
load_dotenv()

#Configuration
APP_ENV = os.getenv("APP_ENV", "development").lower()
SECRET_KEY = os.getenv("SECRET_KEY")
if APP_ENV in {"production", "prod"} and (not SECRET_KEY or len(SECRET_KEY) < 32):
    raise RuntimeError("SECRET_KEY must be configured with at least 32 characters in production")
SECRET_KEY = SECRET_KEY or "development-only-traveloop-secret-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_database_url = os.getenv("DATABASE_URL", "")
DB_PATH = (
    _database_url.removeprefix("sqlite:///")
    if _database_url.startswith("sqlite:///")
    else os.path.join(BASE_DIR, "traveloop.db")
)

#Password hashing configuration
# Use a standard PBKDF2 implementation so auth works even when bcrypt is not
# available or has version incompatibilities in the runtime environment.

#Database Setup
def init_db():
    """Initializes the database and creates the users table if it doesn't exist."""
    with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0
            )
        """)
        conn.commit()

#Password Utilities
def get_password_hash(password: str) -> str:
    """Hashes a plain-text password using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2_sha256${salt.hex()}${derived.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a hashed version."""
    if not hashed_password:
        return False

    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            _, salt_hex, expected_hex = hashed_password.split("$")
            salt = bytes.fromhex(salt_hex)
            derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 200_000)
            return secrets.compare_digest(derived.hex(), expected_hex)
        except ValueError:
            return False

    # Maintain compatibility with bcrypt-hashed values from older environments.
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

#JWT Token Management
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a JWT access token with an expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    # Ensure is_admin is included if provided in data, else default to 0
    if "is_admin" not in to_encode:
        to_encode["is_admin"] = 0
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes a JWT token and returns the payload if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except InvalidTokenError:
        return None

#User Operations
def register_user(username: str, password: str) -> bool:
    """Registers a new user. Returns True if successful, False if username exists."""
    hashed_password = get_password_hash(password)
    try:
        with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
                (username, hashed_password)
            )
            conn.commit()
            return True
    except sqlite3.IntegrityError:
        #Username already exists
        return False

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user record from the database by username."""
    with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
        conn.row_factory = sqlite3.Row  #This allows accessing columns by name
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

def reset_user_password(username: str, new_password: str) -> bool:
    """Updates a user's password in the database."""
    hashed_password = get_password_hash(new_password)
    try:
        with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET hashed_password = ? WHERE username = ?",
                (hashed_password, username)
            )
            conn.commit()
            return cursor.rowcount > 0
    except Exception as e:
        print(f"Error resetting password: {e}")
        return False

def delete_user(username: str) -> bool:
    """Deletes the authentication record for a user."""
    try:
        with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE username = ?", (username,))
            conn.commit()
            return cursor.rowcount > 0
    except sqlite3.Error:
        return False

if __name__ == "__main__":
    #Quick sanity check/demo
    test_user = "hackathon_dev"
    test_pass = "securepassword123"
    
    print(f"Registering user '{test_user}'...")
    if register_user(test_user, test_pass):
        print("Registration successful!")
    else:
        print("User already exists.")
    
    print("\nFetching user...")
    user = get_user_by_username(test_user)
    if user and verify_password(test_pass, user['hashed_password']):
        print(f"Authentication successful for: {user['username']}")
        token = create_access_token(data={"sub": user['username']})
        print(f"Access Token: {token}")
    else:
        print("Authentication failed.")