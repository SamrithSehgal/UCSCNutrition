from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from db.models.models import DiningHall, Meal, MenuItem
from db.models.userModels import User, JournalEntry
from db.seed import seed
from scraping import getData
from database import get_db
from db.dbFuncs import postUser as db_postUser, saveOnboarding as db_saveOnboarding
from db.dbFuncs import getMealIds, getMenuItem, getMealsByDate as db_getMealsByDate, addToMeal as db_addToMeal, deleteFromJournal as db_deleteFromJournal, getJournalTotals as db_getJournalTotals, getJournalByDate as db_getJournalByDate, getUserGoals as db_getUserGoals, getDHMenu as db_getDHMenu
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
            ]
            for sql in migrations:
                db.execute(text(sql))
            db.commit()
        except Exception:
            db.rollback()

        # Trigram index for fast fuzzy name search
        try:
            db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            db.execute(text(
                "CREATE INDEX IF NOT EXISTS menu_items_name_trgm "
                "ON menu_items USING gin (name gin_trgm_ops)"
            ))
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
def getDHMenuRoute(dining_hall: str, date: str = None):
    return db_getDHMenu({"dining_hall": dining_hall, "date": date})

@app.get('/api/getUserGoals')
def getUserGoalsRoute(email: str):
    return db_getUserGoals(email)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
