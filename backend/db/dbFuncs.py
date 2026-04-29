from database import SessionLocal, engine, Base
from db.models.models import DiningHall, Meal, MenuItem, MealMenuItem
from db.models.userModels import User, JournalEntry, UserSettings
from sqlalchemy import func
from datetime import datetime as dt, date as date_type
import json

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
    weight_kg = weight_lbs * 0.453592
    height_cm = (height_ft * 12 + height_in) * 2.54

    if sex == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    activity_factors = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "active": 1.55,
        "very_active": 1.725,
    }
    tdee = bmr * activity_factors.get(activity_level, 1.375)

    if weight_change_rate is not None:
        direction = -1 if goal_weight_lbs < weight_lbs else 1
        calorie_adjustment = direction * weight_change_rate * 500
    else:
        calorie_adjustment = 0

    goal_calories = max(1200, round(tdee + calorie_adjustment))

    protein_g = max(goal_calories * 0.25 / 4, weight_kg * 0.8)
    fat_g = goal_calories * 0.30 / 9
    carb_g = max((goal_calories - protein_g * 4 - fat_g * 9) / 4, 130)
    sat_fat_g = goal_calories * 0.10 / 9
    trans_fat_g = round(goal_calories * 0.01 / 9, 1)
    cholesterol_mg = 300.0
    sodium_mg = 2300.0

    if sex == "male":
        fiber_g = 30 if age >= 51 else 38
    else:
        fiber_g = 21 if age >= 51 else 25

    sugars_g = goal_calories * 0.10 / 4
    vitamin_d_pct = 100.0
    calcium_pct = 100.0

    if sex == "male" or age >= 51:
        iron_pct = round(8 / 18 * 100)
    else:
        iron_pct = 100.0

    potassium_pct = 100.0

    return {
        "goal_calories": round(goal_calories),
        "goal_total_fat": round(fat_g, 1),
        "goal_saturated_fat": round(sat_fat_g, 1),
        "goal_trans_fat": trans_fat_g,
        "goal_cholesterol": cholesterol_mg,
        "goal_sodium": sodium_mg,
        "goal_total_carbohydrate": round(carb_g, 1),
        "goal_dietary_fiber": float(fiber_g),
        "goal_total_sugars": round(sugars_g, 1),
        "goal_protein": round(protein_g, 1),
        "goal_vitamin_d": vitamin_d_pct,
        "goal_calcium": calcium_pct,
        "goal_iron": float(iron_pct),
        "goal_potassium": potassium_pct,
    }


