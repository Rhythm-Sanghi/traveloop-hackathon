from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
import models
import json

# Create database tables
models.Base.metadata.create_all(bind=engine)

def sync_database():
    """Ensures the database schema matches the Python models for the hackathon."""
    with engine.connect() as conn:
        # Check if is_public exists in trips table
        try:
            conn.execute(text("SELECT is_public FROM trips LIMIT 1"))
        except Exception:
            print("Adding is_public column to trips table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN is_public INTEGER DEFAULT 1"))
            conn.commit()
            
        # Check if likes exists in trips table
        try:
            conn.execute(text("SELECT likes FROM trips LIMIT 1"))
        except Exception:
            print("Adding likes column to trips table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN likes INTEGER DEFAULT 0"))
            conn.commit()
        # Check if total_budget exists in trips table
        try:
            conn.execute(text("SELECT total_budget FROM trips LIMIT 1"))
        except Exception:
            print("Adding total_budget column to trips table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN total_budget FLOAT DEFAULT 250000.0"))
            conn.commit()
    print("Database Synced")

sync_database()

#Import functions from auth.py
from auth import (
    register_user,
    get_user_by_username,
    verify_password,
    create_access_token,
    decode_access_token
)

app = FastAPI(title="Hackathon API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#OAuth2 scheme for token extraction from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

#Pydantic Models
class UserSchema(BaseModel):
    username: str
    password: str

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

class ActivityInput(BaseModel):
    name: str
    cost: float = 0.0
    category: str = "Uncategorized"

class StopSchema(BaseModel):
    city_name: str
    arrival_date: Optional[str] = None
    departure_date: Optional[str] = None
    budget: Optional[float] = 0.0
    description: Optional[str] = None
    activities: Optional[List[ActivityInput]] = None

    @field_validator('description', mode='before')
    @classmethod
    def ensure_description_is_str(cls, v):
        if v is None or isinstance(v, list):
            return ""
        return str(v)

class ItinerarySchema(BaseModel):
    stops: List[StopSchema]

# Detailed Trip Schemas for nested responses
class ActivitySchema(BaseModel):
    id: Optional[int] = None
    name: str
    cost: float
    category: str = "Uncategorized"

    class Config:
        from_attributes = True

class StopResponseSchema(BaseModel):
    id: int
    city_name: str
    arrival_date: str
    departure_date: str
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
    image_url: Optional[str] = None
    stops: List[StopResponseSchema]
    budget: TripBudget

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
            additional_info=profile_data.additional_info
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
                activities=processed_activities
            )
            db.add(new_stop)
        
        db.commit()
        return {"message": "Itinerary saved successfully"}
        
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
        acts = stop.activities
        if isinstance(acts, str):
            try:
                import json
                acts = json.loads(acts)
            except:
                acts = []
        
        formatted_stops.append({
            "id": stop.id,
            "city_name": stop.city_name,
            "arrival_date": stop.arrival_date,
            "departure_date": stop.departure_date,
            "budget": stop.budget,
            "description": stop.description,
            "activities": acts if isinstance(acts, list) else []
        })
    
    return {
        "trip_id": trip.id,
        "name": trip.name,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "stops": formatted_stops,
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
        total_budget=trip_data.total_budget,
        image_url=trip_data.image_url
    )
    
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    return {"message": "Trip created!", "trip_id": new_trip.id}

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
                "image_url": trip.image_url
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

    new_stop = models.Stop(
        city_name=stop_data.city_name,
        arrival_date=stop_data.arrival_date,
        departure_date=stop_data.departure_date,
        trip_id=trip.id
    )
    db.add(new_stop)
    db.commit()
    db.refresh(new_stop)
    return {"message": f"Added {new_stop.city_name} to trip!", "stop_id": new_stop.id}

