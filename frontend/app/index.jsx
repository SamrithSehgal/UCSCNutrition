import { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from "react-native";
import s, { BG } from "./styles/index.styles";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";
import { post } from "./api";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  hostedDomain: "ucsc.edu",
});

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fbUser, setFbUser] = useState(undefined)

  // Step 1: listen to Firebase auth state and store user in React state
  useEffect(() => {
    return auth().onAuthStateChanged(setFbUser);
  }, []);

  // Step 2: when fbUser resolves, register with backend and route
  useEffect(() => {
    if (fbUser === undefined || fbUser === null) return;
    const nameParts = (fbUser.displayName ?? "").split(" ");
    post("/postUser", {
      email: fbUser.email,
      givenName: nameParts[0] ?? "",
      familyName: nameParts.slice(1).join(" ") ?? "",
    })
      .then(result => {
        router.replace(result.is_new ? "/(app)/onboarding/activity" : "/(app)/dashboard");
      })
      .catch(async () => {
        // Backend unreachable — sign out of Firebase so the user isn't
        // left in a half-authenticated state with no DB record.
        await auth().signOut();
        setFbUser(null);
        setLoading(false);
        setError("Could not reach the server. Make sure you're connected and try again.");
      });
  }, [fbUser]);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const credential = auth.GoogleAuthProvider.credential(data.idToken);
      await auth().signInWithCredential(credential);
      // fbUser state update triggers the useEffect above, which handles routing
    } catch (e) {
      if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
        setError("Sign-in failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <ImageBackground source={{ uri: BG }} style={s.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={s.overlay} />

      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.logo}>CampusPlates</Text>
        </View>

        <View style={s.main}>
          <Text style={s.title}>{"Track every meal,\nfrom anywhere."}</Text>
          <Text style={s.sub}>Keep track of all your macronutrients</Text>
        </View>

        <View style={s.footer}>
          {error && <Text style={s.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1a1208" />
              : <Text style={s.btnText}>Log in with UCSC</Text>
            }
          </Pressable>

          <Text style={s.hint}>For registered UCSC students only</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

