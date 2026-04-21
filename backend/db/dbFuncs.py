from database import SessionLocal, engine, Base
from db.models.models import DiningHall, Meal, MenuItem, MealMenuItem
from db.models.userModels import User, JournalEntry
from sqlalchemy import func
from datetime import datetime as dt, date as date_type

def postUser(data):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == data['email']).first()
        if existing:
            return {"is_new": False}
        user = User(
            email=data['email'],
            first_name=data['givenName'],
            family_name=data['familyName'],
        )
        db.add(user)
        db.commit()
        return {"is_new": True}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def _calculate_goals(activity_level, sex, age, height_ft, height_in, weight_lbs, goal_weight_lbs, weight_change_rate):
    """
    Calculate daily nutrition goals from user profile.

    Formulas used:
      - BMR:      Mifflin-St Jeor equation
      - TDEE:     BMR × activity factor (Ainsworth scale)
      - Calorie goal: TDEE ± (rate × 500 kcal/day) for gain/loss
      - Macros:   AMDR midpoints; protein floored by 0.8 g/kg body weight
      - Fiber:    DRI by sex and age
      - Micros:   FDA %DV reference intakes; iron adjusted for sex/age
    """
    # ── Unit conversions ────────────────────────────────────────────
    weight_kg  = weight_lbs  * 0.453592
    height_cm  = (height_ft * 12 + height_in) * 2.54

    # ── Mifflin-St Jeor BMR ─────────────────────────────────────────
    if sex == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    # ── TDEE ────────────────────────────────────────────────────────
    activity_factors = {
        "sedentary":      1.2,
        "lightly_active": 1.375,
        "active":         1.55,
        "very_active":    1.725,
    }
    tdee = bmr * activity_factors.get(activity_level, 1.375)

    # ── Calorie goal ────────────────────────────────────────────────
    # 1 lb/week ≈ 500 kcal/day surplus or deficit
    if weight_change_rate is not None:
        direction = -1 if goal_weight_lbs < weight_lbs else 1
        calorie_adjustment = direction * weight_change_rate * 500
    else:
        calorie_adjustment = 0  # maintenance

    goal_calories = max(1200, round(tdee + calorie_adjustment))

    # ── Macronutrients (AMDR) ────────────────────────────────────────
    # Protein: 25 % of calories, floored at 0.8 g/kg (DRI minimum)
    protein_g = max(goal_calories * 0.25 / 4, weight_kg * 0.8)

    # Fat: 30 % of calories
    fat_g = goal_calories * 0.30 / 9

    # Carbohydrate: fills remaining calories; min 130 g/day (DRI)
    carb_g = max((goal_calories - protein_g * 4 - fat_g * 9) / 4, 130)

    # Saturated fat: < 10 % of calories (DGAC 2020)
    sat_fat_g = goal_calories * 0.10 / 9

    # Trans fat: WHO recommends < 1 % of total energy from trans fat.
    # Natural trans fats (dairy, meat) make 0 g unrealistic; this gives
    # the lowest achievable amount still within health guidelines.
    trans_fat_g = round(goal_calories * 0.01 / 9, 1)

    # Cholesterol: 300 mg (FDA Daily Value)
    cholesterol_mg = 300.0

    # Sodium: 2300 mg (FDA / AHA upper limit)
    sodium_mg = 2300.0

    # Dietary fiber (DRI by sex and age)
    if sex == "male":
        fiber_g = 30 if age >= 51 else 38
    else:
        fiber_g = 21 if age >= 51 else 25

    # Total sugars: < 10 % of calories as added-sugar proxy (DGAC 2020)
    sugars_g = goal_calories * 0.10 / 4

    # ── Micronutrients as % Daily Value ─────────────────────────────
    # Vitamin D: 100 %DV = 20 mcg (FDA); universal goal
    vitamin_d_pct = 100.0

    # Calcium: 100 %DV = 1300 mg (FDA); universal goal
    calcium_pct = 100.0

    # Iron: FDA DV = 18 mg; actual need varies
    #   Men of all ages and women ≥ 51:  8 mg  →  44 % of 18 mg DV
    #   Women < 51:                      18 mg → 100 % of 18 mg DV
    if sex == "male" or age >= 51:
        iron_pct = round(8 / 18 * 100)   # ≈ 44 %
    else:
        iron_pct = 100.0

    # Potassium: 100 %DV = 4700 mg (FDA); universal goal
    potassium_pct = 100.0

    return {
        "goal_calories":           round(goal_calories),
        "goal_total_fat":          round(fat_g,      1),
        "goal_saturated_fat":      round(sat_fat_g,  1),
        "goal_trans_fat":          trans_fat_g,
        "goal_cholesterol":        cholesterol_mg,
        "goal_sodium":             sodium_mg,
        "goal_total_carbohydrate": round(carb_g,     1),
        "goal_dietary_fiber":      float(fiber_g),
        "goal_total_sugars":       round(sugars_g,   1),
        "goal_protein":            round(protein_g,  1),
        "goal_vitamin_d":          vitamin_d_pct,
        "goal_calcium":            calcium_pct,
        "goal_iron":               float(iron_pct),
        "goal_potassium":          potassium_pct,
    }


