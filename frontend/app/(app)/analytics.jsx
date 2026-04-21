import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";
import { useDrawer } from "../drawerContext";
import { C } from "../styles/dashboard.styles";
import { post, get } from "../api";

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES = ["1W", "1M", "6M", "1Y"];
const RANGE_DAYS = { "1W": 7, "1M": 30, "6M": 182, "1Y": 365 };

const FIELDS = [
  "calories", "protein", "carbs", "fat", "fiber",
  "sodium", "sugar", "saturated_fat", "cholesterol",
  "vitamin_d", "calcium", "iron", "potassium",
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStartEnd(label) {
  const days = RANGE_DAYS[label];
  const now = new Date();
  const end = fmtDate(now);
  const startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  return { start: fmtDate(startD), end };
}

function fillDays(days, startStr, totalDays) {
  const map = {};
  days.forEach((d) => { map[d.date] = d.calories; });
  const [y, m, day] = startStr.split("-").map(Number);
  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(y, m - 1, day + i);
    const key = fmtDate(d);
    return { date: key, cal: map[key] ?? 0 };
  });
}

// ─── Aggregation for 6M / 1Y chart ──────────────────────────────────────────

function aggregateWeekly(allDays) {
  const out = [];
  for (let i = 0; i < allDays.length; i += 7) {
    const slice = allDays.slice(i, i + 7).filter((d) => d.cal > 0);
    out.push({
      date: allDays[i].date,
      cal: slice.length ? slice.reduce((s, d) => s + d.cal, 0) / slice.length : 0,
    });
  }
  return out;
}

function aggregateMonthly(allDays) {
  const months = {};
  allDays.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (!months[key]) months[key] = { date: d.date, total: 0, count: 0 };
    if (d.cal > 0) { months[key].total += d.cal; months[key].count++; }
  });
  return Object.values(months).map((m) => ({
    date: m.date,
    cal: m.count ? m.total / m.count : 0,
  }));
}

// ─── Bar chart ───────────────────────────────────────────────────────────────

