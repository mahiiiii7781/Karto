import apiClient from "@/api/apiClient";

const fail = (error: any, emptyData: any = null) => ({
  data: emptyData,
  error: error?.response?.data || error,
});

export const riderService = {
  dashboard: async () => {
    try {
      const res = await apiClient.get("/riders/dashboard");
      return { data: res.data.dashboard || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getProfile: async () => {
    try {
      const res = await apiClient.get("/riders/profile");
      return { data: res.data.rider || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateProfile: async (payload: any) => {
    try {
      const res = await apiClient.patch("/riders/profile", payload);
      return { data: res.data.rider || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateKyc: async (payload: any) => {
    try {
      const res = await apiClient.patch("/riders/kyc", payload);
      return { data: res.data.rider || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateOnlineStatus: async (isOnline: boolean) => {
    try {
      const res = await apiClient.patch("/riders/online-status", { isOnline });
      return { data: res.data.rider || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getCurrentAssignment: async () => {
    try {
      const res = await apiClient.get("/riders/orders/assignment/current");
      return { data: res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getNewOrders: async () => {
    try {
      const res = await apiClient.get("/riders/orders/new");
      return { data: res.data.orders || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getActiveOrders: async () => {
    try {
      const res = await apiClient.get("/riders/orders/active");
      return { data: res.data.orders || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getOrderDetail: async (orderId: string) => {
    try {
      const res = await apiClient.get(`/riders/orders/${orderId}`);
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getOrderHistory: async () => {
    try {
      const res = await apiClient.get("/riders/orders/history");
      return { data: res.data.orders || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  acceptOrder: async (orderId: string) => {
    try {
      const res = await apiClient.patch(`/riders/orders/${orderId}/accept`);
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  rejectOrder: async (orderId: string) => {
    try {
      const res = await apiClient.patch(`/riders/orders/${orderId}/reject`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  markPicked: async (orderId: string) => {
    try {
      const res = await apiClient.patch(`/riders/orders/${orderId}/picked`);
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  startDelivery: async (orderId: string) => {
    try {
      const res = await apiClient.patch(`/riders/orders/${orderId}/start-delivery`);
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  completeOrder: async (orderId: string) => {
    try {
      const res = await apiClient.patch(`/riders/orders/${orderId}/complete`);
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  verifyDeliveryOtp: async (orderId: string, otp: string) => {
    try {
      const res = await apiClient.post(
        `/riders/orders/${orderId}/verify-delivery-otp`,
        { otp }
      );
      return { data: res.data.order || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateLocation: async (orderId: string, latitude: number, longitude: number) => {
    try {
      const res = await apiClient.post("/riders/location", {
        orderId,
        latitude,
        longitude,
      });
      return { data: res.data.location || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getAnalytics: async () => {
    try {
      const res = await apiClient.get("/riders/analytics");
      return { data: res.data.analytics || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getTodayEarnings: async (type: "daily" | "weekly" | "monthly" = "daily") => {
    try {
      const res = await apiClient.get(`/riders/earnings/today?type=${type}`);
      return { data: res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getWallet: async () => {
    try {
      const res = await apiClient.get("/riders/wallet");
      return {
        data: {
          wallet: res.data.wallet,
          settlements: res.data.settlements || [],
        },
        error: null,
      };
    } catch (error: any) {
      return fail(error);
    }
  },

  getCoupons: async () => {
    try {
      const res = await apiClient.get("/riders/coupons");
      return { data: res.data.coupons || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getLeaderboard: async () => {
    try {
      const res = await apiClient.get("/riders/leaderboard");
      return { data: res.data.leaderboard || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getIncentives: async () => {
    try {
      const res = await apiClient.get("/riders/incentives");
      return { data: res.data.incentives || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getNotifications: async () => {
    try {
      const res = await apiClient.get("/riders/notifications");
      return { data: res.data.notifications || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getSupportTickets: async () => {
    try {
      const res = await apiClient.get("/riders/support/tickets");
      return { data: res.data.tickets || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createSupportTicket: async (payload: any) => {
    try {
      const res = await apiClient.post("/riders/support/tickets", payload);
      return { data: res.data.ticket || res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  addSupportMessage: async (ticketId: string, payload: any) => {
    try {
      const res = await apiClient.post(
        `/riders/support/tickets/${ticketId}/messages`,
        payload
      );
      return {
        data: res.data.supportMessage || res.data.data || res.data,
        error: null,
      };
    } catch (error: any) {
      return fail(error);
    }
  },
};