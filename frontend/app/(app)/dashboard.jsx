import { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,

  ScrollView,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Animated,
  Easing,
  TextInput,
  FlatList,
  PanResponder,
  Dimensions,
  Keyboard,
  StyleSheet as RNStyleSheet,
  Platform,
} from "react-native";

const SCREEN_H    = Dimensions.get("window").height;
const SCREEN_W    = Dimensions.get("window").width;
const SNAP_PARTIAL = SCREEN_H * 0.28;
const SNAP_FULL    = Platform.OS === "android" ? 24 : 44;
import s, { C } from "../styles/dashboard.styles";
import auth from "@react-native-firebase/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDrawer } from "../drawerContext";
import { get, post, postQuery } from "../api";

const MEALS = [
  { key: "breakfast", label: "Breakfast", mealId: 1, accent: C.mBreakfast },
  { key: "lunch",     label: "Lunch",     mealId: 2, accent: C.mLunch     },
  { key: "dinner",    label: "Dinner",    mealId: 3, accent: C.mDinner    },
  { key: "snacks",    label: "Snacks",    mealId: 4, accent: C.mSnacks    },
];

const GOAL = 2000;

const WEEKDAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS    = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function sameDay(a, b) {
  return a.getDate() === b.getDate() &&
         a.getMonth() === b.getMonth() &&
         a.getFullYear() === b.getFullYear();
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function localDateStr(d) {
  const dt = d ?? new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [date, setDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [addingToMeal, setAddingToMeal] = useState(null);
  const [recentFoods, setRecentFoods] = useState([]);
  // { mealNum: { menuItemId: { id, name, cal, p, c, f, ...nutrition }, ... }, ... }
  const [mealLog, setMealLog] = useState({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [goals, setGoals] = useState(null);

  const { openDrawer } = useDrawer();
  const userEmail = auth().currentUser?.email ?? null;
  const today     = new Date();
  const isToday   = sameDay(date, today);

  useEffect(() => {
    const dateStr = localDateStr(date);
    // Reset immediately so stale data never shows while loading
    setMealLog({ 1: {}, 2: {}, 3: {}, 4: {} });
    if (!userEmail) return;
    post("/getJournalByDate", { user_email: userEmail, date: dateStr })
      .then(data => {
        const newLog = { 1: {}, 2: {}, 3: {}, 4: {} };
        [1, 2, 3, 4].forEach(mealNum => {
          (data[String(mealNum)] ?? []).forEach(item => {
            const baseCal = Math.round(item.calories ?? 0);
            const baseP   = Math.round(item.protein  ?? 0);
            const baseC   = Math.round(item.total_carbohydrate ?? 0);
            const baseF   = Math.round(item.total_fat ?? 0);
            newLog[mealNum][item.id] = {
              ...item,
              qty: 1,
              baseCal, baseP, baseC, baseF,
              cal: baseCal,
              p:   baseP,
              c:   baseC,
              f:   baseF,
            };
          });
        });
        setMealLog(newLog);
      })
      .catch(e => console.log("getJournalByDate error:", e.message));
  }, [date]);

  const allFoods = useMemo(
    () => Object.values(mealLog).flatMap(m => Object.values(m)),
    [mealLog]
  );
  const totalCal = useMemo(() => allFoods.reduce((s, f) => s + f.cal, 0), [allFoods]);
  const macros   = useMemo(() => ({
    p: allFoods.reduce((s, f) => s + (f.p || 0), 0),
    c: allFoods.reduce((s, f) => s + (f.c || 0), 0),
    f: allFoods.reduce((s, f) => s + (f.f || 0), 0),
  }), [allFoods]);

  useEffect(() => {
    if (!userEmail) return;
    get(`/getUserGoals?email=${encodeURIComponent(userEmail)}`)
      .then(data => setGoals(Object.keys(data).some(k => data[k] != null) ? data : null))
      .catch(() => {});
  }, [userEmail]);

  const calorieGoal = Math.round(goals?.goal_calories ?? GOAL);
  const remaining = calorieGoal - totalCal;
  const progress  = Math.min(Math.max(totalCal / calorieGoal, 0), 1);
  const isOver    = remaining < 0;

  function handleFoodAdded(food, mealId) {
    const baseCal = Math.round(food.calories ?? 0);
    const baseP   = Math.round(food.protein  ?? 0);
    const baseC   = Math.round(food.total_carbohydrate ?? 0);
    const baseF   = Math.round(food.total_fat ?? 0);
    const qty     = food.qty ?? 1;
    setMealLog(prev => ({
      ...prev,
      [mealId]: {
        ...prev[mealId],
        [food.id]: {
          ...food,               // preserves all raw nutrition fields for detail view
          qty,
          baseCal, baseP, baseC, baseF,
          cal: Math.round(baseCal * qty),
          p:   Math.round(baseP   * qty),
          c:   Math.round(baseC   * qty),
          f:   Math.round(baseF   * qty),
        },
      },
    }));
    setRecentFoods(prev => {
      const filtered = prev.filter(f => f.id !== food.id);
      return [food, ...filtered].slice(0, 20);
    });
    post("/addToMeal", {
      user_email:   userEmail,
      date:         localDateStr(date),
      meal_num:     mealId,
      menu_item_id: food.id,
    }).catch(e => console.log("addToMeal error:", e.message));
  }

  const [editingEntry, setEditingEntry] = useState(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  const totals = useMemo(() => {
    const foods = Object.values(mealLog).flatMap(m => Object.values(m));
    const sum = key => foods.reduce((acc, f) => acc + Math.round((f[key] ?? 0) * (f.qty ?? 1)), 0);
    return {
      calories:    sum("calories"),
      fat:         sum("total_fat"),
      sat_fat:     sum("saturated_fat"),
      trans_fat:   sum("trans_fat"),
      cholesterol: sum("cholesterol"),
      sodium:      sum("sodium"),
      carbs:       sum("total_carbohydrate"),
      fiber:       sum("dietary_fiber"),
      sugar:       sum("total_sugars"),
      protein:     sum("protein"),
      vit_d:       sum("vitamin_d"),
      calcium:     sum("calcium"),
      iron:        sum("iron"),
      potassium:   sum("potassium"),
    };
  }, [mealLog]);

  function handleFoodPress(food, mealTypeId) {
    const meal = MEALS.find(m => m.mealId === mealTypeId);
    setEditingEntry({ food, mealTypeId, meal });
  }

  function handleEditSave(food, qty) {
    handleFoodAdded({ ...food, qty }, editingEntry.mealTypeId);
    setEditingEntry(null);
  }

  function handleDeleteFood() {
    const { food, mealTypeId } = editingEntry;
    setMealLog(prev => {
      const updated = { ...prev[mealTypeId] };
      delete updated[food.id];
      return { ...prev, [mealTypeId]: updated };
    });
    setEditingEntry(null);
    post("/deleteFromMeal", {
      user_email:   userEmail,
      date:         localDateStr(date),
      meal_num:     mealTypeId,
      menu_item_id: food.id,
    }).catch(e => console.log("deleteFromMeal error:", e.message));
  }

  const dateLabel = isToday
    ? `Today, ${MONTHS[date.getMonth()]} ${date.getDate()}`
    : `${DAYS_FULL[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && s.pressed]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
        <Text style={s.logo}>CampusPlates</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.dateRow}>
          <Pressable
            style={({ pressed }) => [s.arrowBtn, pressed && s.pressed]}
            onPress={() => setDate(d => addDays(d, -1))}
            hitSlop={12}
          >
            <Text style={s.arrowGlyph}>‹</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.dateTouchable, pressed && s.pressed]}
            onPress={() => setCalendarOpen(true)}
          >
            <Text style={s.dateText}>{dateLabel}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.arrowBtn, pressed && s.pressed]}
            onPress={() => setDate(d => addDays(d, 1))}
            hitSlop={12}
          >
            <Text style={s.arrowGlyph}>›</Text>
          </Pressable>
        </View>
        <View style={s.dateDivider} />

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setNutritionOpen(true)}
        >
          <View style={s.calorieCard}>
          <View style={s.calorieRow}>
            <View style={s.calStat}>
              <Text style={[s.calValue, { color: C.text }]}>{totalCal}</Text>
              <Text style={s.calLabel}>Consumed</Text>
            </View>
            <View style={s.calDivider} />
            <View style={s.calStat}>
              <Text style={[s.calValue, { color: isOver ? C.danger : C.mBreakfast }]}>
                {Math.abs(remaining)}
              </Text>
              <Text style={s.calLabel}>{isOver ? "Over Goal" : "Remaining"}</Text>
            </View>
            <View style={s.calDivider} />
            <View style={s.calStat}>
              <Text style={[s.calValue, { color: C.green }]}>{calorieGoal}</Text>
              <Text style={s.calLabel}>Goal</Text>
            </View>
          </View>

          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${progress * 100}%` },
                isOver && s.progressOver,
              ]}
            />
          </View>

          <View style={s.insetSep} />
          <View style={s.macroRow}>
            <View style={s.macroPill}>
              <Text style={s.macroValue}>{macros.p}g</Text>
              <Text style={s.macroLabel}>Protein</Text>
            </View>
            <View style={s.macroDivider} />
            <View style={s.macroPill}>
              <Text style={s.macroValue}>{macros.c}g</Text>
              <Text style={s.macroLabel}>Carbs</Text>
            </View>
            <View style={s.macroDivider} />
            <View style={s.macroPill}>
              <Text style={s.macroValue}>{macros.f}g</Text>
              <Text style={s.macroLabel}>Fat</Text>
            </View>
          </View>
          </View>
        </TouchableOpacity>

        <View style={s.mealList}>
          {MEALS.map(meal => (
            <MealCard
              key={meal.key}
              meal={meal}
              foods={Object.values(mealLog[meal.mealId])}
              onAdd={() => setAddingToMeal(meal)}
              onFoodPress={food => handleFoodPress(food, meal.mealId)}
            />
          ))}
        </View>
      </ScrollView>

      <CalendarModal
        visible={calendarOpen}
        selected={date}
        onSelect={d => { setDate(d); setCalendarOpen(false); }}
        onClose={() => setCalendarOpen(false)}
      />
      <FoodSearchModal
        visible={addingToMeal !== null}
        meal={addingToMeal}
        onClose={() => setAddingToMeal(null)}
        recentFoods={recentFoods}
        onFoodAdded={handleFoodAdded}
      />
      <LoggedFoodModal
        visible={editingEntry !== null}
        food={editingEntry?.food}
        meal={editingEntry?.meal}
        onClose={() => setEditingEntry(null)}
        onSave={handleEditSave}
        onDelete={handleDeleteFood}
      />
      <NutritionBreakdownModal
        visible={nutritionOpen}
        totals={totals}
        goals={goals}
        calorieGoal={calorieGoal}
        dateLabel={dateLabel}
        onClose={() => setNutritionOpen(false)}
      />
    </SafeAreaView>
  );
}

function MealCard({ meal, foods, onAdd, onFoodPress }) {
  const [open, setOpen] = useState(true);
  const [bodyHeight, setBodyHeight] = useState(0);
  const anim = useRef(new Animated.Value(1)).current;
  const mealCal = foods.reduce((sum, f) => sum + f.cal, 0);

  function toggle() {
    Animated.timing(anim, {
      toValue: open ? 0 : 1,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
    setOpen(o => !o);
  }

  const animatedHeight = bodyHeight > 0
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, bodyHeight] })
    : undefined;

  const animatedOpacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.8, 1] });

  return (
    <View style={s.mealCard}>
      <Pressable
        style={({ pressed }) => [s.mealHeader, pressed && s.pressed]}
        onPress={toggle}
      >
        <View style={s.mealHeaderLeft}>
          <View style={[s.mealAccent, { backgroundColor: meal.accent }]} />
          <Text style={s.mealLabel}>{meal.label}</Text>
        </View>
        <View style={s.mealHeaderRight}>
          {foods.length > 0 && (
            <Text style={s.mealCal}>{mealCal} cal</Text>
          )}
          <Text style={s.chevron}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      <Animated.View style={{ height: animatedHeight, opacity: animatedOpacity, overflow: "hidden" }}>
        <View onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && h !== bodyHeight) setBodyHeight(h);
        }}>
          {foods.map((food, i) => (
            <View key={food.id}>
              {i > 0 && <View style={s.foodSep} />}
              <Pressable
                style={({ pressed }) => [s.foodRow, pressed && s.pressed]}
                onPress={() => onFoodPress(food)}
              >
                <Text style={s.foodName} numberOfLines={1}>{food.name}</Text>
                <Text style={s.foodCal}>{food.cal}</Text>
              </Pressable>
            </View>
          ))}
          <View style={s.insetSep} />
          <Pressable
            style={({ pressed }) => [s.addFoodRow, pressed && s.pressed]}
            onPress={onAdd}
          >
            <Text style={[s.addFoodText, { color: meal.accent }]}>+ Add Food</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function FoodRow({ item, onSelect }) {
  const cal = Math.round(item.calories  ?? 0);
  const p   = Math.round(item.protein   ?? 0);
  const c   = Math.round(item.total_carbohydrate ?? 0);
  const f   = Math.round(item.total_fat ?? 0);

  return (
    <Pressable
      style={({ pressed }) => [s.searchResultRow, pressed && s.pressed]}
      onPress={() => onSelect(item)}
    >
      <View style={s.searchResultLeft}>
        <Text style={s.searchResultName} numberOfLines={1}>{item.name}</Text>
        <View style={s.searchResultMacroRow}>
          <Text style={s.searchResultMacroChip}>P {p}g</Text>
          <Text style={s.searchResultMacroDot}>·</Text>
          <Text style={s.searchResultMacroChip}>C {c}g</Text>
          <Text style={s.searchResultMacroDot}>·</Text>
          <Text style={s.searchResultMacroChip}>F {f}g</Text>
          {item.serving_size ? (
            <>
              <Text style={s.searchResultMacroDot}>·</Text>
              <Text style={s.searchResultServing}>{item.serving_size}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={s.searchResultCalCol}>
        <Text style={s.searchResultCal}>{cal}</Text>
        <Text style={s.searchResultCalUnit}>kcal</Text>
      </View>
    </Pressable>
  );
}

function LoggedFoodModal({ visible, food, meal, onClose, onSave, onDelete }) {
  if (!visible || !food) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={[RNStyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]}
          onPress={onClose}
        />
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTopWidth: 1,
          borderColor: C.border,
          height: "88%",
        }}>
          <FoodDetailView
            key={food.id}
            food={food}
            meal={meal}
            onBack={onClose}
            onSave={onSave}
            onDelete={onDelete}
            initialQty={food.qty || 1}
          />
        </View>
      </View>
    </Modal>
  );
}

