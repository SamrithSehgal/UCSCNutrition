import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput,
  SafeAreaView, StatusBar, ActivityIndicator, Modal, Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useDrawer } from "../drawerContext";
import { C } from "../styles/dashboard.styles";
import s from "../styles/settings.styles";
import { get, post } from "../api";

const NUTRIENT_METRICS = [
  { key: "calories",      label: "Calories",     defaultColor: "#FF6B6B" },
  { key: "protein",       label: "Protein",      defaultColor: "#4DABF7" },
  { key: "carbs",         label: "Carbs",        defaultColor: "#FFB84D" },
  { key: "fat",           label: "Fat",          defaultColor: "#FF9F40" },
  { key: "fiber",         label: "Fiber",        defaultColor: "#51CF66" },
  { key: "sodium",        label: "Sodium",       defaultColor: "#B197FC" },
  { key: "sugar",         label: "Sugar",        defaultColor: "#FF8FAB" },
  { key: "saturated_fat", label: "Saturated Fat", defaultColor: "#E64980" },
  { key: "cholesterol",   label: "Cholesterol",  defaultColor: "#FAA2C1" },
  { key: "vitamin_d",     label: "Vitamin D",    defaultColor: "#FCC419" },
  { key: "calcium",       label: "Calcium",      defaultColor: "#74C0FC" },
  { key: "iron",          label: "Iron",         defaultColor: "#FF6B9D" },
  { key: "potassium",     label: "Potassium",    defaultColor: "#38D9A9" },
];

const PALETTE = [
  "#FF6B6B", "#FA5252", "#FF8787", "#E64980", "#FF6B9D",
  "#FF8FAB", "#FAA2C1", "#BE4BDB", "#B197FC", "#845EF7",
  "#5C7CFA", "#4DABF7", "#74C0FC", "#5080BC", "#15AABF",
  "#38D9A9", "#20C997", "#51CF66", "#69DB7C", "#94D82D",
  "#C0EB75", "#FFD43B", "#FCC419", "#FFB84D", "#FF9F40",
  "#FFA94D", "#FF8C42", "#FD7E14", "#A0522D", "#8A8A8A",
];

const ACTIVITY_LEVELS = [
  { key: "sedentary",      label: "Sedentary" },
  { key: "lightly_active", label: "Lightly Active" },
  { key: "active",         label: "Active" },
  { key: "very_active",    label: "Very Active" },
];

const RANGES = ["1W", "1M", "6M", "1Y"];

function Toggle({ value, onValueChange }) {
  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      style={[s.toggle, value && s.toggleActive]}
    >
      <View
        style={[
          s.toggleKnob,
          value && s.toggleKnobActive,
          { transform: [{ translateX: value ? 18 : 0 }] },
        ]}
      />
    </Pressable>
  );
}

