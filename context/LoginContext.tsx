import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

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
    console.log("🔐 Saving auth token and user...");
    await SecureStore.setItemAsync("auth_token", newToken);
    await SecureStore.setItemAsync("user", JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);

    console.log("✅ Login context updated:", {
      token: newToken,
      user: userData,
    });
  };

  const logout = async () => {
    console.log("🚪 Logging out and clearing storage...");
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("expo_token"); // Optional
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  const checkLogin = async () => {
    console.log("🔄 Checking for stored login...");
    const storedToken = await SecureStore.getItemAsync("auth_token");
    const storedUser = await SecureStore.getItemAsync("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsLoggedIn(true);
        console.log("✅ Rehydrated user:", parsedUser);
      } catch (err) {
        console.warn("⚠️ Failed to parse user. Logging out...");
        await logout();
      }
    } else {
      console.log("❌ No valid login found.");
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
