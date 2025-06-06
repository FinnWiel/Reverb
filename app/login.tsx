import { useApiConfig } from "@/context/ApiConfigContext";
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
  const { apiUrl } = useApiConfig();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

  const validate = () => {
    let valid = true;
    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password || password.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!apiUrl) {
      Alert.alert(
        "Missing API URL",
        "Please set the API URL before logging in."
      );
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      const finalStatus =
        existingStatus === "granted"
          ? existingStatus
          : (await Notifications.requestPermissionsAsync()).status;

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission denied",
          "Push notification permission is required."
        );
        return;
      }

      const expoToken = (await Notifications.getExpoPushTokenAsync()).data;

      const response = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          expo_token: expoToken,
          device_type: Platform.OS,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.log("❌ Login API response status:", response.status);
        console.log("❌ Login API response body:", data);

        if (data.errors) {
          if (data.errors.email) {
            setEmailError(data.errors.email[0]);
            console.log("📩 Email error:", data.errors.email[0]);
          }
          if (data.errors.password) {
            setPasswordError(data.errors.password[0]);
            console.log("🔐 Password error:", data.errors.password[0]);
          }
        } else if (data.message) {
          console.log("⚠️ Login message:", data.message);
          Alert.alert("Login failed", data.message);
        } else {
          Alert.alert("Login failed", "An unknown error occurred.");
        }

        return;
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

  const goToApiConfig = () => {
    router.push("/api-config");
  };

  if (!isAuthLoaded) return null;
  const isDark = theme === "dark";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#fff" },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
        Welcome Back
      </Text>

      <View style={styles.inputContainer}>
        {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#f1f1f1",
              color: isDark ? "#fff" : "#111",
              borderColor: emailError ? "#db3c30" : "transparent",
              borderWidth: 1,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={isDark ? "#aaa" : "#999"}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError("");
          }}
        />
        {!!passwordError && (
          <Text style={styles.errorText}>{passwordError}</Text>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#f1f1f1",
              color: isDark ? "#fff" : "#111",
              borderColor: passwordError ? "#db3c30" : "transparent",
              borderWidth: 1,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={isDark ? "#aaa" : "#999"}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) setPasswordError("");
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goToApiConfig} style={styles.apiButton}>
        <Text style={styles.apiButtonText}>Change organization</Text>
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
    gap: 12,
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
  apiButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  apiButtonText: {
    color: "#888",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#db3c30",
    fontSize: 13,
    marginBottom: -6,
    marginLeft: 8,
  },
});