function ColorPickerModal({ visible, metric, currentColor, onPick, onClose }) {
  if (!metric) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>{metric.label} Color</Text>
              <Text style={s.colorPickerSub}>Tap a swatch to apply</Text>
            </View>
            <Pressable style={s.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={14} color={C.soft} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.colorGrid}>
              {PALETTE.map((c) => {
                const active = c.toLowerCase() === (currentColor || "").toLowerCase();
                return (
                  <Pressable
                    key={c}
                    onPress={() => { onPick(c); onClose(); }}
                    style={[s.colorSwatch, { backgroundColor: c }, active && s.colorSwatchActive]}
                  >
                    {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ alignItems: "flex-start", marginTop: 12 }}>
              <Pressable
                style={s.resetBtn}
                onPress={() => { onPick(null); onClose(); }}
              >
                <Text style={s.resetBtnTxt}>Reset to default</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Settings() {
  const { openDrawer } = useDrawer();
  const email = auth().currentUser?.email ?? null;

  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileDraft, setProfileDraft] = useState(null);
  const [pickerMetric, setPickerMetric] = useState(null);

  useEffect(() => {
    if (!email) return;
    Promise.all([
      get(`/getUserProfile?email=${encodeURIComponent(email)}`),
      get(`/getUserSettings?email=${encodeURIComponent(email)}`),
    ])
      .then(([p, st]) => {
        setProfile(p);
        setProfileDraft(p);
        setSettings(st);
      })
      .catch((e) => console.log("settings load error:", e.message))
      .finally(() => setLoading(false));
  }, [email]);

  const updateSetting = useCallback(async (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      await post("/updateUserSettings", { email, ...patch });
    } catch (e) {
      console.log("updateUserSettings error:", e.message);
    }
  }, [email]);

  const updateMetricColor = useCallback((metricKey, color) => {
    const next = { ...(settings?.metric_colors ?? {}) };
    if (color === null) {
      delete next[metricKey];
    } else {
      next[metricKey] = color;
    }
    updateSetting({ metric_colors: Object.keys(next).length ? next : null });
  }, [settings, updateSetting]);

  const isDirty = profileDraft && profile && (
    profileDraft.first_name !== profile.first_name ||
    profileDraft.family_name !== profile.family_name ||
    profileDraft.sex !== profile.sex ||
    Number(profileDraft.age) !== Number(profile.age) ||
    Number(profileDraft.height_ft) !== Number(profile.height_ft) ||
    Number(profileDraft.height_in) !== Number(profile.height_in) ||
    Number(profileDraft.weight_lbs) !== Number(profile.weight_lbs) ||
    Number(profileDraft.goal_weight_lbs) !== Number(profile.goal_weight_lbs) ||
    profileDraft.activity_level !== profile.activity_level
  );

  async function saveProfile() {
    if (!isDirty || !email) return;
    setSaving(true);
    try {
      await post("/updateUserProfile", { email, ...profileDraft });
      setProfile(profileDraft);
    } catch (e) {
      console.log("updateUserProfile error:", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try { await GoogleSignin.signOut(); } catch (_) {}
    await auth().signOut();
  }

  function confirmSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: handleSignOut },
      ]
    );
  }

  if (loading || !settings) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" />
        <View style={s.header}>
          <Pressable
            style={({ pressed }) => [s.menuBtn, pressed && { opacity: 0.45 }]}
            onPress={openDrawer}
            hitSlop={10}
          >
            <Ionicons name="menu-outline" size={22} color={C.soft} />
          </Pressable>
          <Text style={s.title}>Settings</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.soft} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = `${(profile?.first_name?.[0] ?? "").toUpperCase()}${(profile?.family_name?.[0] ?? "").toUpperCase()}` || "—";
  const colorMap = settings.metric_colors ?? {};

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.menuBtn, pressed && { opacity: 0.45 }]}
          onPress={openDrawer}
          hitSlop={10}
        >
          <Ionicons name="menu-outline" size={22} color={C.soft} />
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={s.sectionLabel}>PROFILE</Text>
          <View style={s.card}>
            <View style={s.profileTop}>
              <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
              <Text style={s.profileName}>
                {profile?.first_name} {profile?.family_name}
              </Text>
              <Text style={s.profileEmail}>{profile?.email}</Text>
            </View>
            <View style={s.rowSep} />

            <View style={s.inputRow}>
              <Text style={s.inputLabel}>First name</Text>
              <TextInput
                style={s.input}
                value={profileDraft?.first_name ?? ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, first_name: v }))}
                placeholderTextColor={C.faint}
              />
            </View>
            <View style={s.rowSep} />
            <View style={s.inputRow}>
              <Text style={s.inputLabel}>Last name</Text>
              <TextInput
                style={s.input}
                value={profileDraft?.family_name ?? ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, family_name: v }))}
                placeholderTextColor={C.faint}
              />
            </View>
            <View style={s.rowSep} />

            <View style={s.row}>
              <Text style={s.rowLabel}>Sex</Text>
              <View style={s.segRow}>
                {["male", "female"].map((sx) => {
                  const active = profileDraft?.sex === sx;
                  return (
                    <Pressable
                      key={sx}
                      onPress={() => setProfileDraft((p) => ({ ...p, sex: sx }))}
                      style={[s.segBtn, active && s.segBtnActive]}
                    >
                      <Text style={[s.segBtnTxt, active && s.segBtnTxtActive]}>
                        {sx === "male" ? "Male" : "Female"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={s.rowSep} />

            <View style={s.inputRow}>
              <Text style={s.inputLabel}>Age</Text>
              <TextInput
                style={s.input}
                value={profileDraft?.age != null ? String(profileDraft.age) : ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, age: v.replace(/[^0-9]/g, "") }))}
                keyboardType="number-pad"
                placeholderTextColor={C.faint}
              />
              <Text style={s.inputSuffix}>yrs</Text>
            </View>
            <View style={s.rowSep} />

            <View style={s.inputRow}>
              <Text style={s.inputLabel}>Height</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={profileDraft?.height_ft != null ? String(profileDraft.height_ft) : ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, height_ft: v.replace(/[^0-9]/g, "") }))}
                keyboardType="number-pad"
                placeholderTextColor={C.faint}
              />
              <Text style={s.inputSuffix}>ft</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={profileDraft?.height_in != null ? String(profileDraft.height_in) : ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, height_in: v.replace(/[^0-9]/g, "") }))}
                keyboardType="number-pad"
                placeholderTextColor={C.faint}
              />
              <Text style={s.inputSuffix}>in</Text>
            </View>
            <View style={s.rowSep} />

            <View style={s.inputRow}>
              <Text style={s.inputLabel}>Weight</Text>
              <TextInput
                style={s.input}
                value={profileDraft?.weight_lbs != null ? String(profileDraft.weight_lbs) : ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, weight_lbs: v.replace(/[^0-9.]/g, "") }))}
                keyboardType="decimal-pad"
                placeholderTextColor={C.faint}
              />
              <Text style={s.inputSuffix}>lbs</Text>
            </View>
            <View style={s.rowSep} />

            <View style={s.inputRow}>
              <Text style={s.inputLabel}>Goal weight</Text>
              <TextInput
                style={s.input}
                value={profileDraft?.goal_weight_lbs != null ? String(profileDraft.goal_weight_lbs) : ""}
                onChangeText={(v) => setProfileDraft((p) => ({ ...p, goal_weight_lbs: v.replace(/[^0-9.]/g, "") }))}
                keyboardType="decimal-pad"
                placeholderTextColor={C.faint}
              />
              <Text style={s.inputSuffix}>lbs</Text>
            </View>
            <View style={s.rowSep} />

            <View style={s.pillSegRow}>
              {ACTIVITY_LEVELS.map((al) => {
                const active = profileDraft?.activity_level === al.key;
                return (
                  <Pressable
                    key={al.key}
                    onPress={() => setProfileDraft((p) => ({ ...p, activity_level: al.key }))}
                    style={[s.pillSeg, active && s.pillSegActive]}
                  >
                    <Text style={[s.pillSegTxt, active && s.pillSegTxtActive]}>{al.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            disabled={!isDirty || saving}
            onPress={saveProfile}
            style={[s.saveBtn, (!isDirty || saving) && s.saveBtnDisabled]}
          >
            <Text style={s.saveBtnTxt}>
              {saving ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
            </Text>
          </Pressable>
        </View>

        <View>
          <Text style={s.sectionLabel}>AI ANALYSIS</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIconWrap, { borderColor: "rgba(80,128,188,0.4)", backgroundColor: "rgba(80,128,188,0.18)" }]}>
                <Ionicons name="sparkles-outline" size={14} color="#7AB0E0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>AI nutrition insights</Text>
                <Text style={s.rowSub}>Personalized analysis on the analytics page.</Text>
              </View>
              <Toggle
                value={settings.ai_analytics_enabled}
                onValueChange={(v) => updateSetting({ ai_analytics_enabled: v, analytics_onboarded: true })}
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={s.sectionLabel}>APPEARANCE</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="moon-outline" size={14} color={C.soft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Theme</Text>
                <Text style={s.rowSub}>Light mode is in beta — most screens currently render in dark.</Text>
              </View>
              <View style={s.segRow}>
                {[{ k: "dark", l: "Dark" }, { k: "light", l: "Light" }].map((t) => {
                  const active = settings.theme === t.k;
                  return (
                    <Pressable
                      key={t.k}
                      onPress={() => updateSetting({ theme: t.k })}
                      style={[s.segBtn, active && s.segBtnActive]}
                    >
                      <Text style={[s.segBtnTxt, active && s.segBtnTxtActive]}>{t.l}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={s.rowSep} />
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="contract-outline" size={14} color={C.soft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Compact view</Text>
                <Text style={s.rowSub}>Tighter spacing on cards and lists.</Text>
              </View>
              <Toggle
                value={settings.compact_view}
                onValueChange={(v) => updateSetting({ compact_view: v })}
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={s.sectionLabel}>NUTRIENT COLORS</Text>
          <View style={s.card}>
            {NUTRIENT_METRICS.map((m, i) => {
              const color = colorMap[m.key] ?? m.defaultColor;
              const isCustom = !!colorMap[m.key];
              return (
                <View key={m.key}>
                  {i > 0 && <View style={s.rowSep} />}
                  <Pressable
                    style={({ pressed }) => [s.colorMetricRow, pressed && { opacity: 0.6 }]}
                    onPress={() => setPickerMetric(m)}
                  >
                    <View style={[s.colorSwatchPreview, { backgroundColor: color }]} />
                    <Text style={s.colorMetricName}>{m.label}</Text>
                    {isCustom && (
                      <Text style={[s.rowSub, { marginTop: 0, color: "#7AB0E0", fontWeight: "600" }]}>Custom</Text>
                    )}
                    <Text style={s.colorMetricChevron}>›</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={s.sectionLabel}>PREFERENCES</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="speedometer-outline" size={14} color={C.soft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Units</Text>
                <Text style={s.rowSub}>Imperial (lbs/ft) or metric (kg/cm).</Text>
              </View>
              <View style={s.segRow}>
                {[{ k: "imperial", l: "Imperial" }, { k: "metric", l: "Metric" }].map((u) => {
                  const active = settings.units_system === u.k;
                  return (
                    <Pressable
                      key={u.k}
                      onPress={() => updateSetting({ units_system: u.k })}
                      style={[s.segBtn, active && s.segBtnActive]}
                    >
                      <Text style={[s.segBtnTxt, active && s.segBtnTxtActive]}>{u.l}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={s.rowSep} />
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={C.soft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Default analytics range</Text>
                <Text style={s.rowSub}>Time range to load when opening Analytics.</Text>
              </View>
            </View>
            <View style={s.pillSegRow}>
              {RANGES.map((r) => {
                const active = settings.default_range === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => updateSetting({ default_range: r })}
                    style={[s.pillSeg, active && s.pillSegActive]}
                  >
                    <Text style={[s.pillSegTxt, active && s.pillSegTxtActive]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.rowSep} />
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="notifications-outline" size={14} color={C.soft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Notifications</Text>
                <Text style={s.rowSub}>Reminders to log meals and updates.</Text>
              </View>
              <Toggle
                value={settings.notifications_enabled}
                onValueChange={(v) => updateSetting({ notifications_enabled: v })}
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <Pressable
            style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.7 }]}
            onPress={confirmSignOut}
          >
            <Ionicons name="log-out-outline" size={16} color="#D77878" />
            <Text style={s.signOutBtnTxt}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ColorPickerModal
        visible={pickerMetric !== null}
        metric={pickerMetric}
        currentColor={pickerMetric ? (colorMap[pickerMetric.key] ?? pickerMetric.defaultColor) : null}
        onPick={(color) => {
          if (pickerMetric) updateMetricColor(pickerMetric.key, color);
        }}
        onClose={() => setPickerMetric(null)}
      />
    </SafeAreaView>
  );
}
