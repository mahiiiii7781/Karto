import apiClient from "@/api/apiClient";

export type Coupon = {
  id: string;
  code: string;
  title?: string | null;
  description?: string | null;
  discountType?: "PERCENTAGE" | "FLAT" | string;
  discount_type?: "PERCENTAGE" | "FLAT" | string;
  discountValue?: number | string;
  discount_value?: number | string;
  minOrderAmount?: number | string;
  min_order_amount?: number | string;
  maxDiscount?: number | string | null;
  max_discount?: number | string | null;
  expiresAt?: string | null;
  expires_at?: string | null;
  isActive?: boolean;
  is_active?: boolean;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) =>
  res?.data?.data ?? res?.data?.coupons ?? res?.data ?? null;

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return { data: normalizeData(res) as T, error: null };
  } catch (error: any) {
    console.log("COUPON API ERROR:", error?.response?.data || error?.message);
    return { data: null, error: error?.response?.data || error };
  }
};

export const couponService = {
  getCoupons: async () => {
    return safe<Coupon[]>(() => apiClient.get("/coupons"));
  },

  validateCoupon: async (code: string, orderAmount: number) => {
    return safe<any>(() =>
      apiClient.post("/coupons/validate", {
        code,
        orderAmount,
      })
    );
  },
};