import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import auth from "@react-native-firebase/auth";
import { post } from "../../api";
import s, { C } from "../../styles/onboarding.styles";

const SLIDER_RANGE = 50;

const RATES = [
  {
    value: 0.5,
    label: "0.5 lb / week",
    gainSub: "Slow and sustainable — minimal dietary change needed. Great for building lean mass with little fat gain.",
    lossSub: "Slow and sustainable — easy to maintain with modest diet adjustments. Least disruptive to energy levels.",
    difficulty: "Easy",
  },
  {
    value: 1.0,
    label: "1 lb / week",
    gainSub: "A moderate pace — requires consistent caloric surplus. Balanced approach for most people.",
    lossSub: "The most recommended pace for lasting fat loss — noticeable progress without feeling deprived.",
    difficulty: "Moderate",
  },
  {
    value: 1.5,
    label: "1.5 lb / week",
    gainSub: "Faster bulk — larger surplus means more potential fat gain alongside muscle.",
    lossSub: "Aggressive cut — requires discipline with meals. Best paired with strength training to preserve muscle.",
    difficulty: "Challenging",
  },
  {
    value: 2.0,
    label: "2 lb / week",
    gainSub: "Maximum rate — significant surplus, expect some fat gain. Suited for those prioritizing mass.",
    lossSub: "Maximum recommended deficit — quite strict. Only sustainable short-term without risking muscle loss.",
    difficulty: "Hard",
  },
];

