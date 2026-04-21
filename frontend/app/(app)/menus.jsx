import { useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useDrawer } from "../drawerContext";
import { useMenu } from "../menuContext";
import { C } from "../styles/dashboard.styles";

const DINING_HALLS = [
  "John R. Lewis & College Nine",
  "Cowell & Stevenson",
  "Crown & Merrill",
  "Porter & Kresge",
  "Rachel Carson & Oakes",
];

const CAFES = [
  { name: "Banana Joe's",           type: "Cafe",    icon: "cafe-outline"   },
  { name: "Oakes Cafe",             type: "Cafe",    icon: "cafe-outline"   },
  { name: "Global Village Cafe",    type: "Cafe",    icon: "cafe-outline"   },
  { name: "Owl's Nest Cafe",        type: "Cafe",    icon: "cafe-outline"   },
  { name: "UCen Coffee Bar",        type: "Coffee",  icon: "cafe-outline"   },
  { name: "Stevenson Coffee House", type: "Coffee",  icon: "cafe-outline"   },
  { name: "Perk Coffee Bar",        type: "Coffee",  icon: "cafe-outline"   },
  { name: "Porter Market",          type: "Market",  icon: "bag-outline"    },
  { name: "Merrill Market",         type: "Market",  icon: "bag-outline"    },
];

const MEAL_COLOR = {
  "Breakfast":  C.mBreakfast,
  "Lunch":      C.mLunch,
  "Dinner":     C.mDinner,
  "Late Night": C.mSnacks,
  "After 11am": C.mDinner,
  "Menu":       C.faint,
  "All Day":    C.faint,
};

const TYPE_COLOR = {
  "Cafe":    C.mLunch,
  "Coffee":  C.mBreakfast,
  "Market":  C.green,
};

function goToHall(name) {
  router.push({ pathname: "/menu/[hall]", params: { hall: name } });
}

export default function Menus() {
  const { openDrawer } = useDrawer();
  const { menu, loading, error, fetchMenu } = useMenu();

  useEffect(() => {
    if (!menu && !loading) fetchMenu();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <SafeAreaView style={ms.safe}>
      <StatusBar barStyle="light-content" />

      <View style={ms.header}>
        <Pressable
          style={({ pressed }) => [ms.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={ms.title}>Menus</Text>
          <Text style={ms.dateLine}>{today}</Text>
        </View>
      </View>

      {loading ? (
        <View style={ms.centerState}>
          <ActivityIndicator color={C.soft} size="small" />
          <Text style={ms.stateText}>Loading today's menus…</Text>
        </View>
      ) : error ? (
        <View style={ms.centerState}>
          <Ionicons name="cloud-offline-outline" size={32} color={C.faint} />
          <Text style={ms.stateText}>Couldn't load menus</Text>
          <Pressable onPress={() => fetchMenu()} style={ms.retryBtn}>
            <Text style={ms.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ms.scroll}
        >
          <View style={ms.sectionRow}>
            <Text style={ms.sectionLabel}>Dining Halls</Text>
            <Text style={ms.sectionCount}>{DINING_HALLS.length} locations</Text>
          </View>

          {DINING_HALLS.map((name) => {
            const hallMenu = menu?.[name];
            const meals = hallMenu ? Object.keys(hallMenu) : [];
            const hasMenu = meals.length > 0;
            return (
              <Pressable
                key={name}
                style={({ pressed }) => [ms.dhCard, pressed && ms.dhCardPressed]}
                onPress={() => goToHall(name)}
              >
                <View style={ms.dhCardInner}>
                  <View style={ms.dhLeft}>
                    <Text style={ms.dhName}>{name}</Text>
                    {hasMenu ? (
                      <View style={ms.mealRow}>
                        {meals.map((meal, i) => (
                          <View key={meal} style={ms.mealItem}>
                            {i > 0 && <Text style={ms.mealDot}>·</Text>}
                            <View style={[ms.mealPip, { backgroundColor: MEAL_COLOR[meal] ?? C.faint }]} />
                            <Text style={ms.mealName}>{meal}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={ms.closedText}>No menu today</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={C.faint} style={{ marginTop: 2 }} />
                </View>
              </Pressable>
            );
          })}

          <View style={[ms.sectionRow, { marginTop: 28 }]}>
            <Text style={ms.sectionLabel}>Cafes & Markets</Text>
            <Text style={ms.sectionCount}>{CAFES.length} locations</Text>
          </View>

          <View style={ms.cafeGroup}>
            {CAFES.map((cafe, i) => (
              <View key={cafe.name}>
                {i > 0 && <View style={ms.cafeSep} />}
                <Pressable
                  style={({ pressed }) => [ms.cafeRow, pressed && { backgroundColor: C.raised }]}
                  onPress={() => goToHall(cafe.name)}
                >
                  <Ionicons name={cafe.icon} size={16} color={C.faint} style={ms.cafeIcon} />
                  <Text style={ms.cafeName}>{cafe.name}</Text>
                  <Text style={[ms.cafeType, { color: TYPE_COLOR[cafe.type] ?? C.soft }]}>
                    {cafe.type}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={C.faint} />
                </Pressable>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  dateLine: {
    fontSize: 13,
    color: C.faint,
    marginTop: 3,
    fontWeight: "400",
  },
  menuBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    marginTop: 4,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: { fontSize: 15, color: C.soft, fontWeight: "500" },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  retryText: { fontSize: 14, color: C.soft, fontWeight: "500" },

  scroll: { paddingHorizontal: 16 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.soft,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  sectionCount: { fontSize: 12, color: C.faint },

  dhCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 9,
  },
  dhCardPressed: { opacity: 0.6 },
  dhCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  dhLeft: { flex: 1, marginRight: 10 },
  dhName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mealDot: {
    fontSize: 10,
    color: C.faint,
    lineHeight: 14,
  },
  mealPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mealName: {
    fontSize: 12,
    color: C.soft,
    fontWeight: "500",
  },
  closedText: {
    fontSize: 12,
    color: C.faint,
    fontStyle: "italic",
  },

  cafeGroup: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  cafeSep: { height: 1, backgroundColor: C.border, marginLeft: 48 },
  cafeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cafeIcon: { marginRight: 12, width: 20, textAlign: "center" },
  cafeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
  },
  cafeType: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginRight: 8,
  },
});
