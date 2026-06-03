import apiClient from "@/api/apiClient";

export type CreatePaymentOrderResponse = {
  success: boolean;
  message?: string;
  key?: string;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  kartoOrderId?: string;
  orderNumber?: string;
};

export type VerifyPaymentPayload = {
  kartoOrderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  message?: string;
  data?: any;
  order?: any;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: res?.data as T,
      error: null,
    };
  } catch (error: any) {
    console.log("PAYMENT API ERROR:", error?.response?.data || error?.message);

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const paymentApi = {
  createOrder: async (orderId: string) => {
    return safe<CreatePaymentOrderResponse>(() =>
      apiClient.post("/payments/create-order", { orderId })
    );
  },

  verifyPayment: async (payload: VerifyPaymentPayload) => {
    return safe<VerifyPaymentResponse>(() =>
      apiClient.post("/payments/verify", payload)
    );
  },
};