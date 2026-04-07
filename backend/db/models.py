import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import Base
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship

class DiningHall(Base):
    __tablename__ = "dining_halls"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    meals = relationship("Meal", back_populates="dining_hall")

class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True)
    diningId = Column(Integer, ForeignKey("dining_halls.id"))
    mealId = Column(Integer) #1 = breakfast, 2 = lunch, 3 = dinner, 4 = late night
    date = Column(Date)
    dining_hall = relationship("DiningHall", back_populates="meals")
    menu_items = relationship("MenuItem", back_populates="meal")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    mealId = Column(Integer, ForeignKey("meals.id"))
    meal = relationship("Meal", back_populates="menu_items")

    name = Column(String, nullable=False)
    serving_size = Column(String)
    calories = Column(Float)

    # Macronutrients
    total_fat = Column(Float)
    saturated_fat = Column(Float)
    trans_fat = Column(Float)
    cholesterol = Column(Float)
    sodium = Column(Float)
    total_carbohydrate = Column(Float)
    dietary_fiber = Column(Float)
    total_sugars = Column(Float)
    protein = Column(Float)

    # Vitamins & minerals (stored as %DV numeric value)
    vitamin_d = Column(Float)
    calcium = Column(Float)
    iron = Column(Float)
    potassium = Column(Float)

    # Ingredients / allergens
    ingredients = Column(String)
    allergens = Column(String)
