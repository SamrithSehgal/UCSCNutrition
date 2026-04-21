import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import date
from database import SessionLocal, engine, Base
from db.models.models import DiningHall, Meal, MenuItem, MealMenuItem
from sqlalchemy.exc import IntegrityError

MEAL_ID_MAP = {
    "Breakfast":  1,
    "Lunch":      2,
    "Dinner":     3,
    "Late+Night": 5,
    "After+11am": 6,
    "Menu":       7,
    "All":        8,
    "ALL":        8,
}

def seed(allFoodTree: dict):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    today = date.today()

    try:
        for place_name, meals in allFoodTree.items():
            dining_hall = db.query(DiningHall).filter_by(name=place_name).first()
            if not dining_hall:
                dining_hall = DiningHall(name=place_name)
                db.add(dining_hall)
                db.flush()

            for meal_name, items in meals.items():
                meal_id_num = MEAL_ID_MAP.get(meal_name)

                meal = Meal(
                    diningId=dining_hall.id,
                    mealId=meal_id_num,
                    date=today,
                )
                db.add(meal)
                db.flush()

                for item in items:
                    name = item.get("name", "")
                    if not name:
                        continue

                    menu_item = db.query(MenuItem).filter_by(name=name).first()
                    if not menu_item:
                        menu_item = MenuItem(
                            name=name,
                            serving_size=item.get("Serving Size"),
                            calories=item.get("Calories"),
                            total_fat=item.get("Total Fat"),
                            saturated_fat=item.get("Saturated Fat"),
                            trans_fat=item.get("Trans Fat"),
                            cholesterol=item.get("Cholesterol"),
                            sodium=item.get("Sodium"),
                            total_carbohydrate=item.get("Total Carbohydrate"),
                            dietary_fiber=item.get("Dietary Fiber"),
                            total_sugars=item.get("Total Sugars"),
                            protein=item.get("Protein"),
                            vitamin_d=item.get("Vitamin D"),
                            calcium=item.get("Calcium"),
                            iron=item.get("Iron"),
                            potassium=item.get("Potassium"),
                            ingredients=item.get("Ingredients"),
                            allergens=item.get("Allergens"),
                        )
                        db.add(menu_item)
                        db.flush()

                    try:
                        with db.begin_nested():
                            db.add(MealMenuItem(meal_id=meal.id, menu_item_id=menu_item.id))
                    except IntegrityError:
                        pass

        db.commit()
        print("Seeded successfully.")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
