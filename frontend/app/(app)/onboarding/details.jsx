import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  TextInput,
  StatusBar,
  Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import s, { C } from "../../styles/onboarding.styles";

export default function DetailsScreen() {
  const { activity } = useLocalSearchParams();

  const [sex, setSex] = useState(null);
  const [age, setAge] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");

  const [focused, setFocused] = useState(null);

  const ageRef = useRef(null);
  const ftRef = useRef(null);
  const inRef = useRef(null);
  const weightRef = useRef(null);

  const canContinue =
    sex !== null &&
    age.trim().length > 0 &&
    heightFt.trim().length > 0 &&
    heightIn.trim().length > 0 &&
    weight.trim().length > 0;

  function handleContinue() {
    Keyboard.dismiss();
    router.push({
      pathname: "/(app)/onboarding/goals",
      params: {
        activity,
        sex,
        age,
        heightFt,
        heightIn,
        weight,
      },
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      <View style={s.progressWrap}>
        <View style={[s.progressSegment, s.progressSegmentActive]} />
        <View style={[s.progressSegment, s.progressSegmentActive]} />
        <View style={s.progressSegment} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.titleWrap}>
          <Text style={s.title}>A bit about you</Text>
          <Text style={s.subtitle}>
            Used to calculate your personalized calorie and macro targets.
          </Text>
        </View>

        {/* Sex */}
        <View style={s.fieldSection}>
          <Text style={s.fieldLabel}>Sex</Text>
          <View style={s.sexRow}>
            {["male", "female"].map((option) => {
              const isSelected = sex === option;
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    s.sexBtn,
                    isSelected && s.sexBtnSelected,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setSex(option)}
                >
                  <Text style={[s.sexBtnText, isSelected && s.sexBtnTextSelected]}>
                    {option === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Age */}
        <View style={s.fieldSection}>
          <Text style={s.fieldLabel}>Age</Text>
          <Pressable
            style={[s.inputWrap, focused === "age" && s.inputWrapFocused]}
            onPress={() => ageRef.current?.focus()}
          >
            <TextInput
              ref={ageRef}
              style={s.input}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="—"
              placeholderTextColor={C.faint}
              onFocus={() => setFocused("age")}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
              onSubmitEditing={() => ftRef.current?.focus()}
            />
            <Text style={s.inputUnit}>years</Text>
          </Pressable>
        </View>

        {/* Height */}
        <View style={s.fieldSection}>
          <Text style={s.fieldLabel}>Height</Text>
          <View style={s.inputRow}>
            <Pressable
              style={[s.inputWrap, focused === "ft" && s.inputWrapFocused]}
              onPress={() => ftRef.current?.focus()}
            >
              <TextInput
                ref={ftRef}
                style={s.input}
                value={heightFt}
                onChangeText={(v) => setHeightFt(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={1}
                placeholder="—"
                placeholderTextColor={C.faint}
                onFocus={() => setFocused("ft")}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
                onSubmitEditing={() => inRef.current?.focus()}
              />
              <Text style={s.inputUnit}>ft</Text>
            </Pressable>

            <Pressable
              style={[s.inputWrap, focused === "in" && s.inputWrapFocused]}
              onPress={() => inRef.current?.focus()}
            >
              <TextInput
                ref={inRef}
                style={s.input}
                value={heightIn}
                onChangeText={(v) => {
                  const num = v.replace(/[^0-9]/g, "");
                  setHeightIn(Math.min(11, parseInt(num || "0", 10)).toString() === "0" && num === "" ? "" : Math.min(11, parseInt(num || "0", 10)).toString());
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="—"
                placeholderTextColor={C.faint}
                onFocus={() => setFocused("in")}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
              />
              <Text style={s.inputUnit}>in</Text>
            </Pressable>
          </View>
        </View>

        {/* Weight */}
        <View style={s.fieldSection}>
          <Text style={s.fieldLabel}>Current Weight</Text>
          <Pressable
            style={[s.inputWrap, focused === "weight" && s.inputWrapFocused]}
            onPress={() => weightRef.current?.focus()}
          >
            <TextInput
              ref={weightRef}
              style={s.input}
              value={weight}
              onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              maxLength={6}
              placeholder="—"
              placeholderTextColor={C.faint}
              onFocus={() => setFocused("weight")}
              onBlur={() => setFocused(null)}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <Text style={s.inputUnit}>lbs</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.continueBtn,
            !canContinue && s.continueBtnDisabled,
            pressed && canContinue && { opacity: 0.82 },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={[s.continueBtnText, !canContinue && s.continueBtnTextDisabled]}>
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
