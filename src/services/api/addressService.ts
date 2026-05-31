import apiClient from "@/api/apiClient";

export type Address = {
  id: string;

  label?: string | null;

  address?: string | null;
  addressLine?: string | null;
  fullAddress?: string | null;

  landmark?: string | null;

  city?: string | null;
  state?: string | null;
  country?: string | null;

  pincode?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  isDefault?: boolean;
  is_default?: boolean;

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
  updated_at?: string;
};

export type CreateAddressPayload = {
  label: string;
  address: string;
  landmark: string;
  city: string;
  state?: string | null;
  country?: string | null;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return (
    res?.data?.data ||
    res?.data?.addresses ||
    res?.data?.address ||
    res?.data ||
    null
  );
};

const safe = async <T>(
  fn: () => Promise<any>
): Promise<ApiResult<T>> => {
  try {
    const res = await fn();

    return {
      data: normalizeData(res) as T,
      error: null,
    };
  } catch (error: any) {
    console.log(
      "ADDRESS API ERROR:",
      error?.response?.data || error?.message
    );

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const addressService = {
  getAddresses: async () => {
    return safe<Address[]>(() =>
      apiClient.get("/address")
    );
  },

  getAddressById: async (id: string) => {
    return safe<Address>(() =>
      apiClient.get(`/address/${id}`)
    );
  },

  createAddress: async (
    payload: CreateAddressPayload
  ) => {
    return safe<Address>(() =>
      apiClient.post("/address", payload)
    );
  },

  updateAddress: async (
    id: string,
    payload: Partial<CreateAddressPayload>
  ) => {
    return safe<Address>(() =>
      apiClient.put(`/address/${id}`, payload)
    );
  },

  deleteAddress: async (id: string) => {
    return safe<boolean>(() =>
      apiClient.delete(`/address/${id}`)
    );
  },

  setDefaultAddress: async (id: string) => {
    return safe<Address>(() =>
      apiClient.patch(`/address/${id}/default`)
    );
  },
};