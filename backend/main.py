import datetime
import os
import time
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from decimal import Decimal
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, condecimal
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, get_db
import models
import json
from providers import PlacesProviderUnavailable, get_places_provider

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def seed_group_catalog(db: Session):
    if db.query(models.GroupCatalog).count() > 0:
        return

    groups = [
        models.GroupCatalog(
            id=1,
            name="Photography Junkies",
            member_count=31500,
            cover_image="https://images.unsplash.com/photo-1452723312111-3a7d0db0e024?auto=format&fit=crop&w=400&q=80"
        ),
        models.GroupCatalog(
            id=2,
            name="Hidden Gems",
            member_count=22100,
            cover_image="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80"
        ),
        models.GroupCatalog(
            id=4,
            name="Solo Backpackers",
            member_count=45200,
            cover_image="https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=400&q=80"
        ),
        models.GroupCatalog(
            id=5,
            name="Luxury Europe",
            member_count=12800,
            cover_image="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80"
        )
    ]
    db.add_all(groups)
    db.commit()


#Import functions from auth.py
from auth import (
    register_user,
    get_user_by_username,
    verify_password,
    create_access_token,
    decode_access_token,
    get_password_hash,
    reset_user_password,
    delete_user
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Seed reference rows after Alembic has created the application schema."""
    db = SessionLocal()
    try:
        seed_group_catalog(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Hackathon API", lifespan=lifespan)

_rate_limit_events = defaultdict(deque)
_upload_owners = {}
_rate_limits = {
    "/login": (10, 60),
    "/register": (10, 60),
    "/api/search/places": (30, 60),
    "/api/uploads/images": (20, 60),
    "/api/auth/change-password": (5, 60),
    "/api/community/comments": (20, 60),
}

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ALLOWED_UPLOAD_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_SIZE", str(5 * 1024 * 1024)))

async def save_uploaded_image(file: UploadFile = File(...)) -> str:
    """Validates and stores a user-uploaded image file, returning a local URL."""
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded")

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPG, PNG, GIF, and WebP images are allowed")

    filename = os.path.basename(file.filename)
    name, ext = os.path.splitext(filename)
    safe_name = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in name)
    safe_ext = ext.lower() if ext.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"} else ".png"
    saved_name = f"{safe_name or 'upload'}-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}{safe_ext}"

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Upload exceeds 5MB limit")
    signatures = {
        "image/jpeg": (b"\xff\xd8\xff",),
        "image/png": (b"\x89PNG\r\n\x1a\n",),
        "image/gif": (b"GIF87a", b"GIF89a"),
        "image/webp": (b"RIFF",),
    }
    if not any(contents.startswith(signature) for signature in signatures[content_type]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded content does not match the declared image type",
        )
    if content_type == "image/webp" and contents[8:12] != b"WEBP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded content does not match the declared image type",
        )

    path = os.path.join(UPLOAD_DIR, saved_name)
    with open(path, "wb") as fh:
        fh.write(contents)

    return f"/uploads/{saved_name}"

# CORS Middleware MUST be added FIRST to intercept all requests before 404 errors
# Supports local development and deployed frontends via environment configuration.
def _split_env_list(value: Optional[str], default: Optional[List[str]] = None) -> List[str]:
    if value is None:
        return default or []
    return [item.strip() for item in value.split(',') if item.strip()]

origins = _split_env_list(
    os.getenv("CORS_ORIGINS"),
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request, call_next):
    limit_config = _rate_limits.get(request.url.path)
    if limit_config:
        limit, window = limit_config
        client_key = request.client.host if request.client else "unknown"
        if os.getenv("APP_ENV") == "test":
            client_key = request.headers.get("x-test-client", client_key)
        key = (client_key, request.url.path)
        now = time.monotonic()
        events = _rate_limit_events[key]
        while events and events[0] <= now - window:
            events.popleft()
        if len(events) >= limit:
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(window)},
            )
            return response
        events.append(now)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    )
    return response

#OAuth2 scheme for token extraction from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

#Pydantic Models
class UserSchema(BaseModel):
    username: str
    password: str

class PasswordChangeSchema(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: int = 0

class ProfileSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    city: str
    country: str
    additional_info: Optional[str] = None
    avatar_url: Optional[str] = None

class ActivityInput(BaseModel):
    name: str
    cost: float = 0.0
    category: str = "Uncategorized"
    activity_date: Optional[str] = None
    timezone: Optional[str] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value):
        if value in (None, ""):
            return value
        if len(value) > 64:
            raise ValueError("Timezone identifier is too long")
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Timezone must be a valid IANA identifier") from exc
        return value

class StopSchema(BaseModel):
    city_name: str
    arrival_date: Optional[str] = None
    departure_date: Optional[str] = None
    budget: Optional[float] = 0.0
    description: Optional[str] = None
    activities: Optional[List[ActivityInput]] = None
    timezone: Optional[str] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value):
        if value in (None, ""):
            return value
        if len(value) > 64:
            raise ValueError("Timezone identifier is too long")
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Timezone must be a valid IANA identifier") from exc
        return value

    @field_validator('description', mode='before')
    @classmethod
    def ensure_description_is_str(cls, v):
        if v is None or isinstance(v, list):
            return ""
        return str(v)

class ItinerarySchema(BaseModel):
    stops: List[StopSchema]
    version: Optional[int] = None

# Detailed Trip Schemas for nested responses
class ActivitySchema(BaseModel):
    id: Optional[int] = None
    name: str
    cost: float
    category: str = "Uncategorized"
    activity_date: Optional[str] = None
    timezone: Optional[str] = None

    class Config:
        from_attributes = True

def _canonical_activity_payload(activity: models.Activity) -> Dict[str, Any]:
    return {
        "id": activity.id,
        "name": activity.name,
        "cost": activity.cost or 0.0,
        "category": activity.category or "Uncategorized",
        "activity_date": activity.activity_date,
        "timezone": activity.timezone,
        "position": activity.position,
    }

def _canonical_activities(db: Session, stop_id: int) -> List[Dict[str, Any]]:
    activities = db.query(models.Activity).filter(
        models.Activity.trip_stop_id == stop_id
    ).order_by(models.Activity.position.asc(), models.Activity.id.asc()).all()
    return [_canonical_activity_payload(activity) for activity in activities]

class StopResponseSchema(BaseModel):
    id: int
    city_name: str
    arrival_date: str
    departure_date: str
    timezone: Optional[str] = None
    budget: float = 0.0
    description: Optional[str] = None
    activities: List[ActivitySchema]

    class Config:
        from_attributes = True

    @field_validator('description', mode='before')
    @classmethod
    def ensure_description_is_str_res(cls, v):
        if v is None or isinstance(v, list):
            return ""
        return str(v)

class NoteCreateSchema(BaseModel):
    trip_id: int
    trip_stop_id: Optional[int] = None
    title: str
    content: str
    day_info: Optional[str] = None

class ExpenseCreateSchema(BaseModel):
    trip_id: int
    stop_id: Optional[int] = None
    activity_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="General", min_length=1, max_length=80)
    amount: condecimal(ge=Decimal("0"), max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    expense_date: str
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value):
        return value.upper()

class ExpenseUpdateSchema(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, min_length=1, max_length=80)
    amount: Optional[condecimal(ge=Decimal("0"), max_digits=12, decimal_places=2)] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    expense_date: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class TripBudget(BaseModel):
    total_cost: float
    total_budget: float
    breakdown: Dict[str, float]

class TripDetailSchema(BaseModel):
    id: int
    name: str
    start_date: str
    end_date: str
    total_budget: float = 0.0
    currency: str = "USD"
    image_url: Optional[str] = None
    stops: List[StopResponseSchema]
    budget: TripBudget
    is_settled: int = 0

    class Config:
        from_attributes = True

class TripResponse(BaseModel):
    id: int
    name: str
    start_date: str
    end_date: str
    is_public: int
    likes: int
    image_url: Optional[str] = None
    currency: str = "USD"
    is_settled: int = 0

    class Config:
        from_attributes = True

#Security Dependency
#Security Dependency
async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """
    Dependency that extracts the token, decodes it, and retrieves the user.
    Raises a 401 HTTPException if anything is invalid.
    """
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = get_user_by_username(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def admin_required(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Dependency that ensures the current user has admin privileges.
    Raises 403 Forbidden if not an admin.
    """
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges"
        )
    return current_user

