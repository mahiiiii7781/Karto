import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/api/apiClient";

export type KartoUser = {
  id: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";
  isActive: boolean;
};

type AuthResult = {
  data?: any;
  error?: any;
};

type UpdateProfilePayload = {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

type AuthContextType = {
  user: KartoUser | null;
  loading: boolean;
  signUp: (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInFromStorage: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>;
};

const AuthContext = React.createContext<AuthContextType | null>(null);

const normalizeAuthResponse = (resData: any) => resData?.data || resData;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<KartoUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const saveAuthData = async (rawData: any) => {
    const data = normalizeAuthResponse(rawData);

    const accessToken = data?.accessToken || data?.token;
    const refreshToken = data?.refreshToken || "";
    const authUser = data?.user;

    if (accessToken) await AsyncStorage.setItem("accessToken", accessToken);
    if (refreshToken) await AsyncStorage.setItem("refreshToken", refreshToken);

    if (authUser) {
      await AsyncStorage.setItem("user", JSON.stringify(authUser));
      setUser(authUser);
    }
  };

  const clearAuthData = async () => {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
    setUser(null);
  };

  const reloadUser = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      if (!token) {
        setUser(null);
        return;
      }

      const res = await apiClient.get("/auth/me");
      const authUser = res.data?.data?.user || res.data?.user || res.data;

      if (authUser?.id) {
        setUser(authUser);
        await AsyncStorage.setItem("user", JSON.stringify(authUser));
      } else {
        await clearAuthData();
      }
    } catch {
      await clearAuthData();
    }
  };

  const signInFromStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");

      if (userData) {
        setUser(JSON.parse(userData));
        return;
      }

      await reloadUser();
    } catch {
      await reloadUser();
    }
  };

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");

        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }

        reloadUser().catch(() => {});
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signUp = async (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => {
    try {
      const res = await apiClient.post("/auth/register", {
        fullName,
        email,
        password,
        phone,
      });

      await saveAuthData(res.data);

      return { data: res.data, error: null };
    } catch (error: any) {
      return { data: null, error: error?.response?.data || error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });

      await saveAuthData(res.data);

      return { data: res.data, error: null };
    } catch (error: any) {
      return { data: null, error: error?.response?.data || error };
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    try {
      const res = await apiClient.patch("/auth/profile", payload);
      const updatedUser = res.data?.data?.user || res.data?.user || res.data;

      if (updatedUser?.id) {
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }

      return { data: updatedUser, error: null };
    } catch (error: any) {
      return { data: null, error: error?.response?.data || error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.log("Logout API error:", error);
    } finally {
      await clearAuthData();
    }
  };

  const value = React.useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signInFromStorage,
      signOut,
      reloadUser,
      updateProfile,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};