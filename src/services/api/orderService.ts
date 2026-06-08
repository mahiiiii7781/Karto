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
  itemTotal?: number | string;
  item_total?: number | string;

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

  couponId?: string | null;
  coupon_id?: string | null;

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

  deliveryOtp?: string | null;
  delivery_otp?: string | null;

  deliveryOtpExpiresAt?: string | null;
  delivery_otp_expires_at?: string | null;

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
  updated_at?: string;

  restaurant?: any;
  vendor?: any;
  user?: any;
  customer?: any;
  rider?: any;
  address?: any;
  deliveryAddress?: any;
  delivery_address?: any;
  coupon?: any;
  history?: any[];

  items?: OrderItem[];
  orderItems?: OrderItem[];
  order_items?: OrderItem[];
};

export type CreateOrderPayload = {
  addressId: string;
  paymentMethod: PaymentMethod;
  customerNote?: string | null;
  couponCode?: string | null;
};

export type CreateOrderResponse = {
  order: Order;
  pricing?: OrderPricing | null;
};

export type RazorpayCreateOrderResponse = {
  key: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  kartoOrderId: string;
  orderNumber?: string;
};

export type VerifyPaymentPayload = {
  kartoOrderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const STATUS_ALIASES: Record<string, OrderStatus | string> = {
  ACCEPTED: "ACCEPTED_BY_VENDOR",
  VENDOR_ACCEPTED: "ACCEPTED_BY_VENDOR",
  READY: "READY_FOR_PICKUP",
  READY_FOR_DELIVERY: "READY_FOR_PICKUP",
  RIDER_ASSIGNED: "ASSIGNED_TO_RIDER",
  ASSIGNED: "ASSIGNED_TO_RIDER",
  PICKED: "PICKED_UP",
  PICKUP_DONE: "PICKED_UP",
  ON_THE_WAY: "OUT_FOR_DELIVERY",
  COMPLETED: "DELIVERED",
};

export const normalizeOrderStatus = (status?: string | null) => {
  const raw = String(status || "PLACED").toUpperCase();
  return STATUS_ALIASES[raw] || raw;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: res?.data as T,
      error: null,
    };
  } catch (error: any) {
    const apiError = error?.response?.data || {
      message: error?.message || "Network error. Please try again.",
    };

    console.log("ORDER API ERROR:", apiError);

    return {
      data: null,
      error: apiError,
    };
  }
};

const unwrap = (value: any) => value?.data ?? value;

const normalizeOrder = (resData: any): Order | null => {
  const data = unwrap(resData);

  const order =
    data?.order ||
    data?.data?.order ||
    data?.data?.data?.order ||
    data?.data ||
    data;

  if (!order || Array.isArray(order) || !order?.id) return null;

  return {
    ...order,
    status: normalizeOrderStatus(order.status),
  };
};

const normalizeOrders = (resData: any): Order[] => {
  const data = unwrap(resData);

  const orders =
    data?.orders ||
    data?.data?.orders ||
    data?.data?.data?.orders ||
    data?.data ||
    data;

  if (!Array.isArray(orders)) return [];

  return orders
    .filter(Boolean)
    .map((order: any) => ({
      ...order,
      status: normalizeOrderStatus(order.status),
    }));
};

const normalizeCreateOrder = (resData: any): CreateOrderResponse | null => {
  const data = unwrap(resData);
  const order = normalizeOrder(data);

  if (!order) return null;

  return {
    order,
    pricing:
      data?.pricing ||
      data?.data?.pricing ||
      data?.data?.data?.pricing ||
      null,
  };
};

const normalizePaymentOrder = (
  resData: any
): RazorpayCreateOrderResponse | null => {
  const data = unwrap(resData);

  const payment =
    data?.payment ||
    data?.razorpay ||
    data?.data?.payment ||
    data?.data?.razorpay ||
    data?.data ||
    data;

  const razorpayOrderId =
    payment?.razorpayOrderId ||
    payment?.razorpay_order_id ||
    payment?.id;

  if (!razorpayOrderId) return null;

  return {
    key: payment.key,
    razorpayOrderId,
    amount: Number(payment.amount || 0),
    currency: payment.currency || "INR",
    kartoOrderId: payment.kartoOrderId || payment.karto_order_id || payment.orderId,
    orderNumber: payment.orderNumber || payment.order_number,
  };
};

const sortOrdersNewestFirst = (orders: Order[]) => {
  return [...orders].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.created_at || 0).getTime();
    const bDate = new Date(b.createdAt || b.created_at || 0).getTime();
    return bDate - aDate;
  });
};

export const getOrderStatusLabel = (status?: string) => {
  switch (normalizeOrderStatus(status)) {
    case "PLACED":
      return "Placed";
    case "ACCEPTED_BY_VENDOR":
      return "Accepted";
    case "PREPARING":
      return "Preparing";
    case "READY_FOR_PICKUP":
      return "Ready for pickup";
    case "ASSIGNED_TO_RIDER":
      return "Rider assigned";
    case "PICKED_UP":
      return "Picked up";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Order";
  }
};

export const getOrderStatusMessage = (status?: string) => {
  switch (normalizeOrderStatus(status)) {
    case "PLACED":
      return "Store is reviewing your order.";
    case "ACCEPTED_BY_VENDOR":
      return "Store accepted your order.";
    case "PREPARING":
      return "Your order is being prepared.";
    case "READY_FOR_PICKUP":
      return "Order is packed and waiting for pickup.";
    case "ASSIGNED_TO_RIDER":
      return "Delivery partner has been assigned.";
    case "PICKED_UP":
      return "Order has been picked up.";
    case "OUT_FOR_DELIVERY":
      return "Order is on the way.";
    case "DELIVERED":
      return "Order delivered successfully.";
    case "CANCELLED":
      return "Order was cancelled.";
    default:
      return "Order status updated.";
  }
};

