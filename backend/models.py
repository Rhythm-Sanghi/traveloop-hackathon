from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON, Numeric, Index
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(Text, unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_admin = Column(Integer, default=0)

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    start_date = Column(String)
    end_date = Column(String)
    owner_id = Column(Integer)
    is_public = Column(Integer, default=0) # default private; user must explicitly publish
    likes = Column(Integer, default=0)
    total_budget = Column(Float, default=0.0) # Added for budget breakdown comparison
    currency = Column(String(3), nullable=False, default="USD")
    image_url = Column(String, nullable=True) # Standardized name for trip cover photo
    version = Column(Integer, default=1, nullable=False)

    is_settled = Column(Integer, default=0) # 0 for False, 1 for True

    # This allows you to easily fetch all stops for a trip later
    stops = relationship("Stop", back_populates="trip", cascade="all, delete-orphan")
    itinerary = relationship("TripStop", back_populates="trip", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="trip", cascade="all, delete-orphan")
    packing_items = relationship("PackingItem", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")

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
    stop_id = Column(Integer, ForeignKey("stops.id"), nullable=True)
    trip_stop_id = Column(Integer, ForeignKey("trip_stops.id", ondelete="CASCADE"), nullable=True, index=True)
    position = Column(Integer, nullable=False, default=0)
    activity_date = Column(String, nullable=True)
    timezone = Column(String, nullable=True)

    stop = relationship("Stop", back_populates="activities")
    trip_stop = relationship("TripStop", foreign_keys=[trip_stop_id], back_populates="canonical_activities")

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
    avatar_url = Column(String, nullable=True)

class TripStop(Base):
    __tablename__ = "trip_stops"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    city_name = Column(String, nullable=False)
    arrival_date = Column(String)
    departure_date = Column(String)
    timezone = Column(String, nullable=True)
    budget = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    activities = Column(JSON, default=list, nullable=True)

    trip = relationship("Trip", back_populates="itinerary")
    notes = relationship("Note", back_populates="trip_stop", cascade="all, delete-orphan")
    canonical_activities = relationship(
        "Activity",
        foreign_keys="Activity.trip_stop_id",
        back_populates="trip_stop",
        cascade="all, delete-orphan",
        order_by="Activity.position",
    )

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

class PackingItem(Base):
    __tablename__ = "packing_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_packed = Column(Integer, default=0) # 0 for False, 1 for True
    category = Column(String, default="General")
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)

    trip = relationship("Trip", back_populates="packing_items")

class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_trip_date", "trip_id", "expense_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_id = Column(Integer, ForeignKey("trip_stops.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, default="General")
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    expense_date = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    trip = relationship("Trip", back_populates="expenses")

# Update Trip model to include notes
# I need to add 'notes' relationship to Trip as well.

class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    author_name = Column(String, nullable=False)
    author_id = Column(Integer, nullable=False)
    likes = Column(Integer, default=0)
    created_at = Column(String, nullable=False)

class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_type = Column(String, nullable=False)  # 'trip' or 'post'
    target_id = Column(Integer, nullable=False)
    author_name = Column(String, nullable=False)
    author_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)

class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)

class GroupCatalog(Base):
    __tablename__ = "group_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    member_count = Column(Integer, default=0)
    cover_image = Column(String, nullable=True)

class Discussion(Base):
    __tablename__ = "discussions"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    category = Column(String, nullable=False)
    reply_count = Column(Integer, default=0)

class DiscussionReply(Base):
    __tablename__ = "discussion_replies"

    id = Column(Integer, primary_key=True, index=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id"), nullable=False, index=True)
    author_name = Column(String, nullable=False)
    author_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)

class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, nullable=False)
    followed_name = Column(String, nullable=False)

class UserBookmark(Base):
    __tablename__ = "user_bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    item_type = Column(String, nullable=False)  # 'trip' or 'post'
    target_id = Column(Integer, nullable=False)

class GroupMessage(Base):
    __tablename__ = "group_messages"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, nullable=False, index=True)
    author_name = Column(String, nullable=False)
    author_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)

class UserLike(Base):
    __tablename__ = "user_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    item_type = Column(String, nullable=False)  # 'trip' or 'post'
    target_id = Column(Integer, nullable=False)