function BarChart({ allDays, rangeLabel, goalCal }) {
  let bars;
  if (rangeLabel === "6M") bars = aggregateWeekly(allDays);
  else if (rangeLabel === "1Y") bars = aggregateMonthly(allDays);
  else bars = allDays;

  const maxCal = Math.max(...bars.map((b) => b.cal), goalCal || 0, 1);
  const today = fmtDate(new Date());

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 72, gap: 1.5 }}>
      {bars.map((b, i) => {
        const pct = b.cal / maxCal;
        const barH = b.cal > 0 ? Math.max(pct * 64, 3) : 2;
        const isToday = b.date === today;
        return (
          <View key={i} style={{ flex: 1, height: 72, justifyContent: "flex-end" }}>
            <View
              style={{
                height: barH,
                backgroundColor: b.cal === 0 ? C.raised : isToday ? C.blue : "#3A5878",
                borderRadius: 2,
                opacity: b.cal === 0 ? 0.5 : 1,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

// ─── Macro card ──────────────────────────────────────────────────────────────

function MacroCard({ label, value, unit, color, goal }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={as.macroCard}>
      <Text style={as.macroLabel}>{label}</Text>
      <Text style={[as.macroVal, { color }]}>
        {Math.round(value)}
        <Text style={as.macroUnit}>{unit}</Text>
      </Text>
      <View style={as.macroTrack}>
        <View
          style={[
            as.macroFill,
            { width: `${Math.round(pct * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      {goal > 0 && (
        <Text style={as.macroGoal}>of {Math.round(goal)}{unit}</Text>
      )}
    </View>
  );
}

// ─── Micro row ───────────────────────────────────────────────────────────────

function MicroRow({ label, value, unit, goal, accent }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = goal > 0 && value > goal * 1.05;
  const fillColor = over ? C.danger : (accent ?? C.faint);
  return (
    <View style={as.microRow}>
      <View style={as.microLabelRow}>
        <Text style={as.microLabel}>{label}</Text>
        <Text style={[as.microVal, over && { color: C.danger }]}>
          {Math.round(value)}
          <Text style={as.microUnit}> {unit}</Text>
        </Text>
      </View>
      <View style={as.microTrack}>
        <View
          style={[
            as.microFill,
            { width: `${Math.round(Math.min(pct, 1) * 100)}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      {goal > 0 && (
        <Text style={[as.microGoal, over && { color: C.danger }]}>
          {over
            ? `${Math.round(((value - goal) / goal) * 100)}% over`
            : `${Math.round(pct * 100)}% of goal`}
        </Text>
      )}
    </View>
  );
}

// ─── Header + range pills ────────────────────────────────────────────────────

function Header({ openDrawer, range, setRange, disabled }) {
  return (
    <>
      <View style={as.header}>
        <Pressable
          style={({ pressed }) => [as.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
        <Text style={as.title}>Analytics</Text>
      </View>

      <View style={as.pillRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            disabled={disabled}
            onPress={() => setRange(r)}
            style={[as.pill, r === range && as.pillActive]}
          >
            <Text style={[as.pillTxt, r === range && as.pillTxtActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const { openDrawer } = useDrawer();
  const [range, setRange]   = useState("1W");
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const goalsRef = useRef(null);
  const [goals, setGoals]   = useState(null);

  const fetchAll = useCallback(async (r) => {
    const email = auth().currentUser?.email;
    if (!email) return;
    const { start, end } = getStartEnd(r);
    setLoading(true);
    setError(null);
    try {
      const goalsPromise = goalsRef.current
        ? Promise.resolve(goalsRef.current)
        : get(`/getUserGoals?email=${encodeURIComponent(email)}`);
      const [rangeRes, goalsRes] = await Promise.all([
        post("/getJournalRange", { email, start, end }),
        goalsPromise,
      ]);
      setData(rangeRes);
      if (!goalsRef.current) {
        goalsRef.current = goalsRes;
        setGoals(goalsRes);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(range); }, [range]);

  // ── Derived values ──────────────────────────────────────────────────────
  const { start } = getStartEnd(range);
  const totalDays = RANGE_DAYS[range];
  const rawDays   = data?.days ?? [];
  const avgs      = data?.averages ?? {};
  const allDays   = fillDays(rawDays, start, totalDays);
  const logRate   = totalDays > 0 ? Math.round((rawDays.length / totalDays) * 100) : 0;
  const avgCal    = Math.round(avgs.calories || 0);
  const goalCal   = goals?.goal_calories || 0;
  const calDiff   = goalCal && avgCal ? avgCal - goalCal : null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={as.safe}>
      <StatusBar barStyle="light-content" />
      <Header openDrawer={openDrawer} range={range} setRange={setRange} disabled={loading} />

      {loading ? (
        <View style={as.center}>
          <ActivityIndicator color={C.soft} />
        </View>
      ) : error ? (
        <View style={as.center}>
          <Ionicons name="cloud-offline-outline" size={28} color={C.faint} />
          <Text style={as.errTxt}>Couldn't load data</Text>
          <Pressable onPress={() => fetchAll(range)} style={as.retryBtn}>
            <Text style={as.retryTxt}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={as.scroll}
        >
          {/* ── Calorie hero ── */}
          <View style={as.heroCard}>
            <View style={as.heroTop}>
              <View>
                <Text style={as.heroNum}>{avgCal || "—"}</Text>
                <Text style={as.heroSub}>avg calories / day</Text>
              </View>
              {calDiff !== null && (
                <View
                  style={[
                    as.diffBadge,
                    {
                      backgroundColor:
                        calDiff > 0
                          ? "rgba(158,64,64,0.12)"
                          : "rgba(74,143,90,0.12)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      as.diffTxt,
                      { color: calDiff > 0 ? C.danger : C.green },
                    ]}
                  >
                    {calDiff > 0 ? "+" : ""}
                    {calDiff} vs goal
                  </Text>
                </View>
              )}
            </View>

            <BarChart allDays={allDays} rangeLabel={range} goalCal={goalCal} />

            <View style={as.heroFooter}>
              <Text style={as.heroFooterTxt}>
                {rawDays.length} day{rawDays.length !== 1 ? "s" : ""} logged
              </Text>
              <Text style={as.heroFooterTxt}>{logRate}% consistency</Text>
            </View>
          </View>

          {/* ── Macros ── */}
          <Text style={as.sectionLabel}>MACROS — AVG / DAY</Text>
          <View style={as.macroSection}>
            <View style={as.macroRow}>
              <MacroCard
                label="Protein"
                value={avgs.protein || 0}
                unit="g"
                color={C.blue}
                goal={goals?.goal_protein}
              />
              <MacroCard
                label="Carbs"
                value={avgs.carbs || 0}
                unit="g"
                color={C.mLunch}
                goal={goals?.goal_total_carbohydrate}
              />
            </View>
            <View style={as.macroRow}>
              <MacroCard
                label="Fat"
                value={avgs.fat || 0}
                unit="g"
                color={C.mBreakfast}
                goal={goals?.goal_total_fat}
              />
              <MacroCard
                label="Fiber"
                value={avgs.fiber || 0}
                unit="g"
                color={C.green}
                goal={goals?.goal_dietary_fiber}
              />
            </View>
          </View>

          {/* ── Micros ── */}
          <Text style={as.sectionLabel}>MICROS — AVG / DAY</Text>
          <View style={as.microCard}>
            <MicroRow
              label="Sodium"
              value={avgs.sodium || 0}
              unit="mg"
              goal={goals?.goal_sodium}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Sugar"
              value={avgs.sugar || 0}
              unit="g"
              goal={goals?.goal_total_sugars}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Saturated Fat"
              value={avgs.saturated_fat || 0}
              unit="g"
              goal={goals?.goal_saturated_fat}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Cholesterol"
              value={avgs.cholesterol || 0}
              unit="mg"
              goal={goals?.goal_cholesterol}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Vitamin D"
              value={avgs.vitamin_d || 0}
              unit="%dv"
              goal={goals?.goal_vitamin_d}
              accent={C.mLunch}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Calcium"
              value={avgs.calcium || 0}
              unit="%dv"
              goal={goals?.goal_calcium}
              accent={C.mLunch}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Iron"
              value={avgs.iron || 0}
              unit="%dv"
              goal={goals?.goal_iron}
              accent={C.mLunch}
            />
            <View style={as.microSep} />
            <MicroRow
              label="Potassium"
              value={avgs.potassium || 0}
              unit="%dv"
              goal={goals?.goal_potassium}
              accent={C.mLunch}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const as = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // Header
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

  // Range pills
  pillRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  pillTxt: {
    fontSize: 13,
    fontWeight: "500",
    color: C.soft,
  },
  pillTxtActive: {
    color: "#fff",
    fontWeight: "600",
  },

  // Scroll
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 48,
    gap: 10,
  },

  // Hero card
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 18,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroNum: {
    fontSize: 64,
    fontWeight: "200",
    color: C.text,
    letterSpacing: -2,
    lineHeight: 68,
  },
  heroSub: {
    fontSize: 12,
    color: C.faint,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  diffTxt: {
    fontSize: 12,
    fontWeight: "600",
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
  },
  heroFooterTxt: {
    fontSize: 12,
    color: C.faint,
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.faint,
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 0,
    paddingHorizontal: 2,
  },

  // Macro grid
  macroSection: { gap: 8 },
  macroRow: { flexDirection: "row", gap: 8 },
  macroCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
  },
  macroLabel: {
    fontSize: 11,
    color: C.soft,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  macroVal: {
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -0.5,
    color: C.text,
  },
  macroUnit: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 0,
    color: C.soft,
  },
  macroTrack: {
    height: 3,
    backgroundColor: C.raised,
    borderRadius: 2,
    overflow: "hidden",
  },
  macroFill: { height: 3, borderRadius: 2 },
  macroGoal: { fontSize: 10, color: C.faint },

  // Micro list
  microCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 14,
  },
  microSep: { height: 1, backgroundColor: C.border },
  microRow: { gap: 6 },
  microLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  microLabel: { fontSize: 13, color: C.soft, fontWeight: "500" },
  microVal: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    fontVariant: ["tabular-nums"],
  },
  microUnit: { fontSize: 11, fontWeight: "400", color: C.faint },
  microTrack: {
    height: 3,
    backgroundColor: C.raised,
    borderRadius: 2,
    overflow: "hidden",
  },
  microFill: { height: 3, borderRadius: 2 },
  microGoal: { fontSize: 10, color: C.faint },

  // States
  errTxt: { fontSize: 14, color: C.soft },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  retryTxt: { fontSize: 13, color: C.soft },
});
