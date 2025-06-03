import { API_BASE_URL } from "@/constants/Constants";
import { useLogin } from "@/context/LoginContext";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoggedIn, isAuthLoaded } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    SecureStore.getItemAsync("app_theme").then((savedTheme) => {
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthLoaded && isLoggedIn) {
      router.replace("/");
    }
  }, [isAuthLoaded, isLoggedIn]);

  const handleLogin = async () => {
    setLoading(true);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      const finalStatus =
        existingStatus === "granted"
          ? existingStatus
          : (await Notifications.requestPermissionsAsync()).status;

      if (finalStatus !== "granted") {
        Alert.alert("Permission denied", "Push notification permission is required.");
        return;
      }

      const expoToken = (await Notifications.getExpoPushTokenAsync()).data;

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, expo_token: expoToken }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("❌ Login failed:", data);
        throw new Error(data.message || "Login failed");
      }

      await SecureStore.setItemAsync("auth_token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));

      login(data.token, data.user);
      router.replace("/");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      Alert.alert("Login Error", error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthLoaded) return null;
  const isDark = theme === "dark";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: isDark ? "#121212" : "#fff" }]}
    >
      <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
        Welcome Back
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#f1f1f1",
              color: isDark ? "#fff" : "#111",
            },
          ]}
          placeholder="Email"
          placeholderTextColor={isDark ? "#aaa" : "#999"}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#f1f1f1",
              color: isDark ? "#fff" : "#111",
            },
          ]}
          placeholder="Password"
          placeholderTextColor={isDark ? "#aaa" : "#999"}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginText}>{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
  },
  inputContainer: {
    width: "100%",
    gap: 16,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#ed751f",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginTop: 24,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
