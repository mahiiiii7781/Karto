import apiClient from "@/api/apiClient";

export const adminService = {
  users: () => apiClient.get("/admin/users"),
  createRoleUser: (data: any) => apiClient.post("/admin/users/create-role-user", data),
  updateUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${id}/status`, { isActive }),

  vendors: () => apiClient.get("/admin/vendors"),
  createRestaurant: (vendorId: string, data: any) =>
    apiClient.post(`/admin/vendors/${vendorId}/restaurants`, data),
  toggleRestaurant: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/restaurants/${id}/status`, { isActive }),

  categories: () => apiClient.get("/admin/categories"),
  createCategory: (name: string) => apiClient.post("/admin/categories", { name }),
  updateCategory: (id: string, name: string) =>
    apiClient.patch(`/admin/categories/${id}`, { name }),
  deleteCategory: (id: string) => apiClient.delete(`/admin/categories/${id}`),

  createMenuItem: (data: any) => apiClient.post("/admin/menu-items", data),
  updateMenuItem: (id: string, data: any) => apiClient.patch(`/admin/menu-items/${id}`, data),
  deleteMenuItem: (id: string) => apiClient.delete(`/admin/menu-items/${id}`),

  riders: () => apiClient.get("/admin/riders"),
  riderBilling: (id: string, type: "daily" | "monthly") =>
    apiClient.get(`/admin/riders/${id}/billing?type=${type}`),
  monthlyBilling: () => apiClient.get("/admin/billing/monthly"),
};

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

export const adminService = {
  getDashboard: async () => {
    try {
      const res = await apiClient.get("/admin/dashboard");
      return { data: res.data.data as AdminDashboardData, error: null };
    } catch (error: any) {
      return { data: null, error: error.response?.data || error };
    }
  },
};