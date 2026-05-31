import apiClient from "@/api/apiClient";

export type AdminDashboardData = {
  totalUsers: number;
  totalVendors: number;
  totalRiders: number;
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  kartoIncome: number;
  vendorIncome: number;
  recentOrders: any[];
};

const formHeaders = {
  headers: { "Content-Type": "multipart/form-data" },
};

const toFormData = (data: any) => {
  const form = new FormData();

  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });

  return form;
};

const filePart = (file: any) => {
  if (!file?.uri) return null;

  return {
    uri: file.uri,
    type: file.type || "image/jpeg",
    name: file.fileName || `image-${Date.now()}.jpg`,
  } as any;
};

const fail = (error: any, emptyData: any = null) => ({
  data: emptyData,
  error: error.response?.data || error,
});

export const adminService = {
  getDashboard: async () => {
    try {
      const res = await apiClient.get("/admin/dashboard");
      return { data: res.data.data as AdminDashboardData, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  users: async () => {
    try {
      const res = await apiClient.get("/admin/users");
      return { data: res.data.users || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createRoleUser: async (data: any) => {
    try {
      const res = await apiClient.post("/admin/users/create-role-user", data);
      return { data: res.data.user || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/users/${id}/status`, { isActive });
      return { data: res.data.user || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getCities: async () => {
    try {
      const res = await apiClient.get("/admin/cities");
      return { data: res.data.cities || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createCity: async (data: { name: string; code: string }) => {
    try {
      const res = await apiClient.post("/admin/cities", data);
      return { data: res.data.city || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  vendors: async (categoryId?: string) => {
    try {
      const url =
        categoryId && categoryId !== "ALL"
          ? `/admin/vendors?categoryId=${categoryId}`
          : "/admin/vendors";

      const res = await apiClient.get(url);
      return { data: res.data.vendors || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createVendor: async (data: any) => {
    try {
      const form = toFormData({
        cityId: data.cityId,
        categoryId: data.categoryId,
        role: "VENDOR",
        name: data.name,
        ownerName: data.ownerName,
        ownerMobileNo: data.ownerMobileNo,
        phone: data.phone,
        email: data.email,
        password: data.password,
        address: data.address,
        type: data.type,
        commission: data.commission,
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/vendors", form, formHeaders);
      return { data: res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateVendorCommission: async (id: string, commission: number) => {
    try {
      const res = await apiClient.patch(`/admin/vendors/${id}/commission`, {
        commission,
      });
      return { data: res.data.vendor || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  toggleRestaurant: async (id: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/restaurants/${id}/status`, {
        isActive,
      });
      return { data: res.data.restaurant || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  riders: async () => {
    try {
      const res = await apiClient.get("/admin/riders");
      return { data: res.data.riders || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createRider: async (data: any) => {
    try {
      const form = toFormData({
        cityId: data.cityId,
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        vehicleNo: data.vehicleNo,
        vehicleType: data.vehicleType,
        address: data.address,
        role: "RIDER",
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/riders", form, formHeaders);
      return { data: res.data.rider || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  categories: async () => {
    try {
      const res = await apiClient.get("/admin/categories");
      return { data: res.data.categories || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createCategory: async (data: { name: string; description?: string; image?: any }) => {
    try {
      const form = toFormData({
        name: data.name,
        description: data.description || "",
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/categories", form, formHeaders);
      return { data: res.data.category || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCategory: async (
    id: string,
    data: { name?: string; description?: string; image?: any }
  ) => {
    try {
      const form = toFormData({
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/categories/${id}`, form, formHeaders);
      return { data: res.data.category || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteCategory: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/categories/${id}`);
      return { data: res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  subCategories: async (categoryId?: string) => {
    try {
      const url =
        categoryId && categoryId !== "ALL"
          ? `/admin/subcategories?categoryId=${categoryId}`
          : "/admin/subcategories";

      const res = await apiClient.get(url);
      return { data: res.data.subCategories || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createSubCategory: async (data: {
    categoryId: string;
    name: string;
    description?: string;
    image?: any;
  }) => {
    try {
      const form = toFormData({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description || "",
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/subcategories", form, formHeaders);
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateSubCategory: async (
    id: string,
    data: { categoryId?: string; name?: string; description?: string; image?: any }
  ) => {
    try {
      const form = toFormData({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/subcategories/${id}`, form, formHeaders);
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteSubCategory: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/subcategories/${id}`);
      return { data: res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getMenuItems: async (params?: {
    restaurantId?: string;
    categoryId?: string;
    subCategoryId?: string;
  }) => {
    try {
      const query = new URLSearchParams();

      if (params?.restaurantId && params.restaurantId !== "ALL") {
        query.append("restaurantId", params.restaurantId);
      }
      if (params?.categoryId && params.categoryId !== "ALL") {
        query.append("categoryId", params.categoryId);
      }
      if (params?.subCategoryId && params.subCategoryId !== "ALL") {
        query.append("subCategoryId", params.subCategoryId);
      }

      const url = query.toString()
        ? `/admin/menu-items?${query.toString()}`
        : "/admin/menu-items";

      const res = await apiClient.get(url);
      return { data: res.data.menuItems || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createMenuItem: async (data: any) => {
    try {
      const form = toFormData({
        restaurantId: data.restaurantId,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        name: data.name,
        description: data.description || "",
        price: data.price,
        isVegetarian: String(data.isVegetarian || false),
        isPopular: String(data.isPopular || false),
        isAvailable: String(data.isAvailable ?? true),
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/menu-items", form, formHeaders);
      return { data: res.data.menuItem || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateMenuItem: async (id: string, data: any) => {
    try {
      const form = toFormData({
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        isVegetarian:
          data.isVegetarian !== undefined ? String(data.isVegetarian) : undefined,
        isPopular: data.isPopular !== undefined ? String(data.isPopular) : undefined,
        isAvailable:
          data.isAvailable !== undefined ? String(data.isAvailable) : undefined,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/menu-items/${id}`, form, formHeaders);
      return { data: res.data.menuItem || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteMenuItem: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/menu-items/${id}`);
      return { data: res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  getOrders: async (params?: {
    status?: string;
    cityId?: string;
    vendorId?: string;
  }) => {
    try {
      const query = new URLSearchParams();

      if (params?.status && params.status !== "ALL") query.append("status", params.status);
      if (params?.cityId) query.append("cityId", params.cityId);
      if (params?.vendorId) query.append("vendorId", params.vendorId);

      const url = query.toString()
        ? `/admin/orders?${query.toString()}`
        : "/admin/orders";

      const res = await apiClient.get(url);
      return { data: res.data.orders || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getOrderById: async (orderId: string) => {
    try {
      const res = await apiClient.get(`/admin/orders/${orderId}`);
      return { data: res.data.order || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateOrderStatus: async (orderId: string, status: string, note?: string) => {
    try {
      const res = await apiClient.patch(`/admin/orders/${orderId}/status`, {
        status,
        note,
      });

      return { data: res.data.order || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  assignRider: async (orderId: string, riderId: string) => {
    try {
      const res = await apiClient.patch(`/admin/orders/${orderId}/assign-rider`, {
        riderId,
      });

      return { data: res.data.order || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  riderBilling: async (id: string, type: "daily" | "monthly") => {
    try {
      const res = await apiClient.get(`/admin/riders/${id}/billing?type=${type}`);
      return { data: res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  monthlyBilling: async () => {
    try {
      const res = await apiClient.get("/admin/billing/monthly");
      return { data: res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },
};