export const isActiveOrder = (status?: string) => {
  const s = normalizeOrderStatus(status);
  return !["DELIVERED", "CANCELLED"].includes(String(s));
};

export const canCancelOrder = (status?: string) => {
  const s = normalizeOrderStatus(status);
  return ["PLACED", "ACCEPTED_BY_VENDOR"].includes(String(s));
};

export const getActiveOrderEtaMinutes = (order?: Order | null) => {
  if (!order || !isActiveOrder(order.status)) return 0;

  const status = normalizeOrderStatus(order.status);

  let baseMinutes = Number(
    order.estimatedPreparationMinutes ||
      order.estimated_preparation_minutes ||
      30
  );

  if (status === "PLACED") baseMinutes += 15;
  if (status === "ACCEPTED_BY_VENDOR") baseMinutes += 12;
  if (status === "PREPARING") baseMinutes += 10;
  if (status === "READY_FOR_PICKUP") baseMinutes = 15;
  if (status === "ASSIGNED_TO_RIDER") baseMinutes = 12;
  if (status === "PICKED_UP") baseMinutes = 10;
  if (status === "OUT_FOR_DELIVERY") baseMinutes = 7;

  const created = order.createdAt || order.created_at;

  if (!created) return Math.max(baseMinutes, 5);

  const elapsed = Math.floor(
    (Date.now() - new Date(created).getTime()) / 60000
  );

  return Math.max(baseMinutes - elapsed, 5);
};

export const getActiveOrderFromList = (orders: Order[] = []) => {
  const active = sortOrdersNewestFirst(orders).find(order =>
    isActiveOrder(order.status)
  );

  return active || null;
};

export const getOrderDisplayNumber = (order?: Order | null) => {
  if (!order) return "ORDER";
  return order.orderNumber || order.order_number || order.id?.slice(0, 8) || "ORDER";
};

export const getOrderStoreName = (order?: Order | null) => {
  if (!order) return "Karto Store";

  return (
    order.restaurant?.name ||
    order.restaurant?.restaurantName ||
    order.restaurant?.restaurant_name ||
    order.vendor?.name ||
    order.vendor?.fullName ||
    order.vendor?.full_name ||
    "Karto Store"
  );
};

export const orderService = {
  createOrder: async (
    payload: CreateOrderPayload
  ): Promise<ApiResult<CreateOrderResponse>> => {
    const result = await safe<any>(() =>
      apiClient.post("/orders", {
        addressId: payload.addressId,
        paymentMethod: payload.paymentMethod,
        customerNote: payload.customerNote ?? null,
        couponCode: payload.couponCode ?? null,
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCreateOrder(result.data),
      error: null,
    };
  },

  getMyOrders: async (): Promise<ApiResult<Order[]>> => {
    const result = await safe<any>(() => apiClient.get("/orders/my"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeOrders(result.data),
      error: null,
    };
  },

  getOrdersByUser: async (): Promise<ApiResult<Order[]>> => {
    return orderService.getMyOrders();
  },

  getActiveOrder: async (): Promise<ApiResult<Order | null>> => {
    const result = await orderService.getMyOrders();

    if (result.error) return { data: null, error: result.error };

    return {
      data: getActiveOrderFromList(result.data || []),
      error: null,
    };
  },

  getOrderById: async (orderId: string): Promise<ApiResult<Order>> => {
    if (!orderId) {
      return {
        data: null,
        error: { message: "Order id is required" },
      };
    }

    const result = await safe<any>(() => apiClient.get(`/orders/${orderId}`));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeOrder(result.data),
      error: null,
    };
  },

  cancelOrder: async (
    orderId: string,
    reason?: string
  ): Promise<ApiResult<Order>> => {
    if (!orderId) {
      return {
        data: null,
        error: { message: "Order id is required" },
      };
    }

    const result = await safe<any>(() =>
      apiClient.patch(`/orders/${orderId}/status`, {
        status: "CANCELLED",
        note: reason || "Cancelled by customer",
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeOrder(result.data),
      error: null,
    };
  },

  updateOrderStatus: async (
    orderId: string,
    status: OrderStatus,
    note?: string
  ): Promise<ApiResult<Order>> => {
    if (!orderId) {
      return {
        data: null,
        error: { message: "Order id is required" },
      };
    }

    const result = await safe<any>(() =>
      apiClient.patch(`/orders/${orderId}/status`, {
        status,
        note: note || null,
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeOrder(result.data),
      error: null,
    };
  },

  createPaymentOrder: async (
    orderId: string
  ): Promise<ApiResult<RazorpayCreateOrderResponse>> => {
    if (!orderId) {
      return {
        data: null,
        error: { message: "Order id is required" },
      };
    }

    const result = await safe<any>(() =>
      apiClient.post("/payments/create-order", {
        orderId,
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizePaymentOrder(result.data),
      error: null,
    };
  },

  verifyPayment: async (
    payload: VerifyPaymentPayload
  ): Promise<ApiResult<Order>> => {
    if (
      !payload?.kartoOrderId ||
      !payload?.razorpay_order_id ||
      !payload?.razorpay_payment_id ||
      !payload?.razorpay_signature
    ) {
      return {
        data: null,
        error: { message: "Payment details missing" },
      };
    }

    const result = await safe<any>(() =>
      apiClient.post("/payments/verify", payload)
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeOrder(result.data),
      error: null,
    };
  },
};

export default orderService;
