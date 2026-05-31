import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";
const authHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const paymentApi = {
  createOrder: async (orderId: string) => {
    const res = await fetch(`${API_BASE_URL}/payment/create-order`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ orderId }),
    });

    return res.json();
  },

  verifyPayment: async (payload: any) => {
    const res = await fetch(`${API_BASE_URL}/payment/verify`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });

    return res.json();
  },
};