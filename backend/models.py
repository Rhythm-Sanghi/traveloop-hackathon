from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    start_date = Column(String)
    end_date = Column(String)
    owner_id = Column(Integer)
    is_public = Column(Integer, default=1) # 1 for True, 0 for False
    likes = Column(Integer, default=0)
    total_budget = Column(Float, default=0.0) # Added for budget breakdown comparison
    image_url = Column(String, nullable=True) # Standardized name for trip cover photo

    # This allows you to easily fetch all stops for a trip later
    stops = relationship("Stop", back_populates="trip", cascade="all, delete-orphan")
    itinerary = relationship("TripStop", back_populates="trip", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="trip", cascade="all, delete-orphan")

class Stop(Base):
    __tablename__ = "stops"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    arrival_date = Column(String)
    departure_date = Column(String)
    trip_id = Column(Integer, ForeignKey("trips.id"))

    trip = relationship("Trip", back_populates="stops")
    activities = relationship("Activity", back_populates="stop", cascade="all, delete-orphan")

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    cost = Column(Float, default=0.0)
    category = Column(String) # e.g., Transport, Food, Sightseeing
    stop_id = Column(Integer, ForeignKey("stops.id"))

    stop = relationship("Stop", back_populates="activities")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    phone = Column(String)
    city = Column(String)
    country = Column(String)
    additional_info = Column(Text, nullable=True)

class TripStop(Base):
    __tablename__ = "trip_stops"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    city_name = Column(String, nullable=False)
    arrival_date = Column(String)
    departure_date = Column(String)
    budget = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    activities = Column(JSON, default=list, nullable=True)

    trip = relationship("Trip", back_populates="itinerary")
    notes = relationship("Note", back_populates="trip_stop", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), index=True)
    trip_stop_id = Column(Integer, ForeignKey("trip_stops.id"), nullable=True)
    title = Column(String)
    content = Column(Text)
    created_at = Column(String)
    day_info = Column(String, nullable=True)

    trip = relationship("Trip", back_populates="notes")
    trip_stop = relationship("TripStop", back_populates="notes")

# Update Trip model to include notes
# I need to add 'notes' relationship to Trip as well.