#Auth Routes
@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserSchema):
    """Registers a new user using the auth module."""
    success = register_user(user_data.username, user_data.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    return {"message": "User registered successfully"}

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticates a user and returns a JWT access token."""
    user = get_user_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={
        "sub": user["username"],
        "is_admin": user.get("is_admin", 0)
    })
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_admin": user.get("is_admin", 0)
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Returns a minimal health response for the API and database."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        print(f"Health check failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable"
        )

@app.get("/api/auth/me")
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated user identity from the server-side JWT claims."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "is_admin": bool(current_user.get("is_admin", 0))
    }

@app.post("/api/auth/change-password")
async def change_password(
    password_data: PasswordChangeSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Changes the authenticated user's password after verifying the current one."""
    if not verify_password(password_data.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    if not reset_user_password(current_user["username"], password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update password",
        )
    return {"message": "Password updated successfully"}

@app.delete("/api/account")
async def delete_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently deletes the authenticated account and owned application data."""
    user_id = current_user["id"]
    owned_trips = db.query(models.Trip).filter(models.Trip.owner_id == user_id).all()
    trip_ids = [trip.id for trip in owned_trips]

    if trip_ids:
        db.query(models.CommunityComment).filter(
            models.CommunityComment.post_type == "trip",
            models.CommunityComment.target_id.in_(trip_ids),
        ).delete(synchronize_session=False)
        for trip in owned_trips:
            db.delete(trip)

    owned_posts = db.query(models.CommunityPost).filter(models.CommunityPost.author_id == user_id).all()
    post_ids = [post.id for post in owned_posts]
    if post_ids:
        db.query(models.CommunityComment).filter(
            models.CommunityComment.post_type == "post",
            models.CommunityComment.target_id.in_(post_ids),
        ).delete(synchronize_session=False)
        db.query(models.CommunityPost).filter(models.CommunityPost.id.in_(post_ids)).delete(synchronize_session=False)

    db.query(models.CommunityComment).filter(models.CommunityComment.author_id == user_id).delete(synchronize_session=False)
    db.query(models.DiscussionReply).filter(models.DiscussionReply.author_id == user_id).delete(synchronize_session=False)
    db.query(models.GroupMessage).filter(models.GroupMessage.author_id == user_id).delete(synchronize_session=False)
    db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).delete(synchronize_session=False)
    db.query(models.GroupMembership).filter(models.GroupMembership.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserFollow).filter(models.UserFollow.follower_id == user_id).delete(synchronize_session=False)
    db.query(models.UserBookmark).filter(models.UserBookmark.user_id == user_id).delete(synchronize_session=False)
    db.query(models.UserLike).filter(models.UserLike.user_id == user_id).delete(synchronize_session=False)
    db.commit()

    if not delete_user(current_user["username"]):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account data was removed, but the authentication record could not be deleted",
        )
    return {"message": "Account deleted successfully"}

@app.post("/api/uploads/images")
async def upload_image(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Stores a user-uploaded image and returns the static URL for the client."""
    url = await save_uploaded_image(file)
    _upload_owners[url] = current_user["id"]
    return {"url": url, "filename": os.path.basename(url)}

@app.get("/api/profile", response_model=Dict[str, Any])
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the user profile. If it doesn't exist, returns default values
    linked to the authenticated user's account info.
    """
    try:
        profile = db.query(models.UserProfile).filter(
            models.UserProfile.user_id == current_user["id"]
        ).first()
        
        if not profile:
            return {
                "first_name": "",
                "last_name": "",
                "email": current_user["username"] if "@" in current_user["username"] else "",
                "phone": "",
                "city": "",
                "country": "",
                "additional_info": "",
                "avatar_url": "",
                "username": current_user["username"]
            }

        return {
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "email": profile.email,
            "phone": profile.phone,
            "city": profile.city,
            "country": profile.country,
            "additional_info": profile.additional_info,
            "avatar_url": profile.avatar_url,
            "username": current_user["username"]
        }
    except Exception as e:
        print(f"Database error in get_profile: {e}")
        return {
            "first_name": "",
            "last_name": "",
            "email": "",
            "phone": "",
            "city": "",
            "country": "",
            "additional_info": "",
            "avatar_url": "",
            "username": current_user["username"]
        }

@app.post("/api/profile", status_code=status.HTTP_200_OK)
async def save_profile(
    profile_data: ProfileSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates or updates a user profile.
    """
    user_id = current_user["id"]
    if profile_data.avatar_url:
        owner_id = _upload_owners.get(profile_data.avatar_url)
        if owner_id is not None and owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this upload")
    
    # Check if profile already exists
    existing_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == user_id
    ).first()
    
    if existing_profile:
        # Update existing profile
        existing_profile.first_name = profile_data.first_name
        existing_profile.last_name = profile_data.last_name
        existing_profile.email = profile_data.email
        existing_profile.phone = profile_data.phone
        existing_profile.city = profile_data.city
        existing_profile.country = profile_data.country
        existing_profile.additional_info = profile_data.additional_info
        existing_profile.avatar_url = profile_data.avatar_url or existing_profile.avatar_url
    else:
        # Create new profile
        new_profile = models.UserProfile(
            user_id=user_id,
            first_name=profile_data.first_name,
            last_name=profile_data.last_name,
            email=profile_data.email,
            phone=profile_data.phone,
            city=profile_data.city,
            country=profile_data.country,
            additional_info=profile_data.additional_info,
            avatar_url=profile_data.avatar_url
        )
        db.add(new_profile)
    
    db.commit()
    return {"message": "Profile updated successfully"}

@app.post("/api/trips/{trip_id}/itinerary", status_code=status.HTTP_200_OK)
async def save_itinerary(
    trip_id: int,
    itinerary_data: ItinerarySchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates or updates an itinerary for a trip.
    Deletes existing stops and bulk-inserts new ones.
    """
    try:
        # Verify that the trip belongs to the current user
        trip = db.query(models.Trip).filter(
            models.Trip.id == trip_id,
            models.Trip.owner_id == current_user["id"]
        ).first()
        
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found or you do not have permission to edit it."
            )
        
        if itinerary_data.version is not None and itinerary_data.version != trip.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This trip was changed elsewhere. Reload the latest itinerary before saving.",
            )

        # Remove canonical activities first because bulk stop deletion bypasses ORM cascades.
        existing_stop_ids = [
            stop.id for stop in db.query(models.TripStop.id).filter(models.TripStop.trip_id == trip_id).all()
        ]
        if existing_stop_ids:
            db.query(models.Activity).filter(models.Activity.trip_stop_id.in_(existing_stop_ids)).delete(
                synchronize_session=False
            )

        # Delete existing stops for this trip
        db.query(models.TripStop).filter(models.TripStop.trip_id == trip_id).delete()
        
        # Bulk-insert new stops
        for stop in itinerary_data.stops:
            # Task 1 Fix: Ensure activities is a list, not a string
            activities_data = stop.activities
            
            # If Pydantic already parsed it to a list of models, convert to list of dicts
            if isinstance(activities_data, list):
                # Check if elements are ActivityInput objects (Pydantic models)
                processed_activities = []
                for act in activities_data:
                    if hasattr(act, 'dict'):
                        processed_activities.append(act.dict())
                    else:
                        processed_activities.append(act)
            elif isinstance(activities_data, str):
                import json
                processed_activities = json.loads(activities_data)
            else:
                processed_activities = []

            new_stop = models.TripStop(
                trip_id=trip_id,
                city_name=stop.city_name,
                arrival_date=stop.arrival_date,
                departure_date=stop.departure_date,
                budget=stop.budget or 0.0,
                description=stop.description,
                timezone=stop.timezone,
                activities=[]
            )
            db.add(new_stop)
            db.flush()
            for position, activity in enumerate(processed_activities):
                if not isinstance(activity, dict) or not activity.get("name"):
                    raise HTTPException(status_code=422, detail="Every activity must have a name")
                db.add(models.Activity(
                    name=str(activity["name"]),
                    cost=float(activity.get("cost") or 0),
                    category=str(activity.get("category") or "Uncategorized"),
                    trip_stop_id=new_stop.id,
                    position=position,
                    activity_date=activity.get("activity_date"),
                    timezone=activity.get("timezone"),
                ))
        
        trip.version += 1
        db.commit()
        return {"message": "Itinerary saved successfully", "version": trip.version}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(f"Error saving itinerary: {e}")
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/api/trips/{trip_id}/itinerary", response_model=Dict[str, Any])
async def get_itinerary(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the itinerary (stops) for a specific trip.
    The trip must belong to the authenticated user.
    """
    # Verify that the trip belongs to the current user
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user["id"]
    ).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you do not have permission to view it."
        )
    
    # Fetch all stops for this trip, sorted by arrival_date (chronological order)
    stops = db.query(models.TripStop).filter(
        models.TripStop.trip_id == trip_id
    ).order_by(models.TripStop.arrival_date.asc()).all()
    
    # Format stops for the frontend
    formatted_stops = []
    for stop in stops:
        acts = _canonical_activities(db, stop.id)
        
        formatted_stops.append({
            "id": stop.id,
            "city_name": stop.city_name,
            "arrival_date": stop.arrival_date,
            "departure_date": stop.departure_date,
            "timezone": stop.timezone,
            "budget": stop.budget,
            "description": stop.description,
            "activities": acts
        })
    
    return {
        "trip_id": trip.id,
        "name": trip.name,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "stops": formatted_stops,
        "image_url": trip.image_url,
        "total_budget": trip.total_budget or 0.0,
        "currency": trip.currency or "USD",
        "is_settled": trip.is_settled or 0,
        "is_public": trip.is_public,
        "version": trip.version,
    }