function WeightSlider({ currentWeight, goalWeight, onChange }) {
  const trackWidthRef = useRef(0);
  const startGoalRef = useRef(goalWeight);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startGoalRef.current = goalWeight;
      },
      onPanResponderMove: (_, gs) => {
        const width = trackWidthRef.current;
        if (width === 0) return;
        const deltaLbs = (gs.dx / width) * (SLIDER_RANGE * 2);
        const raw = startGoalRef.current + deltaLbs;
        const clamped = Math.round(
          Math.max(currentWeight - SLIDER_RANGE, Math.min(currentWeight + SLIDER_RANGE, raw))
        );
        onChange(clamped);
      },
    })
  ).current;

  const fraction = (goalWeight - (currentWeight - SLIDER_RANGE)) / (SLIDER_RANGE * 2);
  const centerFraction = 0.5;
  const delta = goalWeight - currentWeight;
  const isGain = delta > 0;
  const isLoss = delta < 0;

  const fillLeft = isLoss ? fraction : centerFraction;
  const fillRight = isGain ? 1 - fraction : 1 - centerFraction;

  const deltaColor = isGain ? C.green : isLoss ? C.danger : C.soft;
  const deltaLabel =
    delta === 0
      ? "Maintain weight"
      : isGain
      ? `+${delta} lbs`
      : `${delta} lbs`;

  return (
    <View style={s.sliderWrap}>
      <View style={s.sliderValueRow}>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <Text style={s.sliderValueNum}>{goalWeight}</Text>
          <Text style={s.sliderValueUnit}> lbs</Text>
        </View>
        <Text
          style={[
            s.sliderDeltaTag,
            {
              color: deltaColor,
              backgroundColor: isGain
                ? "rgba(74,143,90,0.12)"
                : isLoss
                ? "rgba(158,64,64,0.12)"
                : "rgba(138,138,138,0.1)",
            },
          ]}
        >
          {deltaLabel}
        </Text>
      </View>

      <View
        style={s.sliderTrackWrap}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <View style={s.sliderTrack}>
          {/* filled region */}
          <View
            style={[
              s.sliderFill,
              {
                left: `${fillLeft * 100}%`,
                right: `${fillRight * 100}%`,
                backgroundColor: isGain ? C.green : isLoss ? C.danger : C.soft,
              },
            ]}
          />
          {/* center mark */}
          <View style={[s.sliderCenterMark, { left: "50%" }]} />
        </View>

        {/* thumb */}
        <View
          style={[
            s.sliderThumb,
            {
              left: `${fraction * 100}%`,
              marginLeft: -13,
              backgroundColor: isGain ? C.green : isLoss ? C.danger : C.soft,
            },
          ]}
        />
      </View>

      <View style={s.sliderRangeRow}>
        <Text style={s.sliderRangeText}>{currentWeight - SLIDER_RANGE} lbs</Text>
        <Text style={[s.sliderRangeText, { color: C.soft }]}>
          Current: {currentWeight} lbs
        </Text>
        <Text style={s.sliderRangeText}>{currentWeight + SLIDER_RANGE} lbs</Text>
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const params = useLocalSearchParams();
  const currentWeight = Math.round(parseFloat(params.weight) || 150);

  const [goalWeight, setGoalWeight] = useState(currentWeight);
  const [selectedRate, setSelectedRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const delta = goalWeight - currentWeight;
  const isMaintain = delta === 0;
  const isGain = delta > 0;

  const canFinish = isMaintain || selectedRate !== null;

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      const user = auth().currentUser;
      await post("/saveOnboarding", {
        email: user.email,
        activity_level: params.activity,
        sex: params.sex,
        age: params.age,
        height_ft: params.heightFt,
        height_in: params.heightIn,
        weight: params.weight,
        goal_weight: goalWeight,
        weight_change_rate: isMaintain ? null : selectedRate,
      });
      router.replace("/(app)/dashboard");
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const rateTitle = isMaintain
    ? null
    : isGain
    ? "How fast do you want to gain?"
    : "How fast do you want to lose?";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={s.progressWrap}>
        <View style={[s.progressSegment, s.progressSegmentActive]} />
        <View style={[s.progressSegment, s.progressSegmentActive]} />
        <View style={[s.progressSegment, s.progressSegmentActive]} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleWrap}>
          <Text style={s.title}>Set your goal</Text>
          <Text style={s.subtitle}>
            Drag the slider to set your target weight.
          </Text>
        </View>

        <WeightSlider
          currentWeight={currentWeight}
          goalWeight={goalWeight}
          onChange={setGoalWeight}
        />

        {!isMaintain && (
          <>
            <View style={s.sectionDivider} />

            <Text style={[s.subtitle, { color: C.text, fontSize: 16, fontWeight: "600" }]}>
              {rateTitle}
            </Text>
            <Text style={[s.subtitle, { marginTop: 4 }]}>
              {isGain
                ? "Choose a weekly gain rate that fits your lifestyle."
                : "Choose a weekly loss rate you can realistically sustain."}
            </Text>

            {RATES.map((rate) => {
              const isSelected = selectedRate === rate.value;
              return (
                <Pressable
                  key={rate.value}
                  style={({ pressed }) => [
                    s.optionCard,
                    isSelected && s.optionCardSelected,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setSelectedRate(rate.value)}
                >
                  <View style={s.optionCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.optionLabel, isSelected && s.optionLabelSelected]}>
                        {rate.label}
                      </Text>
                      <Text
                        style={[
                          s.optionSub,
                          { fontSize: 11, color: C.faint, marginTop: 1 },
                        ]}
                      >
                        {rate.difficulty}
                      </Text>
                    </View>
                    <View style={[s.optionCheck, isSelected && s.optionCheckSelected]}>
                      {isSelected && <View style={s.optionCheckDot} />}
                    </View>
                  </View>
                  <Text style={s.optionSub}>
                    {isGain ? rate.gainSub : rate.lossSub}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}

        {isMaintain && (
          <>
            <View style={s.sectionDivider} />
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
                Maintaining current weight
              </Text>
              <Text style={[s.optionSub, { marginTop: 6 }]}>
                We'll set your calorie goal to match your total daily energy expenditure — enough to fuel your activity without gaining or losing.
              </Text>
            </View>
          </>
        )}

        {error && (
          <Text
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "#f87171",
              backgroundColor: "rgba(248,113,113,0.1)",
              padding: 12,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {error}
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [
            s.continueBtn,
            !canFinish && s.continueBtnDisabled,
            pressed && canFinish && { opacity: 0.82 },
          ]}
          onPress={handleFinish}
          disabled={!canFinish || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[s.continueBtnText, !canFinish && s.continueBtnTextDisabled]}>
              Finish Setup
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