function FoodDetailView({ food, meal, onBack, onSave, panHandlers, initialQty = 1, onDelete }) {
  const [qty, setQty] = useState(initialQty);

  const baseCal  = Math.round(food.calories ?? 0);
  const baseP    = Math.round(food.protein  ?? 0);
  const baseC    = Math.round(food.total_carbohydrate ?? 0);
  const baseF    = Math.round(food.total_fat ?? 0);
  const baseSF   = Math.round(food.saturated_fat ?? 0);
  const baseTF   = Math.round(food.trans_fat ?? 0);
  const baseChol = Math.round(food.cholesterol ?? 0);
  const baseNa   = Math.round(food.sodium ?? 0);
  const baseFib  = Math.round(food.dietary_fiber ?? 0);
  const baseSug  = Math.round(food.total_sugars ?? 0);

  const rows = [
    { label: "Total Fat",      value: `${baseF}g` },
    { label: "Saturated Fat",  value: `${baseSF}g`, indent: true },
    { label: "Trans Fat",      value: `${baseTF}g`, indent: true },
    { label: "Cholesterol",    value: `${baseChol}mg` },
    { label: "Sodium",         value: `${baseNa}mg` },
    { label: "Total Carbs",    value: `${baseC}g` },
    { label: "Dietary Fiber",  value: `${baseFib}g`, indent: true },
    { label: "Total Sugars",   value: `${baseSug}g`, indent: true },
    { label: "Protein",        value: `${baseP}g` },
  ];

  return (
    <View style={s.detailView}>
      <View style={s.detailHeader} {...panHandlers}>
        <Pressable
          style={({ pressed }) => [s.detailBackBtn, pressed && s.pressed]}
          onPress={onBack}
        >
          <Text style={s.detailBackText}>‹ Back</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.detailXBtn, pressed && s.pressed]}
          onPress={onBack}
        >
          <Text style={s.detailXText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={s.detailFoodName}>{food.name}</Text>
        {food.serving_size ? (
          <Text style={s.detailServing}>Per serving · {food.serving_size}</Text>
        ) : null}

        <View style={s.detailCalBlock}>
          <Text style={s.detailCalNum}>{baseCal}</Text>
          <Text style={s.detailCalLabel}>Calories per serving</Text>
        </View>

        <View style={s.detailSection}>
          {rows.map((row, i) => (
            <View key={row.label}>
              {i > 0 && <View style={s.detailDivider} />}
              <View style={[s.detailRow, row.indent && s.detailRowIndented]}>
                <Text style={[s.detailRowLabel, row.indent && s.detailRowLabelSoft]}>
                  {row.label}
                </Text>
                <Text style={s.detailRowValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {food.allergens ? (
          <Text style={s.detailAllergens}>Allergens: {food.allergens}</Text>
        ) : null}

        <View style={s.quantitySection}>
          <Text style={s.quantityLabel}>Quantity</Text>
          <View style={s.quantityRow}>
            <Pressable
              style={({ pressed }) => [s.quantityBtn, pressed && s.pressed]}
              onPress={() => {
                if (qty === 1 && onDelete) { onDelete(); }
                else { setQty(q => Math.max(1, q - 1)); }
              }}
            >
              <Text style={s.quantityBtnText}>−</Text>
            </Pressable>
            <Text style={s.quantityNum}>{qty}</Text>
            <Pressable
              style={({ pressed }) => [s.quantityBtn, pressed && s.pressed]}
              onPress={() => setQty(q => q + 1)}
            >
              <Text style={s.quantityBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.saveBtn,
            { borderColor: meal?.accent ?? C.green },
            pressed && s.pressed,
          ]}
          onPress={() => onSave(food, qty)}
        >
          <Text style={[s.saveBtnText, { color: meal?.accent ?? C.green }]}>
            Save to {meal?.label}  ·  {baseCal * qty} cal
          </Text>
        </Pressable>

        {onDelete && (
          <Pressable
            style={({ pressed }) => [s.deleteBtn, pressed && s.pressed]}
            onPress={onDelete}
          >
            <Text style={s.deleteBtnText}>Remove from Log</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function FoodSearchModal({ visible, meal, onClose, recentFoods, onFoodAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const searchTimer = useRef(null);
  const translateY  = useRef(new Animated.Value(SCREEN_H)).current;
  const detailSlide = useRef(new Animated.Value(SCREEN_W)).current;
  const posRef      = useRef(SNAP_PARTIAL);

  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) { setResults([]); setError(null); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await postQuery("/getMenuItem", { query: q });
        setResults(data);
      } catch (e) {
        setError(e.message ?? "Could not reach server.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    translateY.setValue(SCREEN_H);
    detailSlide.setValue(SCREEN_W);
    posRef.current = SNAP_PARTIAL;
    Animated.spring(translateY, {
      toValue: SNAP_PARTIAL,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
    }).start();
  }
  prevVisible.current = visible;

  function close() {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 240,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(() => {
      setQuery("");
      setResults([]);
      setSelectedFood(null);
      detailSlide.setValue(SCREEN_W);
      onClose();
    });
  }

  function openDetail(food) {
    Keyboard.dismiss();
    setSelectedFood(food);
    Animated.timing(detailSlide, {
      toValue: 0,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }

  function closeDetail() {
    Animated.timing(detailSlide, {
      toValue: SCREEN_W,
      duration: 240,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(() => setSelectedFood(null));
  }

  function handleSave(food, qty) {
    const cal = Math.round((food.calories ?? 0) * qty);
    const p   = Math.round((food.protein  ?? 0) * qty);
    const c   = Math.round((food.total_carbohydrate ?? 0) * qty);
    const f   = Math.round((food.total_fat ?? 0) * qty);
    onFoodAdded({ ...food, cal, p, c, f, qty }, meal.mealId);
    close();
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      translateY.setOffset(posRef.current);
      translateY.setValue(0);
    },
    onPanResponderMove: (_, { dy }) => {
      translateY.setValue(Math.max(SNAP_FULL - posRef.current, dy));
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      translateY.flattenOffset();
      if (vy > 0.3 || dy > 40) {
        close();
      } else if (vy < -0.3 || dy < -40) {
        posRef.current = SNAP_FULL;
        Animated.spring(translateY, { toValue: SNAP_FULL, useNativeDriver: true, damping: 22, stiffness: 180 }).start();
      } else {
        Animated.spring(translateY, { toValue: posRef.current, useNativeDriver: true, damping: 22, stiffness: 180 }).start();
      }
    },
  })).current;

  const detailPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderGrant: () => {
      detailSlide.setOffset(0);
      detailSlide.setValue(0);
    },
    onPanResponderMove: (_, { dx }) => {
      if (dx > 0) detailSlide.setValue(dx);
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      detailSlide.flattenOffset();
      if (dx > 80 || vx > 0.5) {
        closeDetail();
      } else {
        Animated.spring(detailSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 180,
        }).start();
      }
    },
  })).current;

  const borderRadius = translateY.interpolate({
    inputRange: [SNAP_FULL, SNAP_PARTIAL],
    outputRange: [0, 16],
    extrapolate: "clamp",
  });
  const backdropOpacity = translateY.interpolate({
    inputRange: [SNAP_FULL, SNAP_PARTIAL, SCREEN_H],
    outputRange: [0.72, 0.55, 0],
    extrapolate: "clamp",
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={RNStyleSheet.absoluteFill}>
        <Animated.View style={[RNStyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            s.searchSheet,
            {
              transform: [{ translateY }],
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
            },
          ]}
        >
          <View style={s.searchDragZone} {...pan.panHandlers}>
            <View style={s.searchHandle} />
          </View>

          <View style={{ flex: 1, overflow: "hidden" }}>
            {/* Search content */}
            <View style={s.searchTitleRow}>
              <Text style={s.searchTitle}>
                Add to <Text style={{ color: meal?.accent }}>{meal?.label}</Text>
              </Text>
              <Pressable onPress={close} style={({ pressed }) => pressed && s.pressed}>
                <Text style={s.searchDone}>Done</Text>
              </Pressable>
            </View>

            <View style={s.searchBarWrap}>
              <Text style={s.searchIcon}>⌕</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search for a food..."
                placeholderTextColor={C.soft}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
              />
            </View>

            {query.trim().length === 0 ? (
              recentFoods.length === 0 ? (
                <View style={s.searchEmptyState}>
                  <Text style={s.searchEmptyText}>Search for a food item</Text>
                  <Text style={s.searchEmptySub}>Type a name above to get started</Text>
                </View>
              ) : (
                <>
                  <Text style={s.searchSectionLabel}>Recently Added</Text>
                  <FlatList
                    data={recentFoods}
                    keyExtractor={item => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={s.searchResultSep} />}
                    renderItem={({ item }) => (
                      <FoodRow item={item} onSelect={openDetail} />
                    )}
                  />
                </>
              )
            ) : loading ? (
              <View style={s.searchEmptyState}>
                <Text style={s.searchEmptyText}>Searching…</Text>
              </View>
            ) : error ? (
              <View style={s.searchEmptyState}>
                <Text style={s.searchEmptyText}>{error}</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={s.searchEmptyState}>
                <Text style={s.searchEmptyText}>No results for "{query}"</Text>
                <Text style={s.searchEmptySub}>Try a different search term</Text>
              </View>
            ) : (
              <>
                <Text style={s.searchSectionLabel}>Results</Text>
                <FlatList
                  data={results}
                  keyExtractor={item => String(item.id)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={s.searchResultSep} />}
                  renderItem={({ item }) => (
                    <FoodRow item={item} onSelect={openDetail} />
                  )}
                />
              </>
            )}

            {/* Detail view — slides in from the right */}
            <Animated.View
              style={[
                RNStyleSheet.absoluteFill,
                { transform: [{ translateX: detailSlide }], backgroundColor: C.surface },
              ]}
              pointerEvents={selectedFood ? "auto" : "none"}
            >
              {selectedFood ? (
                <FoodDetailView
                  key={selectedFood.id}
                  food={selectedFood}
                  meal={meal}
                  onBack={closeDetail}
                  onSave={handleSave}
                  panHandlers={detailPan.panHandlers}
                />
              ) : null}
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Nutrition direction: 'more' = hitting goal is good, 'less' = staying under is good, 'range' = both matter
const NUTRIENT_DIR = {
  calories: 'range', fat: 'range',  carbs: 'range',
  sat_fat: 'less',   trans_fat: 'less', cholesterol: 'less', sodium: 'less', sugar: 'less',
  fiber: 'more',     protein: 'more',   vit_d: 'more', calcium: 'more', iron: 'more', potassium: 'more',
};
const GOAL_KEY = {
  calories: 'goal_calories',      fat: 'goal_total_fat',
  sat_fat: 'goal_saturated_fat',  trans_fat: 'goal_trans_fat',
  cholesterol: 'goal_cholesterol', sodium: 'goal_sodium',
  carbs: 'goal_total_carbohydrate', fiber: 'goal_dietary_fiber',
  sugar: 'goal_total_sugars',     protein: 'goal_protein',
  vit_d: 'goal_vitamin_d',        calcium: 'goal_calcium',
  iron: 'goal_iron',              potassium: 'goal_potassium',
};

function nColor(key, value, goals) {
  if (!goals || value === 0) return C.text;
  const g = goals[GOAL_KEY[key]];
  if (!g) return C.text;
  const r = value / g;
  if (NUTRIENT_DIR[key] === 'more')  return r >= 0.8 && r <= 1.2  ? C.green : C.text;
  if (NUTRIENT_DIR[key] === 'less')  return r >= 0.6 && r <= 1.05 ? C.green : C.text;
  return r >= 0.8 && r <= 1.15      ? C.green : C.text;
}

function fmtVal(key, value, unit, goals, mode) {
  const g = goals?.[GOAL_KEY[key]];
  if (mode === 'amount' || !g) return `${value}${unit}`;
  if (mode === 'vs_goal')      return `${value}${unit} / ${Math.round(g)}${unit}`;
  return `${Math.round((value / g) * 100)}%`;
}

function NutritionBreakdownModal({ visible, totals, goals, calorieGoal, dateLabel, onClose }) {
  const [mode, setMode] = useState('vs_goal');

  if (!visible || !totals) return null;

  const cal      = totals.calories ?? 0;
  const progress = Math.min(Math.max(cal / calorieGoal, 0), 1);
  const isOver   = cal > calorieGoal;

  const macroRows = [
    { key: 'fat',         label: 'Total Fat',      value: totals.fat,         unit: 'g'  },
    { key: 'sat_fat',     label: 'Saturated Fat',  value: totals.sat_fat,     unit: 'g',  indent: true },
    { key: 'trans_fat',   label: 'Trans Fat',      value: totals.trans_fat,   unit: 'g',  indent: true },
    { key: 'cholesterol', label: 'Cholesterol',    value: totals.cholesterol, unit: 'mg' },
    { key: 'sodium',      label: 'Sodium',         value: totals.sodium,      unit: 'mg' },
    { key: 'carbs',       label: 'Total Carbs',    value: totals.carbs,       unit: 'g'  },
    { key: 'fiber',       label: 'Dietary Fiber',  value: totals.fiber,       unit: 'g',  indent: true },
    { key: 'sugar',       label: 'Total Sugars',   value: totals.sugar,       unit: 'g',  indent: true },
    { key: 'protein',     label: 'Protein',        value: totals.protein,     unit: 'g'  },
  ];

  const microRows = [
    { key: 'vit_d',     label: 'Vitamin D',  value: totals.vit_d,      unit: 'mcg' },
    { key: 'calcium',   label: 'Calcium',    value: totals.calcium,    unit: 'mg'  },
    { key: 'iron',      label: 'Iron',       value: totals.iron,       unit: 'mg'  },
    { key: 'potassium', label: 'Potassium',  value: totals.potassium,  unit: 'mg'  },
  ];

  // calorie display adapts to mode
  const calGoalObj = goals ? { goal_calories: calorieGoal } : null;
  const calDisplay = mode === 'pct' && goals
    ? `${Math.round((cal / calorieGoal) * 100)}%`
    : mode === 'vs_goal' && goals
    ? `${cal} / ${calorieGoal}`
    : `${cal}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.nbOverlay}>
        <View style={s.nbSheet}>

          <View style={s.nbHeader}>
            <View>
              <Text style={s.nbTitle}>Nutrition Summary</Text>
              <Text style={s.nbSubtitle}>{dateLabel}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.nbCloseBtn, pressed && s.pressed]}
              onPress={onClose}
            >
              <Text style={s.nbCloseText}>✕</Text>
            </Pressable>
          </View>

          {goals && (
            <View style={s.nbModeRow}>
              {[
                { k: 'amount',  l: 'Amount'    },
                { k: 'vs_goal', l: 'Targets'   },
                { k: 'pct',     l: '% of Goal' },
              ].map(m => (
                <Pressable
                  key={m.k}
                  style={[s.nbModeBtn, mode === m.k && s.nbModeBtnActive]}
                  onPress={() => setMode(m.k)}
                >
                  <Text style={[s.nbModeBtnText, mode === m.k && s.nbModeBtnTextActive]}>
                    {m.l}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 48 }}
          >
            <View style={s.nbCalBlock}>
              <Text style={[s.nbCalNum, { color: nColor('calories', cal, calGoalObj) }]}>
                {calDisplay}
              </Text>
              <Text style={s.nbCalLabel}>
                {mode === 'pct' && goals ? 'of daily calorie goal' : 'kcal consumed'}
              </Text>
              <View style={s.nbGoalRow}>
                <Text style={s.nbGoalText}>Goal: {calorieGoal} kcal</Text>
                <Text style={[s.nbGoalText, { color: isOver ? C.danger : C.green }]}>
                  {isOver ? `${cal - calorieGoal} over` : `${calorieGoal - cal} remaining`}
                </Text>
              </View>
              <View style={s.nbProgressTrack}>
                <View style={[s.nbProgressFill, { width: `${progress * 100}%` }, isOver && { backgroundColor: C.danger }]} />
              </View>
            </View>

            <View style={s.nbMacroRow}>
              <View style={s.nbMacroPill}>
                <Text style={[s.nbMacroVal, { color: nColor('protein', totals.protein, goals) }]}>
                  {fmtVal('protein', totals.protein, 'g', goals, mode)}
                </Text>
                <Text style={s.nbMacroLbl}>Protein</Text>
              </View>
              <View style={s.nbMacroDivider} />
              <View style={s.nbMacroPill}>
                <Text style={[s.nbMacroVal, { color: nColor('carbs', totals.carbs, goals) }]}>
                  {fmtVal('carbs', totals.carbs, 'g', goals, mode)}
                </Text>
                <Text style={s.nbMacroLbl}>Carbs</Text>
              </View>
              <View style={s.nbMacroDivider} />
              <View style={s.nbMacroPill}>
                <Text style={[s.nbMacroVal, { color: nColor('fat', totals.fat, goals) }]}>
                  {fmtVal('fat', totals.fat, 'g', goals, mode)}
                </Text>
                <Text style={s.nbMacroLbl}>Fat</Text>
              </View>
            </View>

            <Text style={s.nbSectionLabel}>Nutrition Facts</Text>
            <View style={s.detailSection}>
              {macroRows.map((row, i) => (
                <View key={row.key}>
                  {i > 0 && <View style={s.detailDivider} />}
                  <View style={[s.detailRow, row.indent && s.detailRowIndented]}>
                    <Text style={[s.detailRowLabel, row.indent && s.detailRowLabelSoft]}>
                      {row.label}
                    </Text>
                    <Text style={[s.detailRowValue, { color: nColor(row.key, row.value, goals) }]}>
                      {fmtVal(row.key, row.value, row.unit, goals, mode)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.nbSectionLabel}>Micronutrients</Text>
            <View style={s.detailSection}>
              {microRows.map((row, i) => (
                <View key={row.key}>
                  {i > 0 && <View style={s.detailDivider} />}
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>{row.label}</Text>
                    <Text style={[s.detailRowValue, { color: nColor(row.key, row.value, goals) }]}>
                      {fmtVal(row.key, row.value, row.unit, goals, mode)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CalendarModal({ visible, selected, onSelect, onClose }) {
  const [view, setView] = useState(() => new Date(selected));
  const today = new Date();

  const year  = view.getFullYear();
  const month = view.getMonth();

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }
  function nextMonth() {
    setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }

  function isSelected(day) {
    return day &&
      day === selected.getDate() &&
      month === selected.getMonth() &&
      year === selected.getFullYear();
  }

  function isTodayCell(day) {
    return day &&
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.calendarCard} onPress={() => {}}>
          <View style={s.calMonthRow}>
            <Pressable style={s.calMonthArrow} onPress={prevMonth}>
              <Text style={s.calMonthArrowText}>‹</Text>
            </Pressable>
            <Text style={s.calMonthLabel}>{MONTHS[month]} {year}</Text>
            <Pressable style={s.calMonthArrow} onPress={nextMonth}>
              <Text style={s.calMonthArrowText}>›</Text>
            </Pressable>
          </View>

          <View style={s.calGrid}>
            {WEEKDAYS.map(d => (
              <View key={d} style={s.calDayHeader}>
                <Text style={s.calDayHeaderText}>{d}</Text>
              </View>
            ))}
            {cells.map((day, i) => {
              const sel   = isSelected(day);
              const tod   = isTodayCell(day);
              return (
                <Pressable
                  key={i}
                  style={[s.calCell, sel && s.calCellSelected, !sel && tod && s.calCellToday]}
                  onPress={() => day && onSelect(new Date(year, month, day))}
                  disabled={!day}
                >
                  {day ? (
                    <Text style={[
                      s.calCellText,
                      sel && s.calCellSelectedText,
                      !sel && tod && s.calCellTodayText,
                    ]}>
                      {day}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
