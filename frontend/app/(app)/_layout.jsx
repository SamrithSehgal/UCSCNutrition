import { useState, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { Redirect, Stack, usePathname, router } from "expo-router";
import { useAuthState } from "../hooks/useAuthState";
import { DrawerCtx } from "../drawerContext";
import { MenuCtx } from "../menuContext";
import { C } from "../styles/dashboard.styles";
import Ionicons from "@expo/vector-icons/Ionicons";
import { get } from "../api";

const DRAWER_W = 256;

const TABS = [
  { label: "Menus",     href: "/menus",     icon: "restaurant",  iconOut: "restaurant-outline"  },
  { label: "Journal",   href: "/dashboard", icon: "journal",     iconOut: "journal-outline"     },
  { label: "Analytics", href: "/analytics", icon: "stats-chart", iconOut: "stats-chart-outline" },
];

const FOOTER_TABS = [
  { label: "Settings",  href: "/settings",  icon: "settings",    iconOut: "settings-outline"    },
];

export default function AppLayout() {
  const { user, loading } = useAuthState();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [menu, setMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(null);

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 260 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer(cb) {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setDrawerOpen(false); cb?.(); });
  }

  function navigate(href) {
    if (pathname === href) { closeDrawer(); return; }
    closeDrawer(() => router.replace(href));
  }

  async function fetchMenu(dateStr) {
    if (menuLoading) return;
    setMenuLoading(true);
    setMenuError(null);
    try {
      const now = new Date();
      const d = dateStr ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const data = await get(`/getDHMenu?date=${d}`);
      setMenu(data);
    } catch (e) {
      setMenuError(e.message ?? "Failed to load menus.");
    } finally {
      setMenuLoading(false);
    }
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!user) return <Redirect href="/" />;

  return (
    <MenuCtx.Provider value={{ menu, loading: menuLoading, error: menuError, fetchMenu }}>
      <DrawerCtx.Provider value={{ open: drawerOpen, openDrawer, closeDrawer }}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <Stack screenOptions={{ headerShown: false }} />

          <Animated.View
            style={[StyleSheet.absoluteFill, ds.backdrop, { opacity }]}
            pointerEvents={drawerOpen ? "auto" : "none"}
          >
            <Pressable style={{ flex: 1 }} onPress={() => closeDrawer()} />
          </Animated.View>

          <Animated.View
            style={[ds.drawer, { transform: [{ translateX }] }]}
            pointerEvents={drawerOpen ? "auto" : "none"}
          >
            <View style={ds.drawerInner}>
              <View style={ds.brandArea}>
                <Text style={ds.brandName}>CampusPlates</Text>
                <Text style={ds.brandSub}>UCSC Dining</Text>
              </View>

              <View style={ds.divider} />

              <View style={ds.navSection}>
                {TABS.map((tab) => {
                  const active = pathname === tab.href;
                  return (
                    <Pressable
                      key={tab.href}
                      style={({ pressed }) => [
                        ds.navItem,
                        active && ds.navItemActive,
                        pressed && !active && ds.navItemPressed,
                      ]}
                      onPress={() => navigate(tab.href)}
                    >
                      {active && <View style={ds.activeAccent} />}
                      <Ionicons
                        name={active ? tab.icon : tab.iconOut}
                        size={19}
                        color={active ? C.blue : C.soft}
                        style={ds.navIcon}
                      />
                      <Text style={[ds.navLabel, active && ds.navLabelActive]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flex: 1 }} />
              <View style={ds.divider} />

              <View style={ds.navSection}>
                {FOOTER_TABS.map((tab) => {
                  const active = pathname === tab.href;
                  return (
                    <Pressable
                      key={tab.href}
                      style={({ pressed }) => [
                        ds.navItem,
                        active && ds.navItemActive,
                        pressed && !active && ds.navItemPressed,
                      ]}
                      onPress={() => navigate(tab.href)}
                    >
                      {active && <View style={ds.activeAccent} />}
                      <Ionicons
                        name={active ? tab.icon : tab.iconOut}
                        size={19}
                        color={active ? C.blue : C.soft}
                        style={ds.navIcon}
                      />
                      <Text style={[ds.navLabel, active && ds.navLabelActive]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </View>
      </DrawerCtx.Provider>
    </MenuCtx.Provider>
  );
}

const ds = StyleSheet.create({
  backdrop: { backgroundColor: "#000", zIndex: 20 },
  drawer: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: DRAWER_W,
    backgroundColor: C.surface,
    borderRightWidth: 1,
    borderRightColor: C.border,
    zIndex: 30,
  },
  drawerInner: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) + 8 : 56,
    paddingBottom: Platform.OS === "android" ? 16 : 32,
  },
  brandArea: { paddingHorizontal: 22, paddingBottom: 22 },
  brandName: { fontSize: 17, fontWeight: "700", color: C.text, letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: C.soft, marginTop: 3, fontWeight: "400" },
  divider: { height: 1, backgroundColor: C.border },
  navSection: { paddingTop: 10, paddingBottom: 6, paddingHorizontal: 10 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    marginVertical: 1,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: { backgroundColor: "rgba(80,128,188,0.11)" },
  navItemPressed: { backgroundColor: C.raised },
  activeAccent: {
    position: "absolute",
    left: 0, top: 8, bottom: 8,
    width: 3, borderRadius: 2,
    backgroundColor: C.blue,
  },
  navIcon: { width: 24, marginRight: 11, textAlign: "center" },
  navLabel: { fontSize: 15, fontWeight: "500", color: C.soft },
  navLabelActive: { color: C.blue, fontWeight: "600" },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 2,
  },
  signOutLabel: { fontSize: 14, color: C.faint, fontWeight: "500" },
});
