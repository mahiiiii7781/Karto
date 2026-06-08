import apiClient from "@/api/apiClient";

export type City = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminVendorPayload = {
  cityId: string;
  name: string;
  ownerName: string;
  ownerMobileNo: string;
  phone: string;
  email: string;
  password?: string;
  address: string;
  image?: any;
  imageUrl?: string | null;
  type?: string;
  commission?: number;
  categoryId?: string | null;
  isOpen?: boolean;
  isActive?: boolean;
};

const formHeaders = {
  headers: { "Content-Type": "multipart/form-data" },
};

const clean = (value: any) => value !== undefined && value !== null && value !== "";

const filePart = (file: any) => {
  if (!file?.uri) return undefined;

  return {
    uri: file.uri,
    type: file.type || "image/jpeg",
    name: file.fileName || file.name || `image-${Date.now()}.jpg`,
  } as any;
};

const toFormData = (data: any) => {
  const form = new FormData();

  Object.keys(data || {}).forEach((key) => {
    const value = data[key];
    if (!clean(value)) return;
    form.append(key, value as any);
  });

  return form;
};

const fail = (error: any, fallback: any = null) => ({
  data: fallback,
  error: error?.response?.data || error,
});

const queryString = (params?: Record<string, any>) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (clean(value) && value !== "ALL") query.append(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : "";
};

export const adminVendorService = {
  getCities: async (includeInactive = false) => {
    try {
      const res = await apiClient.get(
        `/admin/cities${includeInactive ? "?includeInactive=true" : ""}`
      );

      return { data: res.data.cities || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createCity: async (payload: { name: string; code: string }) => {
    try {
      const res = await apiClient.post("/admin/cities", payload);
      return { data: res.data.city || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCity: async (
    id: string,
    payload: { name?: string; code?: string; isActive?: boolean }
  ) => {
    try {
      const res = await apiClient.patch(`/admin/cities/${id}`, payload);
      return { data: res.data.city || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteCity: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/cities/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  createVendor: async (payload: AdminVendorPayload) => {
    try {
      const form = toFormData({
        cityId: payload.cityId,
        categoryId: payload.categoryId,
        name: payload.name,
        ownerName: payload.ownerName,
        ownerMobileNo: payload.ownerMobileNo,
        phone: payload.phone,
        email: payload.email,
        password: payload.password,
        address: payload.address,
        type: payload.type || "RESTAURANT",
        commission: payload.commission ?? 0,
        imageUrl: payload.imageUrl,
        image: filePart(payload.image),
      });

      const res = await apiClient.post("/admin/vendors", form, formHeaders);
      return {
        data: res.data.vendor || res.data.data,
        error: null,
      };
    } catch (error: any) {
      return fail(error);
    }
  },

  getVendors: async (params?: { cityId?: string; categoryId?: string }) => {
    try {
      const res = await apiClient.get(`/admin/vendors${queryString(params)}`);
      return { data: res.data.vendors || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  updateVendor: async (vendorId: string, payload: AdminVendorPayload) => {
    try {
      const form = toFormData({
        cityId: payload.cityId,
        categoryId: payload.categoryId,
        name: payload.name,
        ownerName: payload.ownerName,
        ownerMobileNo: payload.ownerMobileNo,
        phone: payload.phone,
        email: payload.email,
        password: payload.password,
        address: payload.address,
        type: payload.type,
        commission: payload.commission,
        imageUrl: payload.imageUrl,
        image: filePart(payload.image),
        isOpen: payload.isOpen,
        isActive: payload.isActive,
      });

      const res = await apiClient.patch(
        `/admin/vendors/${vendorId}`,
        form,
        formHeaders
      );

      return {
        data: res.data.vendor || res.data.data,
        error: null,
      };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCommission: async (vendorId: string, commission: number) => {
    try {
      const res = await apiClient.patch(`/admin/vendors/${vendorId}/commission`, {
        commission,
      });

      return { data: res.data.vendor || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  toggleVendorStatus: async (vendorId: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/vendors/${vendorId}/status`, {
        isActive,
      });

      return {
        data: res.data.vendor || res.data.restaurant || res.data.data,
        error: null,
      };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteVendor: async (vendorId: string) => {
    try {
      const res = await apiClient.delete(`/admin/vendors/${vendorId}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },
};