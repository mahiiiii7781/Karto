import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";
export const SOCKET_BASE_URL = "https://karto-backend-kor1.onrender.com";

const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);

    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError<any>) => {
    const originalRequest: any = error.config;

    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";

    const isAuthRefreshRequest = requestUrl.includes("/auth/refresh-token");
    const shouldTryRefresh =
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRefreshRequest;

    if (shouldTryRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: token => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.refreshToken
      );

      if (!refreshToken) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.accessToken,
          STORAGE_KEYS.refreshToken,
          STORAGE_KEYS.user,
        ]);

        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const accessToken = res.data?.accessToken;
        const newRefreshToken = res.data?.refreshToken;

        if (!accessToken) {
          throw new Error("Access token missing in refresh response");
        }

        await AsyncStorage.setItem(STORAGE_KEYS.accessToken, accessToken);

        if (newRefreshToken) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.refreshToken,
            newRefreshToken
          );
        }

        processQueue(null, accessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        await AsyncStorage.multiRemove([
          STORAGE_KEYS.accessToken,
          STORAGE_KEYS.refreshToken,
          STORAGE_KEYS.user,
        ]);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Network error. Please try again."
  );
};

export default apiClient;