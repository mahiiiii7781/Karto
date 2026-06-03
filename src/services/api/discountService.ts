// src/services/api/discountService.ts
import apiClient from "@/api/apiClient";

export type Discount = {
  id: string;
  title?: string | null;
  code?: string | null;
  description?: string | null;

  discountPercent?: number | string | null;
  discount_percent?: number | string | null;

  discountAmount?: number | string | null;
  discount_amount?: number | string | null;

  maxDiscount?: number | string | null;
  max_discount?: number | string | null;

  minOrderAmount?: number | string | null;
  min_order_amount?: number | string | null;

  imageUrl?: string | null;
  image_url?: string | null;

  isActive?: boolean;
  is_active?: boolean;

  startsAt?: string | null;
  starts_at?: string | null;

  expiresAt?: string | null;
  expires_at?: string | null;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return (
    res?.data?.data ??
    res?.data?.discounts ??
    res?.data?.offers ??
    res?.data ??
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
    console.log("DISCOUNT API ERROR:", error?.response?.data || error?.message);

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const discountService = {
  getActiveDiscounts: async () => {
    return safe<Discount[]>(() => apiClient.get("/discounts/active"));
  },

  getAllDiscounts: async () => {
    return safe<Discount[]>(() => apiClient.get("/discounts"));
  },

  getDiscountByCode: async (code: string) => {
    return safe<Discount>(() =>
      apiClient.get(`/discounts/code/${encodeURIComponent(code)}`)
    );
  },

  validateDiscount: async (payload: {
    code: string;
    cartValue?: number;
    restaurantId?: string;
  }) => {
    return safe<any>(() =>
      apiClient.post("/discounts/validate", {
        code: payload.code,
        cartValue: payload.cartValue ?? 0,
        restaurantId: payload.restaurantId,
      })
    );
  },
};