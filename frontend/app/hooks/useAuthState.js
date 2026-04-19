import { useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";

export function useAuthState() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return auth().onAuthStateChanged(setUser);
  }, []);

  return { user, loading: user === undefined };
}
