import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem("refreshToken");

      if (!refreshToken) {
        return Promise.reject(error);
      }

      const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      await AsyncStorage.setItem("accessToken", res.data.accessToken);
      await AsyncStorage.setItem("refreshToken", res.data.refreshToken);

      originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;

      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;