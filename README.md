# CampusPlates

A full-stack nutrition tracking app built for UC Santa Cruz students. Browse real-time dining hall menus, log meals, and track macro/micronutrient intake against personalized goals.

Built with **React Native (Expo)** on the frontend and **FastAPI + PostgreSQL** on the backend. Menu data is scraped daily from UCSC's official nutrition site across all 14 campus dining locations.

---

## Features

### Menu Browser
Browse menus for all 5 dining halls and 9 cafes/markets. Each item shows full nutrition info — calories, protein, carbs, fat, serving size, and allergens. The app auto-selects the current meal (Breakfast/Lunch/Dinner) based on time of day.

### Food Journal
Log what you eat across four meal slots (Breakfast, Lunch, Dinner, Snacks). Add items directly from the menu browser or search the full database. See a live calorie count with a progress ring against your daily goal, plus a macro breakdown (P/C/F).

### Personalized Goals
During onboarding, the app collects your body metrics (sex, age, height, weight) and fitness goal (gain/lose/maintain). It then calculates 14 daily nutrition targets

### Analytics
View your nutrition trends across four time windows: 1 Week, 1 Month, 6 Months, and 1 Year. The analytics page shows average daily calories, a bar chart (with smart bucketing — daily for short ranges, weekly/monthly for longer ones), macro cards with progress bars, and a full micro breakdown (sodium, sugar, sat fat, cholesterol, Vitamin D, calcium, iron, potassium).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native 0.83 · Expo 55 · Expo Router (file-based routing) |
| **State** | React Context API (drawer nav, menu cache, auth) |
| **Auth** | Firebase Auth · Google Sign-In (UCSC domain-restricted) |
| **Backend** | Python · FastAPI · Uvicorn |
| **Database** | PostgreSQL · SQLAlchemy ORM |
| **Scraping** | BeautifulSoup4 · Requests |
| **Build** | EAS (Expo Application Services) for iOS and Android |

---

## Architecture

```
UCSC Nutrition Website
        |
   [ Web Scraper ]  ← runs on server startup, parses HTML nutrition labels
        |
   [ PostgreSQL ]   ← 6 tables: users, dining_halls, meals, menu_items,
        |              meal_menu_items (junction), journal_entries
   [ FastAPI ]      ← 12 REST endpoints (auth, menus, journal, analytics)
        |
   [ React Native ] ← Expo Router, Context API, custom animated drawer
```

**Data flow:** The scraper hits UCSC's nutrition site daily, parses each item's full nutrition label (HTML table → structured data), and seeds the database. The mobile app fetches menus and journal data via the API. Nutrition goals are calculated server-side from user metrics during onboarding.

---

## Database Schema

```
users
  ├── user_id (PK)
  ├── email (UNIQUE)
  ├── first_name, family_name
  ├── onboarding_complete
  └── 14 goal columns (calories, protein, fat, carbs, fiber, sodium, ...)

dining_halls
  ├── id (PK)
  └── name (UNIQUE)

meals
  ├── id (PK)
  ├── diningId → dining_halls.id
  ├── mealId (1=Breakfast, 2=Lunch, 3=Dinner, 5=Late Night, ...)
  └── date

menu_items
  ├── id (PK)
  ├── name (UNIQUE)
  ├── serving_size, calories
  ├── 12 nutrition fields (fat, protein, carbs, fiber, sodium, ...)
  └── ingredients, allergens

meal_menu_items (junction)
  ├── meal_id → meals.id
  └── menu_item_id → menu_items.id

journal_entries
  ├── id (PK)
  ├── user_id → users.user_id
  ├── date
  ├── meal_num (1-4)
  └── menu_id → menu_items.id
```

---

## Project Structure

```
backend/
  main.py               FastAPI app, routes, startup lifecycle
  scraping.py           UCSC dining site scraper (14 locations)
  database.py           SQLAlchemy engine + session config
  db/
    dbFuncs.py          Query functions (journal, goals, analytics)
    seed.py             Populates DB from scraped data
    models/
      models.py         DiningHall, Meal, MenuItem, MealMenuItem
      userModels.py     User, JournalEntry

frontend/
  app/
    index.jsx           Login screen (Google OAuth)
    api.js              HTTP client (get, post, timeout handling)
    drawerContext.js    Drawer navigation state
    menuContext.js      Shared menu data cache
    hooks/
      useAuthState.js   Firebase auth listener
    styles/
      dashboard.styles.js   Color palette + component styles
    (app)/
      _layout.jsx       App shell (custom animated drawer + stack nav)
      dashboard.jsx     Food journal + calorie tracking
      menus.jsx         Dining hall browser
      analytics.jsx     Nutrition analytics (1W/1M/6M/1Y)
      menu/
        [hall].jsx      Dining hall detail + add-to-journal
      onboarding/
        activity.jsx    Step 1: activity level
        details.jsx     Step 2: body metrics
        goals.jsx       Step 3: weight goal slider
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/postUser` | Register or check user |
| `POST` | `/api/saveOnboarding` | Calculate + save nutrition goals |
| `GET` | `/api/getUserGoals` | Get user's 14 daily targets |
| `GET` | `/api/getDHMenu` | Get all menus for a date |
| `POST` | `/api/getMenuItem` | Search menu items by name |
| `POST` | `/api/addToMeal` | Log food to journal |
| `POST` | `/api/deleteFromMeal` | Remove food from journal |
| `POST` | `/api/getJournalByDate` | Get all logged items for a day |
| `POST` | `/api/getJournalTotals` | Get daily macro/micro sums |
| `POST` | `/api/getJournalRange` | Get aggregated stats for a date range |

---

## Built by

Samrith Sehgal — UC Santa Cruz
