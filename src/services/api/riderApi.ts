import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://karto-backend-kor1.onrender.com/api";

const authHeaders = async (isFormData: boolean = false) => {
  const token = await AsyncStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Session expired. Please login again.");
  }

  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Authorization: `Bearer ${token}`,
  };
};

const safeJsonParse = (text: string) => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const request = async (
  url: string,
  options: RequestInit & { isFormData?: boolean } = {}
) => {
  try {
    const isFormData = options.isFormData === true;

    const { isFormData: _removed, ...fetchOptions } = options;

    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...(await authHeaders(isFormData)),
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    const data = safeJsonParse(text);

    if (!res.ok) {
      throw new Error(
        data?.message ||
          data?.error?.message ||
          data?.error ||
          `Request failed with status ${res.status}`
      );
    }

    return data;
  } catch (error: any) {
    if (
      error?.message ===
      "Session expired. Please login again."
    ) {
      throw error;
    }

    if (error?.message) {
      throw error;
    }

    throw new Error(
      "Network error. Please check your internet connection."
    );
  }
};

export const riderService = {
  /* ==========================
     PROFILE
  ========================== */

  getProfile: async () =>
    request(`${API_BASE_URL}/riders/profile`),

  updateProfile: async (payload: any) =>
    request(`${API_BASE_URL}/riders/profile`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateKyc: async (payload: any) =>
    request(`${API_BASE_URL}/riders/kyc`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateOnlineStatus: async (isOnline: boolean) =>
    request(`${API_BASE_URL}/riders/online-status`, {
      method: "PATCH",
      body: JSON.stringify({
        isOnline,
      }),
    }),

  /* ==========================
     ORDERS
  ========================== */

  getNewOrders: async () =>
    request(`${API_BASE_URL}/riders/orders/new`),

  getActiveOrders: async () =>
    request(`${API_BASE_URL}/riders/orders/active`),

  getOrderDetail: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}`
    ),

  getOrderHistory: async () =>
    request(`${API_BASE_URL}/riders/orders/history`),

  acceptOrder: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}/accept`,
      {
        method: "PATCH",
      }
    ),

  rejectOrder: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}/reject`,
      {
        method: "PATCH",
      }
    ),

  markPicked: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}/picked`,
      {
        method: "PATCH",
      }
    ),

  startDelivery: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}/start-delivery`,
      {
        method: "PATCH",
      }
    ),

  completeOrder: async (orderId: string) =>
    request(
      `${API_BASE_URL}/riders/orders/${orderId}/complete`,
      {
        method: "PATCH",
      }
    ),

  updateLocation: async (
    orderId: string,
    latitude: number,
    longitude: number
  ) =>
    request(`${API_BASE_URL}/riders/location`, {
      method: "POST",
      body: JSON.stringify({
        orderId,
        latitude,
        longitude,
      }),
    }),

  /* ==========================
     ANALYTICS
  ========================== */

  getAnalytics: async () =>
    request(`${API_BASE_URL}/riders/analytics`),

  getTodayEarnings: async () =>
    request(
      `${API_BASE_URL}/riders/earnings/today`
    ),

  getWallet: async () =>
    request(`${API_BASE_URL}/riders/wallet`),

  getCoupons: async () =>
    request(`${API_BASE_URL}/riders/coupons`),

  getLeaderboard: async () =>
    request(
      `${API_BASE_URL}/riders/leaderboard`
    ),

  getIncentives: async () =>
    request(
      `${API_BASE_URL}/riders/incentives`
    ),

  /* ==========================
     SUPPORT
  ========================== */

  getSupportTickets: async () =>
    request(
      `${API_BASE_URL}/riders/support/tickets`
    ),

  createSupportTicket: async (
    payload: any
  ) =>
    request(
      `${API_BASE_URL}/riders/support/tickets`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  addSupportMessage: async (
    ticketId: string,
    payload: any
  ) =>
    request(
      `${API_BASE_URL}/riders/support/tickets/${ticketId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
};