def saveOnboarding(data):
    goals = _calculate_goals(
        activity_level    = data['activity_level'],
        sex               = data['sex'],
        age               = int(data['age']),
        height_ft         = int(data['height_ft']),
        height_in         = int(data['height_in']),
        weight_lbs        = float(data['weight']),
        goal_weight_lbs   = float(data['goal_weight']),
        weight_change_rate= float(data['weight_change_rate']) if data.get('weight_change_rate') is not None else None,
    )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == data['email']).first()
        if not user:
            raise ValueError(f"User not found: {data['email']}")
        for field, value in goals.items():
            setattr(user, field, value)
        user.onboarding_complete = True
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def getMealIds(data):
    date = dt.strptime(data["date"], "%Y-%m-%d").date()

    db = SessionLocal()
    try:
        items = db.query(Meal).filter(Meal.date == date).all()
        return [item.id for item in items]
    finally:
        db.close()


def getMenuItem(query: str):
    db = SessionLocal()
    try:
        results = (
            db.query(MenuItem)
            .filter(MenuItem.name.ilike(f"%{query}%"))
            .limit(30)
            .all()
        )
        return [
            {
                "id": r.id,
                "name": r.name,
                "serving_size": r.serving_size,
                "calories": r.calories,
                "total_fat": r.total_fat,
                "saturated_fat": r.saturated_fat,
                "trans_fat": r.trans_fat,
                "cholesterol": r.cholesterol,
                "sodium": r.sodium,
                "total_carbohydrate": r.total_carbohydrate,
                "dietary_fiber": r.dietary_fiber,
                "total_sugars": r.total_sugars,
                "protein": r.protein,
                "vitamin_d": r.vitamin_d,
                "calcium": r.calcium,
                "iron": r.iron,
                "potassium": r.potassium,
                "allergens": r.allergens,
            }
            for r in results
        ]
    finally:
        db.close()


def getMealsByDate(date_str: str):
    db = SessionLocal()
    try:
        date = dt.strptime(date_str, "%Y-%m-%d").date()
        meals = db.query(Meal).filter(Meal.date == date).all()
        # Returns {mealTypeId: meal_pk_id}  e.g. {1: 13, 2: 14, 3: 15, 4: 16}
        return {m.mealId: m.id for m in meals}
    finally:
        db.close()


