import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TouchableOpacity, Modal,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  Animated, Easing,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";
import { useMenu } from "../../menuContext";
import { C } from "../../styles/dashboard.styles";
import { post } from "../../api";

const DINING_HALLS = new Set([
  "John R. Lewis & College Nine",
  "Cowell & Stevenson",
  "Crown & Merrill",
  "Porter & Kresge",
  "Rachel Carson & Oakes",
]);

const CAFE_TYPE = {
  "Banana Joe's": "Cafe", "Oakes Cafe": "Cafe",
  "Global Village Cafe": "Cafe", "Owl's Nest Cafe": "Cafe",
  "UCen Coffee Bar": "Coffee", "Stevenson Coffee House": "Coffee",
  "Perk Coffee Bar": "Coffee", "Porter Market": "Market",
  "Merrill Market": "Market",
};

const JOURNAL_MEALS = [
  { label: "Breakfast", num: 1, color: C.mBreakfast },
  { label: "Lunch", num: 2, color: C.mLunch },
  { label: "Dinner", num: 3, color: C.mDinner },
  { label: "Snacks", num: 4, color: C.mSnacks },
];

function getLocationType(name) {
  if (DINING_HALLS.has(name)) return "Dining Hall";
  return CAFE_TYPE[name] ?? "Cafe";
}

function pickDefaultMeal(meals) {
  const h = new Date().getHours();
  const pref = h < 10 ? "Breakfast" : h < 14 ? "Lunch" : h < 20 ? "Dinner" : "Late Night";
  return meals.includes(pref) ? pref : meals[0] ?? null;
}