def saveOnboarding(data):
    goals = _calculate_goals(
        activity_level=data['activity_level'],
        sex=data['sex'],
        age=int(data['age']),
        height_ft=int(data['height_ft']),
        height_in=int(data['height_in']),
        weight_lbs=float(data['weight']),
        goal_weight_lbs=float(data['goal_weight']),
        weight_change_rate=float(data['weight_change_rate']) if data.get('weight_change_rate') is not None else None,
    )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == data['email']).first()
        if not user:
            raise ValueError(f"User not found: {data['email']}")
        for field, value in goals.items():
            setattr(user, field, value)
        user.sex = data['sex']
        user.age = int(data['age'])
        user.height_ft = int(data['height_ft'])
        user.height_in = int(data['height_in'])
        user.weight_lbs = float(data['weight'])
        user.goal_weight_lbs = float(data['goal_weight'])
        user.weight_change_rate = float(data['weight_change_rate']) if data.get('weight_change_rate') is not None else None
        user.activity_level = data['activity_level']
        user.onboarding_complete = True
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def getUserProfile(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {}
        return {
            "email": user.email,
            "first_name": user.first_name,
            "family_name": user.family_name,
            "sex": user.sex,
            "age": user.age,
            "height_ft": user.height_ft,
            "height_in": user.height_in,
            "weight_lbs": user.weight_lbs,
            "goal_weight_lbs": user.goal_weight_lbs,
            "weight_change_rate": user.weight_change_rate,
            "activity_level": user.activity_level,
        }
    finally:
        db.close()


def updateUserProfile(data):
    email = data["email"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError(f"User not found: {email}")

        if "first_name" in data and data["first_name"] is not None:
            user.first_name = data["first_name"]
        if "family_name" in data and data["family_name"] is not None:
            user.family_name = data["family_name"]
        if "sex" in data and data["sex"] is not None:
            user.sex = data["sex"]
        if "age" in data and data["age"] is not None:
            user.age = int(data["age"])
        if "height_ft" in data and data["height_ft"] is not None:
            user.height_ft = int(data["height_ft"])
        if "height_in" in data and data["height_in"] is not None:
            user.height_in = int(data["height_in"])
        if "weight_lbs" in data and data["weight_lbs"] is not None:
            user.weight_lbs = float(data["weight_lbs"])
        if "goal_weight_lbs" in data and data["goal_weight_lbs"] is not None:
            user.goal_weight_lbs = float(data["goal_weight_lbs"])
        if "weight_change_rate" in data and data["weight_change_rate"] is not None:
            user.weight_change_rate = float(data["weight_change_rate"])
        if "activity_level" in data and data["activity_level"] is not None:
            user.activity_level = data["activity_level"]

        if all(getattr(user, f) is not None for f in [
            "activity_level", "sex", "age", "height_ft", "height_in", "weight_lbs", "goal_weight_lbs"
        ]):
            goals = _calculate_goals(
                activity_level=user.activity_level,
                sex=user.sex,
                age=user.age,
                height_ft=user.height_ft,
                height_in=user.height_in,
                weight_lbs=user.weight_lbs,
                goal_weight_lbs=user.goal_weight_lbs,
                weight_change_rate=user.weight_change_rate,
            )
            for field, value in goals.items():
                setattr(user, field, value)

        db.commit()
        return {"status": "ok"}
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
            .filter(MenuItem.name.ilike(f"%{query}%"), MenuItem.calories != None)
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
        return {m.mealId: m.id for m in meals}
    finally:
        db.close()


def deleteFromJournal(data):
    user_email = data['user_email']
    meal_num = data['meal_num']
    menu_item_id = data['menu_item_id']
    date = dt.strptime(data['date'], "%Y-%m-%d").date()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise ValueError(f"User not found: {user_email}")
        db.query(JournalEntry).filter(
            JournalEntry.user_id == user.user_id,
            JournalEntry.date == date,
            JournalEntry.meal_num == meal_num,
            JournalEntry.menu_id == menu_item_id,
        ).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def addToMeal(data):
    user_email = data['user_email']
    date = dt.strptime(data['date'], "%Y-%m-%d").date()
    meal_num = data['meal_num']
    menu_item_id = data['menu_item_id']
    quantity = int(data.get('quantity', 1))

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise ValueError(f"User not found: {user_email}")
        matches = db.query(JournalEntry).filter(
            JournalEntry.user_id == user.user_id,
            JournalEntry.date == date,
            JournalEntry.meal_num == meal_num,
            JournalEntry.menu_id == menu_item_id,
        ).order_by(JournalEntry.id.asc()).all()
        if matches:
            matches[0].quantity = quantity
            for dup in matches[1:]:
                db.delete(dup)
        else:
            db.add(JournalEntry(
                user_id=user.user_id,
                date=date,
                meal_num=meal_num,
                menu_id=menu_item_id,
                quantity=quantity,
            ))
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
            'goal_calories': user.goal_calories,
            'goal_total_fat': user.goal_total_fat,
            'goal_saturated_fat': user.goal_saturated_fat,
            'goal_trans_fat': user.goal_trans_fat,
            'goal_cholesterol': user.goal_cholesterol,
            'goal_sodium': user.goal_sodium,
            'goal_total_carbohydrate': user.goal_total_carbohydrate,
            'goal_dietary_fiber': user.goal_dietary_fiber,
            'goal_total_sugars': user.goal_total_sugars,
            'goal_protein': user.goal_protein,
            'goal_vitamin_d': user.goal_vitamin_d,
            'goal_calcium': user.goal_calcium,
            'goal_iron': user.goal_iron,
            'goal_potassium': user.goal_potassium,
        }
    finally:
        db.close()


def _settingsToDict(settings):
    metric_colors = None
    if settings.metric_colors:
        try:
            metric_colors = json.loads(settings.metric_colors)
        except Exception:
            metric_colors = None
    return {
        "analytics_onboarded": settings.analytics_onboarded,
        "ai_analytics_enabled": settings.ai_analytics_enabled,
        "theme": settings.theme,
        "units_system": settings.units_system,
        "default_range": settings.default_range,
        "notifications_enabled": settings.notifications_enabled,
        "compact_view": settings.compact_view,
        "metric_colors": metric_colors,
    }


def getUserSettings(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {}
        settings = db.query(UserSettings).filter(UserSettings.user_id == user.user_id).first()
        if not settings:
            settings = UserSettings(
                user_id=user.user_id,
                analytics_onboarded=False,
                ai_analytics_enabled=False,
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return _settingsToDict(settings)
    finally:
        db.close()


def updateUserSettings(data):
    email = data["email"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError(f"User not found: {email}")
        settings = db.query(UserSettings).filter(UserSettings.user_id == user.user_id).first()
        if not settings:
            settings = UserSettings(user_id=user.user_id)
            db.add(settings)
        if "analytics_onboarded" in data:
            settings.analytics_onboarded = bool(data["analytics_onboarded"])
        if "ai_analytics_enabled" in data:
            settings.ai_analytics_enabled = bool(data["ai_analytics_enabled"])
        if "theme" in data and data["theme"] is not None:
            settings.theme = str(data["theme"])
        if "units_system" in data and data["units_system"] is not None:
            settings.units_system = str(data["units_system"])
        if "default_range" in data and data["default_range"] is not None:
            settings.default_range = str(data["default_range"])
        if "notifications_enabled" in data:
            settings.notifications_enabled = bool(data["notifications_enabled"])
        if "compact_view" in data:
            settings.compact_view = bool(data["compact_view"])
        if "metric_colors" in data:
            settings.metric_colors = json.dumps(data["metric_colors"]) if data["metric_colors"] is not None else None
        db.commit()
        db.refresh(settings)
        return _settingsToDict(settings)
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def getJournalByDate(data):
    user_email = data['user_email']
    date = dt.strptime(data['date'], "%Y-%m-%d").date()

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
                JournalEntry.date == date,
            )
            .order_by(JournalEntry.id.desc())
            .all()
        )

        result = {"1": [], "2": [], "3": [], "4": []}
        seen = set()
        for entry, item in entries:
            key = (entry.meal_num, item.id)
            if key in seen:
                continue
            seen.add(key)
            bucket = str(entry.meal_num)
            if bucket not in result:
                continue
            result[bucket].append({
                "id": item.id,
                "name": item.name,
                "serving_size": item.serving_size,
                "quantity": entry.quantity,
                "calories": item.calories,
                "total_fat": item.total_fat,
                "saturated_fat": item.saturated_fat,
                "trans_fat": item.trans_fat,
                "cholesterol": item.cholesterol,
                "sodium": item.sodium,
                "total_carbohydrate": item.total_carbohydrate,
                "dietary_fiber": item.dietary_fiber,
                "total_sugars": item.total_sugars,
                "protein": item.protein,
                "vitamin_d": item.vitamin_d,
                "calcium": item.calcium,
                "iron": item.iron,
                "potassium": item.potassium,
                "allergens": item.allergens,
            })

        return result
    finally:
        db.close()

def getJournalRange(data):
    db = SessionLocal()
    userEmail = data["email"]
    start = dt.strptime(data['start'], "%Y-%m-%d").date()
    end = dt.strptime(data['end'], "%Y-%m-%d").date()

    try:
        user = db.query(User).filter(User.email == userEmail).first()
        if not user:
            return {"days": [], "averages": {}}

        rows = (
            db.query(
                JournalEntry.date.label("date"),
                func.coalesce(func.sum(MenuItem.calories * JournalEntry.quantity), 0).label("calories"),
                func.coalesce(func.sum(MenuItem.protein * JournalEntry.quantity), 0).label("protein"),
                func.coalesce(func.sum(MenuItem.total_carbohydrate * JournalEntry.quantity), 0).label("carbs"),
                func.coalesce(func.sum(MenuItem.total_fat * JournalEntry.quantity), 0).label("fat"),
                func.coalesce(func.sum(MenuItem.dietary_fiber * JournalEntry.quantity), 0).label("fiber"),
                func.coalesce(func.sum(MenuItem.sodium * JournalEntry.quantity), 0).label("sodium"),
                func.coalesce(func.sum(MenuItem.total_sugars * JournalEntry.quantity), 0).label("sugar"),
                func.coalesce(func.sum(MenuItem.saturated_fat * JournalEntry.quantity), 0).label("saturated_fat"),
                func.coalesce(func.sum(MenuItem.cholesterol * JournalEntry.quantity), 0).label("cholesterol"),
                func.coalesce(func.sum(MenuItem.vitamin_d * JournalEntry.quantity), 0).label("vitamin_d"),
                func.coalesce(func.sum(MenuItem.calcium * JournalEntry.quantity), 0).label("calcium"),
                func.coalesce(func.sum(MenuItem.iron * JournalEntry.quantity), 0).label("iron"),
                func.coalesce(func.sum(MenuItem.potassium * JournalEntry.quantity), 0).label("potassium"),
            )
            .join(MenuItem, MenuItem.id == JournalEntry.menu_id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date >= start,
                JournalEntry.date <= end,
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

        meal_rows = (
            db.query(
                JournalEntry.meal_num.label("meal_num"),
                func.coalesce(func.sum(MenuItem.calories * JournalEntry.quantity), 0).label("calories"),
                func.coalesce(func.sum(MenuItem.protein * JournalEntry.quantity), 0).label("protein"),
                func.coalesce(func.sum(MenuItem.total_carbohydrate * JournalEntry.quantity), 0).label("carbs"),
                func.coalesce(func.sum(MenuItem.total_fat * JournalEntry.quantity), 0).label("fat"),
                func.coalesce(func.sum(MenuItem.dietary_fiber * JournalEntry.quantity), 0).label("fiber"),
                func.coalesce(func.sum(MenuItem.sodium * JournalEntry.quantity), 0).label("sodium"),
                func.coalesce(func.sum(MenuItem.total_sugars * JournalEntry.quantity), 0).label("sugar"),
                func.coalesce(func.sum(MenuItem.saturated_fat * JournalEntry.quantity), 0).label("saturated_fat"),
                func.coalesce(func.sum(MenuItem.cholesterol * JournalEntry.quantity), 0).label("cholesterol"),
                func.coalesce(func.sum(MenuItem.vitamin_d * JournalEntry.quantity), 0).label("vitamin_d"),
                func.coalesce(func.sum(MenuItem.calcium * JournalEntry.quantity), 0).label("calcium"),
                func.coalesce(func.sum(MenuItem.iron * JournalEntry.quantity), 0).label("iron"),
                func.coalesce(func.sum(MenuItem.potassium * JournalEntry.quantity), 0).label("potassium"),
            )
            .join(MenuItem, MenuItem.id == JournalEntry.menu_id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date >= start,
                JournalEntry.date <= end,
            )
            .group_by(JournalEntry.meal_num)
            .all()
        )

        meal_breakdown = {str(m): {f: 0.0 for f in fields} for m in (1, 2, 3, 4)}
        for row in meal_rows:
            key = str(row.meal_num)
            if key not in meal_breakdown:
                continue
            for f in fields:
                meal_breakdown[key][f] = round(float(getattr(row, f) or 0), 1)

        return {"days": days, "averages": averages, "meal_breakdown": meal_breakdown}
    finally:
        db.close()


def getJournalRangeDetailed(data):
    db = SessionLocal()
    userEmail = data["email"]
    start = dt.strptime(data['start'], "%Y-%m-%d").date()
    end = dt.strptime(data['end'], "%Y-%m-%d").date()

    MEAL_LABELS = {1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snack"}
    fields = [
        "calories", "protein", "carbs", "fat", "fiber",
        "sodium", "sugar", "saturated_fat", "cholesterol",
        "vitamin_d", "calcium", "iron", "potassium",
    ]

    try:
        user = db.query(User).filter(User.email == userEmail).first()
        if not user:
            return {}

        entries = (
            db.query(JournalEntry, MenuItem)
            .join(MenuItem, MenuItem.id == JournalEntry.menu_id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date >= start,
                JournalEntry.date <= end,
            )
            .order_by(JournalEntry.date, JournalEntry.meal_num, JournalEntry.id.desc())
            .all()
        )

        result = {
            "user": {
                "goal_calories":      user.goal_calories,
                "goal_protein":       user.goal_protein,
                "goal_carbs":         user.goal_total_carbohydrate,
                "goal_fat":           user.goal_total_fat,
                "goal_fiber":         user.goal_dietary_fiber,
                "goal_sodium":        user.goal_sodium,
                "goal_sugar":         user.goal_total_sugars,
                "goal_saturated_fat": user.goal_saturated_fat,
                "goal_cholesterol":   user.goal_cholesterol,
                "goal_vitamin_d":     user.goal_vitamin_d,
                "goal_calcium":       user.goal_calcium,
                "goal_iron":          user.goal_iron,
                "goal_potassium":     user.goal_potassium,
            }
        }
        seen = set()
        for entry, item in entries:
            dedup_key = (entry.date, entry.meal_num, item.id)
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            meal_label = MEAL_LABELS.get(entry.meal_num)
            if meal_label is None:
                continue

            date_str = str(entry.date)
            qty = entry.quantity

            if date_str not in result:
                result[date_str] = {f: 0.0 for f in fields}
                result[date_str]["meals"] = {label: [] for label in MEAL_LABELS.values()}

            item_vals = {
                "item": item.name,
                "quantity": qty,
                "calories": round(float(item.calories or 0), 1),
                "protein": round(float(item.protein or 0), 1),
                "carbs": round(float(item.total_carbohydrate or 0), 1),
                "fat": round(float(item.total_fat or 0), 1),
                "fiber": round(float(item.dietary_fiber or 0), 1),
                "sodium": round(float(item.sodium or 0), 1),
                "sugar": round(float(item.total_sugars or 0), 1),
                "saturated_fat": round(float(item.saturated_fat or 0), 1),
                "cholesterol": round(float(item.cholesterol or 0), 1),
                "vitamin_d": round(float(item.vitamin_d or 0), 1),
                "calcium": round(float(item.calcium or 0), 1),
                "iron": round(float(item.iron or 0), 1),
                "potassium": round(float(item.potassium or 0), 1),
            }

            result[date_str]["meals"][meal_label].append(item_vals)

            for f in fields:
                result[date_str][f] = round(result[date_str][f] + item_vals[f] * qty, 1)

        return result
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
            .filter(Meal.date == query_date, MenuItem.calories != None)
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
                "id": item.id,
                "name": item.name,
                "serving_size": item.serving_size,
                "calories": item.calories,
                "total_fat": item.total_fat,
                "saturated_fat": item.saturated_fat,
                "trans_fat": item.trans_fat,
                "cholesterol": item.cholesterol,
                "sodium": item.sodium,
                "total_carbohydrate": item.total_carbohydrate,
                "dietary_fiber": item.dietary_fiber,
                "total_sugars": item.total_sugars,
                "protein": item.protein,
                "vitamin_d": item.vitamin_d,
                "calcium": item.calcium,
                "iron": item.iron,
                "potassium": item.potassium,
                "allergens": item.allergens,
            })

        for dh_name in result:
            result[dh_name] = {label: items for label, items in result[dh_name].items() if items}

        return result
    finally:
        db.close()


def getJournalTotals(data):
    db = SessionLocal()
    date_str = data['date']
    userEmail = data['email']

    try:
        date = dt.strptime(date_str, "%Y-%m-%d").date()
        user = db.query(User).filter(User.email == userEmail).first()
        if not user:
            return {}

        row = (
            db.query(
                func.coalesce(func.sum(MenuItem.calories * JournalEntry.quantity), 0).label('total_calories'),
                func.coalesce(func.sum(MenuItem.total_fat * JournalEntry.quantity), 0).label('total_fat'),
                func.coalesce(func.sum(MenuItem.saturated_fat * JournalEntry.quantity), 0).label('total_sat_fat'),
                func.coalesce(func.sum(MenuItem.trans_fat * JournalEntry.quantity), 0).label('total_trans_fat'),
                func.coalesce(func.sum(MenuItem.cholesterol * JournalEntry.quantity), 0).label('total_cholesterol'),
                func.coalesce(func.sum(MenuItem.sodium * JournalEntry.quantity), 0).label('total_sodium'),
                func.coalesce(func.sum(MenuItem.total_carbohydrate * JournalEntry.quantity), 0).label('total_carbs'),
                func.coalesce(func.sum(MenuItem.dietary_fiber * JournalEntry.quantity), 0).label('total_fiber'),
                func.coalesce(func.sum(MenuItem.total_sugars * JournalEntry.quantity), 0).label('total_sugar'),
                func.coalesce(func.sum(MenuItem.protein * JournalEntry.quantity), 0).label('total_protein'),
                func.coalesce(func.sum(MenuItem.vitamin_d * JournalEntry.quantity), 0).label('total_vit_d'),
                func.coalesce(func.sum(MenuItem.calcium * JournalEntry.quantity), 0).label('total_calcium'),
                func.coalesce(func.sum(MenuItem.iron * JournalEntry.quantity), 0).label('total_iron'),
                func.coalesce(func.sum(MenuItem.potassium * JournalEntry.quantity), 0).label('total_potassium'),
            )
            .join(JournalEntry, JournalEntry.menu_id == MenuItem.id)
            .filter(
                JournalEntry.user_id == user.user_id,
                JournalEntry.date == date,
            )
            .first()
        )

        if not row:
            return {}

        return {
            'total_calories': round(row.total_calories or 0),
            'total_fat': round(row.total_fat or 0),
            'total_sat_fat': round(row.total_sat_fat or 0),
            'total_trans_fat': round(row.total_trans_fat or 0),
            'total_cholesterol': round(row.total_cholesterol or 0),
            'total_sodium': round(row.total_sodium or 0),
            'total_carbs': round(row.total_carbs or 0),
            'total_fiber': round(row.total_fiber or 0),
            'total_sugar': round(row.total_sugar or 0),
            'total_protein': round(row.total_protein or 0),
            'total_vit_d': round(row.total_vit_d or 0),
            'total_calcium': round(row.total_calcium or 0),
            'total_iron': round(row.total_iron or 0),
            'total_potassium': round(row.total_potassium or 0),
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
