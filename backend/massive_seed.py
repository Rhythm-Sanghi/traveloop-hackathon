import random
from auth import register_user, get_user_by_username
from database import SessionLocal
import models

# Data for randomization
CITIES = ["Tokyo", "London", "Bali", "Paris", "New York", "Rome", "Sydney", "Barcelona", "Berlin", "Seoul"]
CATEGORIES = ["Transport", "Food", "Sightseeing", "Accommodation"]
ACTIVITY_NAMES = {
    "Transport": ["Flight ticket", "Bullet Train", "Taxi to Airport", "Subway pass", "Private Transfer"],
    "Food": ["Sushi Omakase", "Street Food Crawl", "Rooftop Dinner", "Local Market Breakfast", "Wine Tasting"],
    "Sightseeing": ["Ancient Temple Tour", "Modern Art Gallery", "City Walking Tour", "Panoramic Lookout", "Island Boat Trip"],
    "Accommodation": ["Boutique Hotel", "Luxury Resort", "Traditional Ryokan", "City Apartment", "Cozy Villa"]
}

def seed_data():
    """Programmatically seeds the database with realistic hackathon demo data."""
    db = SessionLocal()
    print("Starting massive database seed...")

    # 1. Generate 10 Different Users
    user_ids = []
    for i in range(1, 11):
        username = f"traveler_{i}"
        password = "password123"
        # register_user handles password hashing and sqlite storage
        register_user(username, password)
        user = get_user_by_username(username)
        if user:
            user_ids.append(user['id'])
    
    print(f"Registered {len(user_ids)} users.")

    # 2. Generate 20 Trips across those users
    all_stop_ids = []
    for i in range(20):
        owner_id = random.choice(user_ids)
        city = random.choice(CITIES)
        
        new_trip = models.Trip(
            name=f"Adventure in {city}",
            start_date="2024-07-01",
            end_date="2024-07-10",
            owner_id=owner_id
        )
        db.add(new_trip)
        db.commit()
        db.refresh(new_trip)
        
        # Add 1-2 stops for each trip to make it multi-city
        for _ in range(random.randint(1, 2)):
            stop_city = random.choice(CITIES)
            new_stop = models.Stop(
                city_name=stop_city,
                arrival_date="2024-07-01",
                departure_date="2024-07-05",
                trip_id=new_trip.id
            )
            db.add(new_stop)
            db.commit()
            db.refresh(new_stop)
            all_stop_ids.append(new_stop.id)
            
    print(f"Generated 20 trips with associated stops.")

    # 3. Generate 100 Activities across all stops
    for i in range(100):
        stop_id = random.choice(all_stop_ids)
        category = random.choice(CATEGORIES)
        name = random.choice(ACTIVITY_NAMES[category])
        
        # Randomly generate a realistic cost
        cost = round(random.uniform(15.0, 450.0), 2)
        
        new_activity = models.Activity(
            name=f"{name} {i+1}",
            cost=cost,
            category=category,
            stop_id=stop_id
        )
        db.add(new_activity)
    
    db.commit()
    print(f"Created 100 activities with varied categories and costs.")
    print("Database seeding complete! Traveloop is now populated.")
    db.close()

if __name__ == "__main__":
    seed_data()
