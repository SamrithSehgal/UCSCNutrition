from database import Base
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Boolean, Text
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    first_name = Column(String)
    family_name = Column(String)

    # Profile data captured during onboarding (raw inputs)
    sex = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height_ft = Column(Integer, nullable=True)
    height_in = Column(Integer, nullable=True)
    weight_lbs = Column(Float, nullable=True)
    goal_weight_lbs = Column(Float, nullable=True)
    weight_change_rate = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True)

    # Onboarding state
    onboarding_complete = Column(Boolean, nullable=False, default=False)

    # Daily nutrition goals — calculated from onboarding data, one per MenuItem field
    goal_calories = Column(Float, nullable=True)
    goal_total_fat = Column(Float, nullable=True)   # g
    goal_saturated_fat = Column(Float, nullable=True)   # g
    goal_trans_fat = Column(Float, nullable=True)   # g  (target: 0)
    goal_cholesterol = Column(Float, nullable=True)   # mg
    goal_sodium = Column(Float, nullable=True)   # mg
    goal_total_carbohydrate = Column(Float, nullable=True)   # g
    goal_dietary_fiber = Column(Float, nullable=True)   # g
    goal_total_sugars = Column(Float, nullable=True)   # g
    goal_protein = Column(Float, nullable=True)   # g
    goal_vitamin_d = Column(Float, nullable=True)   # %DV
    goal_calcium = Column(Float, nullable=True)   # %DV
    goal_iron = Column(Float, nullable=True)   # %DV
    goal_potassium = Column(Float, nullable=True)   # %DV

    journal_entries = relationship("JournalEntry", back_populates="user")
    settings = relationship("UserSettings", back_populates="user", uselist=False)


class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    analytics_onboarded = Column(Boolean, nullable=False, default=False, server_default='false')
    ai_analytics_enabled = Column(Boolean, nullable=False, default=False, server_default='false')

    theme = Column(String, nullable=False, default='dark', server_default='dark')
    units_system = Column(String, nullable=False, default='imperial', server_default='imperial')
    default_range = Column(String, nullable=False, default='1W', server_default='1W')
    notifications_enabled = Column(Boolean, nullable=False, default=True, server_default='true')
    compact_view = Column(Boolean, nullable=False, default=False, server_default='false')
    metric_colors = Column(Text, nullable=True)

    user = relationship("User", back_populates="settings")


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    date = Column(Date, index=True)
    meal_num = Column(Integer)   # 1=breakfast 2=lunch 3=dinner 4=snacks
    menu_id = Column(Integer, ForeignKey("menu_items.id"))
    quantity = Column(Integer, nullable=False, server_default='1')

    user = relationship("User", back_populates="journal_entries")
    menu_item = relationship("MenuItem")
