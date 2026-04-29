from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from db.models.models import DiningHall, Meal, MenuItem, MealMenuItem
from db.models.userModels import User, JournalEntry, UserSettings
from db.seed import seed
from scraping import getData
from database import get_db
from db.dbFuncs import postUser as db_postUser, saveOnboarding as db_saveOnboarding
from db.dbFuncs import getMealIds, getMenuItem, getMealsByDate as db_getMealsByDate, addToMeal as db_addToMeal, deleteFromJournal as db_deleteFromJournal, getJournalTotals as db_getJournalTotals, getJournalByDate as db_getJournalByDate, getUserGoals as db_getUserGoals, getDHMenu as db_getDHMenu, getJournalRange as db_getJournalRange, getUserSettings as db_getUserSettings, updateUserSettings as db_updateUserSettings, getUserProfile as db_getUserProfile, updateUserProfile as db_updateUserProfile
from ai.aiFuncs import generateNutritionSummary
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Migrate users table — add columns introduced after initial schema
        try:
            migrations = [
                # journal_entries schema change: drop meal_id FK, add date
                "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS date DATE",
                "CREATE INDEX IF NOT EXISTS ix_journal_entries_date ON journal_entries (date)",
                # users onboarding goal columns
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_calories FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_total_fat FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_saturated_fat FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_trans_fat FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_cholesterol FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_sodium FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_total_carbohydrate FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_dietary_fiber FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_total_sugars FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_protein FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_vitamin_d FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_calcium FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_iron FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_potassium FLOAT",
                "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1",
                # user_settings — analytics onboarding + AI opt-in
                "CREATE TABLE IF NOT EXISTS user_settings (user_id INTEGER PRIMARY KEY REFERENCES users(user_id), analytics_onboarded BOOLEAN NOT NULL DEFAULT FALSE, ai_analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE)",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS analytics_onboarded BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme VARCHAR NOT NULL DEFAULT 'dark'",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS units_system VARCHAR NOT NULL DEFAULT 'imperial'",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_range VARCHAR NOT NULL DEFAULT '1W'",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS compact_view BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS metric_colors TEXT",
                # users — raw onboarding profile fields
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS height_ft INTEGER",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS height_in INTEGER",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_lbs FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_weight_lbs FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_change_rate FLOAT",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR",
            ]
            for sql in migrations:
                db.execute(text(sql))
            db.commit()
        except Exception:
            db.rollback()

        already_seeded = db.query(Meal).filter(Meal.date == date.today()).first()
        if not already_seeded:
            seed(getData())
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/postUser")
def postUser(data: dict):
    result = db_postUser(data)
    return {"status": "ok", "is_new": result["is_new"]}

@app.post("/api/saveOnboarding")
def saveOnboardingRoute(data: dict):
    db_saveOnboarding(data)
    return {"status": "ok"}

@app.post('/api/getMealIds')
def getMeals(data: dict):
    res = getMealIds(data)
    return {"status": "ok", "data": res}

@app.post('/api/getMenuItem')
def getItem(query: str):
    return getMenuItem(query)

@app.get('/api/getMealsByDate')
def getMealsByDateRoute(date: str):
    return db_getMealsByDate(date)

@app.post('/api/addToMeal')
def addToMealRoute(data: dict):
    db_addToMeal(data)
    return {"status": "ok"}

@app.post('/api/deleteFromMeal')
def deleteFromMealRoute(data: dict):
    db_deleteFromJournal(data)
    return {"status": "ok"}

@app.post('/api/getJournalTotals')
def getJournalTotalsRoute(data: dict):
    return db_getJournalTotals(data)

@app.post('/api/getJournalByDate')
def getJournalByDateRoute(data: dict):
    return db_getJournalByDate(data)

@app.get('/api/getDHMenu')
def getDHMenuRoute(date: str = None):
    return db_getDHMenu({"date": date})

@app.get('/api/getUserGoals')
def getUserGoalsRoute(email: str):
    return db_getUserGoals(email)

@app.post('/api/getJournalRange')
def getJournalRangeRoute(data: dict):
    return db_getJournalRange(data)

@app.post('/api/generateNutrientSummary')
def getSummary(data: dict):
    return generateNutritionSummary(data)

@app.get('/api/getUserSettings')
def getUserSettingsRoute(email: str):
    return db_getUserSettings(email)

@app.post('/api/updateUserSettings')
def updateUserSettingsRoute(data: dict):
    return db_updateUserSettings(data)

@app.get('/api/getUserProfile')
def getUserProfileRoute(email: str):
    return db_getUserProfile(email)

@app.post('/api/updateUserProfile')
def updateUserProfileRoute(data: dict):
    return db_updateUserProfile(data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
