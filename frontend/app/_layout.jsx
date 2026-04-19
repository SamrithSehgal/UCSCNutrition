import { LogBox } from "react-native";
import { Stack } from "expo-router";

LogBox.ignoreAllLogs();

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
