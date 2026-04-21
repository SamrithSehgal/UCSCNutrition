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
    id = Column(Integer, primary_key=True, index=True)
    diningId = Column(Integer, ForeignKey("dining_halls.id"))
    mealId = Column(Integer)  # 1=breakfast 2=lunch 3=dinner 5=late night 6=after11am 7=menu 8=all day
    date = Column(Date)
    dining_hall = relationship("DiningHall", back_populates="meals")
    meal_items = relationship("MealMenuItem", back_populates="meal")

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    serving_size = Column(String)
    calories = Column(Float)
    total_fat = Column(Float)
    saturated_fat = Column(Float)
    trans_fat = Column(Float)
    cholesterol = Column(Float)
    sodium = Column(Float)
    total_carbohydrate = Column(Float)
    dietary_fiber = Column(Float)
    total_sugars = Column(Float)
    protein = Column(Float)
    vitamin_d = Column(Float)
    calcium = Column(Float)
    iron = Column(Float)
    potassium = Column(Float)
    ingredients = Column(String)
    allergens = Column(String)
    meal_appearances = relationship("MealMenuItem", back_populates="menu_item")

class MealMenuItem(Base):
    __tablename__ = "meal_menu_items"
    meal_id = Column(Integer, ForeignKey("meals.id"), primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), primary_key=True)
    meal = relationship("Meal", back_populates="meal_items")
    menu_item = relationship("MenuItem", back_populates="meal_appearances")
