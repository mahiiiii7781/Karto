import apiClient from "@/api/apiClient";

export type City = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type AdminVendorPayload = {
  cityId: string;
  role: "VENDOR" | "ADMIN" | "RIDER" | "CUSTOMER";
  name: string;
  ownerName: string;
  ownerMobileNo: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  imageUrl?: string;
  type: string;
  commission: number;
  categoryId?: string | null;
};

export const adminVendorService = {
  getCities: async () => {
    try {
      const res = await apiClient.get("/admin/cities");
      return { data: res.data.cities || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.response?.data || error };
    }
  },

  createCity: async (payload: { name: string; code: string }) => {
    try {
      const res = await apiClient.post("/admin/cities", payload);
      return { data: res.data.city, error: null };
    } catch (error: any) {
      return { data: null, error: error.response?.data || error };
    }
  },

  createVendor: async (payload: AdminVendorPayload) => {
    try {
      const res = await apiClient.post("/admin/vendors", payload);
      return { data: res.data.data, error: null };
    } catch (error: any) {
      return { data: null, error: error.response?.data || error };
    }
  },

  getVendors: async (cityId?: string) => {
    try {
      const url = cityId ? `/admin/vendors?cityId=${cityId}` : "/admin/vendors";
      const res = await apiClient.get(url);
      return { data: res.data.vendors || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.response?.data || error };
    }
  },

  updateCommission: async (vendorId: string, commission: number) => {
    try {
      const res = await apiClient.patch(`/admin/vendors/${vendorId}/commission`, {
        commission,
      });
      return { data: res.data.vendor, error: null };
    } catch (error: any) {
      return { data: null, error: error.response?.data || error };
    }
  },
};