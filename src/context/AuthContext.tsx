import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/api/apiClient";

export type KartoRole = "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";

export type KartoUser = {
  id: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: KartoRole;
  isActive: boolean;
  createdAt?: string;
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
  isAuthenticated: boolean;
  role: KartoRole | null;

  signUp: (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<AuthResult>;

  signIn: (email: string, password: string) => Promise<AuthResult>;

  sendOtp: (payload: {
    email?: string;
    phone?: string;
  }) => Promise<AuthResult>;

  verifyOtp: (payload: {
    email?: string;
    phone?: string;
    code?: string;
    otp?: string;
    fullName?: string;
  }) => Promise<AuthResult>;

  signInFromStorage: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>;
};

const AuthContext = React.createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
};

const normalizeAuthResponse = (resData: any) => resData?.data || resData;

const normalizeRole = (role?: string): KartoRole => {
  const finalRole = String(role || "CUSTOMER").toUpperCase();

  if (["CUSTOMER", "VENDOR", "RIDER", "ADMIN"].includes(finalRole)) {
    return finalRole as KartoRole;
  }

  return "CUSTOMER";
};

const normalizeUser = (rawUser: any): KartoUser | null => {
  if (!rawUser?.id) return null;

  return {
    id: rawUser.id,
    fullName: rawUser.fullName ?? null,
    email: rawUser.email || "",
    phone: rawUser.phone ?? null,
    avatarUrl: rawUser.avatarUrl ?? null,
    role: normalizeRole(rawUser.role),
    isActive: rawUser.isActive !== false,
    createdAt: rawUser.createdAt,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<KartoUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const saveAuthData = React.useCallback(async (rawData: any) => {
    const data = normalizeAuthResponse(rawData);

    const accessToken = data?.accessToken || data?.token;
    const refreshToken = data?.refreshToken || "";
    const authUser = normalizeUser(data?.user);

    if (accessToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    }

    if (refreshToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    }

    if (authUser) {
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(authUser));
      setUser(authUser);
    }

    return authUser;
  }, []);

  const clearAuthData = React.useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.accessToken,
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.user,
    ]);

    setUser(null);
  }, []);

  const reloadUser = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);

      if (!token) {
        setUser(null);
        return;
      }

      const res = await apiClient.get("/auth/me");
      const authUser = normalizeUser(
        res.data?.data?.user || res.data?.user || res.data
      );

      if (authUser?.id) {
        setUser(authUser);
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(authUser));
      } else {
        await clearAuthData();
      }
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        await clearAuthData();
      }
    }
  }, [clearAuthData]);

  const signInFromStorage = React.useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.user);

      if (userData) {
        const parsedUser = normalizeUser(JSON.parse(userData));
        setUser(parsedUser);
      }

      await reloadUser();
    } catch {
      await reloadUser();
    }
  }, [reloadUser]);

  React.useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.user);

        if (mounted && userData) {
          const parsedUser = normalizeUser(JSON.parse(userData));
          setUser(parsedUser);
        }

        await reloadUser();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [reloadUser]);

  const signUp = React.useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      phone?: string
    ) => {
      try {
        const res = await apiClient.post("/auth/register", {
          fullName: String(fullName || "").trim(),
          email: String(email || "").trim().toLowerCase(),
          password,
          phone: phone ? String(phone).trim() : undefined,
        });

        await saveAuthData(res.data);

        return { data: res.data, error: null };
      } catch (error: any) {
        return { data: null, error: error?.response?.data || error };
      }
    },
    [saveAuthData]
  );

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      try {
        const res = await apiClient.post("/auth/login", {
          email: String(email || "").trim().toLowerCase(),
          password,
        });

        await saveAuthData(res.data);

        return { data: res.data, error: null };
      } catch (error: any) {
        return { data: null, error: error?.response?.data || error };
      }
    },
    [saveAuthData]
  );

  const sendOtp = React.useCallback(async (payload: {
    email?: string;
    phone?: string;
  }) => {
    try {
      const res = await apiClient.post("/auth/send-otp", {
        email: payload.email
          ? String(payload.email).trim().toLowerCase()
          : undefined,
        phone: payload.phone ? String(payload.phone).trim() : undefined,
      });

      return { data: res.data, error: null };
    } catch (error: any) {
      return { data: null, error: error?.response?.data || error };
    }
  }, []);

  const verifyOtp = React.useCallback(
    async (payload: {
      email?: string;
      phone?: string;
      code?: string;
      otp?: string;
      fullName?: string;
    }) => {
      try {
        const res = await apiClient.post("/auth/verify-otp", {
          email: payload.email
            ? String(payload.email).trim().toLowerCase()
            : undefined,
          phone: payload.phone ? String(payload.phone).trim() : undefined,
          code: payload.code,
          otp: payload.otp,
          fullName: payload.fullName,
        });

        await saveAuthData(res.data);

        return { data: res.data, error: null };
      } catch (error: any) {
        return { data: null, error: error?.response?.data || error };
      }
    },
    [saveAuthData]
  );

  const updateProfile = React.useCallback(
    async (payload: UpdateProfilePayload) => {
      try {
        const res = await apiClient.patch("/auth/profile", payload);
        const updatedUser = normalizeUser(
          res.data?.data?.user || res.data?.user || res.data
        );

        if (updatedUser?.id) {
          setUser(updatedUser);
          await AsyncStorage.setItem(
            STORAGE_KEYS.user,
            JSON.stringify(updatedUser)
          );
        }

        return { data: updatedUser || res.data, error: null };
      } catch (error: any) {
        return { data: null, error: error?.response?.data || error };
      }
    },
    []
  );

  const signOut = React.useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.log("Logout API error:", error);
    } finally {
      await clearAuthData();
    }
  }, [clearAuthData]);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      role: user?.role || null,
      signUp,
      signIn,
      sendOtp,
      verifyOtp,
      signInFromStorage,
      signOut,
      reloadUser,
      updateProfile,
    }),
    [
      user,
      loading,
      signUp,
      signIn,
      sendOtp,
      verifyOtp,
      signInFromStorage,
      signOut,
      reloadUser,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};