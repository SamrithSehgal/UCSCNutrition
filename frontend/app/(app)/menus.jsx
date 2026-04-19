import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDrawer } from "../drawerContext";
import { C } from "../styles/dashboard.styles";

const LOCATIONS = [
  { name: "John R. Lewis & College Nine", num: 40,  tag: "Dining Hall", meals: ["Breakfast", "Lunch", "Dinner", "Late Night"] },
  { name: "Cowell & Stevenson",           num: 5,   tag: "Dining Hall", meals: ["Breakfast", "Lunch", "Dinner", "Late Night"] },
  { name: "Crown & Merrill",              num: 20,  tag: "Dining Hall", meals: ["Breakfast", "Lunch", "Dinner"] },
  { name: "Porter & Kresge",             num: 25,  tag: "Dining Hall", meals: ["Breakfast", "Lunch", "Dinner"] },
  { name: "Rachel Carson & Oakes",       num: 30,  tag: "Dining Hall", meals: ["Breakfast", "Lunch", "Dinner", "Late Night"] },
  { name: "Banana Joe's",                num: 21,  tag: "Cafe",        meals: ["Late Night"] },
  { name: "Oakes Cafe",                  num: 23,  tag: "Cafe",        meals: ["Breakfast", "All Day"] },
  { name: "Global Village Cafe",         num: 46,  tag: "Cafe",        meals: ["Menu"] },
  { name: "Owl's Nest Cafe",             num: 24,  tag: "Cafe",        meals: ["Breakfast", "All Day"] },
  { name: "Stevenson Coffee House",      num: 26,  tag: "Coffee",      meals: ["Menu"] },
  { name: "Porter Market",               num: 50,  tag: "Market",      meals: ["Menu"] },
  { name: "Merrill Market",              num: 47,  tag: "Market",      meals: ["Menu"] },
];

const TAG_COLORS = {
  "Dining Hall": C.blue,
  "Cafe":        C.mDinner,
  "Coffee":      C.mBreakfast,
  "Market":      C.mSnacks,
};

export default function Menus() {
  const { openDrawer } = useDrawer();

  return (
    <SafeAreaView style={ms.safe}>
      <StatusBar barStyle="light-content" />

      <View style={ms.header}>
        <Text style={ms.title}>Menus</Text>
        <Pressable
          style={({ pressed }) => [ms.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
      </View>

      <View style={ms.subRow}>
        <Ionicons name="calendar-outline" size={13} color={C.faint} style={{ marginRight: 5 }} />
        <Text style={ms.subText}>Today's dining locations</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ms.list}
      >
        {LOCATIONS.map((loc) => (
          <Pressable
            key={loc.num}
            style={({ pressed }) => [ms.card, pressed && { opacity: 0.65 }]}
          >
            <View style={ms.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={ms.cardName} numberOfLines={1}>{loc.name}</Text>
                <View style={ms.mealRow}>
                  {loc.meals.map((m) => (
                    <View key={m} style={ms.mealChip}>
                      <Text style={ms.mealChipText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={ms.cardRight}>
                <View style={[ms.tagPill, { borderColor: TAG_COLORS[loc.tag] + "44" }]}>
                  <Text style={[ms.tagText, { color: TAG_COLORS[loc.tag] }]}>{loc.tag}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.faint} style={{ marginTop: 8 }} />
              </View>
            </View>
          </Pressable>
        ))}

        <View style={ms.footer}>
          <Ionicons name="information-circle-outline" size={14} color={C.faint} />
          <Text style={ms.footerText}>Menus update daily from UCSC Dining</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
  },
  menuBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 4,
  },
  subText: {
    fontSize: 13,
    color: C.faint,
    fontWeight: "400",
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  mealRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  mealChip: {
    backgroundColor: C.raised,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mealChipText: {
    fontSize: 11,
    color: C.soft,
    fontWeight: "500",
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  tagPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: C.faint,
  },
});
