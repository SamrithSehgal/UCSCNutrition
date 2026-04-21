import { StyleSheet } from "react-native";

export const BG = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=85&auto=format&fit=crop";

export default StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,8,6,0.45)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 44,
    justifyContent: "space-between",
  },
  header: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  logo: {
    width: 220,
    height: 220,
    alignSelf: "center",
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 44,
    letterSpacing: -0.8,
    color: "#faf6f0",
    textAlign: "center",
  },
  sub: { fontSize: 15, lineHeight: 24, color: "rgba(250,246,240,0.5)", textAlign: "center" },
  footer: { gap: 12, alignItems: "center" },
  error: {
    width: "100%",
    fontSize: 14,
    color: "#f87171",
    backgroundColor: "rgba(248,113,113,0.1)",
    padding: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  btn: {
    width: "100%",
    paddingVertical: 17,
    borderRadius: 14,
    backgroundColor: "#faf6f0",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  btnPressed: { opacity: 0.82 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: "600", color: "#1a1208" },
  hint: { fontSize: 12, color: "rgba(250,246,240,0.3)", letterSpacing: 0.4 },
});
