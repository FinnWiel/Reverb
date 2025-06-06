import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL_KEY = "api-url";

type ApiConfigContextType = {
  apiUrl: string | null;
  setApiUrl: (url: string | null) => void;
  isConfigLoaded: boolean;
};

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(
  undefined
);

export const ApiConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    const loadApiUrl = async () => {
      const savedUrl = await SecureStore.getItemAsync(API_URL_KEY);
      if (savedUrl) setApiUrl(savedUrl);
      setIsConfigLoaded(true);
    };
    loadApiUrl();
  }, []);

  return (
    <ApiConfigContext.Provider value={{ apiUrl, setApiUrl, isConfigLoaded }}>
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (!context)
    throw new Error("useApiConfig must be used within ApiConfigProvider");
  return context;
};
