import { API_BASE_URL } from "@/constants/Constants";
import { useLogin } from "@/context/LoginContext";
import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, logout } = useLogin();
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<"light" | "dark">(systemScheme || "light");

  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [notificationTypes, setNotificationTypes] = useState<
    { key: string; label: string }[]
  >([]);

  const [expoToken, setExpoToken] = useState<string | null>(null);

  const isDark = theme === "dark";
  const themedStyles = getStyles(isDark);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await SecureStore.getItemAsync("app_theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    };
    loadTheme();
  }, []);

  // Fetch notification types once on mount
  useEffect(() => {
    const fetchNotificationTypes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notification-types`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to load notification types");

        const typesData = await response.json();

        const types = typesData.map((type: { name: string; description?: string }) => ({
          key: type.name,
          label: type.name
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        }));

        setNotificationTypes(types);
      } catch (error: any) {
        console.error("❌ Failed to load notification types:", error);
        Alert.alert(
          "Error",
          `Could not load notification types:\n${error.message}`
        );
      }
    };

    fetchNotificationTypes();
  }, []);

  // Get Expo Push Token on mount and store it securely
  useEffect(() => {
    const getAndStoreExpoToken = async () => {
      try {
        let storedToken = await SecureStore.getItemAsync("expo_token");
        if (!storedToken) {
          const tokenResponse = await Notifications.getExpoPushTokenAsync();
          storedToken = tokenResponse.data;
          await SecureStore.setItemAsync("expo_token", storedToken);
        }
        setExpoToken(storedToken);
      } catch (e) {
        console.error("Failed to get Expo push token:", e);
      }
    };
    getAndStoreExpoToken();
  }, []);

  // Fetch preferences when user or expoToken changes
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        if (!user) return;
        if (!expoToken) return;

        const token = await SecureStore.getItemAsync("auth_token");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/notification-preferences`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Expo-Token": expoToken,
          },
        });

        if (!response.ok) throw new Error("Failed to load preferences");

        const data = await response.json();

        setPreferences(data);
      } catch (error: any) {
        console.error("❌ Failed to load preferences:", error);
        Alert.alert(
          "Error",
          `Could not load notification preferences:\n${error.message}`
        );
      }
    };

    fetchPreferences();
  }, [user, expoToken]);

  const togglePreference = async (key: string) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) throw new Error("Missing auth token");
      if (!expoToken) throw new Error("Missing expo token");

      const response = await fetch(`${API_BASE_URL}/api/notification-preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Expo-Token": expoToken,
        },
        body: JSON.stringify({ [key]: newValue }),
      });

      const raw = await response.text();

      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        // ignore invalid JSON
      }

      if (!response.ok) {
        console.error(`❌ Failed to update preference ${key}:`, data);
        throw new Error(data?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error updating preference "${key}":`, error);
      Alert.alert("Update Failed", `Could not update ${key} preference.`);
      setPreferences((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await SecureStore.setItemAsync("app_theme", newTheme);
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("auth_token");
            if (!token) throw new Error("No auth token available.");

            const tokenResponse = await Notifications.getExpoPushTokenAsync();
            const currentExpoToken = tokenResponse.data || expoToken;

            const response = await fetch(`${API_BASE_URL}/api/logout`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ expo_token: currentExpoToken }),
            });

            const data = await response.json();

            if (!response.ok) {
              console.error("❌ Logout failed:", data);
              throw new Error(data?.message || "Logout failed");
            }

            await SecureStore.deleteItemAsync("auth_token");
            await SecureStore.deleteItemAsync("expo_token");

            logout();
          } catch (error) {
            console.error("❌ Logout error:", error);
            Alert.alert("Logout failed", "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      {user && (
        <View style={themedStyles.userBlock}>
          <View style={themedStyles.userInfo}>
            <Text style={themedStyles.name}>{user.name}</Text>
            <Text style={themedStyles.email}>{user.email}</Text>
          </View>
          <TouchableOpacity
            style={themedStyles.iconButton}
            onPress={toggleTheme}
          >
            <Feather
              name={isDark ? "sun" : "moon"}
              size={24}
              color={isDark ? "#fc9c0a" : "#333"}
            />
          </TouchableOpacity>
        </View>
      )}

      <Text style={themedStyles.notificationTitle}>Notifications</Text>
      <ScrollView
        style={themedStyles.scrollArea}
        contentContainerStyle={themedStyles.preferenceList}
      >
        {notificationTypes.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => togglePreference(item.key)}
            activeOpacity={0.8}
            style={themedStyles.preferenceItem}
          >
            <Text style={themedStyles.preferenceLabel}>{item.label}</Text>
            <Switch
              value={preferences[item.key]}
              onValueChange={() => togglePreference(item.key)}
              trackColor={{ false: "#ccc", true: "#ed751f" }}
              thumbColor="#fff"
              ios_backgroundColor="#ccc"
              pointerEvents="none"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={themedStyles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={themedStyles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = (darkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 50,
      backgroundColor: darkMode ? "#111" : "#f9f9f9",
    },
    scrollArea: {
      flex: 1,
      paddingHorizontal: 25,
    },
    logoutButton: {
      backgroundColor: "#db3c30",
      paddingVertical: 12,
      margin: 25,
      borderRadius: 10,
    },
    logoutText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
    },
    name: {
      fontSize: 32,
      fontWeight: "600",
      color: darkMode ? "#fff" : "#333",
    },
    email: {
      fontSize: 16,
      color: darkMode ? "#ccc" : "#888",
    },
    userBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 25,
      marginBottom: 20,
    },
    userInfo: {
      flex: 1,
    },
    iconButton: {
      padding: 8,
    },
    notificationTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: darkMode ? "#fff" : "#333",
      marginLeft: 20,
      marginBottom: 10,
    },
    preferenceItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: darkMode ? "#222" : "#fff",
      borderRadius: 8,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    preferenceLabel: {
      fontSize: 16,
      color: darkMode ? "#eee" : "#333",
    },
    preferenceList: {
      paddingBottom: 40,
      paddingTop: 10,
    },
  });
