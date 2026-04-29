import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, Pressable,
  SafeAreaView, StatusBar, ActivityIndicator, Dimensions,
  Animated, Easing,
} from "react-native";
import Svg, {
  Path, Defs, LinearGradient as SvgLinearGradient, Stop,
  Line, Circle, G, Rect, Text as SvgText,
} from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";
import { useDrawer } from "../drawerContext";
import { C } from "../styles/dashboard.styles";
import s from "../styles/analytics.styles";
import { post, get } from "../api";

const RANGES = ["1W", "1M", "6M", "1Y"];
const RANGE_DAYS = { "1W": 7, "1M": 30, "6M": 182, "1Y": 365 };

const DEFAULT_METRICS = [
  { key: "calories",      label: "Calories",    unit: "kcal", color: "#FF6B6B", goalKey: "goal_calories" },
  { key: "protein",       label: "Protein",     unit: "g",    color: "#4DABF7", goalKey: "goal_protein" },
  { key: "carbs",         label: "Carbs",       unit: "g",    color: "#FFB84D", goalKey: "goal_total_carbohydrate" },
  { key: "fat",           label: "Fat",         unit: "g",    color: "#FF9F40", goalKey: "goal_total_fat" },
  { key: "fiber",         label: "Fiber",       unit: "g",    color: "#51CF66", goalKey: "goal_dietary_fiber" },
  { key: "sodium",        label: "Sodium",      unit: "mg",   color: "#B197FC", goalKey: "goal_sodium" },
  { key: "sugar",         label: "Sugar",       unit: "g",    color: "#FF8FAB", goalKey: "goal_total_sugars" },
  { key: "saturated_fat", label: "Sat Fat",     unit: "g",    color: "#E64980", goalKey: "goal_saturated_fat" },
  { key: "cholesterol",   label: "Cholesterol", unit: "mg",   color: "#FAA2C1", goalKey: "goal_cholesterol" },
  { key: "vitamin_d",     label: "Vit D",       unit: "%",    color: "#FCC419", goalKey: "goal_vitamin_d" },
  { key: "calcium",       label: "Calcium",     unit: "%",    color: "#74C0FC", goalKey: "goal_calcium" },
  { key: "iron",          label: "Iron",        unit: "%",    color: "#FF6B9D", goalKey: "goal_iron" },
  { key: "potassium",     label: "Potassium",   unit: "%",    color: "#38D9A9", goalKey: "goal_potassium" },
];

let METRICS = DEFAULT_METRICS;

const TREND_KEYS = ["calories", "protein", "carbs", "fat", "fiber"];
let TREND_METRICS = METRICS.filter((m) => TREND_KEYS.includes(m.key));

function applyColorOverrides(overrides) {
  METRICS = DEFAULT_METRICS.map((m) =>
    overrides && overrides[m.key] ? { ...m, color: overrides[m.key] } : m
  );
  TREND_METRICS = METRICS.filter((m) => TREND_KEYS.includes(m.key));
}

const MEAL_LABELS = { 1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snacks" };
const MEAL_COLORS = { 1: "#FFB84D", 2: "#4DABF7", 3: "#A78BFA", 4: "#51CF66" };

const LIMIT_METRICS = new Set(["sodium", "sugar", "saturated_fat", "cholesterol"]);

const MACRO_BREAKDOWN = [
  { key: "protein", label: "Protein", color: "#4DABF7", kcalPerG: 4 },
  { key: "carbs",   label: "Carbs",   color: "#FFB84D", kcalPerG: 4 },
  { key: "fat",     label: "Fat",     color: "#FF9F40", kcalPerG: 9 },
];

const SCREEN_W = Dimensions.get("window").width;
const CHART_W  = SCREEN_W - 64;
const CHART_H  = 220;

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStartEnd(label) {
  const days = RANGE_DAYS[label];
  const now = new Date();
  const startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  return { start: fmtDate(startD), end: fmtDate(now) };
}

function fillDays(days, startStr, totalDays, field) {
  const map = {};
  days.forEach((d) => { map[d.date] = d[field] ?? 0; });
  const [y, m, day] = startStr.split("-").map(Number);
  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(y, m - 1, day + i);
    const key = fmtDate(d);
    return { date: key, value: map[key] ?? 0 };
  });
}

function bucketize(allDays, range) {
  if (range === "1W" || range === "1M") return allDays;
  if (range === "6M") {
    const out = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const slice = allDays.slice(i, i + 7).filter((d) => d.value > 0);
      out.push({
        date: allDays[i].date,
        value: slice.length ? slice.reduce((s, d) => s + d.value, 0) / slice.length : 0,
      });
    }
    return out;
  }
  const months = {};
  allDays.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (!months[key]) months[key] = { date: d.date, total: 0, count: 0 };
    if (d.value > 0) { months[key].total += d.value; months[key].count++; }
  });
  return Object.values(months).map((m) => ({
    date: m.date, value: m.count ? m.total / m.count : 0,
  }));
}

function smoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function donutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const so = polar(cx, cy, rOuter, endAngle);
  const eo = polar(cx, cy, rOuter, startAngle);
  const si = polar(cx, cy, rInner, startAngle);
  const ei = polar(cx, cy, rInner, endAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${ei.x} ${ei.y}`,
    "Z",
  ].join(" ");
}

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function LineChart({ data, color, goal, range, unit }) {
  const pad = { l: 32, r: 16, t: 16, b: 24 };
  const w = CHART_W;
  const h = CHART_H;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => { setSelectedIdx(null); }, [data]);

  const maxVal = Math.max(...data.map((d) => d.value), goal || 0, 1) * 1.1;
  const today  = fmtDate(new Date());

  const points = data.map((d, i) => ({
    x: pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: pad.t + (1 - d.value / maxVal) * innerH,
    raw: d,
  }));

  const linePath = smoothPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x},${pad.t + innerH} L ${points[0].x},${pad.t + innerH} Z`
    : "";

  const goalY = goal ? pad.t + (1 - goal / maxVal) * innerH : null;
  const xLabels = pickXLabels(data, range);
  const sel = selectedIdx !== null ? points[selectedIdx] : null;

  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgLinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.45" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>

      {[0.25, 0.5, 0.75].map((t) => (
        <Line
          key={t}
          x1={pad.l} x2={w - pad.r}
          y1={pad.t + t * innerH} y2={pad.t + t * innerH}
          stroke={C.border} strokeWidth="1" strokeDasharray="2,4" opacity="0.5"
        />
      ))}

      <SvgText x={pad.l - 6} y={pad.t + 4} fontSize="9" fill={C.faint} textAnchor="end">
        {Math.round(maxVal)}
      </SvgText>
      <SvgText x={pad.l - 6} y={pad.t + innerH + 4} fontSize="9" fill={C.faint} textAnchor="end">
        0
      </SvgText>

      {goalY !== null && (
        <>
          <Line
            x1={pad.l} x2={w - pad.r}
            y1={goalY} y2={goalY}
            stroke="#bbb" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.9"
          />
          <Rect x={1} y={goalY - 8} width={pad.l - 3} height={16} rx={4} fill={color} opacity={0.85} />
          <SvgText x={(pad.l - 2) / 2} y={goalY} fontSize="8.5" fill="#fff" textAnchor="middle" fontWeight="700" alignmentBaseline="middle">
            {Math.round(goal)}
          </SvgText>
        </>
      )}

      {sel && (
        <Line
          x1={sel.x} x2={sel.x}
          y1={pad.t} y2={pad.t + innerH}
          stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.4"
        />
      )}

      {areaPath && <Path d={areaPath} fill="url(#lineFill)" />}
      <Path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => {
        const isSel = selectedIdx === i;
        const isToday = p.raw.date === today;
        return (
          <G key={i}>
            {(data.length <= 31 || isSel) && (
              <Circle
                cx={p.x} cy={p.y}
                r={isSel ? 5 : isToday ? 4 : 2.5}
                fill={isSel || isToday ? "#fff" : color}
                stroke={color} strokeWidth={isSel ? 2.5 : isToday ? 2 : 0}
              />
            )}
            <Circle
              cx={p.x} cy={p.y} r={12}
              fill="transparent"
              onPress={() => setSelectedIdx(isSel ? null : i)}
            />
          </G>
        );
      })}

      {sel && (() => {
        const lx = Math.max(pad.l + 22, Math.min(w - pad.r - 22, sel.x));
        const ly = Math.max(pad.t + 13, sel.y - 18);
        const [, m, d] = data[selectedIdx].date.split("-");
        return (
          <>
            <SvgText x={lx} y={ly} fontSize="11" fill={color} textAnchor="middle" fontWeight="700">
              {Math.round(data[selectedIdx].value)}{unit}
            </SvgText>
            <SvgText x={lx} y={ly + 12} fontSize="8" fill={C.soft} textAnchor="middle">
              {Number(m)}/{Number(d)}
            </SvgText>
          </>
        );
      })()}

      {xLabels.map((lbl, i) => (
        <SvgText
          key={i}
          x={pad.l + (lbl.idx / Math.max(data.length - 1, 1)) * innerW}
          y={h - 6}
          fontSize="9" fill={C.faint} textAnchor="middle"
        >
          {lbl.text}
        </SvgText>
      ))}
    </Svg>
  );
}

function BarChartSvg({ data, color, goal, range, unit }) {
  const pad = { l: 32, r: 16, t: 16, b: 24 };
  const w = CHART_W;
  const h = CHART_H;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => { setSelectedIdx(null); }, [data]);

  const maxVal = Math.max(...data.map((d) => d.value), goal || 0, 1) * 1.1;
  const today = fmtDate(new Date());
  const gap = data.length > 30 ? 1 : 3;
  const barW = (innerW - gap * (data.length - 1)) / data.length;

  const goalY = goal ? pad.t + (1 - goal / maxVal) * innerH : null;
  const xLabels = pickXLabels(data, range);

  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgLinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0.55" />
        </SvgLinearGradient>
      </Defs>

      {[0.25, 0.5, 0.75].map((t) => (
        <Line
          key={t}
          x1={pad.l} x2={w - pad.r}
          y1={pad.t + t * innerH} y2={pad.t + t * innerH}
          stroke={C.border} strokeWidth="1" strokeDasharray="2,4" opacity="0.5"
        />
      ))}

      <SvgText x={pad.l - 6} y={pad.t + 4} fontSize="9" fill={C.faint} textAnchor="end">
        {Math.round(maxVal)}
      </SvgText>
      <SvgText x={pad.l - 6} y={pad.t + innerH + 4} fontSize="9" fill={C.faint} textAnchor="end">
        0
      </SvgText>

      {data.map((d, i) => {
        const x = pad.l + i * (barW + gap);
        const isZero = d.value <= 0;
        const bh = isZero ? 2 : Math.max((d.value / maxVal) * innerH, 3);
        const y = pad.t + innerH - bh;
        const isToday = d.date === today;
        const isSel = selectedIdx === i;
        return (
          <G key={i}>
            <Rect
              x={x} y={y}
              width={Math.max(barW, 1)} height={bh}
              rx={Math.min(barW / 2, 3)}
              fill={isZero ? C.raised : isSel || isToday ? "#fff" : "url(#barFill)"}
              opacity={isZero ? 0.5 : 1}
              stroke={isSel ? color : isToday ? color : "none"}
              strokeWidth={isSel || isToday ? 2 : 0}
            />
            <Rect
              x={x - gap / 2} y={pad.t}
              width={Math.max(barW + gap, 12)} height={innerH}
              fill="transparent"
              onPress={() => setSelectedIdx(isSel ? null : i)}
            />
          </G>
        );
      })}

      {selectedIdx !== null && (() => {
        const d = data[selectedIdx];
        const x = pad.l + selectedIdx * (barW + gap);
        const bh = d.value <= 0 ? 2 : Math.max((d.value / maxVal) * innerH, 3);
        const barTop = pad.t + innerH - bh;
        const cx = x + barW / 2;
        const lx = Math.max(pad.l + 22, Math.min(w - pad.r - 22, cx));
        const ly = Math.max(pad.t + 13, barTop - 18);
        const [, m, dy] = d.date.split("-");
        return (
          <>
            <SvgText x={lx} y={ly} fontSize="11" fill={color} textAnchor="middle" fontWeight="700">
              {Math.round(d.value)}{unit}
            </SvgText>
            <SvgText x={lx} y={ly + 12} fontSize="8" fill={C.soft} textAnchor="middle">
              {Number(m)}/{Number(dy)}
            </SvgText>
          </>
        );
      })()}

      {goalY !== null && (
        <>
          <Line
            x1={pad.l} x2={w - pad.r}
            y1={goalY} y2={goalY}
            stroke="#ccc" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.85"
          />
          <Rect x={1} y={goalY - 8} width={pad.l - 3} height={16} rx={4} fill={color} opacity={0.85} />
          <SvgText x={(pad.l - 2) / 2} y={goalY} fontSize="8.5" fill="#fff" textAnchor="middle" fontWeight="700" alignmentBaseline="middle">
            {Math.round(goal)}
          </SvgText>
        </>
      )}

      {xLabels.map((lbl, i) => (
        <SvgText
          key={i}
          x={pad.l + (lbl.idx + 0.5) * (barW + gap) - gap / 2}
          y={h - 6}
          fontSize="9" fill={C.faint} textAnchor="middle"
        >
          {lbl.text}
        </SvgText>
      ))}
    </Svg>
  );
}

