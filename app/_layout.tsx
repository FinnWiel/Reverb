import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { ApiConfigProvider, useApiConfig } from "@/context/ApiConfigContext";
import { LoginProvider, useLogin } from "@/context/LoginContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";

function ApiConfigGate({ children }: { children: React.ReactNode }) {
  const { apiUrl, isConfigLoaded } = useApiConfig();
  const pathname = usePathname();
  const router = useRouter();

  const lastRedirectedUrlRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Reset if config is reloaded and apiUrl is cleared
    if (!apiUrl) {
      lastRedirectedUrlRef.current = null;
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!isConfigLoaded) return;

    const isOnConfigPage = pathname === "/api-config";
    const isUrlMissing = !apiUrl;

    const alreadyRedirected = lastRedirectedUrlRef.current === pathname;

    if (isUrlMissing && !isOnConfigPage && !alreadyRedirected) {
      console.log("🔁 Redirecting to /api-config...");
      lastRedirectedUrlRef.current = pathname;
      router.replace("/api-config");
    }
  }, [apiUrl, isConfigLoaded, pathname]);

  if (!isConfigLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAuthLoaded } = useLogin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoaded) return;

    const isLoginScreen = pathname === "/login";
    const isConfigPage = pathname === "/api-config";

    if (!isLoggedIn && !isLoginScreen && !isConfigPage) {
      router.replace("/login");
    }

    if (isLoggedIn && isLoginScreen) {
      router.replace("/");
    }
  }, [isLoggedIn, isAuthLoaded, pathname]);

  if (!isAuthLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  if (!loaded) return null;

  return (
    <ApiConfigProvider>
      <ApiConfigGate>
        <NotificationProvider>
          <LoginProvider>
            <AuthGate>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="login" />
                  <Stack.Screen name="api-config" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </AuthGate>
          </LoginProvider>
        </NotificationProvider>
      </ApiConfigGate>
    </ApiConfigProvider>
  );
}
