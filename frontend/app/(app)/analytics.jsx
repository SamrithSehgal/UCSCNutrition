import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useDrawer } from "../drawerContext";
import { C } from "../styles/dashboard.styles";

const MACRO_BARS = [
  { label: "Protein",  pct: 0.72, color: C.blue,       unit: "g", value: 118 },
  { label: "Carbs",    pct: 0.55, color: C.mLunch,     unit: "g", value: 210 },
  { label: "Fat",      pct: 0.41, color: C.mBreakfast, unit: "g", value: 58  },
  { label: "Fiber",    pct: 0.30, color: C.green,      unit: "g", value: 14  },
];

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEK_VALS = [0.55, 0.88, 0.71, 0.64, 0.92, 0.45, 0.0];

export default function Analytics() {
  const { openDrawer } = useDrawer();
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <SafeAreaView style={as.safe}>
      <StatusBar barStyle="light-content" />

      <View style={as.header}>
        <Text style={as.title}>Analytics</Text>
        <Pressable
          style={({ pressed }) => [as.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
      </View>

      <View style={as.subRow}>
        <Ionicons name="trending-up-outline" size={13} color={C.faint} style={{ marginRight: 5 }} />
        <Text style={as.subText}>This week's nutrition overview</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={as.scroll}
      >
        {/* Calorie streak card */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <Text style={as.cardTitle}>Weekly Calories</Text>
            <View style={as.badgeRow}>
              <Ionicons name="flame-outline" size={13} color={C.mBreakfast} />
              <Text style={[as.badge, { color: C.mBreakfast }]}>5 day streak</Text>
            </View>
          </View>

          <View style={as.weekRow}>
            {WEEK_DAYS.map((d, i) => {
              const isToday  = i === todayIdx;
              const isEmpty  = WEEK_VALS[i] === 0;
              const barH     = isEmpty ? 4 : Math.max(WEEK_VALS[i] * 72, 8);
              return (
                <View key={i} style={as.weekCol}>
                  <View style={as.barTrack}>
                    <View
                      style={[
                        as.barFill,
                        { height: barH, backgroundColor: isToday ? C.blue : C.raised },
                        isEmpty && { backgroundColor: C.border, opacity: 0.4 },
                      ]}
                    />
                  </View>
                  <Text style={[as.dayLabel, isToday && { color: C.blue, fontWeight: "600" }]}>
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={as.calSummaryRow}>
            <View style={as.calStat}>
              <Text style={as.calStatVal}>1,840</Text>
              <Text style={as.calStatLbl}>Avg / day</Text>
            </View>
            <View style={as.calStatDivider} />
            <View style={as.calStat}>
              <Text style={as.calStatVal}>2,000</Text>
              <Text style={as.calStatLbl}>Daily goal</Text>
            </View>
            <View style={as.calStatDivider} />
            <View style={as.calStat}>
              <Text style={[as.calStatVal, { color: C.green }]}>−160</Text>
              <Text style={as.calStatLbl}>Avg deficit</Text>
            </View>
          </View>
        </View>

        {/* Macro breakdown */}
        <View style={as.card}>
          <Text style={as.cardTitle}>Macros — Today</Text>
          <View style={as.macroList}>
            {MACRO_BARS.map((m) => (
              <View key={m.label} style={as.macroRow}>
                <View style={as.macroLabelRow}>
                  <Text style={as.macroLabel}>{m.label}</Text>
                  <Text style={[as.macroVal, { color: m.color }]}>
                    {m.value}{m.unit}
                  </Text>
                </View>
                <View style={as.macroTrack}>
                  <View
                    style={[
                      as.macroFill,
                      { width: `${m.pct * 100}%`, backgroundColor: m.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Coming soon hint */}
        <View style={[as.card, as.comingSoon]}>
          <Ionicons name="construct-outline" size={20} color={C.faint} style={{ marginBottom: 10 }} />
          <Text style={as.comingSoonTitle}>More insights coming</Text>
          <Text style={as.comingSoonSub}>
            Trends, goal progress, and nutrient breakdowns over time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const as = StyleSheet.create({
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
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 48,
    gap: 10,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.raised,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Week bar chart
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  weekCol: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  barTrack: {
    height: 72,
    justifyContent: "flex-end",
  },
  barFill: {
    width: 22,
    borderRadius: 5,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    color: C.faint,
    fontWeight: "500",
  },

  calSummaryRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
  },
  calStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  calStatDivider: {
    width: 1,
    backgroundColor: C.border,
    alignSelf: "stretch",
  },
  calStatVal: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
    fontVariant: ["tabular-nums"],
  },
  calStatLbl: {
    fontSize: 10,
    color: C.soft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Macro bars
  macroList: {
    gap: 14,
    marginTop: -4,
  },
  macroRow: {
    gap: 7,
  },
  macroLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  macroLabel: {
    fontSize: 13,
    color: C.soft,
    fontWeight: "500",
  },
  macroVal: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  macroTrack: {
    height: 5,
    backgroundColor: C.raised,
    borderRadius: 3,
    overflow: "hidden",
  },
  macroFill: {
    height: 5,
    borderRadius: 3,
  },

  // Coming soon
  comingSoon: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: C.raised,
    borderStyle: "dashed",
  },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.soft,
    marginBottom: 6,
  },
  comingSoonSub: {
    fontSize: 13,
    color: C.faint,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 220,
  },
});
