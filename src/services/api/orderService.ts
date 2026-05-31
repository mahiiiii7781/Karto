import apiClient from "@/api/apiClient";

export type PaymentMethod = "COD" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED";
export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  totalPrice?: number | string;
  total_price?: number | string;
  itemName?: string | null;
  menuItem?: {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    image_url?: string | null;
  } | null;
  menu_item?: {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    image_url?: string | null;
  } | null;
};

export type Order = {
  id: string;
  userId?: string;
  user_id?: string;
  restaurantId?: string;
  restaurant_id?: string;
  addressId?: string;
  address_id?: string;
  orderNumber?: string;
  order_number?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
  deliveryFee?: number | string;
  delivery_fee?: number | string;
  platformFee?: number | string;
  platform_fee?: number | string;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  payment_status?: PaymentStatus;
  status: OrderStatus | string;
  customerNote?: string | null;
  customer_note?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
};

export type CreateOrderPayload = {
  addressId: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  customerNote?: string | null;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return res?.data?.data ?? res?.data?.order ?? res?.data?.orders ?? res?.data ?? null;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: normalizeData(res) as T,
      error: null,
    };
  } catch (error: any) {
    console.log("ORDER API ERROR:", error?.response?.data || error?.message);

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const orderService = {
  createOrder: async (payload: CreateOrderPayload) => {
    return safe<Order>(() =>
      apiClient.post("/orders", {
        addressId: payload.addressId,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus ?? "PENDING",
        customerNote: payload.customerNote ?? null,
      })
    );
  },

  getMyOrders: async () => {
    return safe<Order[]>(() => apiClient.get("/orders/my-orders"));
  },

  getOrdersByUser: async () => {
    return safe<Order[]>(() => apiClient.get("/orders/my-orders"));
  },

  getOrderById: async (orderId: string) => {
    return safe<Order>(() => apiClient.get(`/orders/${orderId}`));
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    return safe<Order>(() =>
      apiClient.patch(`/orders/${orderId}/cancel`, {
        reason: reason || "Cancelled by customer",
      })
    );
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    return safe<Order>(() =>
      apiClient.patch(`/orders/${orderId}/status`, {
        status,
      })
    );
  },
};