def deleteFromJournal(data):
    user_email   = data['user_email']
    meal_num     = data['meal_num']
    menu_item_id = data['menu_item_id']
    date         = dt.strptime(data['date'], "%Y-%m-%d").date()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise ValueError(f"User not found: {user_email}")
        db.query(JournalEntry).filter(
            JournalEntry.user_id  == user.user_id,
            JournalEntry.date     == date,
            JournalEntry.meal_num == meal_num,
            JournalEntry.menu_id  == menu_item_id,
        ).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def addToMeal(data):
    user_email   = data['user_email']
    date         = dt.strptime(data['date'], "%Y-%m-%d").date()
    meal_num     = data['meal_num']       # 1–4
    menu_item_id = data['menu_item_id']

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise ValueError(f"User not found: {user_email}")
        entry = JournalEntry(
            user_id=user.user_id,
            date=date,
            meal_num=meal_num,
            menu_id=menu_item_id,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def getUserGoals(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {}
        return {
            'goal_calories':             user.goal_calories,
            'goal_total_fat':            user.goal_total_fat,
            'goal_saturated_fat':        user.goal_saturated_fat,
            'goal_trans_fat':            user.goal_trans_fat,
            'goal_cholesterol':          user.goal_cholesterol,
            'goal_sodium':               user.goal_sodium,
            'goal_total_carbohydrate':   user.goal_total_carbohydrate,
            'goal_dietary_fiber':        user.goal_dietary_fiber,
            'goal_total_sugars':         user.goal_total_sugars,
            'goal_protein':              user.goal_protein,
            'goal_vitamin_d':            user.goal_vitamin_d,
            'goal_calcium':              user.goal_calcium,
            'goal_iron':                 user.goal_iron,
            'goal_potassium':            user.goal_potassium,
        }
    finally:
        db.close()


def getJournalByDate(data):
    user_email = data['user_email']
    date       = dt.strptime(data['date'], "%Y-%m-%d").date()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return {"1": [], "2": [], "3": [], "4": []}

        entries = (
            db.query(JournalEntry, MenuItem)
            .join(MenuItem, MenuItem.id == JournalEntry.menu_id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date    == date,
            )
            .all()
        )

        result = {"1": [], "2": [], "3": [], "4": []}
        seen = set()   # deduplicate repeated inserts for the same food/meal_num
        for entry, item in entries:
            key = (entry.meal_num, item.id)
            if key in seen:
                continue
            seen.add(key)
            bucket = str(entry.meal_num)
            if bucket not in result:
                continue
            result[bucket].append({
                "id":                 item.id,
                "name":               item.name,
                "serving_size":       item.serving_size,
                "calories":           item.calories,
                "total_fat":          item.total_fat,
                "saturated_fat":      item.saturated_fat,
                "trans_fat":          item.trans_fat,
                "cholesterol":        item.cholesterol,
                "sodium":             item.sodium,
                "total_carbohydrate": item.total_carbohydrate,
                "dietary_fiber":      item.dietary_fiber,
                "total_sugars":       item.total_sugars,
                "protein":            item.protein,
                "vitamin_d":          item.vitamin_d,
                "calcium":            item.calcium,
                "iron":               item.iron,
                "potassium":          item.potassium,
                "allergens":          item.allergens,
            })

        return result
    finally:
        db.close()

def getJournalRange(data):
    db = SessionLocal()
    userEmail = data["email"]
    start = dt.strptime(data['start'], "%Y-%m-%d").date()
    end   = dt.strptime(data['end'],   "%Y-%m-%d").date()

    try:
        user = db.query(User).filter(User.email == userEmail).first()
        if not user:
            return {"days": [], "averages": {}}

        rows = (
            db.query(
                JournalEntry.date.label("date"),
                func.coalesce(func.sum(MenuItem.calories),           0).label("calories"),
                func.coalesce(func.sum(MenuItem.protein),            0).label("protein"),
                func.coalesce(func.sum(MenuItem.total_carbohydrate), 0).label("carbs"),
                func.coalesce(func.sum(MenuItem.total_fat),          0).label("fat"),
                func.coalesce(func.sum(MenuItem.dietary_fiber),      0).label("fiber"),
                func.coalesce(func.sum(MenuItem.sodium),             0).label("sodium"),
                func.coalesce(func.sum(MenuItem.total_sugars),       0).label("sugar"),
                func.coalesce(func.sum(MenuItem.saturated_fat),      0).label("saturated_fat"),
                func.coalesce(func.sum(MenuItem.cholesterol),        0).label("cholesterol"),
                func.coalesce(func.sum(MenuItem.vitamin_d),          0).label("vitamin_d"),
                func.coalesce(func.sum(MenuItem.calcium),            0).label("calcium"),
                func.coalesce(func.sum(MenuItem.iron),               0).label("iron"),
                func.coalesce(func.sum(MenuItem.potassium),          0).label("potassium"),
            )
            .join(MenuItem, MenuItem.id == JournalEntry.menu_id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date    >= start,
                JournalEntry.date    <= end,
            )
            .group_by(JournalEntry.date)
            .order_by(JournalEntry.date)
            .all()
        )

        fields = [
            "calories", "protein", "carbs", "fat", "fiber",
            "sodium", "sugar", "saturated_fat", "cholesterol",
            "vitamin_d", "calcium", "iron", "potassium",
        ]

        days = [
            {"date": str(row.date), **{f: round(float(getattr(row, f) or 0), 1) for f in fields}}
            for row in rows
        ]

        if days:
            averages = {f: round(sum(d[f] for d in days) / len(days), 1) for f in fields}
        else:
            averages = {f: 0.0 for f in fields}

        return {"days": days, "averages": averages}
    finally:
        db.close()





MEAL_LABEL = {1: "Breakfast", 2: "Lunch", 3: "Dinner", 5: "Late Night", 6: "After 11am", 7: "Menu", 8: "All Day"}
MEAL_ORDER = [1, 2, 3, 5, 6, 7, 8]

def getDHMenu(data):
    date_str = data.get("date")
    query_date = dt.strptime(date_str, "%Y-%m-%d").date() if date_str else date_type.today()

    db = SessionLocal()
    try:
        rows = (
            db.query(DiningHall, Meal, MenuItem)
            .join(Meal, Meal.diningId == DiningHall.id)
            .join(MealMenuItem, MealMenuItem.meal_id == Meal.id)
            .join(MenuItem, MenuItem.id == MealMenuItem.menu_item_id)
            .filter(Meal.date == query_date)
            .order_by(DiningHall.name, Meal.mealId)
            .all()
        )

        result = {}
        for dh, meal, item in rows:
            label = MEAL_LABEL.get(meal.mealId)
            if label is None:
                continue
            if dh.name not in result:
                result[dh.name] = {MEAL_LABEL[mid]: [] for mid in MEAL_ORDER}
            result[dh.name].setdefault(label, []).append({
                "id":                 item.id,
                "name":               item.name,
                "serving_size":       item.serving_size,
                "calories":           item.calories,
                "total_fat":          item.total_fat,
                "saturated_fat":      item.saturated_fat,
                "trans_fat":          item.trans_fat,
                "cholesterol":        item.cholesterol,
                "sodium":             item.sodium,
                "total_carbohydrate": item.total_carbohydrate,
                "dietary_fiber":      item.dietary_fiber,
                "total_sugars":       item.total_sugars,
                "protein":            item.protein,
                "vitamin_d":          item.vitamin_d,
                "calcium":            item.calcium,
                "iron":               item.iron,
                "potassium":          item.potassium,
                "allergens":          item.allergens,
            })

        for dh_name in result:
            result[dh_name] = {label: items for label, items in result[dh_name].items() if items}

        return result
    finally:
        db.close()


def getJournalTotals(data):
    db = SessionLocal()
    date_str  = data['date']
    userEmail = data['email']

    try:
        date = dt.strptime(date_str, "%Y-%m-%d").date()
        user = db.query(User).filter(User.email == userEmail).first()
        if not user:
            return {}

        row = (
            db.query(
                func.coalesce(func.sum(MenuItem.calories), 0).label('total_calories'),
                func.coalesce(func.sum(MenuItem.total_fat), 0).label('total_fat'),
                func.coalesce(func.sum(MenuItem.saturated_fat), 0).label('total_sat_fat'),
                func.coalesce(func.sum(MenuItem.trans_fat), 0).label('total_trans_fat'),
                func.coalesce(func.sum(MenuItem.cholesterol), 0).label('total_cholesterol'),
                func.coalesce(func.sum(MenuItem.sodium), 0).label('total_sodium'),
                func.coalesce(func.sum(MenuItem.total_carbohydrate), 0).label('total_carbs'),
                func.coalesce(func.sum(MenuItem.dietary_fiber), 0).label('total_fiber'),
                func.coalesce(func.sum(MenuItem.total_sugars), 0).label('total_sugar'),
                func.coalesce(func.sum(MenuItem.protein), 0).label('total_protein'),
                func.coalesce(func.sum(MenuItem.vitamin_d), 0).label('total_vit_d'),
                func.coalesce(func.sum(MenuItem.calcium), 0).label('total_calcium'),
                func.coalesce(func.sum(MenuItem.iron), 0).label('total_iron'),
                func.coalesce(func.sum(MenuItem.potassium), 0).label('total_potassium'),
            )
            .join(JournalEntry, JournalEntry.menu_id == MenuItem.id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date    == date,
            )
            .first()
        )

        if not row:
            return {}

        return {
            'total_calories':   round(row.total_calories   or 0),
            'total_fat':        round(row.total_fat        or 0),
            'total_sat_fat':    round(row.total_sat_fat    or 0),
            'total_trans_fat':  round(row.total_trans_fat  or 0),
            'total_cholesterol':round(row.total_cholesterol or 0),
            'total_sodium':     round(row.total_sodium      or 0),
            'total_carbs':      round(row.total_carbs       or 0),
            'total_fiber':      round(row.total_fiber       or 0),
            'total_sugar':      round(row.total_sugar       or 0),
            'total_protein':    round(row.total_protein     or 0),
            'total_vit_d':      round(row.total_vit_d       or 0),
            'total_calcium':    round(row.total_calcium     or 0),
            'total_iron':       round(row.total_iron        or 0),
            'total_potassium':  round(row.total_potassium   or 0),
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    


    