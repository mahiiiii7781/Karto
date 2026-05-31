import apiClient from "@/api/apiClient";

export type VendorOrderStatus =
  | "PLACED"
  | "ACCEPTED_BY_VENDOR"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "ASSIGNED_TO_RIDER"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

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
  estimatedPreparationMinutes?: number | null;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  pickedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  created_at?: string;
  customerNote?: string | null;
  cancelReason?: string | null;
  user?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  address?: any;
  restaurant?: any;
  rider?: any;
  history?: any[];
  items?: VendorOrderItem[];
};

export type VendorRestaurant = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  imageUrl?: string | null;
  isOpen?: boolean;
  deliveryTime?: string;
  rating?: number | string;
  totalReviews?: number;
  menuItems?: any[];
  orders?: VendorOrder[];
};

export type VendorDashboard = {
  totalRestaurants: number;
  totalOrders: number;
  totalMenuItems: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  lifetimeRevenue: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  restaurants: VendorRestaurant[];
  restaurantIds?: string[];
  recentOrders: VendorOrder[];
};

export type VendorPayments = {
  grossEarnings: number;
  platformFee: number;
  netPayable: number;
  pendingAmount: number;
  paidAmount: number;
  settlements: any[];
};

export type VendorEarningGraphItem = {
  date: string;
  label: string;
  earnings: number;
};

const normalizeError = (error: any) => {
  return (
    error?.response?.data || {
      success: false,
      message: error?.message || "Something went wrong",
    }
  );
};

const unwrapData = (res: any) => res?.data?.data ?? res?.data?.dashboard ?? res?.data;

export const vendorService = {
  getDashboard: async () => {
    try {
      const res = await apiClient.get("/vendors/dashboard/me");
      return {
        data: unwrapData(res) as VendorDashboard,
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  getOrders: async (status?: VendorOrderStatus) => {
    try {
      const res = await apiClient.get("/vendors/orders/me", {
        params: status ? { status } : undefined,
      });

      return {
        data: (res.data.data || res.data.orders || []) as VendorOrder[],
        error: null,
      };
    } catch (error: any) {
      return { data: [], error: normalizeError(error) };
    }
  },

  updateOrderStatus: async (
    orderId: string,
    status: VendorOrderStatus,
    estimatedPreparationMinutes?: number,
    note?: string
  ) => {
    try {
      const res = await apiClient.patch(`/vendors/orders/${orderId}/status`, {
        status,
        estimatedPreparationMinutes,
        note,
      });

      return {
        data: (res.data.data || res.data.order) as VendorOrder,
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  updatePreparationTime: async (
    orderId: string,
    estimatedPreparationMinutes: number
  ) => {
    try {
      const res = await apiClient.patch(
        `/vendors/orders/${orderId}/preparation-time`,
        {
          estimatedPreparationMinutes,
        }
      );

      return {
        data: (res.data.data || res.data.order) as VendorOrder,
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  getPayments: async () => {
    try {
      const res = await apiClient.get("/vendors/payments/me");
      return {
        data: res.data.data as VendorPayments,
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: normalizeError(error) };
    }
  },

  getEarningsGraph: async () => {
    try {
      const res = await apiClient.get("/vendors/earnings/graph");
      return {
        data: (res.data.data || []) as VendorEarningGraphItem[],
        error: null,
      };
    } catch (error: any) {
      return { data: [], error: normalizeError(error) };
    }
  },
};

export default vendorService;