#Protected Route
@app.get("/secure-data")
async def secure_data(current_user: Dict[str, Any] = Depends(get_current_user)):
    """A protected route that only authenticated users can access."""
    return {
        "message": "Access granted to secure hackathon data!",
        "user_id": current_user["id"],
        "username": current_user["username"]
    }

# Pydantic schema for the input
class TripCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    total_budget: float = 0.0
    image_url: Optional[str] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value):
        return value.upper()

class StopCreate(BaseModel):
    city_name: str
    arrival_date: str
    departure_date: str

class ActivityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    cost: float
    category: str

    @field_validator('cost')
    @classmethod
    def cost_must_be_positive(cls, value):
        if value < 0:
            raise ValueError('Cost cannot be negative')
        return value

@app.post("/api/trips", status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: TripCreate, 
    current_user: Dict[str, Any] = Depends(get_current_user), # <--- Your auth file at work!
    db: Session = Depends(get_db)
):
    """Creates a new trip and links it to the logged-in user."""
    
    new_trip = models.Trip(
        name=trip_data.name,
        start_date=trip_data.start_date, 
        end_date=trip_data.end_date,
        owner_id=current_user["id"],
        is_public=0,
        total_budget=trip_data.total_budget,
        image_url=trip_data.image_url,
        currency=trip_data.currency
    )
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    return {"message": "Trip created!", "trip_id": new_trip.id}

