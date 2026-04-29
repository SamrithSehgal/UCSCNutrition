import { StyleSheet } from "react-native";
import { C } from "./dashboard.styles";

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
  },
  menuBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
  },

  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 18,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.soft,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 6,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowSep: { height: 1, backgroundColor: C.border, marginLeft: 16 },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 11,
    color: C.faint,
    marginTop: 2,
    fontWeight: "400",
  },
  rowValue: {
    fontSize: 13,
    color: C.soft,
    fontWeight: "600",
  },
  rowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.border,
  },

  // Profile avatar block
  profileTop: {
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.raised,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  avatarTxt: {
    fontSize: 22, fontWeight: "700", color: C.text,
  },
  profileName: {
    fontSize: 16, fontWeight: "700", color: C.text,
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12, color: C.soft, fontWeight: "500",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: C.soft,
    fontWeight: "500",
    width: 90,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontWeight: "500",
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputSuffix: {
    fontSize: 12, color: C.faint, fontWeight: "500",
    marginLeft: -6,
  },

  segRow: {
    flexDirection: "row",
    backgroundColor: C.raised,
    borderRadius: 9,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: "center",
  },
  segBtnActive: {
    backgroundColor: C.surface,
  },
  segBtnTxt: { fontSize: 12, color: C.soft, fontWeight: "600" },
  segBtnTxtActive: { color: C.text, fontWeight: "700" },

  pillSegRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillSeg: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.raised,
  },
  pillSegActive: {
    borderColor: "#5080BC",
    backgroundColor: "rgba(80,128,188,0.18)",
  },
  pillSegTxt: { fontSize: 12, color: C.soft, fontWeight: "600" },
  pillSegTxtActive: { color: "#7AB0E0", fontWeight: "700" },

  toggle: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "rgba(80,128,188,0.5)",
    borderColor: "#5080BC",
  },
  toggleKnob: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.soft,
  },
  toggleKnobActive: {
    backgroundColor: "#fff",
  },

  saveBtn: {
    marginHorizontal: 14, marginTop: 6,
    backgroundColor: "#5080BC",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(158,64,64,0.4)",
    backgroundColor: "rgba(158,64,64,0.1)",
  },
  signOutBtnTxt: { fontSize: 14, fontWeight: "700", color: "#D77878", letterSpacing: 0.3 },

  colorMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  colorSwatchPreview: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: C.surface,
  },
  colorMetricName: {
    flex: 1,
    fontSize: 14, color: C.text, fontWeight: "500",
  },
  colorMetricChevron: {
    color: C.faint, fontSize: 18, fontWeight: "300",
  },

  colorPickerCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  colorPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorPickerTitle: {
    fontSize: 13, fontWeight: "700", color: C.text,
  },
  colorPickerSub: { fontSize: 11, color: C.soft, fontWeight: "500" },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#fff",
  },
  resetBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.raised,
  },
  resetBtnTxt: {
    fontSize: 11, color: C.soft, fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    borderTopWidth: 1, borderRightWidth: 1, borderLeftWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 14,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16, fontWeight: "700", color: C.text,
  },
  modalCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.border,
  },
});
