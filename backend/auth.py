import sqlite3
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

#Load variables from .env file into the environment
load_dotenv()

#Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-just-in-case")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "traveloop.db")

#Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    """Hashes a plain-text password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

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
    except JWTError:
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

#Initialize the database on module load
init_db()

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