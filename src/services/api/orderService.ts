import apiClient from "@/api/apiClient";

export type PaymentMethod = "COD" | "ONLINE" | "WALLET";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED_BY_VENDOR"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "ASSIGNED_TO_RIDER"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  totalPrice?: number | string;
  total_price?: number | string;
  itemName?: string | null;
  item_name?: string | null;

  customizationJson?: any;
  customization_json?: any;
  addonJson?: any;
  addon_json?: any;

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

export type OrderTax = {
  cgstRate?: number | string;
  sgstRate?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  total?: number | string;
};

export type OrderPricing = {
  cartValue?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  delivery_fee?: number | string;
  platformFee?: number | string;
  platform_fee?: number | string;
  tax?: OrderTax;
  taxAmount?: number | string;
  tax_amount?: number | string;
  discount?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;
  grandTotal?: number | string;
};

export type Order = {
  id: string;

  userId?: string;
  user_id?: string;

  restaurantId?: string;
  restaurant_id?: string;

  vendorId?: string;
  vendor_id?: string;

  riderId?: string | null;
  rider_id?: string | null;

  addressId?: string;
  address_id?: string;

  orderNumber?: string;
  order_number?: string;

  itemTotal?: number | string;
  item_total?: number | string;

  totalAmount?: number | string;
  total_amount?: number | string;

  deliveryFee?: number | string;
  delivery_fee?: number | string;

  platformFee?: number | string;
  platform_fee?: number | string;

  discount?: number | string;

  taxAmount?: number | string;
  tax_amount?: number | string;

  cgstAmount?: number | string;
  cgst_amount?: number | string;

  sgstAmount?: number | string;
  sgst_amount?: number | string;

  cgstRate?: number | string;
  cgst_rate?: number | string;

  sgstRate?: number | string;
  sgst_rate?: number | string;

  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod;

  paymentStatus?: PaymentStatus;
  payment_status?: PaymentStatus;

  status: OrderStatus | string;

  customerNote?: string | null;
  customer_note?: string | null;

  cancelReason?: string | null;
  cancel_reason?: string | null;

  estimatedPreparationMinutes?: number | null;
  estimated_preparation_minutes?: number | null;

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
  updated_at?: string;

  restaurant?: any;
  user?: any;
  rider?: any;
  address?: any;
  coupon?: any;
  history?: any[];

  items?: OrderItem[];
  orderItems?: OrderItem[];
};

export type CreateOrderPayload = {
  addressId: string;
  paymentMethod: PaymentMethod;
  customerNote?: string | null;
  couponCode?: string | null;
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
        customerNote: payload.customerNote ?? null,
        couponCode: payload.couponCode ?? null,
      })
    );
  },

  getMyOrders: async () => {
    return safe<Order[]>(() => apiClient.get("/orders/my"));
  },

  getOrdersByUser: async () => {
    return safe<Order[]>(() => apiClient.get("/orders/my"));
  },

  getOrderById: async (orderId: string) => {
    return safe<Order>(() => apiClient.get(`/orders/${orderId}`));
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    return safe<Order>(() =>
      apiClient.patch(`/orders/${orderId}/status`, {
        status: "CANCELLED",
        note: reason || "Cancelled by customer",
      })
    );
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus, note?: string) => {
    return safe<Order>(() =>
      apiClient.patch(`/orders/${orderId}/status`, {
        status,
        note: note || null,
      })
    );
  },
};