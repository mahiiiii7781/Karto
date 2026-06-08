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

export type CartResponse = {
  cartItems: CartItem[];
  pricing: CartPricing | null;
  itemCount: number;
  totalAmount: number;
  total: number;
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

const toNumber = (value: any) => Number(value || 0);

const normalizeArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  return [];
};

const normalizeCartItems = (resData: any): CartItem[] => {
  return normalizeArray<CartItem>(
    resData?.data?.cartItems ||
      resData?.cartItems ||
      resData?.data ||
      []
  );
};

const normalizeSingleCartItem = (resData: any): CartItem | null => {
  return (
    resData?.data?.cartItem ||
    resData?.cartItem ||
    resData?.data ||
    null
  );
};

const normalizePricingFromData = (resData: any): CartPricing | null => {
  return (
    resData?.data?.pricing ||
    resData?.pricing ||
    resData?.data?.bill ||
    resData?.bill ||
    resData?.data?.summary ||
    resData?.summary ||
    null
  );
};

const normalizeCartResponse = (resData: any): CartResponse => {
  const cartItems = normalizeCartItems(resData);
  const pricing = normalizePricingFromData(resData);

  return {
    cartItems,
    pricing,
    itemCount: toNumber(resData?.itemCount ?? resData?.data?.itemCount),
    totalAmount: toNumber(resData?.totalAmount ?? resData?.data?.totalAmount),
    total: toNumber(resData?.total ?? resData?.data?.total),
  };
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: res.data as T,
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
      message:
        "Your cart already has items from another store. Please clear the cart before adding this item.",
    };
  }

  return {
    title: "Cart error",
    message:
      error?.message ||
      error?.response?.data?.message ||
      "Something went wrong. Please try again.",
  };
};

export const cartService = {
  getCart: async (): Promise<ApiResult<CartResponse>> => {
    const result = await safe<any>(() => apiClient.get("/cart"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartResponse(result.data),
      error: null,
    };
  },

  getCartItems: async (): Promise<ApiResult<CartItem[]>> => {
    const result = await safe<any>(() => apiClient.get("/cart"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartItems(result.data),
      error: null,
    };
  },

  getCartPricing: async (): Promise<ApiResult<CartPricing>> => {
    const result = await safe<any>(() => apiClient.get("/cart/pricing"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizePricingFromData(result.data),
      error: null,
    };
  },

  getCartTotal: async (): Promise<ApiResult<any>> => {
    const result = await safe<any>(() => apiClient.get("/cart/total"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: result.data?.data || result.data,
      error: null,
    };
  },

  addToCart: async (payload: AddToCartPayload): Promise<ApiResult<CartItem>> => {
    const result = await safe<any>(() =>
      apiClient.post("/cart/add", {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        quantity: payload.quantity ?? 1,
        note: payload.note ?? null,
        customizationIds: payload.customizationIds ?? [],
        addonIds: payload.addonIds ?? [],
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeSingleCartItem(result.data),
      error: null,
    };
  },

  addToCartAndGetCart: async (
    payload: AddToCartPayload
  ): Promise<ApiResult<CartResponse>> => {
    const result = await safe<any>(() =>
      apiClient.post("/cart/add", {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        quantity: payload.quantity ?? 1,
        note: payload.note ?? null,
        customizationIds: payload.customizationIds ?? [],
        addonIds: payload.addonIds ?? [],
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartResponse(result.data),
      error: null,
    };
  },

  updateCartItem: async (
    cartItemId: string,
    payloadOrQuantity: UpdateCartItemPayload | number
  ): Promise<ApiResult<CartItem>> => {
    const payload =
      typeof payloadOrQuantity === "number"
        ? { quantity: payloadOrQuantity }
        : payloadOrQuantity;

    const result = await safe<any>(() =>
      apiClient.patch(`/cart/${cartItemId}`, {
        quantity: payload.quantity,
        note: payload.note,
        customizationIds: payload.customizationIds,
        addonIds: payload.addonIds,
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeSingleCartItem(result.data),
      error: null,
    };
  },

  updateCartItemAndGetCart: async (
    cartItemId: string,
    payloadOrQuantity: UpdateCartItemPayload | number
  ): Promise<ApiResult<CartResponse>> => {
    const payload =
      typeof payloadOrQuantity === "number"
        ? { quantity: payloadOrQuantity }
        : payloadOrQuantity;

    const result = await safe<any>(() =>
      apiClient.patch(`/cart/${cartItemId}`, {
        quantity: payload.quantity,
        note: payload.note,
        customizationIds: payload.customizationIds,
        addonIds: payload.addonIds,
      })
    );

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartResponse(result.data),
      error: null,
    };
  },

  removeFromCart: async (
    cartItemId: string
  ): Promise<ApiResult<{ success: boolean; id?: string }>> => {
    const result = await safe<any>(() => apiClient.delete(`/cart/${cartItemId}`));

    if (result.error) return { data: null, error: result.error };

    return {
      data: {
        success: true,
        id: result.data?.removedId || result.data?.data?.id || cartItemId,
      },
      error: null,
    };
  },

  removeFromCartAndGetCart: async (
    cartItemId: string
  ): Promise<ApiResult<CartResponse>> => {
    const result = await safe<any>(() => apiClient.delete(`/cart/${cartItemId}`));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartResponse(result.data),
      error: null,
    };
  },

  clearCart: async (): Promise<ApiResult<{ success: boolean }>> => {
    const result = await safe<any>(() => apiClient.delete("/cart"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: { success: true },
      error: null,
    };
  },

  clearCartAndGetCart: async (): Promise<ApiResult<CartResponse>> => {
    const result = await safe<any>(() => apiClient.delete("/cart"));

    if (result.error) return { data: null, error: result.error };

    return {
      data: normalizeCartResponse(result.data),
      error: null,
    };
  },
};

export default cartService;