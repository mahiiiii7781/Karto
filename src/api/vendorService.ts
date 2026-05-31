// src/services/api/vendorService.ts
import apiClient from "@/api/apiClient";

export type VendorOrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "CANCELLED"
  | "DELIVERED";

export type VendorOrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  totalPrice?: number | string;
  itemName?: string | null;
  menuItem?: {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    image_url?: string | null;
  } | null;
};

export type VendorOrder = {
  id: string;
  orderNumber?: string;
  order_number?: string;
  status: VendorOrderStatus;
  paymentStatus?: string;
  payment_status?: string;
  paymentMethod?: string;
  payment_method?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
  estimatedPreparationMinutes?: number;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  created_at?: string;
  customerNote?: string | null;
  user?: { id: string; fullName?: string | null; email?: string | null; phone?: string | null };
  address?: any;
  restaurant?: any;
  items?: VendorOrderItem[];
};

export type VendorDashboard = {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  recentOrders: VendorOrder[];
};

export type VendorPayments = {
  totalDeliveredOrders: number;
  grossEarnings: number;
  platformFee: number;
  netPayable: number;
  settlementStatus: string;
  orders: VendorOrder[];
};

const normalizeError = (error: any) => error.response?.data || error;

export const vendorService = {
  getDashboard: async () => {
    try {
      const res = await apiClient.get("/vendors/dashboard/me");
      return { data: res.data.data as VendorDashboard, error: null };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  getOrders: async () => {
    try {
      const res = await apiClient.get("/vendors/orders/me");
      return { data: (res.data.data || res.data.orders || []) as VendorOrder[], error: null };
    } catch (error: any) {
      return { data: [], error: normalizeError(error) };
    }
  },

  updateOrderStatus: async (orderId: string, status: VendorOrderStatus, estimatedPreparationMinutes?: number) => {
    try {
      const res = await apiClient.patch(`/vendors/orders/${orderId}/status`, { status, estimatedPreparationMinutes });
      return { data: (res.data.data || res.data.order) as VendorOrder, error: null };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  updatePreparationTime: async (orderId: string, estimatedPreparationMinutes: number) => {
    try {
      const res = await apiClient.patch(`/vendors/orders/${orderId}/preparation-time`, { estimatedPreparationMinutes });
      return { data: res.data.data, error: null };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  getPayments: async () => {
    try {
      const res = await apiClient.get("/vendors/payments/me");
      return { data: res.data.data as VendorPayments, error: null };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },
};