function PieChart({ slices, centerLabel, centerValue, onSlicePress, activeSlice }) {
  const w = CHART_W;
  const h = CHART_H + 30;
  const cx = w / 2;
  const cy = h / 2;
  const rOut = 92;
  const rIn  = 58;

  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <View style={{ height: h, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.faint, fontSize: 13 }}>No data to show</Text>
      </View>
    );
  }

  let angle = 0;
  const arcs = slices.map((s) => {
    const sweep = (s.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...s, start, end, sweep };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={w} height={h}>
        {arcs.map((a, i) => {
          const isActive = activeSlice === a.key;
          const localR = isActive ? rOut + 4 : rOut;
          if (a.sweep >= 359.99) {
            return (
              <G key={i}>
                <Circle cx={cx} cy={cy} r={localR} fill={a.color} />
                <Circle cx={cx} cy={cy} r={rIn} fill={C.bg} />
              </G>
            );
          }
          return (
            <Path
              key={i}
              d={donutSlice(cx, cy, localR, rIn, a.start, a.end)}
              fill={a.color}
              opacity={activeSlice && !isActive ? 0.35 : 1}
              onPress={() => onSlicePress?.(a.key)}
            />
          );
        })}
        <SvgText
          x={cx} y={cy - 4}
          fontSize="11" fill={C.soft} textAnchor="middle"
          fontWeight="500"
        >
          {centerLabel}
        </SvgText>
        <SvgText
          x={cx} y={cy + 18}
          fontSize="22" fill={C.text} textAnchor="middle"
          fontWeight="700"
        >
          {centerValue}
        </SvgText>
      </Svg>

      <View style={s.pieLegend}>
        {arcs.map((a) => {
          const pct = Math.round((a.value / total) * 100);
          const isActive = activeSlice === a.key;
          return (
            <Pressable
              key={a.key}
              onPress={() => onSlicePress?.(a.key)}
              style={[s.pieLegendItem, isActive && { borderColor: a.color, backgroundColor: a.color + "20" }]}
            >
              <View style={[s.pieDot, { backgroundColor: a.color }]} />
              <Text style={s.pieLegendLabel}>{a.label}</Text>
              <Text style={[s.pieLegendPct, { color: a.color }]}>{pct}%</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AllTrendsChart({ rawDays, range, goals, totalDays, startStr }) {
  const pad = { l: 32, r: 16, t: 16, b: 24 };
  const w = CHART_W;
  const h = CHART_H;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const [active, setActive] = useState(null);

  const seriesByMetric = useMemo(() => {
    const out = {};
    TREND_METRICS.forEach((m) => {
      const filled = fillDays(rawDays, startStr, totalDays, m.key);
      const bucketed = bucketize(filled, range);
      const goal = goals?.[m.goalKey] || 0;
      out[m.key] = bucketed.map((d, i) => {
        const pct = goal > 0 ? (d.value / goal) * 100 : 0;
        return {
          x: pad.l + (bucketed.length === 1 ? innerW / 2 : (i / (bucketed.length - 1)) * innerW),
          y: pct,
          raw: d,
        };
      });
    });
    return out;
  }, [rawDays, range, goals, totalDays, startStr]);

  const maxY = 150;
  const points = (arr) => arr.map((p) => ({
    x: p.x,
    y: pad.t + (1 - Math.min(p.y, maxY) / maxY) * innerH,
    raw: p.raw,
    pct: p.y,
  }));

  const xLabels = pickXLabels((seriesByMetric.calories || []).map(p => p.raw), range);

  return (
    <View>
      <Svg width={w} height={h}>
        {[50, 100].map((v) => (
          <G key={v}>
            <Line
              x1={pad.l} x2={w - pad.r}
              y1={pad.t + (1 - v / maxY) * innerH}
              y2={pad.t + (1 - v / maxY) * innerH}
              stroke={v === 100 ? "#fff" : C.border}
              strokeWidth="1"
              strokeDasharray={v === 100 ? "5,3" : "2,4"}
              opacity={v === 100 ? 0.55 : 0.5}
            />
            <SvgText
              x={pad.l - 6}
              y={pad.t + (1 - v / maxY) * innerH + 3}
              fontSize="9" fill={C.faint} textAnchor="end"
            >
              {v}%
            </SvgText>
          </G>
        ))}

        {TREND_METRICS.map((m) => {
          const pts = points(seriesByMetric[m.key] || []);
          const path = smoothPath(pts);
          const isActive = active === m.key;
          const dimmed = active && !isActive;
          return (
            <Path
              key={m.key}
              d={path}
              fill="none"
              stroke={m.color}
              strokeWidth={isActive ? 3 : 1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={dimmed ? 0.18 : 1}
            />
          );
        })}

        {xLabels.map((lbl, i) => (
          <SvgText
            key={i}
            x={pad.l + (lbl.idx / Math.max((seriesByMetric.calories?.length || 1) - 1, 1)) * innerW}
            y={h - 6}
            fontSize="9" fill={C.faint} textAnchor="middle"
          >
            {lbl.text}
          </SvgText>
        ))}
      </Svg>

      {active && (
        <View style={s.tooltip}>
          <View style={[s.tooltipDot, { backgroundColor: TREND_METRICS.find((x) => x.key === active).color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.tooltipTitle}>
              {TREND_METRICS.find((x) => x.key === active).label}
            </Text>
            <Text style={s.tooltipSub}>
              avg {Math.round(((rawDays.length
                ? rawDays.reduce((sum, d) => sum + (d[active] || 0), 0) / rawDays.length
                : 0))) }
              {TREND_METRICS.find((x) => x.key === active).unit} / day
              {goals?.[TREND_METRICS.find((x) => x.key === active).goalKey]
                ? `  •  goal ${Math.round(goals[TREND_METRICS.find((x) => x.key === active).goalKey])}${TREND_METRICS.find((x) => x.key === active).unit}`
                : ""}
            </Text>
          </View>
          <Pressable onPress={() => setActive(null)} hitSlop={8} style={s.tooltipX}>
            <Ionicons name="close" size={14} color={C.soft} />
          </Pressable>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.legendScroll}
      >
        {TREND_METRICS.map((m) => {
          const isActive = active === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setActive(isActive ? null : m.key)}
              style={[
                s.legendChip,
                isActive && { borderColor: m.color, backgroundColor: m.color + "22" },
              ]}
            >
              <View style={[s.legendDot, { backgroundColor: m.color }]} />
              <Text style={[s.legendLabel, isActive && { color: m.color, fontWeight: "700" }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function pickXLabels(data, range) {
  if (!data || data.length === 0) return [];
  const fmtMD = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return `${m}/${d}`;
  };
  const fmtMon = (s) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [, m] = s.split("-").map(Number);
    return months[m - 1];
  };

  if (range === "1Y") {
    const step = Math.max(1, Math.floor(data.length / 6));
    return data.map((d, i) => ({ idx: i, text: fmtMon(d.date) }))
               .filter((_, i) => i % step === 0);
  }

  const targets = range === "1W" ? data.length : 5;
  const step = Math.max(1, Math.floor(data.length / targets));
  return data.map((d, i) => ({ idx: i, text: fmtMD(d.date) }))
             .filter((_, i) => i % step === 0);
}

function MacroCard({ label, value, unit, color, goal }) {
  const pct = goal > 0 ? Math.min(value / goal, 1.5) : 0;
  return (
    <View style={[s.macroCard, { borderColor: color + "55" }]}>
      <View style={[s.macroAccent, { backgroundColor: color }]} />
      <Text style={s.macroLabel}>{label}</Text>
      <Text style={[s.macroVal, { color }]}>
        {Math.round(value)}
        <Text style={s.macroUnit}>{unit}</Text>
      </Text>
      <View style={s.macroTrack}>
        <View style={[s.macroFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: color }]} />
      </View>
      {goal > 0 && (
        <Text style={s.macroGoal}>of {Math.round(goal)}{unit}</Text>
      )}
    </View>
  );
}

function MicroRow({ label, value, unit, goal, color }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = goal > 0 && value > goal * 1.05;
  const fillColor = over ? "#FF5C5C" : color;
  return (
    <View style={s.microRow}>
      <View style={[s.microDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={s.microLabelRow}>
          <Text style={s.microLabel}>{label}</Text>
          <Text style={[s.microVal, over && { color: "#FF7A7A" }]}>
            {Math.round(value)}
            <Text style={s.microUnit}> {unit}</Text>
          </Text>
        </View>
        <View style={s.microTrack}>
          <View style={[s.microFill, { width: `${Math.round(Math.min(pct, 1) * 100)}%`, backgroundColor: fillColor }]} />
        </View>
        {goal > 0 && (
          <Text style={[s.microGoal, over && { color: "#FF7A7A" }]}>
            {over
              ? `${Math.round(((value - goal) / goal) * 100)}% over`
              : `${Math.round(pct * 100)}% of goal`}
          </Text>
        )}
      </View>
    </View>
  );
}

const PATTERN_ICONS = {
  snack: "fast-food-outline",
  meal_timing: "time-outline",
  hydration: "water-outline",
  variety: "color-palette-outline",
  portion: "resize-outline",
  sugar: "ice-cream-outline",
  processed: "warning-outline",
  balance: "scale-outline",
  cooking: "flame-outline",
  alcohol: "wine-outline",
};

const STATUS_STYLE = {
  critical_low:  { color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", border: "#FF6B6B66", label: "Critical Low" },
  under:         { color: "#FFB84D", bg: "rgba(255,184,77,0.15)",  border: "#FFB84D66", label: "Under" },
  meeting:       { color: "#51CF66", bg: "rgba(81,207,102,0.15)",  border: "#51CF6666", label: "On Target" },
  over:          { color: "#FFB84D", bg: "rgba(255,184,77,0.15)",  border: "#FFB84D66", label: "Over" },
  critical_high: { color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", border: "#FF6B6B66", label: "Critical High" },
};

const SEVERITY_STYLE = {
  low:      { color: "#7AB0E0", bg: "rgba(80,128,188,0.15)",  border: "#5080BC66" },
  moderate: { color: "#FFB84D", bg: "rgba(255,184,77,0.15)",  border: "#FFB84D66" },
  high:     { color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", border: "#FF6B6B66" },
};

const DIFFICULTY_STYLE = {
  easy:        { color: "#51CF66", bg: "rgba(81,207,102,0.15)",  border: "#51CF6666", label: "Easy" },
  moderate:    { color: "#FFB84D", bg: "rgba(255,184,77,0.15)",  border: "#FFB84D66", label: "Moderate" },
  challenging: { color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", border: "#FF6B6B66", label: "Challenging" },
};

const NUTRIENT_LABELS = {
  calories: "Calories", protein: "Protein", carbs: "Carbs", fat: "Fat",
  fiber: "Fiber", sodium: "Sodium", sugar: "Sugar",
  saturated_fat: "Sat Fat", cholesterol: "Cholesterol",
  vitamin_d: "Vit D", calcium: "Calcium", iron: "Iron", potassium: "Potassium",
};

function getMetricColor(key) {
  return METRICS.find((m) => m.key === key)?.color ?? C.soft;
}

function ScoreRing({ score, size = 86, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 85 ? "#51CF66" : clamped >= 70 ? "#7AB0E0" : clamped >= 55 ? "#FFB84D" : "#FF6B6B";

  return (
    <View style={[s.scoreRing, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={cx} cy={cy} r={r} stroke={C.raised} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <Text style={[s.scoreNum, { color }]}>{clamped}</Text>
      <Text style={s.scoreSlash}>/ 100</Text>
    </View>
  );
}

function NutrientChip({ nutrientKey, onPress, active }) {
  const label = NUTRIENT_LABELS[nutrientKey] ?? nutrientKey;
  const color = getMetricColor(nutrientKey);
  return (
    <Pressable
      onPress={() => onPress?.(nutrientKey)}
      style={[
        s.winNutChip,
        active && { borderColor: color, backgroundColor: color + "22" },
      ]}
    >
      <Text style={[s.winNutChipTxt, active && { color, fontWeight: "700" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActiveNutrientInsight({ nutrient, breakdown, onClear }) {
  if (!breakdown) return null;
  const status = STATUS_STYLE[breakdown.status] ?? STATUS_STYLE.meeting;
  const color = getMetricColor(nutrient);
  const recommended = breakdown.recommended || 0;
  const actual = breakdown.actual || 0;
  const pct = recommended > 0 ? Math.min((actual / recommended) * 100, 150) : 0;
  const fillWidth = Math.min(pct, 100);

  return (
    <View style={[s.insightCard, { borderColor: color + "55" }]}>
      <View style={s.insightHeader}>
        <View style={s.insightLabelRow}>
          <View style={[s.insightDot, { backgroundColor: color }]} />
          <Text style={[s.insightLabel, { color }]}>
            {NUTRIENT_LABELS[nutrient] ?? nutrient} · AI insight
          </Text>
        </View>
        <View
          style={[
            s.insightStatusPill,
            { backgroundColor: status.bg, borderColor: status.border },
          ]}
        >
          <Text style={[s.insightStatusTxt, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={s.insightStatRow}>
        <Text style={[s.insightStatBig, { color }]}>
          {Math.round(actual)}<Text style={s.insightStatUnit}>{breakdown.unit ?? ""}</Text>
        </Text>
        <Text style={s.insightStatVs}>vs target</Text>
        <Text style={s.insightStatGoal}>
          {Math.round(recommended)}{breakdown.unit ?? ""}
        </Text>
      </View>

      <View style={s.insightProgressTrack}>
        <View style={[s.insightProgressFill, { width: `${fillWidth}%`, backgroundColor: color }]} />
        {recommended > 0 && (
          <View style={[s.insightProgressTarget, { left: `${Math.min(100, 100)}%` }]} />
        )}
      </View>

      <Text style={s.insightExplain}>{breakdown.explanation}</Text>
    </View>
  );
}

function WinsSection({ wins, onSelectNutrient, activeNutrient }) {
  if (!wins?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.winsHScroll}
    >
      {wins.map((w, i) => (
        <View key={i} style={s.winCard}>
          <View style={s.winIconWrap}>
            <Ionicons name="trophy-outline" size={16} color="#51CF66" />
          </View>
          <Text style={s.winTitle}>{w.title}</Text>
          <Text style={s.winDetail}>{w.detail}</Text>
          {w.related_nutrients?.length > 0 && (
            <View style={s.winNutrients}>
              {w.related_nutrients.map((n) => (
                <NutrientChip
                  key={n}
                  nutrientKey={n}
                  onPress={onSelectNutrient}
                  active={activeNutrient === n}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function PatternsSection({ patterns, onSelectNutrient, activeNutrient }) {
  if (!patterns?.length) return null;
  return (
    <View>
      {patterns.map((p) => {
        const sev = SEVERITY_STYLE[p.severity] ?? SEVERITY_STYLE.low;
        const iconName = PATTERN_ICONS[p.icon] ?? "ellipse-outline";
        return (
          <View key={p.id} style={s.patternCard}>
            <View
              style={[
                s.patternIconWrap,
                { backgroundColor: sev.bg, borderWidth: 1, borderColor: sev.border },
              ]}
            >
              <Ionicons name={iconName} size={16} color={sev.color} />
            </View>
            <View style={s.patternBody}>
              <View style={s.patternTitleRow}>
                <Text style={s.patternTitle}>{p.title}</Text>
                <View
                  style={[
                    s.severityPill,
                    { backgroundColor: sev.bg, borderColor: sev.border },
                  ]}
                >
                  <Text style={[s.severityPillTxt, { color: sev.color }]}>
                    {p.severity}
                  </Text>
                </View>
              </View>
              <Text style={s.patternObs}>{p.observation}</Text>
              {p.impact?.length > 0 && (
                <View style={s.patternImpact}>
                  {p.impact.map((n) => (
                    <NutrientChip
                      key={n}
                      nutrientKey={n}
                      onPress={onSelectNutrient}
                      active={activeNutrient === n}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SuggestionsSection({ suggestions, onSelectNutrient, activeNutrient }) {
  if (!suggestions?.length) return null;
  return (
    <View>
      {suggestions.map((sg, i) => {
        const diff = DIFFICULTY_STYLE[sg.difficulty] ?? DIFFICULTY_STYLE.moderate;
        const score = sg.impact_score ?? 5;
        return (
          <View key={sg.id ?? i} style={s.suggestionCard}>
            <View style={s.suggestionHead}>
              <View style={s.rankBadge}>
                <Text style={s.rankBadgeTxt}>#{i + 1}</Text>
              </View>
              <Text style={s.suggestionTitle}>{sg.title}</Text>
              <View
                style={[
                  s.difficultyPill,
                  { backgroundColor: diff.bg, borderColor: diff.border },
                ]}
              >
                <Text style={[s.difficultyTxt, { color: diff.color }]}>
                  {diff.label}
                </Text>
              </View>
            </View>

            <View>
              <Text style={s.suggestionLabel}>WHY</Text>
              <Text style={s.suggestionBody}>{sg.why}</Text>
            </View>

            <View style={s.suggestionDivider} />

            <View>
              <Text style={s.suggestionLabel}>HOW</Text>
              <Text style={s.suggestionBody}>{sg.how}</Text>
            </View>

            <View style={s.impactRow}>
              <Text style={s.impactLabel}>IMPACT</Text>
              <View style={s.impactBar}>
                {Array.from({ length: 10 }, (_, idx) => (
                  <View
                    key={idx}
                    style={[
                      s.impactDot,
                      {
                        backgroundColor:
                          idx < score
                            ? score >= 8 ? "#51CF66" : score >= 5 ? "#FFB84D" : "#7AB0E0"
                            : C.raised,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {sg.nutrients_improved?.length > 0 && (
              <View style={s.winNutrients}>
                {sg.nutrients_improved.map((n) => (
                  <NutrientChip
                    key={n}
                    nutrientKey={n}
                    onPress={onSelectNutrient}
                    active={activeNutrient === n}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function WatchSection({ items, onSelectNutrient, activeNutrient }) {
  if (!items?.length) return null;
  return (
    <View>
      {items.map((w, i) => {
        const sev = SEVERITY_STYLE[w.severity] ?? SEVERITY_STYLE.moderate;
        const isHigh = w.direction === "high";
        const arrowName = isHigh ? "arrow-up" : "arrow-down";
        const color = getMetricColor(w.nutrient);
        return (
          <View key={i} style={[s.watchCard, { borderColor: sev.border }]}>
            <View style={s.watchHead}>
              <View
                style={[
                  s.watchIconWrap,
                  { backgroundColor: sev.bg, borderWidth: 1, borderColor: sev.border },
                ]}
              >
                <Ionicons name={arrowName} size={16} color={sev.color} />
              </View>
              <View style={s.watchHeadText}>
                <Pressable onPress={() => onSelectNutrient?.(w.nutrient)}>
                  <Text style={[s.watchNutrient, { color }]}>
                    {NUTRIENT_LABELS[w.nutrient] ?? w.nutrient}
                  </Text>
                </Pressable>
                <Text style={s.watchDir}>
                  Trending {w.direction} · {w.severity} severity
                </Text>
              </View>
            </View>

            <Text style={s.watchMessage}>{w.message}</Text>

            {w.food_culprits?.length > 0 && (
              <View style={s.watchFoodRow}>
                <Text style={s.watchFoodLabel}>FROM</Text>
                <View style={s.watchFoodChips}>
                  {w.food_culprits.map((f, idx) => (
                    <View key={idx} style={s.watchFoodChip}>
                      <Text style={s.watchFoodChipTxt}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {w.food_fixes?.length > 0 && (
              <View style={s.watchFoodRow}>
                <Text style={[s.watchFoodLabel, { color: "#51CF66" }]}>TRY</Text>
                <View style={s.watchFoodChips}>
                  {w.food_fixes.map((f, idx) => (
                    <View
                      key={idx}
                      style={[s.watchFoodChip, { borderColor: "rgba(81,207,102,0.4)", backgroundColor: "rgba(81,207,102,0.1)" }]}
                    >
                      <Text style={[s.watchFoodChipTxt, { color: "#7DD68A" }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function BottomLineCard({ text }) {
  if (!text) return null;
  const disclaimerMatch = text.match(/(Note:?\s*I'?m an AI[\s\S]*)$/i);
  const main = disclaimerMatch ? text.slice(0, disclaimerMatch.index).trim() : text;
  const disclaimer = disclaimerMatch ? disclaimerMatch[0].trim() : null;
  return (
    <View style={s.bottomLineCard}>
      <Text style={s.bottomLineLabel}>BOTTOM LINE</Text>
      <Text style={s.bottomLineBody}>{main}</Text>
      {disclaimer && <Text style={s.disclaimer}>{disclaimer}</Text>}
    </View>
  );
}

function AiSkeleton({ pulse }) {
  return (
    <View style={s.aiSkeleton}>
      <View style={s.aiSkeletonRow}>
        <Animated.View style={[s.aiSkeletonCircle, { opacity: pulse }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[s.aiSkeletonBlock, { opacity: pulse, width: "55%" }]} />
          <Animated.View style={[s.aiSkeletonBlock, { opacity: pulse, width: "85%", height: 9 }]} />
          <Animated.View style={[s.aiSkeletonBlock, { opacity: pulse, width: "70%", height: 9 }]} />
        </View>
      </View>
      <View style={s.aiSkeletonStatus}>
        <ActivityIndicator color="#7AB0E0" size="small" />
        <Text style={s.aiSkeletonText}>Analyzing your nutrition…</Text>
      </View>
    </View>
  );
}

function AiOnboardingBanner({ justDeclined, onYes, onNo }) {
  if (justDeclined) {
    return (
      <View style={s.aiBanner}>
        <View style={s.aiBannerGlow} />
        <View style={s.aiBannerDoneRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={C.soft} />
          <Text style={s.aiBannerDoneTxt}>
            Got it. You can turn on AI analysis any time from Settings.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.aiBanner}>
      <View style={s.aiBannerGlow} />
      <View style={s.aiBannerTopRow}>
        <View style={s.aiBannerIconWrap}>
          <Ionicons name="sparkles-outline" size={18} color="#7AB0E0" />
        </View>
        <View style={s.aiBannerHeader}>
          <Text style={s.aiBannerTitle}>Want AI to analyze your meals?</Text>
          <Text style={s.aiBannerSub}>
            Get personalized insights, patterns, and suggestions based on what you've logged.
          </Text>
        </View>
      </View>
      <View style={s.aiBannerBtnRow}>
        <Pressable
          onPress={onNo}
          style={({ pressed }) => [s.aiBannerBtn, s.aiBannerBtnNo, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.aiBannerBtnTxtNo}>No thanks</Text>
        </Pressable>
        <Pressable
          onPress={onYes}
          style={({ pressed }) => [s.aiBannerBtn, s.aiBannerBtnYes, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={s.aiBannerBtnTxtYes}>Yes, analyze</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AiSection({ summary, loading, error, onRefresh, activeNutrient, setActiveNutrient }) {
  const pulse = useRef(new Animated.Value(0.6)).current;
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading]);

  if (loading) {
    return (
      <View style={{ gap: 10 }}>
        <View style={s.aiSectionHeader}>
          <View style={s.aiSectionTitle}>
            <Ionicons name="sparkles-outline" size={15} color="#7AB0E0" />
            <Text style={s.aiSectionTitleTxt}>AI Nutrition Insights</Text>
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeTxt}>BETA</Text>
            </View>
          </View>
        </View>
        <AiSkeleton pulse={pulse} />
      </View>
    );
  }

  if (error || summary?.error) {
    const isNoData = summary?.error === "no_data";
    return (
      <View style={{ gap: 10 }}>
        <View style={s.aiSectionHeader}>
          <View style={s.aiSectionTitle}>
            <Ionicons name="sparkles-outline" size={15} color="#7AB0E0" />
            <Text style={s.aiSectionTitleTxt}>AI Nutrition Insights</Text>
          </View>
        </View>
        <View style={isNoData ? s.emptyAiCard : s.aiErrorCard}>
          <Ionicons
            name={isNoData ? "leaf-outline" : "cloud-offline-outline"}
            size={isNoData ? 28 : 22}
            color={isNoData ? C.soft : C.faint}
          />
          {isNoData ? (
            <>
              <Text style={s.emptyAiTitle}>Not enough data yet</Text>
              <Text style={s.emptyAiSub}>
                Log a few meals over the next couple of days and your personalized analysis will appear here.
              </Text>
            </>
          ) : (
            <>
              <View style={s.aiErrorTxtWrap}>
                <Text style={s.aiErrorTitle}>Couldn't generate insights</Text>
                <Text style={s.aiErrorSub}>Tap to retry</Text>
              </View>
              <Pressable onPress={onRefresh} style={s.aiRefreshBtn}>
                <Ionicons name="refresh-outline" size={15} color={C.soft} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  if (!summary) return null;

  const breakdown = summary.nutrient_breakdown ?? {};
  const wins = summary.wins ?? [];
  const patterns = summary.patterns ?? [];
  const suggestions = (summary.suggestions ?? []).slice().sort(
    (a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0)
  );
  const watch = summary.nutrients_to_watch ?? [];

  const tabs = [
    { key: "overview",    label: "Overview",     icon: "grid-outline",        count: null },
    { key: "wins",        label: "Wins",         icon: "trophy-outline",      count: wins.length },
    { key: "patterns",    label: "Patterns",     icon: "analytics-outline",   count: patterns.length },
    { key: "suggestions", label: "Suggestions",  icon: "bulb-outline",        count: suggestions.length },
    { key: "watch",       label: "Watch",        icon: "alert-circle-outline", count: watch.length },
  ];

  const activeBreakdown = activeNutrient ? breakdown[activeNutrient] : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={s.aiSectionHeader}>
        <View style={s.aiSectionTitle}>
          <Ionicons name="sparkles-outline" size={15} color="#7AB0E0" />
          <Text style={s.aiSectionTitleTxt}>AI Nutrition Insights</Text>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeTxt}>BETA</Text>
          </View>
        </View>
        <Pressable onPress={onRefresh} style={s.aiRefreshBtn}>
          <Ionicons name="refresh-outline" size={14} color={C.soft} />
        </Pressable>
      </View>

      <View style={s.scoreCard}>
        <ScoreRing score={summary.overall_score} />
        <View style={s.scoreTextBlock}>
          <Text style={s.scoreLabel}>{summary.score_label ?? "Your Score"}</Text>
          <Text style={s.scoreDesc}>
            {wins.length} win{wins.length !== 1 ? "s" : ""} · {patterns.length} pattern{patterns.length !== 1 ? "s" : ""} · {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <ActiveNutrientInsight
        nutrient={activeNutrient}
        breakdown={activeBreakdown}
        onClear={() => setActiveNutrient(null)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[s.aiTabBtn, isActive && s.aiTabBtnActive, { flex: 0, paddingHorizontal: 14 }]}
            >
              <Ionicons name={t.icon} size={13} color={isActive ? C.text : C.soft} />
              <Text style={[s.aiTabBtnTxt, isActive && s.aiTabBtnTxtActive]}>
                {t.label}
              </Text>
              {t.count !== null && (
                <Text style={[s.aiTabCount, isActive && s.aiTabCountActive]}>
                  {t.count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === "overview" && (
        <View style={{ gap: 10 }}>
          <WinsSection wins={wins.slice(0, 2)} onSelectNutrient={setActiveNutrient} activeNutrient={activeNutrient} />
          {patterns.length > 0 && (
            <View style={[s.aiCardBase, { borderColor: C.border }]}>
              <View style={[s.patternBody, { gap: 6 }]}>
                <Text style={s.suggestionLabel}>TOP PATTERN</Text>
                <Text style={s.patternTitle}>{patterns[0].title}</Text>
                <Text style={s.patternObs}>{patterns[0].observation}</Text>
              </View>
            </View>
          )}
          {suggestions.length > 0 && (
            <SuggestionsSection
              suggestions={suggestions.slice(0, 1)}
              onSelectNutrient={setActiveNutrient}
              activeNutrient={activeNutrient}
            />
          )}
          <BottomLineCard text={summary.bottom_line} />
        </View>
      )}

      {tab === "wins" && (
        <WinsSection
          wins={wins}
          onSelectNutrient={setActiveNutrient}
          activeNutrient={activeNutrient}
        />
      )}

      {tab === "patterns" && (
        <PatternsSection
          patterns={patterns}
          onSelectNutrient={setActiveNutrient}
          activeNutrient={activeNutrient}
        />
      )}

      {tab === "suggestions" && (
        <SuggestionsSection
          suggestions={suggestions}
          onSelectNutrient={setActiveNutrient}
          activeNutrient={activeNutrient}
        />
      )}

      {tab === "watch" && (
        watch.length > 0 ? (
          <WatchSection
            items={watch}
            onSelectNutrient={setActiveNutrient}
            activeNutrient={activeNutrient}
          />
        ) : (
          <View style={s.emptyAiCard}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#51CF66" />
            <Text style={s.emptyAiTitle}>Nothing to flag</Text>
            <Text style={s.emptyAiSub}>Your nutrient levels look balanced for this period.</Text>
          </View>
        )
      )}
    </View>
  );
}

function Header({ openDrawer, range, setRange, disabled }) {
  return (
    <>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
        <Text style={s.title}>Analytics</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={s.pillRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            disabled={disabled}
            onPress={() => setRange(r)}
            style={[s.pill, r === range && s.pillActive]}
          >
            <Text style={[s.pillTxt, r === range && s.pillTxtActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

export default function Analytics() {
  const { openDrawer } = useDrawer();
  const [range, setRange]   = useState("1W");
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const goalsRef = useRef(null);
  const [goals, setGoals]   = useState(null);

  const [metric, setMetric] = useState("calories");
  const [chartType, setChartType] = useState("line");
  const [pieActive, setPieActive] = useState(null);

  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [userSettings, setUserSettings] = useState(null);
  const [showJustDeclined, setShowJustDeclined] = useState(false);

  const fetchAiSummary = useCallback(async (r) => {
    const email = auth().currentUser?.email;
    if (!email) return;
    const { start, end } = getStartEnd(r);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await post(
        "/generateNutrientSummary",
        { email, start, end },
        { timeout: 240000 }
      );
      setAiSummary(res);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    const email = auth().currentUser?.email;
    if (!email) return;
    get(`/getUserSettings?email=${encodeURIComponent(email)}`)
      .then((data) => {
        applyColorOverrides(data?.metric_colors);
        setUserSettings(data ?? {});
        if (data?.default_range && RANGES.includes(data.default_range)) {
          setRange(data.default_range);
        }
      })
      .catch(() => setUserSettings({ analytics_onboarded: false, ai_analytics_enabled: false }));
  }, []);

  useEffect(() => {
    if (userSettings?.analytics_onboarded && userSettings?.ai_analytics_enabled) {
      fetchAiSummary(range);
    }
  }, [range, userSettings?.analytics_onboarded, userSettings?.ai_analytics_enabled, fetchAiSummary]);

  const handleAiOnboardingChoice = useCallback(async (enable) => {
    const email = auth().currentUser?.email;
    if (!email) return;
    const next = { analytics_onboarded: true, ai_analytics_enabled: enable };
    setUserSettings(next);
    if (!enable) setShowJustDeclined(true);
    try {
      await post("/updateUserSettings", { email, ...next });
    } catch (e) {
      console.log("updateUserSettings error:", e.message);
    }
  }, []);

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

  const { start } = getStartEnd(range);
  const totalDays = RANGE_DAYS[range];
  const rawDays = data?.days ?? [];
  const avgs    = data?.averages ?? {};
  const mealBreak = data?.meal_breakdown ?? {};

  const activeMetric = METRICS.find((m) => m.key === metric);
  const goalForMetric = goals?.[activeMetric.goalKey] || 0;

  const allDays = useMemo(
    () => fillDays(rawDays, start, totalDays, metric),
    [rawDays, start, totalDays, metric]
  );
  const bucketed = useMemo(() => bucketize(allDays, range), [allDays, range]);

  const avgVal = avgs[metric] || 0;
  const diff = goalForMetric && avgVal ? Math.round(avgVal - goalForMetric) : null;
  const isLimitMetric = LIMIT_METRICS.has(metric);
  const diffIsGood = diff !== null && (isLimitMetric ? diff <= 0 : diff >= 0);
  const logRate = totalDays > 0 ? Math.round((rawDays.length / totalDays) * 100) : 0;

  const chartTypes = useMemo(() => {
    const base = [
      { key: "line",   label: "Line",   icon: "trending-up-outline" },
      { key: "bar",    label: "Bar",    icon: "stats-chart-outline" },
      { key: "meals",  label: "Meals",  icon: "pie-chart-outline" },
    ];
    if (metric === "calories") {
      base.push({ key: "macros", label: "Macros", icon: "nutrition-outline" });
    }
    base.push({ key: "trends", label: "Trends", icon: "layers-outline" });
    return base;
  }, [metric]);

  const mealsPie = useMemo(() => {
    const items = [1, 2, 3, 4].map((m) => ({
      key: String(m),
      label: MEAL_LABELS[m],
      color: MEAL_COLORS[m],
      value: (mealBreak[String(m)]?.[metric]) || 0,
    })).filter((x) => x.value > 0);
    return items;
  }, [mealBreak, metric]);

  const macrosPie = useMemo(() => {
    if (metric !== "calories") return [];
    const total = (avgs.protein || 0) * 4 + (avgs.carbs || 0) * 4 + (avgs.fat || 0) * 9;
    if (total <= 0) return [];
    return MACRO_BREAKDOWN.map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      value: (avgs[m.key] || 0) * m.kcalPerG,
    })).filter((x) => x.value > 0);
  }, [avgs, metric]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <Header openDrawer={openDrawer} range={range} setRange={setRange} disabled={loading} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={activeMetric.color} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={28} color={C.faint} />
          <Text style={s.errTxt}>Couldn't load data</Text>
          <Pressable onPress={() => fetchAll(range)} style={s.retryBtn}>
            <Text style={s.retryTxt}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <View style={[s.heroCard, { borderColor: activeMetric.color + "60" }]}>
            <View style={[s.heroGlow, { backgroundColor: activeMetric.color }]} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.metricScroll}
            >
              {(chartType === "macros" ? METRICS.filter((m) => m.key === "calories") : METRICS).map((m) => {
                const isActive = metric === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetric(m.key)}
                    style={[
                      s.metricChip,
                      isActive && { backgroundColor: m.color, borderColor: m.color },
                      !isActive && { borderColor: m.color + "55" },
                    ]}
                  >
                    <View style={[s.metricDot, { backgroundColor: isActive ? "#fff" : m.color }]} />
                    <Text style={[s.metricChipTxt, isActive && { color: "#fff", fontWeight: "700" }]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={s.heroTop}>
              <View style={{ flex: 1 }}>
                <View style={s.heroLabelRow}>
                  <View style={[s.heroDot, { backgroundColor: activeMetric.color }]} />
                  <Text style={s.heroLabel}>
                    avg {activeMetric.label.toLowerCase()} / day
                  </Text>
                </View>
                <Text style={[s.heroNum, { color: activeMetric.color }]}>
                  {Math.round(avgVal) || "—"}
                  <Text style={s.heroUnit}> {activeMetric.unit}</Text>
                </Text>
              </View>

              {goalForMetric > 0 && (
                <View
                  style={[
                    s.diffBadge,
                    {
                      backgroundColor: diff === null ? "rgba(255,255,255,0.05)" : diffIsGood ? "rgba(81,207,102,0.15)" : "rgba(255,107,107,0.15)",
                      borderColor: diff === null ? C.border : diffIsGood ? "#51CF6666" : "#FF6B6B66",
                    },
                  ]}
                >
                  {diff !== null && (
                    <Ionicons
                      name={diff > 0 ? "arrow-up" : "arrow-down"}
                      size={12}
                      color={diffIsGood ? "#51CF66" : "#FF6B6B"}
                    />
                  )}
                  <Text style={[s.diffTxt, { color: diff === null ? C.soft : diffIsGood ? "#51CF66" : "#FF6B6B" }]}>
                    Goal · {Math.round(goalForMetric)}{activeMetric.unit}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.chartWrap}>
              {chartType === "line" && (
                <LineChart
                  data={bucketed}
                  color={activeMetric.color}
                  goal={goalForMetric}
                  range={range}
                  unit={activeMetric.unit}
                />
              )}
              {chartType === "bar" && (
                <BarChartSvg
                  data={bucketed}
                  color={activeMetric.color}
                  goal={goalForMetric}
                  range={range}
                  unit={activeMetric.unit}
                />
              )}
              {chartType === "meals" && (
                <PieChart
                  slices={mealsPie}
                  centerLabel={`avg ${activeMetric.label.toLowerCase()}`}
                  centerValue={`${Math.round(avgVal)}${activeMetric.unit === "%" ? "%" : ""}`}
                  onSlicePress={(k) => setPieActive(pieActive === k ? null : k)}
                  activeSlice={pieActive}
                />
              )}
              {chartType === "macros" && (
                <PieChart
                  slices={macrosPie}
                  centerLabel="kcal from"
                  centerValue={`${Math.round(avgVal)}`}
                  onSlicePress={(k) => setPieActive(pieActive === k ? null : k)}
                  activeSlice={pieActive}
                />
              )}
              {chartType === "trends" && (
                <AllTrendsChart
                  rawDays={rawDays}
                  range={range}
                  goals={goals}
                  totalDays={totalDays}
                  startStr={start}
                />
              )}
            </View>

            <View style={s.chartTypeRow}>
              {chartTypes.map((t) => {
                const active = chartType === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { setChartType(t.key); setPieActive(null); }}
                    style={[
                      s.typeBtn,
                      active && { backgroundColor: activeMetric.color, borderColor: activeMetric.color },
                    ]}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={active ? "#fff" : C.soft}
                    />
                    <Text style={[s.typeBtnTxt, active && { color: "#fff", fontWeight: "700" }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.heroFooter}>
              <View style={s.footerStat}>
                <Ionicons name="calendar-outline" size={12} color={C.soft} />
                <Text style={s.footerTxt}>{rawDays.length} day{rawDays.length !== 1 ? "s" : ""} logged</Text>
              </View>
              <View style={s.footerStat}>
                <Ionicons name="checkmark-circle-outline" size={12} color={C.soft} />
                <Text style={s.footerTxt}>{logRate}% consistency</Text>
              </View>
            </View>
          </View>

          <Text style={s.sectionLabel}>MACROS — AVG / DAY</Text>
          <View style={s.macroSection}>
            <View style={s.macroRow}>
              <MacroCard
                label="Protein"
                value={avgs.protein || 0}
                unit="g"
                color="#4DABF7"
                goal={goals?.goal_protein}
              />
              <MacroCard
                label="Carbs"
                value={avgs.carbs || 0}
                unit="g"
                color="#FFB84D"
                goal={goals?.goal_total_carbohydrate}
              />
            </View>
            <View style={s.macroRow}>
              <MacroCard
                label="Fat"
                value={avgs.fat || 0}
                unit="g"
                color="#FF9F40"
                goal={goals?.goal_total_fat}
              />
              <MacroCard
                label="Fiber"
                value={avgs.fiber || 0}
                unit="g"
                color="#51CF66"
                goal={goals?.goal_dietary_fiber}
              />
            </View>
          </View>

          {userSettings && !userSettings.analytics_onboarded && (
            <AiOnboardingBanner
              justDeclined={false}
              onYes={() => handleAiOnboardingChoice(true)}
              onNo={() => handleAiOnboardingChoice(false)}
            />
          )}

          {userSettings?.analytics_onboarded && !userSettings.ai_analytics_enabled && showJustDeclined && (
            <AiOnboardingBanner justDeclined={true} />
          )}

          {userSettings?.analytics_onboarded && userSettings.ai_analytics_enabled && (
            <AiSection
              summary={aiSummary}
              loading={aiLoading}
              error={aiError}
              onRefresh={() => fetchAiSummary(range)}
              activeNutrient={metric}
              setActiveNutrient={(n) => setMetric(n)}
            />
          )}

          <Text style={s.sectionLabel}>MICROS — AVG / DAY</Text>
          <View style={s.microCard}>
            {[
              { k: "sodium",        l: "Sodium",        u: "mg", g: "goal_sodium",        c: "#B197FC" },
              { k: "sugar",         l: "Sugar",         u: "g",  g: "goal_total_sugars",  c: "#FF8FAB" },
              { k: "saturated_fat", l: "Saturated Fat", u: "g",  g: "goal_saturated_fat", c: "#E64980" },
              { k: "cholesterol",   l: "Cholesterol",   u: "mg", g: "goal_cholesterol",   c: "#FAA2C1" },
              { k: "vitamin_d",     l: "Vitamin D",     u: "%",  g: "goal_vitamin_d",     c: "#FCC419" },
              { k: "calcium",       l: "Calcium",       u: "%",  g: "goal_calcium",       c: "#74C0FC" },
              { k: "iron",          l: "Iron",          u: "%",  g: "goal_iron",          c: "#FF6B9D" },
              { k: "potassium",     l: "Potassium",     u: "%",  g: "goal_potassium",     c: "#38D9A9" },
            ].map((row, i, arr) => (
              <View key={row.k}>
                <MicroRow
                  label={row.l}
                  value={avgs[row.k] || 0}
                  unit={row.u}
                  goal={goals?.[row.g]}
                  color={row.c}
                />
                {i < arr.length - 1 && <View style={s.microSep} />}
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
