import { API_BASE_URL } from "@/constants/Constants";
import { useApiConfig } from "@/context/ApiConfigContext";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL_KEY = "api-url";
const DEFAULT_API_URL = API_BASE_URL;

export default function ApiConfigScreen() {
  const { apiUrl, setApiUrl } = useApiConfig();
  const [urlInput, setUrlInput] = useState(apiUrl ?? "");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const systemScheme = useColorScheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const router = useRouter();

  // Load theme preference
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await SecureStore.getItemAsync("app_theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
      } else {
        setTheme(systemScheme || "light");
      }
    };
    loadTheme();
  }, [systemScheme]);

  // Load stored API URL
  useEffect(() => {
    const loadStoredUrl = async () => {
      const storedUrl = await SecureStore.getItemAsync(API_URL_KEY);
      if (storedUrl) {
        setApiUrl(storedUrl);
        setUrlInput(storedUrl);
      }
    };
    loadStoredUrl();
  }, []);

  const handleSave = async () => {
    if (!urlInput.startsWith("http")) {
      Alert.alert("Invalid URL", "Please enter a valid URL starting with http or https.");
      return;
    }

    try {
      await SecureStore.setItemAsync(API_URL_KEY, urlInput);
      setApiUrl(urlInput);
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", "Failed to save API URL");
    }
  };

  const handleUseDefault = async () => {
    try {
      await SecureStore.setItemAsync(API_URL_KEY, DEFAULT_API_URL);
      setApiUrl(DEFAULT_API_URL);
      setUrlInput(DEFAULT_API_URL);
    } catch {
      Alert.alert("Error", "Could not apply default URL.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Enter your API Base URL</Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://api.example.com"
          placeholderTextColor={isDark ? "#888" : "#aaa"}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save API URL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#666" }]}
          onPress={handleUseDefault}
        >
          <Text style={styles.saveText}>Use Default API URL</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (dark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      backgroundColor: dark ? "#111" : "#f9f9f9",
    },
    content: {
      gap: 16,
    },
    label: {
      fontSize: 18,
      fontWeight: "600",
      color: dark ? "#fff" : "#222",
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: dark ? "#444" : "#ccc",
      borderRadius: 8,
      padding: 14,
      fontSize: 16,
      color: dark ? "#fff" : "#000",
      backgroundColor: dark ? "#222" : "#fff",
    },
    saveButton: {
      backgroundColor: "#ed751f",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 12,
    },
    saveText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
