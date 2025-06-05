import { API_BASE_URL } from "@/constants/Constants";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

type User = {
  id: number;
  name: string;
  email: string;
};

type LoginContextType = {
  isLoggedIn: boolean;
  isAuthLoaded: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
};

const LoginContext = createContext<LoginContextType | undefined>(undefined);

export const LoginProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const login = async (newToken: string, userData: User) => {
    await SecureStore.setItemAsync("auth_token", newToken);
    await SecureStore.setItemAsync("user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("expo_token");
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  const checkLogin = async () => {
    const storedToken = await SecureStore.getItemAsync("auth_token");

    if (storedToken) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: "application/json",
          },
        });

        const raw = await res.text();
        const parsed = JSON.parse(raw);

        if (!parsed.user) {
          throw new Error("Missing user field");
        }

        const userData: User = parsed.user;
        setToken(storedToken);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (err: any) {
        console.warn("❌ Failed to parse user from /api/me response:", err.message);
        await logout();
        Alert.alert("Session expired", "Please log in again.");
      }
    }

    setIsAuthLoaded(true);
  };

  useEffect(() => {
    checkLogin();
  }, []);

  return (
    <LoginContext.Provider
      value={{ isLoggedIn, isAuthLoaded, user, token, login, logout }}
    >
      {children}
    </LoginContext.Provider>
  );
};

export const useLogin = () => {
  const context = useContext(LoginContext);
  if (!context) throw new Error("useLogin must be used within a LoginProvider");
  return context;
};
