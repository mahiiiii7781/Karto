import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";

const authHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const riderApi = {
  getNewOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/rider/orders/new`, {
      headers: await authHeaders(),
    });
    return res.json();
  },

  acceptOrder: async (orderId: string) => {
    const res = await fetch(`${API_BASE_URL}/rider/orders/${orderId}/accept`, {
      method: "PATCH",
      headers: await authHeaders(),
    });
    return res.json();
  },

  markPicked: async (orderId: string) => {
    const res = await fetch(`${API_BASE_URL}/rider/orders/${orderId}/picked`, {
      method: "PATCH",
      headers: await authHeaders(),
    });
    return res.json();
  },

  completeOrder: async (orderId: string) => {
    const res = await fetch(`${API_BASE_URL}/rider/orders/${orderId}/complete`, {
      method: "PATCH",
      headers: await authHeaders(),
    });
    return res.json();
  },

  getTodayEarnings: async () => {
    const res = await fetch(`${API_BASE_URL}/rider/earnings/today`, {
      headers: await authHeaders(),
    });
    return res.json();
  },

  getWallet: async () => {
    const res = await fetch(`${API_BASE_URL}/rider/wallet`, {
      headers: await authHeaders(),
    });
    return res.json();
  },

  getCoupons: async () => {
    const res = await fetch(`${API_BASE_URL}/rider/coupons`, {
      headers: await authHeaders(),
    });
    return res.json();
  },

  getLeaderboard: async () => {
    const res = await fetch(`${API_BASE_URL}/rider/leaderboard`, {
      headers: await authHeaders(),
    });
    return res.json();
  },
};