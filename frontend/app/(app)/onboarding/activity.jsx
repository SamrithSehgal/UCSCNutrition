import { useState } from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { router } from "expo-router";
import s from "../../styles/onboarding.styles";

const ACTIVITY_OPTIONS = [
  {
    id: "sedentary",
    label: "Not Very Active",
    sub: "Mostly sitting throughout the day — desk job, little to no structured exercise.",
  },
  {
    id: "lightly_active",
    label: "Lightly Active",
    sub: "Light movement a few days a week — casual walks, occasional gym visits.",
  },
  {
    id: "active",
    label: "Active",
    sub: "Moderate exercise most days — consistent gym routine, sports, or physical job.",
  },
  {
    id: "very_active",
    label: "Very Active",
    sub: "Intense daily training — athletes, hard labor, or multiple workouts per day.",
  },
];

export default function ActivityScreen() {
  const [selected, setSelected] = useState(null);

  function handleContinue() {
    router.push({
      pathname: "/(app)/onboarding/details",
      params: { activity: selected },
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={s.progressWrap}>
        <View style={[s.progressSegment, s.progressSegmentActive]} />
        <View style={s.progressSegment} />
        <View style={s.progressSegment} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleWrap}>
          <Text style={s.title}>How active are you?</Text>
          <Text style={s.subtitle}>
            We use this to estimate your daily calorie needs.
          </Text>
        </View>

        {ACTIVITY_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                s.optionCard,
                isSelected && s.optionCardSelected,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setSelected(opt.id)}
            >
              <View style={s.optionCardHeader}>
                <Text style={[s.optionLabel, isSelected && s.optionLabelSelected]}>
                  {opt.label}
                </Text>
                <View style={[s.optionCheck, isSelected && s.optionCheckSelected]}>
                  {isSelected && <View style={s.optionCheckDot} />}
                </View>
              </View>
              <Text style={s.optionSub}>{opt.sub}</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [
            s.continueBtn,
            !selected && s.continueBtnDisabled,
            pressed && selected && { opacity: 0.82 },
          ]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={[s.continueBtnText, !selected && s.continueBtnTextDisabled]}>
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
