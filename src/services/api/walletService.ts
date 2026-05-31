import apiClient from "@/api/apiClient";

export type WalletSummary = {
  balance?: number | string;
  availableBalance?: number | string;
  available_balance?: number | string;
  credits?: number | string;
  refunds?: number | string;
  rewards?: number | string;
};

export type WalletTransaction = {
  id: string;
  type?: "CREDIT" | "DEBIT" | "REFUND" | "REWARD" | string;
  amount: number | string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string;
  created_at?: string;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return res?.data?.data ?? res?.data?.wallet ?? res?.data ?? null;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return { data: normalizeData(res) as T, error: null };
  } catch (error: any) {
    console.log("WALLET API ERROR:", error?.response?.data || error?.message);
    return { data: null, error: error?.response?.data || error };
  }
};

export const walletService = {
  getWalletSummary: async () => {
    return safe<WalletSummary>(() => apiClient.get("/wallet"));
  },

  getTransactions: async () => {
    return safe<WalletTransaction[]>(() => apiClient.get("/wallet/transactions"));
  },

  addMoney: async (amount: number) => {
    return safe<any>(() =>
      apiClient.post("/wallet/add-money", {
        amount,
      })
    );
  },
};