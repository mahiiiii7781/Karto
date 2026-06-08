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

const clean = (value: any) => value !== undefined && value !== null && value !== "";

const toFormData = (data: any) => {
  const form = new FormData();

  Object.keys(data || {}).forEach((key) => {
    const value = data[key];

    if (!clean(value)) return;

    if (Array.isArray(value) || typeof value === "object") {
      if (value?.uri) form.append(key, value as any);
      else form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  });

  return form;
};

const filePart = (file: any) => {
  if (!file?.uri) return undefined;

  return {
    uri: file.uri,
    type: file.type || "image/jpeg",
    name: file.fileName || file.name || `image-${Date.now()}.jpg`,
  } as any;
};

const fail = (error: any, emptyData: any = null) => ({
  data: emptyData,
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

export const adminService = {
  getDashboard: async () => {
    try {
      const res = await apiClient.get("/admin/dashboard");
      return { data: res.data.data as AdminDashboardData, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  dashboard: async () => {
    try {
      const res = await apiClient.get("/admin/dashboard");
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateProfile: async (data: any) => {
    try {
      const form = toFormData({
        fullName: data.fullName,
        phone: data.phone,
        password: data.password,
        image: filePart(data.image),
      });

      const res = await apiClient.patch("/auth/profile", form, formHeaders);
      return { data: res.data.user || res.data.data || res.data, error: null };
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
      const form = toFormData({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
        image: filePart(data.image),
      });

      const res = await apiClient.post(
        "/admin/users/create-role-user",
        form,
        formHeaders
      );

      return { data: res.data.user || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateUserRole: async (id: string, role: string) => {
    try {
      const res = await apiClient.patch(`/admin/users/${id}/role`, { role });
      return { data: res.data.user || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/users/${id}/status`, {
        isActive,
      });
      return { data: res.data.user || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteUser: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/users/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

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

  createCity: async (data: { name: string; code: string }) => {
    try {
      const res = await apiClient.post("/admin/cities", data);
      return { data: res.data.city || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCity: async (
    id: string,
    data: { name?: string; code?: string; isActive?: boolean }
  ) => {
    try {
      const res = await apiClient.patch(`/admin/cities/${id}`, data);
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

  vendors: async (params?: { cityId?: string; categoryId?: string }) => {
    try {
      const res = await apiClient.get(`/admin/vendors${queryString(params)}`);
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
        name: data.name,
        ownerName: data.ownerName,
        ownerMobileNo: data.ownerMobileNo,
        phone: data.phone,
        email: data.email,
        password: data.password,
        address: data.address,
        type: data.type || "RESTAURANT",
        commission: data.commission,
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/vendors", form, formHeaders);
      return { data: res.data.vendor || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateVendor: async (id: string, data: any) => {
    try {
      const form = toFormData({
        cityId: data.cityId,
        categoryId: data.categoryId,
        name: data.name,
        ownerName: data.ownerName,
        ownerMobileNo: data.ownerMobileNo,
        phone: data.phone,
        email: data.email,
        password: data.password,
        address: data.address,
        type: data.type,
        commission: data.commission,
        isOpen: data.isOpen,
        isActive: data.isActive,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/vendors/${id}`, form, formHeaders);
      return { data: res.data.vendor || res.data.data, error: null };
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
      const res = await apiClient.patch(`/admin/vendors/${id}/status`, {
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

  toggleVendorStatus: async (id: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/vendors/${id}/status`, {
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

  deleteVendor: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/vendors/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  riders: async (cityId?: string) => {
    try {
      const res = await apiClient.get(
        `/admin/riders${queryString({ cityId })}`
      );
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
        vehicleType: data.vehicleType || "BIKE",
        address: data.address,
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/riders", form, formHeaders);
      return { data: res.data.rider || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateRider: async (id: string, data: any) => {
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
        isActive: data.isActive,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/riders/${id}`, form, formHeaders);
      return { data: res.data.rider || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateRiderStatus: async (id: string, isActive: boolean) => {
    try {
      const res = await apiClient.patch(`/admin/riders/${id}/status`, {
        isActive,
      });
      return { data: res.data.user || res.data.rider || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteRider: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/riders/${id}`);
      return { data: res.data.data || res.data, error: null };
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

  createCategory: async (data: any) => {
    try {
      const form = toFormData({
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/categories", form, formHeaders);
      return { data: res.data.category || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCategory: async (id: string, data: any) => {
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
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  subCategories: async (categoryId?: string) => {
    try {
      const res = await apiClient.get(
        `/admin/subcategories${queryString({ categoryId })}`
      );
      return { data: res.data.subCategories || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createSubCategory: async (data: any) => {
    try {
      const form = toFormData({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.post("/admin/subcategories", form, formHeaders);
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateSubCategory: async (id: string, data: any) => {
    try {
      const form = toFormData({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(
        `/admin/subcategories/${id}`,
        form,
        formHeaders
      );
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteSubCategory: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/subcategories/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  vendorCategories: async (restaurantId?: string) => {
    try {
      const res = await apiClient.get(
        `/admin/vendor-categories${queryString({ restaurantId })}`
      );
      return { data: res.data.categories || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getVendorCategories: async (
    params?: string | { restaurantId?: string; vendorId?: string }
  ) => {
    try {
      const query =
        typeof params === "string"
          ? { restaurantId: params }
          : {
              restaurantId: params?.restaurantId || params?.vendorId,
            };

      const res = await apiClient.get(
        `/admin/vendor-categories${queryString(query)}`
      );

      return { data: res.data.categories || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createVendorCategory: async (data: any) => {
    try {
      const form = toFormData({
        restaurantId: data.restaurantId,
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.post(
        "/admin/vendor-categories",
        form,
        formHeaders
      );
      return { data: res.data.category || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateVendorCategory: async (id: string, data: any) => {
    try {
      const form = toFormData({
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(
        `/admin/vendor-categories/${id}`,
        form,
        formHeaders
      );
      return { data: res.data.category || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteVendorCategory: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/vendor-categories/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  vendorSubCategories: async (params?: {
    vendorCategoryId?: string;
    categoryId?: string;
    restaurantId?: string;
  }) => {
    try {
      const query = {
        restaurantId: params?.restaurantId,
        vendorCategoryId: params?.vendorCategoryId || params?.categoryId,
      };

      const res = await apiClient.get(
        `/admin/vendor-subcategories${queryString(query)}`
      );

      return {
        data: res.data.subCategories || res.data.data || [],
        error: null,
      };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getVendorSubCategories: async (params?: {
    vendorCategoryId?: string;
    categoryId?: string;
    restaurantId?: string;
  }) => {
    try {
      const query = {
        restaurantId: params?.restaurantId,
        vendorCategoryId: params?.vendorCategoryId || params?.categoryId,
      };

      const res = await apiClient.get(
        `/admin/vendor-subcategories${queryString(query)}`
      );

      return {
        data: res.data.subCategories || res.data.data || [],
        error: null,
      };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  createVendorSubCategory: async (data: any) => {
    try {
      const form = toFormData({
        vendorCategoryId: data.vendorCategoryId || data.categoryId,
        categoryId: data.categoryId || data.vendorCategoryId,
        restaurantId: data.restaurantId,
        name: data.name,
        description: data.description,
        image: filePart(data.image),
      });

      const res = await apiClient.post(
        "/admin/vendor-subcategories",
        form,
        formHeaders
      );
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateVendorSubCategory: async (id: string, data: any) => {
    try {
      const form = toFormData({
        vendorCategoryId: data.vendorCategoryId || data.categoryId,
        categoryId: data.categoryId || data.vendorCategoryId,
        restaurantId: data.restaurantId,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(
        `/admin/vendor-subcategories/${id}`,
        form,
        formHeaders
      );
      return { data: res.data.subCategory || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteVendorSubCategory: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/vendor-subcategories/${id}`);
      return { data: res.data.data || res.data, error: null };
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
      const res = await apiClient.get(`/admin/menu-items${queryString(params)}`);
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
        description: data.description,
        price: data.price,
        isVegetarian: data.isVegetarian,
        isVeg: data.isVeg,
        isPopular: data.isPopular,
        isAvailable: data.isAvailable ?? true,
        isBestSeller: data.isBestSeller,
        calories: data.calories,
        servingInfo: data.servingInfo,
        prepTimeMin: data.prepTimeMin,
        spiceLevel: data.spiceLevel,
        addons: data.addons,
        customizations: data.customizations,
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
        isVegetarian: data.isVegetarian,
        isVeg: data.isVeg,
        isPopular: data.isPopular,
        isAvailable: data.isAvailable,
        isBestSeller: data.isBestSeller,
        calories: data.calories,
        servingInfo: data.servingInfo,
        prepTimeMin: data.prepTimeMin,
        spiceLevel: data.spiceLevel,
        addons: data.addons,
        customizations: data.customizations,
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
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  createMenuItemAddon: async (menuItemId: string, data: any) => {
    try {
      const form = toFormData({
        title: data.title,
        price: data.price,
        isActive: data.isActive ?? true,
        image: filePart(data.image),
      });

      const res = await apiClient.post(
        `/admin/menu-items/${menuItemId}/addons`,
        form,
        formHeaders
      );
      return { data: res.data.addon || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateMenuItemAddon: async (id: string, data: any) => {
    try {
      const form = toFormData({
        title: data.title,
        price: data.price,
        isActive: data.isActive,
        image: filePart(data.image),
      });

      const res = await apiClient.patch(`/admin/menu-addons/${id}`, form, formHeaders);
      return { data: res.data.addon || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteMenuItemAddon: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/menu-addons/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  createMenuItemCustomization: async (menuItemId: string, data: any) => {
    try {
      const res = await apiClient.post(
        `/admin/menu-items/${menuItemId}/customizations`,
        {
          title: data.title,
          price: data.price,
          isRequired: data.isRequired ?? false,
          isActive: data.isActive ?? true,
        }
      );
      return { data: res.data.customization || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateMenuItemCustomization: async (id: string, data: any) => {
    try {
      const res = await apiClient.patch(`/admin/menu-customizations/${id}`, {
        title: data.title,
        price: data.price,
        isRequired: data.isRequired,
        isActive: data.isActive,
      });
      return { data: res.data.customization || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteMenuItemCustomization: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/menu-customizations/${id}`);
      return { data: res.data.data || res.data, error: null };
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
      const res = await apiClient.get(`/admin/orders${queryString(params)}`);
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

  riderBilling: async (id: string, type: "daily" | "monthly" = "daily") => {
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

  coupons: async () => {
    try {
      const res = await apiClient.get("/admin/coupons");
      return { data: res.data.coupons || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },

  getCoupons: async () => {
    try {
      const res = await apiClient.get("/admin/coupons");
      return { data: res.data.coupons || res.data.data || [], error: null };
    } catch (error: any) {
      return fail(error, []);
    }
  },
getNotifications: async () => {
  try {
    const res = await apiClient.get("/admin/notifications");
    return { data: res.data?.data || res.data?.notifications || [], error: null };
  } catch (error: any) {
    return { data: [], error: error.response?.data || error };
  }
},

sendNotification: async (payload: any) => {
  try {
    const res = await apiClient.post("/admin/notifications/send", payload);
    return { data: res.data?.data || res.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.response?.data || error };
  }
},
  createCoupon: async (data: any) => {
    try {
      const res = await apiClient.post("/admin/coupons", data);
      return { data: res.data.coupon || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  updateCoupon: async (id: string, data: any) => {
    try {
      const res = await apiClient.patch(`/admin/coupons/${id}`, data);
      return { data: res.data.coupon || res.data.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },

  deleteCoupon: async (id: string) => {
    try {
      const res = await apiClient.delete(`/admin/coupons/${id}`);
      return { data: res.data.data || res.data, error: null };
    } catch (error: any) {
      return fail(error);
    }
  },
};