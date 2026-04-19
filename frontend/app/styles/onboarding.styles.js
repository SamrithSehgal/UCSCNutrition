import { StyleSheet } from "react-native";
import { C } from "./dashboard.styles";

export { C };

export default StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // ── Progress bar ─────────────────────────────────────────────
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.raised,
  },
  progressSegmentActive: {
    backgroundColor: C.blue,
  },

  // ── Header text ───────────────────────────────────────────────
  titleWrap: {
    paddingTop: 28,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: C.soft,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Option card (activity level, rate) ───────────────────────
  optionCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  optionCardSelected: {
    borderColor: C.blue,
    backgroundColor: "rgba(80,128,188,0.08)",
  },
  optionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  optionLabelSelected: {
    color: C.blue,
  },
  optionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCheckSelected: {
    borderColor: C.blue,
    backgroundColor: C.blue,
  },
  optionCheckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  optionSub: {
    fontSize: 13,
    color: C.soft,
    marginTop: 5,
    lineHeight: 18,
  },

  // ── Form fields ───────────────────────────────────────────────
  fieldSection: {
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.soft,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: C.blue,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    color: C.text,
  },
  inputUnit: {
    fontSize: 14,
    color: C.faint,
    marginLeft: 4,
  },

  // ── Sex toggle ────────────────────────────────────────────────
  sexRow: {
    flexDirection: "row",
    gap: 10,
  },
  sexBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  sexBtnSelected: {
    borderColor: C.blue,
    backgroundColor: "rgba(80,128,188,0.08)",
  },
  sexBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.soft,
  },
  sexBtnTextSelected: {
    color: C.blue,
  },

  // ── Slider ────────────────────────────────────────────────────
  sliderWrap: {
    marginTop: 8,
    marginBottom: 8,
  },
  sliderValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sliderValueNum: {
    fontSize: 42,
    fontWeight: "200",
    color: C.text,
    fontVariant: ["tabular-nums"],
  },
  sliderValueUnit: {
    fontSize: 16,
    color: C.soft,
    marginLeft: 4,
  },
  sliderDeltaTag: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  sliderTrackWrap: {
    height: 36,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 4,
    backgroundColor: C.raised,
    borderRadius: 2,
    overflow: "visible",
  },
  sliderFill: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
  },
  sliderCenterMark: {
    position: "absolute",
    width: 2,
    height: 14,
    backgroundColor: C.faint,
    borderRadius: 1,
    top: -5,
  },
  sliderThumb: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.blue,
    borderWidth: 2.5,
    borderColor: "#fff",
    top: -11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sliderRangeText: {
    fontSize: 12,
    color: C.faint,
    fontVariant: ["tabular-nums"],
  },

  // ── Section divider ───────────────────────────────────────────
  sectionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 24,
  },

  // ── Continue / Finish button ──────────────────────────────────
  continueBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.blue,
  },
  continueBtnDisabled: {
    backgroundColor: C.raised,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.2,
  },
  continueBtnTextDisabled: {
    color: C.faint,
  },
});