function ItemRow({ item, onAdd, added }) {
  const cal = Math.round(item.calories ?? 0);
  const p   = Math.round(item.protein ?? 0);
  const c   = Math.round(item.total_carbohydrate ?? 0);
  const f   = Math.round(item.total_fat ?? 0);

  const scale = useRef(new Animated.Value(1)).current;

  function handleAdd() {
    if (added) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 200 }),
    ]).start();
    onAdd(item);
  }

  return (
    <View style={hs.itemRow}>
      <View style={hs.itemLeft}>
        <Text style={hs.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={hs.itemMeta}>
          {`P ${p}g  ·  C ${c}g  ·  F ${f}g`}
          {item.serving_size ? `  ·  ${item.serving_size}` : ""}
        </Text>
      </View>
      <View style={hs.itemCalCol}>
        <Text style={hs.itemCal}>{cal || "—"}</Text>
        {!!cal && <Text style={hs.itemCalUnit}>kcal</Text>}
      </View>
      <Pressable onPress={handleAdd} hitSlop={8}>
        <Animated.View style={[hs.addBtn, added && hs.addBtnDone, { transform: [{ scale }] }]}>
          <Ionicons
            name={added ? "checkmark" : "add"}
            size={15}
            color={added ? C.green : C.soft}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default function HallDetail() {
  const { hall } = useLocalSearchParams();
  const { menu, loading, fetchMenu } = useMenu();

  const [selectedMeal, setSelectedMeal] = useState(null);
  const [addingItem, setAddingItem]     = useState(null);
  const [addedItems, setAddedItems]     = useState({});

  const hallMenu = menu?.[hall];
  const meals    = hallMenu ? Object.keys(hallMenu) : [];
  const items    = (hallMenu && selectedMeal) ? (hallMenu[selectedMeal] ?? []) : [];
  const locType  = getLocationType(hall);

  useEffect(() => {
    if (!menu && !loading) fetchMenu();
  }, []);

  useEffect(() => {
    if (meals.length > 0 && !selectedMeal) {
      setSelectedMeal(pickDefaultMeal(meals));
    }
  }, [meals.length]);

  async function confirmAdd(journalMealNum) {
    const item  = addingItem;
    const email = auth().currentUser?.email;
    setAddingItem(null);
    if (!email || !item) return;
    setAddedItems(prev => ({ ...prev, [item.id]: journalMealNum }));
    try {
      await post("/addToMeal", {
        user_email:   email,
        date:         (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })(),
        meal_num:     journalMealNum,
        menu_item_id: item.id,
      });
    } catch (_) {
      setAddedItems(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  }

  return (
    <SafeAreaView style={hs.safe}>
      <StatusBar barStyle="light-content" />

      <View style={hs.header}>
        <Pressable
          style={({ pressed }) => [hs.backBtn, pressed && { opacity: 0.45 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={C.soft} />
        </Pressable>
        <View style={hs.headerText}>
          <Text style={hs.hallName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {hall}
          </Text>
          <Text style={hs.hallType}>{locType}</Text>
        </View>
      </View>

      {(loading && !menu) ? (
        <View style={hs.centerState}>
          <ActivityIndicator color={C.soft} />
        </View>
      ) : !hallMenu || meals.length === 0 ? (
        <View style={hs.centerState}>
          <Ionicons name="restaurant-outline" size={32} color={C.faint} />
          <Text style={hs.emptyTitle}>No menu today</Text>
          <Text style={hs.emptySubtitle}>Check back later or try another location.</Text>
        </View>
      ) : (
        <>
          <View style={hs.tabRow}>
            {meals.map((meal) => {
              const active = selectedMeal === meal;
              return (
                <TouchableOpacity
                  key={meal}
                  onPress={() => setSelectedMeal(meal)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? "#5080BC" : "#303030",
                    backgroundColor: active ? "#5080BC" : "#262626",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: active ? "600" : "500",
                    color: active ? "#ffffff" : "#D0D0D0",
                  }}>
                    {meal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={hs.listHeader}>
            <Text style={hs.listCount}>{items.length} items</Text>
            <Text style={hs.listHint}>Tap + to add to journal</Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 48 }}
            ItemSeparatorComponent={() => <View style={hs.itemSep} />}
            renderItem={({ item }) => (
              <ItemRow
                item={item}
                added={!!addedItems[item.id]}
                onAdd={(i) => setAddingItem(i)}
              />
            )}
          />
        </>
      )}

      <Modal
        visible={addingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingItem(null)}
      >
        <View style={hs.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddingItem(null)} />
          <View style={hs.modalCard}>
            <Text style={hs.modalTitle}>Add to Journal</Text>
            <Text style={hs.modalItem} numberOfLines={2}>{addingItem?.name}</Text>
            <View style={hs.modalDivider} />
            {JOURNAL_MEALS.map((m) => (
              <Pressable
                key={m.num}
                style={({ pressed }) => [hs.modalRow, pressed && { backgroundColor: C.raised }]}
                onPress={() => confirmAdd(m.num)}
              >
                <View style={[hs.modalPip, { backgroundColor: m.color }]} />
                <Text style={hs.modalRowLabel}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={C.faint} />
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [hs.cancelRow, pressed && { opacity: 0.5 }]}
              onPress={() => setAddingItem(null)}
            >
              <Text style={hs.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const hs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, paddingLeft: 4 },
  hallName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  hallType: {
    fontSize: 12,
    color: C.faint,
    marginTop: 2,
    fontWeight: "400",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle:    { fontSize: 15, fontWeight: "600", color: C.soft },
  emptySubtitle: { fontSize: 13, color: C.faint, textAlign: "center", lineHeight: 19 },

  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  listCount: { fontSize: 12, color: C.faint, fontWeight: "500" },
  listHint:  { fontSize: 11, color: C.faint },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  itemSep: { height: 1, backgroundColor: C.raised, marginHorizontal: 18 },
  itemLeft: { flex: 1, marginRight: 12 },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 11,
    color: C.faint,
    marginTop: 3,
    lineHeight: 15,
  },
  itemCalCol: { alignItems: "flex-end", marginRight: 10 },
  itemCal:    { fontSize: 15, fontWeight: "600", color: C.text, fontVariant: ["tabular-nums"] },
  itemCalUnit:{ fontSize: 10, color: C.faint, marginTop: 1 },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDone: { borderColor: C.green, backgroundColor: "rgba(74,143,90,0.1)" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    width: "100%",
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    letterSpacing: -0.2,
  },
  modalItem: {
    fontSize: 13,
    color: C.soft,
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 18,
  },
  modalDivider: { height: 1, backgroundColor: C.border },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.raised,
  },
  modalPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  modalRowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: C.text },
  cancelRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, color: C.faint, fontWeight: "500" },
});