@app.get("/api/search")
async def search_trip_activities(
    q: Optional[str] = None,
    category: Optional[str] = None,
    cost: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Builds search results from the user's real trip itinerary data."""
    query = (q or "").strip().lower()
    category_filter = (category or "All").strip()
    cost_filter = (cost or "All").strip()

    trips = db.query(models.Trip).filter(models.Trip.owner_id == current_user["id"]).all()
    results = []

    for trip in trips:
        stop_items = trip.itinerary or []
        for stop in stop_items:
            for activity in stop.canonical_activities:
                name = (activity.name or "").strip()
                if not name:
                    continue

                activity_category = activity.category or "Sightseeing"
                price = float(activity.cost or 0.0)
                normalized_category = activity_category.strip() or "Sightseeing"
                category_lower = normalized_category.lower()
                if category_lower in {"food", "foodie"}:
                    normalized_category = "Foodie"
                elif category_lower == "relaxation":
                    normalized_category = "Relaxation"
                elif category_lower == "adventure":
                    normalized_category = "Adventure"
                elif category_lower == "culture":
                    normalized_category = "Culture"
                elif category_lower == "sightseeing":
                    normalized_category = "Sightseeing"

                cost_bucket = "Budget"
                if price >= 250:
                    cost_bucket = "Luxury"
                elif price >= 75:
                    cost_bucket = "Mid-range"

                if query and not (
                    query in name.lower()
                    or query in (stop.city_name or "").lower()
                    or query in (stop.description or "").lower()
                    or query in normalized_category.lower()
                ):
                    continue

                if category_filter != "All" and normalized_category.lower() != category_filter.lower():
                    continue

                if cost_filter != "All" and cost_bucket != cost_filter:
                    continue

                start_date = stop.arrival_date or trip.start_date
                end_date = stop.departure_date or trip.end_date
                duration_label = "Flexible"
                if start_date and end_date:
                    try:
                        start_dt = datetime.date.fromisoformat(start_date)
                        end_dt = datetime.date.fromisoformat(end_date)
                        diff_days = (end_dt - start_dt).days + 1
                        duration_label = f"{max(diff_days, 1)} day{'s' if diff_days != 1 else ''}"
                    except ValueError:
                        pass

                results.append({
                    "id": f"{trip.id}-{stop.id}-{activity.id}",
                    "title": name,
                    "category": normalized_category,
                    "description": (stop.description or f"Planned in {stop.city_name or trip.name}"),
                    "longDescription": f"Added to {trip.name} in {stop.city_name or 'your itinerary'} for an experience planned around {normalized_category.lower()} travel.",
                    "cost": cost_bucket,
                    "price": round(price, 2),
                    "duration": duration_label,
                    "image": trip.image_url or "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
                    "extraImages": [trip.image_url] if trip.image_url else [],
                    "rating": None,
                    "trip_id": trip.id,
                    "stop_id": stop.id,
                    "trip_name": trip.name,
                    "city_name": stop.city_name or ""
                })

    return sorted(results, key=lambda item: item["price"], reverse=True)

@app.get("/api/search/places")
async def search_places(
    q: str = "",
    limit: int = 10,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Searches an optional server-side places provider without exposing its key."""
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required")
    try:
        return get_places_provider().search_places(query, limit)
    except PlacesProviderUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Place search is temporarily unavailable. You can still add an activity manually.",
        ) from exc

@app.get("/api/trips", response_model=List[TripResponse])
async def get_all_trips(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all trips belonging to the logged-in user."""
    try:
        trips = db.query(models.Trip).filter(models.Trip.owner_id == current_user["id"]).all()
        # Return a list of trips formatted for the frontend
        return [
            {
                "id": trip.id,
                "name": trip.name,
                "start_date": trip.start_date,
                "end_date": trip.end_date,
                "is_public": trip.is_public,
                "likes": trip.likes,
                "image_url": trip.image_url,
                "is_settled": trip.is_settled or 0
            }
            for trip in trips
        ]
    except Exception as e:
        print(f"Database error in get_all_trips: {e}")
        return []

@app.post("/api/trips/{trip_id}/stops", status_code=status.HTTP_201_CREATED)
async def add_stop_to_trip(
    trip_id: int,
    stop_data: StopCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds a city stop to a specific trip."""
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id, 
        models.Trip.owner_id == current_user["id"]
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_stop = models.TripStop(
        city_name=stop_data.city_name,
        arrival_date=stop_data.arrival_date,
        departure_date=stop_data.departure_date,
        trip_id=trip.id
    )
    db.add(new_stop)
    db.commit()
    db.refresh(new_stop)
    return {"message": f"Added {new_stop.city_name} to trip!", "stop_id": new_stop.id}

@app.post("/api/trips/{trip_id}/itinerary/stops/{stop_id}/activities", status_code=status.HTTP_201_CREATED)
async def add_activity_to_trip_itinerary_stop(
    trip_id: int,
    stop_id: int,
    activity_data: ActivityCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds an activity to the canonical itinerary stop model."""
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user["id"]
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    stop = db.query(models.TripStop).filter(
        models.TripStop.id == stop_id,
        models.TripStop.trip_id == trip_id
    ).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    position = db.query(models.Activity).filter(models.Activity.trip_stop_id == stop.id).count()
    new_activity = models.Activity(
        name=activity_data.name.strip(),
        cost=float(activity_data.cost),
        category=(activity_data.category or "Sightseeing").strip() or "Sightseeing",
        trip_stop_id=stop.id,
        position=position,
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return {"message": "Activity added!", "activity": _canonical_activity_payload(new_activity), "stop_id": stop.id}

@app.post("/api/stops/{stop_id}/activities", status_code=status.HTTP_201_CREATED)
async def add_activity_to_stop(
    stop_id: int,
    activity_data: ActivityCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Legacy mutation path disabled in favor of canonical TripStop activities."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy stop activity writes are disabled; use the itinerary activity endpoint.",
    )

@app.get("/api/trips/{trip_id}", response_model=TripDetailSchema)
async def get_trip_details(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches a complete trip with nested stops and activities.
    Calculates total budget and breakdown by category for the frontend visualization.
    """
    # Fetch trip and verify ownership to ensure privacy
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id, 
        models.Trip.owner_id == current_user["id"]
    ).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trip not found or you do not have permission to view it."
        )

    # Core Logic: Budget Calculation
    # We aggregate costs across all stops and activities from both models for robustness
    total_cost = 0.0
    categories = ["Transport", "Food", "Sightseeing", "Accommodation"]
    category_breakdown = {cat: 0.0 for cat in categories}
    category_breakdown["Other"] = 0.0

    try:
        for stop in trip.itinerary:
            for activity in stop.canonical_activities:
                cost = float(activity.cost or 0.0)
                total_cost += cost
                cat = activity.category if activity.category in categories else "Other"
                category_breakdown[cat] += cost
                    
        # Format stops for frontend consumption
        formatted_stops = []
        source_stops = trip.itinerary if trip.itinerary else trip.stops
        
        for stop in source_stops:
            acts = [_canonical_activity_payload(activity) for activity in stop.canonical_activities]
                
            formatted_stops.append({
                "id": stop.id,
                "city_name": getattr(stop, 'city_name', ''),
                "arrival_date": getattr(stop, 'arrival_date', ''),
                "departure_date": getattr(stop, 'departure_date', ''),
                "timezone": getattr(stop, 'timezone', None),
                "budget": getattr(stop, 'budget', 0.0),
                "description": getattr(stop, 'description', '') if not isinstance(getattr(stop, 'description', ''), list) else '',
                "activities": acts
            })

        return {
            "id": trip.id,
            "name": trip.name,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "total_budget": trip.total_budget or 0.0,
            "image_url": trip.image_url,
            "currency": trip.currency or "USD",
            "stops": formatted_stops,
            "is_settled": trip.is_settled or 0,
            "budget": {
                "total_cost": round(total_cost, 2),
                "total_budget": trip.total_budget or 0.0,
                "breakdown": {k: round(v, 2) for k, v in category_breakdown.items()}
            }
        }
    except Exception as e:
        print(f"Error fetching trip: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": "Internal Server Error during budget calculation"}
        )

# Community & Public Routes
@app.get("/api/community/feed")
async def get_community_feed(page: int = 1, page_size: int = 50, db: Session = Depends(get_db)):
    """Fetches public trips and user community posts for the community feed."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    try:
        # 1. Fetch public trips
        trips = db.query(models.Trip).filter(models.Trip.is_public == 1).order_by(models.Trip.likes.desc()).all()
        
        feed_items = []
        for trip in trips:
            owner_username = f"Explorer #{trip.owner_id}"
            try:
                user_row = db.execute(text("SELECT username FROM users WHERE id = :id"), {"id": trip.owner_id}).fetchone()
                if user_row:
                    owner_username = user_row[0]
            except Exception:
                pass
            
            feed_items.append({
                "id": f"real-{trip.id}",
                "tripId": trip.id,
                "authorName": owner_username,
                "timestamp": f"{trip.start_date} to {trip.end_date}",
                "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={owner_username}",
                "image": trip.image_url or "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
                "title": trip.name or "Epic Voyage",
                "contentPreview": f"Check out my curated itinerary for {trip.name}! Cloned directly from my planner.",
                "likesCount": trip.likes or 0,
                "isRealTrip": True
            })
        
        # 2. Fetch custom community posts
        posts = db.query(models.CommunityPost).order_by(models.CommunityPost.id.desc()).all()
        for post in posts:
            feed_items.append({
                "id": f"post-{post.id}",
                "postId": post.id,
                "authorName": post.author_name,
                "timestamp": post.created_at,
                "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={post.author_name}",
                "image": post.image_url or "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?auto=format&fit=crop&w=800&q=80",
                "title": post.title,
                "contentPreview": post.content,
                "likesCount": post.likes or 0,
                "isRealTrip": False
            })
            
        # Sort feed items by likes count
        feed_items.sort(key=lambda x: x["likesCount"], reverse=True)
        start = (page - 1) * page_size
        return feed_items[start:start + page_size]
    except Exception as e:
        print(f"Error fetching community feed: {e}")
        return []

@app.get("/api/public/trips/{trip_id}")
async def get_public_itinerary(trip_id: int, db: Session = Depends(get_db)):
    """Fetches a trip's itinerary without authentication."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.is_public == 1).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or not public")
    
    stops = db.query(models.TripStop).filter(models.TripStop.trip_id == trip_id).order_by(models.TripStop.arrival_date.asc()).all()
    
    return {
        "trip_id": trip.id,
        "name": trip.name,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "stops": [{
            "id": s.id,
            "city_name": s.city_name,
            "arrival_date": s.arrival_date,
            "departure_date": s.departure_date,
            "budget": s.budget,
            "description": s.description,
            "activities": [_canonical_activity_payload(activity) for activity in s.canonical_activities]
        } for s in stops]
    }

@app.post("/api/trips/{trip_id}/clone")
async def clone_trip(
    trip_id: int, 
    current_user: Dict[str, Any] = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Clones a public trip into the authenticated user's account."""
    # Find the original trip
    original_trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not original_trip or (original_trip.is_public != 1 and original_trip.owner_id != current_user["id"]):
        raise HTTPException(status_code=404, detail="Original trip not found")
        
    # Create the new trip shell
    new_trip = models.Trip(
        name=f"Copy of {original_trip.name}",
        start_date=original_trip.start_date,
        end_date=original_trip.end_date,
        owner_id=current_user["id"],
        total_budget=original_trip.total_budget or 0.0,
        image_url=original_trip.image_url,
        currency=original_trip.currency or "USD",
        is_public=0,  # New copies are private by default
        is_settled=0,
        likes=0,
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    # Clone all stops
    original_stops = db.query(models.TripStop).filter(models.TripStop.trip_id == trip_id).all()
    for stop in original_stops:
        new_stop = models.TripStop(
            trip_id=new_trip.id,
            city_name=stop.city_name,
            arrival_date=stop.arrival_date,
            departure_date=stop.departure_date,
            budget=stop.budget,
            description=stop.description,
            timezone=stop.timezone,
            activities=[]
        )
        db.add(new_stop)
        db.flush()
        for activity in stop.canonical_activities:
            db.add(models.Activity(
                name=activity.name,
                cost=activity.cost,
                category=activity.category,
                trip_stop_id=new_stop.id,
                position=activity.position,
                activity_date=activity.activity_date,
                timezone=activity.timezone,
            ))
    
    db.commit()
    return {"message": "Trip cloned successfully!", "new_trip_id": new_trip.id}

@app.post("/api/trips/{trip_id}/like")
async def like_trip(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggles the like state for a trip while keeping counts derived from real records."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    like_record = db.query(models.UserLike).filter(
        models.UserLike.user_id == current_user["id"],
        models.UserLike.item_type == "trip",
        models.UserLike.target_id == trip_id
    ).first()

    if like_record:
        db.delete(like_record)
        db.commit()
        likes_count = db.query(models.UserLike).filter(
            models.UserLike.item_type == "trip",
            models.UserLike.target_id == trip_id
        ).count()
        return {"liked_by_me": False, "likes_count": likes_count, "likes": likes_count, "liked": False}

    new_like = models.UserLike(
        user_id=current_user["id"],
        item_type="trip",
        target_id=trip_id
    )
    db.add(new_like)
    db.commit()
    likes_count = db.query(models.UserLike).filter(
        models.UserLike.item_type == "trip",
        models.UserLike.target_id == trip_id
    ).count()
    return {"liked_by_me": True, "likes_count": likes_count, "likes": likes_count, "liked": True}

@app.post("/api/trips/{trip_id}/bookmark")
async def bookmark_trip(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a bookmark for a trip if it is not already present."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    bookmark = db.query(models.UserBookmark).filter(
        models.UserBookmark.user_id == current_user["id"],
        models.UserBookmark.item_type == "trip",
        models.UserBookmark.target_id == trip_id
    ).first()
    if bookmark:
        return {"bookmarked": True, "trip_id": trip_id}

    db.add(models.UserBookmark(user_id=current_user["id"], item_type="trip", target_id=trip_id))
    db.commit()
    return {"bookmarked": True, "trip_id": trip_id}

@app.delete("/api/trips/{trip_id}/bookmark")
async def unbookmark_trip(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Removes a bookmark from a trip."""
    bookmark = db.query(models.UserBookmark).filter(
        models.UserBookmark.user_id == current_user["id"],
        models.UserBookmark.item_type == "trip",
        models.UserBookmark.target_id == trip_id
    ).first()
    if not bookmark:
        return {"bookmarked": False, "trip_id": trip_id}

    db.delete(bookmark)
    db.commit()
    return {"bookmarked": False, "trip_id": trip_id}

@app.get("/api/me/bookmarks")
async def get_my_bookmarks(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the authenticated user's bookmark ids."""
    bookmarks = db.query(models.UserBookmark).filter(models.UserBookmark.user_id == current_user["id"]).all()
    response = {"trip": [], "post": []}
    for bookmark in bookmarks:
        if bookmark.item_type in response:
            response[bookmark.item_type].append(bookmark.target_id)
    return response

@app.put("/api/trips/{trip_id}/settle")
async def settle_trip(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggles the payment settlement status for a trip."""
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id, 
        models.Trip.owner_id == current_user["id"]
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.is_settled = 1 if (trip.is_settled or 0) == 0 else 0
    db.commit()
    db.refresh(trip)
    return {"message": "Trip settlement status updated", "is_settled": trip.is_settled}

@app.get("/api/admin/analytics/top-cities")
async def get_top_cities_analytics(
    admin: Dict[str, Any] = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """
    Returns platform-wide destination analytics for admin users only.
    """
    raw_sql = text("""
        SELECT ts.city_name,
               COUNT(DISTINCT ts.id) AS visit_count,
               COALESCE(SUM(a.cost), 0) AS total_revenue
        FROM trip_stops ts
        LEFT JOIN activities a ON a.trip_stop_id = ts.id
        GROUP BY ts.city_name
        ORDER BY visit_count DESC, total_revenue DESC
        LIMIT 5
    """)

    result = db.execute(raw_sql).fetchall()

    top_cities = []
    for row in result:
        top_cities.append({
            "city": row[0],
            "visits": row[1],
            "total_spent_by_users": row[2] or 0.0
        })

    return {"top_destinations": top_cities}

# Trip Notes Routes
@app.get("/api/notes")
async def get_notes(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches notes for a specific trip belonging to the user."""
    # Verify trip ownership
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    notes = db.query(models.Note).filter(models.Note.trip_id == trip_id).order_by(models.Note.id.desc()).all()
    return notes

class NoteUpdateSchema(BaseModel):
    title: str
    content: str
    day_info: Optional[str] = None

@app.post("/api/notes")
async def create_note(
    note_data: NoteCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new note for a trip."""
    # Verify trip ownership
    trip = db.query(models.Trip).filter(models.Trip.id == note_data.trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    import datetime
    new_note = models.Note(
        trip_id=note_data.trip_id,
        trip_stop_id=note_data.trip_stop_id,
        title=note_data.title,
        content=note_data.content,
        day_info=note_data.day_info,
        created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@app.put("/api/notes/{note_id}")
async def update_note(
    note_id: int,
    note_data: NoteUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates an existing note."""
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    # Verify trip ownership
    trip = db.query(models.Trip).filter(models.Trip.id == note.trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized to edit this note")
        
    note.title = note_data.title
    note.content = note_data.content
    note.day_info = note_data.day_info
    db.commit()
    db.refresh(note)
    return note

@app.delete("/api/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a specific note."""
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Verify trip ownership
    trip = db.query(models.Trip).filter(models.Trip.id == note.trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

# Expense Routes
def _expense_payload(expense: models.Expense) -> Dict[str, Any]:
    return {
        "id": expense.id,
        "trip_id": expense.trip_id,
        "stop_id": expense.stop_id,
        "activity_id": expense.activity_id,
        "title": expense.title,
        "category": expense.category,
        "amount": str(expense.amount),
        "currency": expense.currency,
        "expense_date": expense.expense_date,
        "notes": expense.notes,
        "created_at": expense.created_at,
        "updated_at": expense.updated_at,
    }

@app.get("/api/expenses")
async def get_expenses(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user["id"],
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    expenses = db.query(models.Expense).filter(
        models.Expense.trip_id == trip_id
    ).order_by(models.Expense.expense_date.desc(), models.Expense.id.desc()).all()
    return [_expense_payload(expense) for expense in expenses]

def _ics_escape(value: str) -> str:
    return str(value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

@app.get("/api/trips/{trip_id}/calendar.ics", response_class=PlainTextResponse)
async def export_trip_calendar(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user["id"],
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    events = []
    for stop in trip.itinerary:
        if not stop.arrival_date:
            continue
        start = stop.arrival_date.replace("-", "")
        end = (stop.departure_date or stop.arrival_date).replace("-", "")
        summary = _ics_escape(f"{trip.name}: {stop.city_name}")
        description = _ics_escape(stop.description or "")
        events.append(
            "\r\n".join([
                "BEGIN:VEVENT",
                f"UID:traveloop-trip-{trip.id}-stop-{stop.id}@traveloop",
                f"DTSTART;VALUE=DATE:{start}",
                f"DTEND;VALUE=DATE:{end}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "END:VEVENT",
            ])
        )
        for activity in stop.canonical_activities:
            if not activity.activity_date or "T" not in activity.activity_date or not stop.timezone:
                continue
            start_value = activity.activity_date.replace("-", "").replace(":", "")
            if start_value.endswith("Z"):
                start_value = start_value[:-1]
            events.append("\r\n".join([
                "BEGIN:VEVENT",
                f"UID:traveloop-trip-{trip.id}-activity-{activity.id}@traveloop",
                f"DTSTART;TZID={_ics_escape(stop.timezone)}:{start_value}",
                f"SUMMARY:{_ics_escape(f'{trip.name}: {activity.name}')}",
                f"DESCRIPTION:{_ics_escape(activity.category or '')}",
                "END:VEVENT",
            ]))
    calendar = "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Traveloop//Trip Calendar//EN",
        "CALSCALE:GREGORIAN",
        *events,
        "END:VCALENDAR",
        "",
    ])
    return PlainTextResponse(
        calendar,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="traveloop-trip-{trip.id}.ics"'},
    )

@app.post("/api/expenses", status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = db.query(models.Trip).filter(
        models.Trip.id == expense_data.trip_id,
        models.Trip.owner_id == current_user["id"],
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if expense_data.stop_id is not None and not db.query(models.TripStop).filter(
        models.TripStop.id == expense_data.stop_id,
        models.TripStop.trip_id == trip.id,
    ).first():
        raise HTTPException(status_code=400, detail="Stop does not belong to this trip")
    if expense_data.activity_id is not None and not db.query(models.Activity).join(
        models.TripStop,
        models.Activity.trip_stop_id == models.TripStop.id,
    ).filter(
        models.Activity.id == expense_data.activity_id,
        models.TripStop.trip_id == trip.id,
    ).first():
        raise HTTPException(status_code=400, detail="Activity does not belong to this trip")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    expense = models.Expense(
        trip_id=trip.id,
        stop_id=expense_data.stop_id,
        activity_id=expense_data.activity_id,
        title=expense_data.title,
        category=expense_data.category,
        amount=expense_data.amount,
        currency=expense_data.currency,
        expense_date=expense_data.expense_date,
        notes=expense_data.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)

@app.patch("/api/expenses/{expense_id}")
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(models.Expense).join(models.Trip).filter(
        models.Expense.id == expense_id,
        models.Trip.owner_id == current_user["id"],
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in expense_data.model_dump(exclude_unset=True).items():
        if field == "currency" and value is not None:
            value = value.upper()
        setattr(expense, field, value)
    expense.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.commit()
    db.refresh(expense)
    return _expense_payload(expense)

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(models.Expense).join(models.Trip).filter(
        models.Expense.id == expense_id,
        models.Trip.owner_id == current_user["id"],
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}

# Packing List Routes
class PackingItemSchema(BaseModel):
    name: str
    category: str = "General"

@app.get("/api/trips/{trip_id}/packing")
async def get_packing_items(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches all packing items for a trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return db.query(models.PackingItem).filter(models.PackingItem.trip_id == trip_id).all()

@app.post("/api/trips/{trip_id}/packing")
async def add_packing_item(
    trip_id: int,
    item_data: PackingItemSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds a new item to the trip packing list."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    new_item = models.PackingItem(
        name=item_data.name,
        category=item_data.category,
        trip_id=trip_id,
        is_packed=0
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.put("/api/packing/{item_id}/toggle")
async def toggle_packing_item(
    item_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggles the is_packed status of a packing item."""
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    trip = db.query(models.Trip).filter(models.Trip.id == item.trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized to edit this trip item")
    item.is_packed = 1 if (item.is_packed or 0) == 0 else 0
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/packing/{item_id}")
async def delete_packing_item(
    item_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a packing item."""
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    trip = db.query(models.Trip).filter(models.Trip.id == item.trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip item")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

@app.post("/api/trips/{trip_id}/packing/reset")
async def reset_packing_items(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resets all packing items for a trip to unchecked."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.query(models.PackingItem).filter(models.PackingItem.trip_id == trip_id).update({"is_packed": 0})
    db.commit()
    return {"message": "All items reset successfully"}

@app.post("/api/trips/{trip_id}/packing/weather-aware")
async def generate_weather_aware_packing(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates weather-aware packing suggestions based on stop destination cities."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Clear existing packing items for a fresh start
    db.query(models.PackingItem).filter(models.PackingItem.trip_id == trip_id).delete()
    db.commit()
    
    # Analyze stop city names for climate categorization
    stops = db.query(models.TripStop).filter(models.TripStop.trip_id == trip_id).all()
    cities = [s.city_name.lower() for s in stops] if stops else []
    
    has_cold = any(any(k in c for k in ["iceland", "alps", "swiss", "oslo", "cold", "winter", "london", "greenland", "sweden", "finland", "norway"]) for c in cities)
    has_warm = any(any(k in c for k in ["bali", "phuket", "beach", "hawaii", "amazon", "tropical", "sun", "summer", "mexico", "thailand", "caribbean", "miami"]) for c in cities)
    
    items = [
        {"name": "Passport & Visa", "category": "Documents"},
        {"name": "Travel Insurance Copy", "category": "Documents"},
        {"name": "Flight Tickets / Hotel Bookings", "category": "Documents"},
        {"name": "Universal Travel Adapter", "category": "Electronics"},
        {"name": "High-capacity Power Bank", "category": "Electronics"},
    ]
    
    if has_cold:
        items.extend([
            {"name": "Thermal Underwear (Layers)", "category": "Clothing"},
            {"name": "Windproof & Waterproof Heavy Jacket", "category": "Clothing"},
            {"name": "Warm Woolen Beanie & Gloves", "category": "Clothing"},
            {"name": "Heavy Fleece Sweater", "category": "Clothing"},
            {"name": "Sturdy Waterproof Walking Boots", "category": "Clothing"},
            {"name": "Insulated Travel Mug", "category": "Documents"}
        ])
    elif has_warm:
        items.extend([
            {"name": "UV Sunglasses & Sun Hat", "category": "Clothing"},
            {"name": "Swimwear / Rash Guard", "category": "Clothing"},
            {"name": "Light Breathable Linen Clothes", "category": "Clothing"},
            {"name": "Anti-slip Beach Sandals", "category": "Clothing"},
            {"name": "High-Protection Sunscreen (SPF 50+)", "category": "Documents"},
            {"name": "Waterproof Phone Pouch", "category": "Electronics"}
        ])
    else:
        # Temperate / City Urban default
        items.extend([
            {"name": "Comfortable Walking Sneakers", "category": "Clothing"},
            {"name": "Casual Layers (Light Jacket/Cardigan)", "category": "Clothing"},
            {"name": "Travel Umbrella / Rain Poncho", "category": "Clothing"},
            {"name": "Noise Cancelling Headphones", "category": "Electronics"},
            {"name": "Digital Travel Guidebook", "category": "Documents"}
        ])
        
    for item in items:
        db_item = models.PackingItem(
            name=item["name"],
            category=item["category"],
            trip_id=trip_id,
            is_packed=0
        )
        db.add(db_item)
    db.commit()
    
    return db.query(models.PackingItem).filter(models.PackingItem.trip_id == trip_id).all()

# Activity Search Integration
class SearchActivityInput(BaseModel):
    name: str
    cost: float = 0.0
    category: str = "Sightseeing"

@app.post("/api/trips/{trip_id}/itinerary/stops/{stop_id}/activities")
async def add_search_activity_to_stop(
    trip_id: int,
    stop_id: int,
    activity_data: SearchActivityInput,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Appends a curated experience to a canonical itinerary stop."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user["id"]).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    stop = db.query(models.TripStop).filter(models.TripStop.id == stop_id, models.TripStop.trip_id == trip_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    position = db.query(models.Activity).filter(models.Activity.trip_stop_id == stop.id).count()
    activity = models.Activity(
        name=activity_data.name.strip(),
        cost=activity_data.cost,
        category=activity_data.category.strip() or "Sightseeing",
        trip_stop_id=stop.id,
        position=position,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return {"message": "Activity added to stop", "activity": _canonical_activity_payload(activity)}


# Admin API Endpoints (Secured)
@app.get("/api/admin/overview")
async def get_admin_overview(
    admin: Dict[str, Any] = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Returns a real summary of the platform for admin use."""
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    active_users = db.execute(text("SELECT COUNT(DISTINCT user_id) FROM user_profiles")).scalar() or 0
    total_trips = db.query(models.Trip).count()
    public_trips = db.query(models.Trip).filter(models.Trip.is_public == 1).count()
    private_trips = total_trips - public_trips
    activity_count = db.query(models.Activity).filter(models.Activity.trip_stop_id.isnot(None)).count()
    destination_count = db.execute(text("SELECT COUNT(DISTINCT city_name) FROM trip_stops WHERE city_name IS NOT NULL AND city_name != ''")).scalar() or 0
    total_planned_value = db.execute(text("SELECT COALESCE(SUM(CAST(total_budget AS REAL)), 0) FROM trips")).scalar() or 0
    community_interactions = (
        db.execute(text("SELECT COUNT(*) FROM user_likes")).scalar() or 0
        + db.execute(text("SELECT COUNT(*) FROM user_bookmarks")).scalar() or 0
        + db.execute(text("SELECT COUNT(*) FROM community_comments")).scalar() or 0
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "trips": total_trips,
        "public_trips": public_trips,
        "private_trips": private_trips,
        "activities": activity_count,
        "destinations": destination_count,
        "total_planned_value": float(total_planned_value),
        "community_interactions": community_interactions,
    }

@app.get("/api/admin/users")
async def list_admin_users(
    admin: Dict[str, Any] = Depends(admin_required),
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
):
    """Lists users without exposing password hashes or secrets."""
    search_term = (search or "").strip()
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    offset = (page - 1) * page_size

    sql = """
        SELECT u.id, u.username, u.is_admin, up.first_name, up.last_name, up.email, up.avatar_url
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
    """
    params = {}
    if search_term:
        sql += " WHERE LOWER(u.username) LIKE :search OR LOWER(COALESCE(up.first_name, '')) LIKE :search OR LOWER(COALESCE(up.last_name, '')) LIKE :search OR LOWER(COALESCE(up.email, '')) LIKE :search "
        params["search"] = f"%{search_term.lower()}%"
    sql += " ORDER BY u.id DESC LIMIT :limit OFFSET :offset"
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(text(sql), params).fetchall()
    total = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0

    users = []
    for row in rows:
        first_name, last_name = row[3] or "", row[4] or ""
        full_name = f"{first_name} {last_name}".strip() or row[1]
        users.append({
            "id": row[0],
            "username": row[1],
            "is_admin": bool(row[2]),
            "name": full_name,
            "email": row[5] or f"{row[1]}@traveloop.com",
            "avatar_url": row[6] or f"https://api.dicebear.com/7.x/avataaars/svg?seed={row[1]}",
            "status": "admin" if row[2] else "active"
        })

    return {
        "items": users,
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": max((total + page_size - 1) // page_size, 1),
    }

@app.get("/api/admin/stats")
async def get_admin_stats(
    admin: Dict[str, Any] = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """
    Returns real system-wide stats.
    Only accessible by users with is_admin=1.
    """
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    total_trips = db.query(models.Trip).count()
    public_trips = db.query(models.Trip).filter(models.Trip.is_public == 1).count()
    active_trips = total_trips

    recent_users_raw = db.execute(text("""
        SELECT u.id, u.username, up.first_name, up.last_name, up.email 
        FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        ORDER BY u.id DESC 
        LIMIT 4
    """)).fetchall()
    
    recent_users = []
    for row in recent_users_raw:
        first = row[2] or ""
        last = row[3] or ""
        name = f"{first} {last}".strip() or row[1]
        recent_users.append({
            "id": row[0],
            "name": name,
            "email": row[4] or f"{row[1]}@traveloop.com",
            "status": "New" if row[0] % 2 == 0 else "Active",
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={row[1]}"
        })
        
    adoption_raw = db.execute(text("""
        SELECT COALESCE(category, 'Sightseeing') AS category_name, COUNT(*) AS activity_count
        FROM activities
        WHERE trip_stop_id IS NOT NULL
        GROUP BY category_name
    """)).fetchall()
    
    trip_adoption = [{"name": row[0], "value": row[1]} for row in adoption_raw]

    trends_raw = db.execute(text("""
        SELECT substr(start_date, 9, 2) as day_num, COUNT(*) as count
        FROM trips
        WHERE start_date IS NOT NULL AND start_date != ''
        GROUP BY day_num
        ORDER BY day_num ASC
        LIMIT 7
    """)).fetchall()

    trends = [{"day": row[0], "trips": row[1]} for row in trends_raw]

    return {
        "total_users": total_users,
        "active_trips": active_trips,
        "public_trips": public_trips,
        "system_status": "Operational",
        "last_backup": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "recent_users": recent_users,
        "trip_adoption": trip_adoption,
        "trends": trends
    }

# New Community and Sharing API Endpoints

class CommunityPostCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class CommentCreate(BaseModel):
    post_type: str  # 'trip' or 'post'
    target_id: int
    content: str

class ReplyCreate(BaseModel):
    content: str

class GroupMessageCreate(BaseModel):
    content: str

@app.post("/api/community/posts")
async def create_community_post(
    post_data: CommunityPostCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        new_post = models.CommunityPost(
            title=post_data.title,
            content=post_data.content,
            image_url=post_data.image_url,
            author_name=current_user["username"],
            author_id=current_user["id"],
            likes=0,
            created_at="Just now"
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        return {"message": "Post created successfully!", "post_id": new_post.id}
    except Exception as e:
        print(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail="Failed to create post")

@app.post("/api/community/posts/{post_id}/like")
async def like_community_post(
    post_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    like_record = db.query(models.UserLike).filter(
        models.UserLike.user_id == current_user["id"],
        models.UserLike.item_type == "post",
        models.UserLike.target_id == post_id
    ).first()
    
    if like_record:
        # Unlike
        db.delete(like_record)
        post.likes = max(0, (post.likes or 1) - 1)
        db.commit()
        return {"likes": post.likes, "liked": False}
    else:
        # Like
        new_like = models.UserLike(
            user_id=current_user["id"],
            item_type="post",
            target_id=post_id
        )
        db.add(new_like)
        post.likes = (post.likes or 0) + 1
        db.commit()
        return {"likes": post.likes, "liked": True}

@app.get("/api/community/comments")
async def get_comments(post_type: str, target_id: int, page: int = 1, page_size: int = 50, db: Session = Depends(get_db)):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    comments = db.query(models.CommunityComment).filter(
        models.CommunityComment.post_type == post_type,
        models.CommunityComment.target_id == target_id
    ).order_by(models.CommunityComment.id.asc()).all()
    start = (page - 1) * page_size
    return comments[start:start + page_size]

@app.post("/api/community/comments")
async def add_comment(
    comment_data: CommentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_comment = models.CommunityComment(
        post_type=comment_data.post_type,
        target_id=comment_data.target_id,
        author_name=current_user["username"],
        author_id=current_user["id"],
        content=comment_data.content,
        created_at="Just now"
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@app.post("/api/trips/{trip_id}/publish")
async def publish_trip(
    trip_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user["id"]
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip.is_public = 1 if (trip.is_public or 0) == 0 else 0
    db.commit()
    db.refresh(trip)
    return {"message": "Trip status updated", "is_public": trip.is_public}

@app.get("/api/community/groups")
async def get_groups(
    current_user: Dict[str, Any] = Depends(get_current_user),
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db)
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    memberships = {
        membership.group_id for membership in db.query(models.GroupMembership).filter(
            models.GroupMembership.user_id == current_user["id"]
        ).all()
    }

    groups = db.query(models.GroupCatalog).order_by(models.GroupCatalog.id.asc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    return [{
        "id": group.id,
        "name": group.name,
        "member_count": group.member_count or 0,
        "cover_image": group.cover_image,
        "joined": group.id in memberships,
    } for group in groups]

@app.post("/api/community/groups/{group_id}/toggle")
async def toggle_group(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == current_user["id"]
    ).first()
    
    if membership:
        db.delete(membership)
        db.commit()
        return {"joined": False}
    else:
        new_member = models.GroupMembership(
            group_id=group_id,
            user_id=current_user["id"]
        )
        db.add(new_member)
        db.commit()
        return {"joined": True}

@app.get("/api/community/follows")
async def get_follows(
    current_user: Dict[str, Any] = Depends(get_current_user),
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db)
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == current_user["id"]
    ).order_by(models.UserFollow.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [f.followed_name for f in follows]

@app.post("/api/community/follow/{followed_name}")
async def toggle_follow(
    followed_name: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == current_user["id"],
        models.UserFollow.followed_name == followed_name
    ).first()
    
    if follow:
        db.delete(follow)
        db.commit()
        return {"following": False}
    else:
        new_follow = models.UserFollow(
            follower_id=current_user["id"],
            followed_name=followed_name
        )
        db.add(new_follow)
        db.commit()
        return {"following": True}

@app.get("/api/community/discussions")
async def get_discussions(page: int = 1, page_size: int = 50, db: Session = Depends(get_db)):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    return db.query(models.Discussion).order_by(models.Discussion.id.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

@app.get("/api/community/discussions/{discussion_id}/replies")
async def get_discussion_replies(
    discussion_id: int,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    replies = db.query(models.DiscussionReply).filter(
        models.DiscussionReply.discussion_id == discussion_id
    ).order_by(models.DiscussionReply.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return replies

@app.post("/api/community/discussions/{discussion_id}/replies")
async def add_discussion_reply(
    discussion_id: int,
    reply_data: ReplyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    discussion = db.query(models.Discussion).filter(models.Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found")
    
    new_reply = models.DiscussionReply(
        discussion_id=discussion_id,
        author_name=current_user["username"],
        author_id=current_user["id"],
        content=reply_data.content,
        created_at="Just now"
    )
    discussion.reply_count += 1
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    return new_reply

@app.get("/api/community/bookmarks")
async def get_bookmarks(
    current_user: Dict[str, Any] = Depends(get_current_user),
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db)
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    bookmarks = db.query(models.UserBookmark).filter(
        models.UserBookmark.user_id == current_user["id"]
    ).order_by(models.UserBookmark.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    res = {"trip": [], "post": []}
    for b in bookmarks:
        if b.item_type in res:
            res[b.item_type].append(b.target_id)
    return res

@app.post("/api/community/bookmarks/{item_type}/{target_id}/toggle")
async def toggle_bookmark(
    item_type: str,
    target_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if item_type not in ["trip", "post"]:
        raise HTTPException(status_code=400, detail="Invalid item type")
        
    bookmark = db.query(models.UserBookmark).filter(
        models.UserBookmark.user_id == current_user["id"],
        models.UserBookmark.item_type == item_type,
        models.UserBookmark.target_id == target_id
    ).first()
    
    if bookmark:
        db.delete(bookmark)
        db.commit()
        return {"bookmarked": False}
    else:
        new_bookmark = models.UserBookmark(
            user_id=current_user["id"],
            item_type=item_type,
            target_id=target_id
        )
        db.add(new_bookmark)
        db.commit()
        return {"bookmarked": True}

@app.get("/api/community/groups/{group_id}/messages")
async def get_group_messages(
    group_id: int,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    messages = db.query(models.GroupMessage).filter(
        models.GroupMessage.group_id == group_id
    ).order_by(models.GroupMessage.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return messages

@app.post("/api/community/groups/{group_id}/messages")
async def add_group_message(
    group_id: int,
    msg_data: GroupMessageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_msg = models.GroupMessage(
        group_id=group_id,
        author_name=current_user["username"],
        author_id=current_user["id"],
        content=msg_data.content,
        created_at="Just now"
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@app.get("/api/community/likes")
async def get_likes(
    current_user: Dict[str, Any] = Depends(get_current_user),
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db)
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    likes = db.query(models.UserLike).filter(
        models.UserLike.user_id == current_user["id"]
    ).order_by(models.UserLike.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    res = {"trip": [], "post": []}
    for l in likes:
        if l.item_type in res:
            res[l.item_type].append(l.target_id)
    return res

@app.delete("/api/community/posts/{post_id}")
async def delete_community_post(
    post_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_name != current_user["username"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to delete this post")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