@app.post("/api/stops/{stop_id}/activities", status_code=status.HTTP_201_CREATED)
async def add_activity_to_stop(
    stop_id: int,
    activity_data: ActivityCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds an activity (with cost) to a specific stop."""
    # Fetch stop and check ownership via the linked Trip
    stop = db.query(models.Stop).filter(models.Stop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    
    if stop.trip.owner_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")

    new_activity = models.Activity(
        name=activity_data.name,
        cost=activity_data.cost,
        category=activity_data.category,
        stop_id=stop.id
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return {"message": "Activity added!", "activity_id": new_activity.id}

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
        # 1. From 'stops' and 'activities' tables
        for stop in trip.stops:
            for activity in stop.activities:
                cost = activity.cost or 0.0
                total_cost += cost
                cat = activity.category if activity.category in categories else "Other"
                category_breakdown[cat] += cost
        
        # 2. From 'trip_stops' (itinerary) JSON data
        for stop in trip.itinerary:
            if stop.activities:
                for activity in stop.activities:
                    # activity is a dict in TripStop model (JSON)
                    cost = float(activity.get('cost', 0)) if isinstance(activity, dict) else 0.0
                    total_cost += cost
                    
                    # Category mapping for JSON activities (default to Other if not specified)
                    cat = activity.get('category') if isinstance(activity, dict) else "Other"
                    if cat not in categories:
                        cat = "Other"
                    category_breakdown[cat] += cost
                    
        # Format stops for frontend consumption
        formatted_stops = []
        source_stops = trip.itinerary if trip.itinerary else trip.stops
        
        for stop in source_stops:
            acts = stop.activities
            if isinstance(acts, str):
                try:
                    acts = json.loads(acts)
                except Exception:
                    acts = []
            
            # Ensure activities is a list of dicts
            if not isinstance(acts, list):
                acts = []
                
            formatted_stops.append({
                "id": stop.id,
                "city_name": getattr(stop, 'city_name', ''),
                "arrival_date": getattr(stop, 'arrival_date', ''),
                "departure_date": getattr(stop, 'departure_date', ''),
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
            "stops": formatted_stops,
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
async def get_community_feed(db: Session = Depends(get_db)):
    """Fetches public trips for the community feed."""
    # Grouping logic would happen here, for now just returning all public trips
    try:
        trips = db.query(models.Trip).filter(models.Trip.is_public == 1).order_by(models.Trip.likes.desc()).all()
        
        return [{
            "id": trip.id,
            "name": trip.name,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "likes": trip.likes,
            "owner_id": trip.owner_id,
            "image_url": trip.image_url
        } for trip in trips]
    except Exception as e:
        print(f"Database error in get_community_feed: {e}")
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
            "activities": s.activities
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
    if not original_trip:
        raise HTTPException(status_code=404, detail="Original trip not found")
        
    # Create the new trip shell
    new_trip = models.Trip(
        name=f"Copy of {original_trip.name}",
        start_date=original_trip.start_date,
        end_date=original_trip.end_date,
        owner_id=current_user["id"],
        is_public=0 # New copies are private by default
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
            activities=stop.activities
        )
        db.add(new_stop)
    
    db.commit()
    return {"message": "Trip cloned successfully!", "new_trip_id": new_trip.id}

@app.post("/api/trips/{trip_id}/like")
async def like_trip(trip_id: int, db: Session = Depends(get_db)):
    """Increments the like count for a trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.likes += 1
    db.commit()
    return {"likes": trip.likes}

@app.get("/api/admin/analytics/top-cities")
async def get_top_cities_analytics(db: Session = Depends(get_db)):
    """
    Executes a complex raw SQL query to get platform-wide statistics.
    Perfect for an Admin Dashboard.
    """
    raw_sql = text("""
        SELECT 
            stops.city_name, 
            COUNT(DISTINCT stops.id) as visit_count, 
            SUM(activities.cost) as total_revenue
        FROM 
            stops
        LEFT JOIN 
            activities ON stops.id = activities.stop_id
        GROUP BY 
            stops.city_name
        ORDER BY 
            visit_count DESC, total_revenue DESC
        LIMIT 5;
    """)
    
    # Execute the raw SQL
    result = db.execute(raw_sql).fetchall()
    
    # Format the output
    top_cities = []
    for row in result:
        top_cities.append({
            "city": row[0],
            "visits": row[1],
            "total_spent_by_users": row[2] or 0.0 # Handle cases where there are no activities
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


# Admin API Endpoints (Secured)
@app.get("/api/admin/stats")
async def get_admin_stats(admin: Dict[str, Any] = Depends(admin_required)):
    """
    Sample admin endpoint that returns system stats.
    Only accessible by users with is_admin=1.
    """
    return {
        "total_users": 1250,
        "active_trips": 450,
        "system_status": "All Nodes Operational",
        "last_backup": "2026-05-10 04:00:00"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

