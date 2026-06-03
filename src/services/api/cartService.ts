import apiClient from "@/api/apiClient";

export type CartMenuItem = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
  is_available?: boolean;
};

export type CartRestaurant = {
  id: string;
  restaurant_name?: string | null;
  name?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  deliveryFee?: number | string;
  delivery_fee?: number | string;
};

export type CartTax = {
  cgstRate?: number | string;
  sgstRate?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  total?: number | string;
};

export type CartPricing = {
  cartValue?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  delivery_fee?: number | string;
  platformFee?: number | string;
  platform_fee?: number | string;
  tax?: CartTax;
  taxAmount?: number | string;
  tax_amount?: number | string;
  discount?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;
  grandTotal?: number | string;
};

export type CartItem = {
  id: string;
  userId?: string;
  user_id?: string;
  menuItemId?: string;
  menu_item_id?: string;
  restaurantId?: string;
  restaurant_id?: string;

  quantity: number;
  price: number | string;
  total_price?: number | string;
  totalPrice?: number | string;
  note?: string | null;

  customizationJson?: any;
  customization_json?: any;
  addonJson?: any;
  addon_json?: any;

  menu_item?: CartMenuItem | null;
  menuItem?: CartMenuItem | null;
  restaurant?: CartRestaurant | null;
  itemName?: string | null;
};

export type AddToCartPayload = {
  menuItemId: string;
  restaurantId?: string;
  quantity?: number;
  note?: string | null;
  customizationIds?: string[];
  addonIds?: string[];
};

export type UpdateCartItemPayload = {
  quantity: number;
  note?: string | null;
  customizationIds?: string[];
  addonIds?: string[];
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return res?.data?.data ?? res?.data?.cartItems ?? res?.data?.cartItem ?? res?.data ?? null;
};

const normalizePricing = (res: any): CartPricing | null => {
  return (
    res?.data?.data?.pricing ??
    res?.data?.pricing ??
    res?.data?.bill ??
    res?.data?.summary ??
    null
  );
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: normalizeData(res) as T,
      error: null,
    };
  } catch (error: any) {
    console.log("CART API ERROR:", error?.response?.data || error?.message);

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

const safePricing = async (): Promise<ApiResult<CartPricing>> => {
  try {
    const res = await apiClient.get("/cart/pricing");

    return {
      data: normalizePricing(res),
      error: null,
    };
  } catch (error: any) {
    console.log("CART PRICING API ERROR:", error?.response?.data || error?.message);

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const isDifferentRestaurantError = (error: any) => {
  const code = String(error?.error || error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "DIFFERENT_RESTAURANT" ||
    message.includes("one restaurant") ||
    message.includes("different restaurant") ||
    message.includes("multiple stores")
  );
};

export const getCartErrorMessage = (error: any) => {
  if (isDifferentRestaurantError(error)) {
    return {
      title: "Different store",
      message: "Your cart already has items from another store. Please clear the cart before adding this item.",
    };
  }

  return {
    title: "Cart error",
    message: error?.message || "Something went wrong. Please try again.",
  };
};

export const cartService = {
  getCartItems: async () => {
    return safe<CartItem[]>(() => apiClient.get("/cart"));
  },

  getCartPricing: async () => {
    return safePricing();
  },

  getCartTotal: async () => {
    return safe<any>(() => apiClient.get("/cart/total"));
  },

  addToCart: async (payload: AddToCartPayload) => {
    return safe<CartItem>(() =>
      apiClient.post("/cart/add", {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        quantity: payload.quantity ?? 1,
        note: payload.note ?? null,
        customizationIds: payload.customizationIds ?? [],
        addonIds: payload.addonIds ?? [],
      })
    );
  },

  updateCartItem: async (
    cartItemId: string,
    payloadOrQuantity: UpdateCartItemPayload | number
  ) => {
    const payload =
      typeof payloadOrQuantity === "number"
        ? { quantity: payloadOrQuantity }
        : payloadOrQuantity;

    return safe<CartItem>(() =>
      apiClient.patch(`/cart/${cartItemId}`, {
        quantity: payload.quantity,
        note: payload.note,
        customizationIds: payload.customizationIds,
        addonIds: payload.addonIds,
      })
    );
  },

  removeFromCart: async (cartItemId: string) => {
    return safe<{ success: boolean; id?: string }>(() =>
      apiClient.delete(`/cart/${cartItemId}`)
    );
  },

  clearCart: async () => {
    return safe<{ success: boolean }>(() => apiClient.delete("/cart"));
  },
};