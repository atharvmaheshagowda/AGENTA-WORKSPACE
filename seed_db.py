import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import models

def seed_database():
    engine = create_engine('sqlite:///productivity.db')
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Create User Profile for Gamification
    # Give them some initial XP and a level
    profile = models.UserProfile(
        xp=450,
        level=2
    )
    session.add(profile)
    session.commit()

    # Base current time
    now = datetime.utcnow()

    # 2. Add Completed Tasks (for Analytics/History)
    completed_tasks = [
        models.Task(title="Morning Workout", description="30 mins cardio", eisenhower_quadrant="Do First", is_completed=True, completed_at=now - timedelta(days=2), estimated_minutes=30),
        models.Task(title="Water the plants", description="Indoor and balcony", eisenhower_quadrant="Schedule", is_completed=True, completed_at=now - timedelta(days=1), estimated_minutes=15),
        models.Task(title="Call Mom", description="Weekly catch-up", eisenhower_quadrant="Do First", is_completed=True, completed_at=now - timedelta(hours=5), estimated_minutes=45),
    ]
    for ct in completed_tasks:
        session.add(ct)
    session.commit()

    # 3. Add Smart Dependencies (Blockers)
    # Task A blocks Task B
    groceries = models.Task(
        title="Buy Groceries", 
        description="Get vegetables, chicken, and milk",
        eisenhower_quadrant="Do First", 
        is_completed=False,
        estimated_minutes=45
    )
    session.add(groceries)
    session.commit() # Commit to get ID

    dinner = models.Task(
        title="Cook Dinner", 
        description="Meal prep for the week",
        eisenhower_quadrant="Do First", 
        is_completed=False,
        estimated_minutes=60,
        blocked_by_id=groceries.id
    )
    session.add(dinner)
    session.commit()

    # 4. Add Tasks for Eisenhower Matrix (All 4 Quadrants)
    matrix_tasks = [
        models.Task(title="Pay Electricity Bill", description="Due tomorrow!", eisenhower_quadrant="Do First", estimated_minutes=15),
        models.Task(title="Read a Book", description="Read at least 10 pages", eisenhower_quadrant="Schedule", estimated_minutes=30),
        models.Task(title="Organize Garage", description="Too much clutter", eisenhower_quadrant="Delegate", estimated_minutes=120),
        models.Task(title="Binge Watch TV Show", description="Just one more episode...", eisenhower_quadrant="Eliminate", estimated_minutes=180)
    ]
    for mt in matrix_tasks:
        session.add(mt)
    session.commit()

    # 5. Add a Task with Microsteps (AI Breakdown showcase)
    trip_task = models.Task(
        title="Plan Weekend Getaway",
        description="Relaxing trip to the mountains",
        eisenhower_quadrant="Schedule",
        estimated_minutes=120
    )
    session.add(trip_task)
    session.commit()

    microsteps = [
        models.MicroStep(task_id=trip_task.id, title="Research destinations", is_completed=True),
        models.MicroStep(task_id=trip_task.id, title="Book a hotel or Airbnb", is_completed=False),
        models.MicroStep(task_id=trip_task.id, title="Create an itinerary", is_completed=False),
        models.MicroStep(task_id=trip_task.id, title="Pack bags", is_completed=False),
    ]
    for step in microsteps:
        session.add(step)
    
    session.commit()

    print("Database successfully seeded with generic testing data!")

if __name__ == "__main__":
    seed_database()
