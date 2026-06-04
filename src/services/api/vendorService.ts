import apiClient from "@/api/apiClient";

export type VendorOrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "ACCEPTED_BY_VENDOR"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "READY_FOR_PICKUP"
  | "ASSIGNED_TO_RIDER"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type ApiError = {
  success: false;
  message: string;
  raw?: any;
};

export type ApiResult<T> = Promise<{
  data: T;
  error: ApiError | null;
}>;

export type NullableApiResult<T> = Promise<{
  data: T | null;
  error: ApiError | null;
}>;

export type VendorOrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  totalPrice?: number | string;
  total_price?: number | string;
  itemName?: string | null;
  item_name?: string | null;
  menuItem?: {
    id: string;
    name: string;
    price: number | string;
    imageUrl?: string | null;
    image_url?: string | null;
  } | null;
};

export type VendorOrder = {
  id: string;
  orderNumber?: string;
  order_number?: string;
  status: VendorOrderStatus;

  paymentStatus?: string;
  payment_status?: string;
  paymentMethod?: string;
  payment_method?: string;

  totalAmount?: number | string;
  total_amount?: number | string;

  estimatedPreparationMinutes?: number | null;
  estimated_preparation_minutes?: number | null;

  acceptedAt?: string | null;
  accepted_at?: string | null;
  preparingAt?: string | null;
  preparing_at?: string | null;
  readyAt?: string | null;
  ready_at?: string | null;
  pickedAt?: string | null;
  picked_at?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;
  cancelledAt?: string | null;
  cancelled_at?: string | null;

  createdAt?: string;
  created_at?: string;

  customerNote?: string | null;
  customer_note?: string | null;
  cancelReason?: string | null;
  cancel_reason?: string | null;

  user?: {
    id: string;
    fullName?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  address?: any;
  restaurant?: any;
  rider?: any;
  history?: any[];
  items?: VendorOrderItem[];
};

export type VendorRestaurant = {
  id: string;
  name: string;
  restaurant_name?: string;

  address?: string;
  phone?: string;
  email?: string;

  imageUrl?: string | null;
  image_url?: string | null;
  bannerUrl?: string | null;
  banner_url?: string | null;

  isOpen?: boolean;
  is_open?: boolean;
  isAcceptingOrders?: boolean;
  is_accepting_orders?: boolean;

  busyUntil?: string | null;
  busy_until?: string | null;

  deliveryTime?: string;
  delivery_time?: string;

  minimumOrder?: number | string;
  minimum_order?: number | string;

  defaultPrepTime?: number | string;
  default_prep_time?: number | string;

  openingTime?: string;
  opening_time?: string;
  closingTime?: string;
  closing_time?: string;
  weeklyOffDay?: string;
  weekly_off_day?: string;

  rating?: number | string;
  totalReviews?: number;
  total_reviews?: number;

  menuItems?: any[];
  menu_items?: any[];
  orders?: VendorOrder[];
  timings?: any[];
};

export type VendorDashboard = {
  totalRestaurants: number;
  totalOrders: number;
  totalMenuItems: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  lifetimeRevenue: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  restaurants: VendorRestaurant[];
  restaurantIds?: string[];
  recentOrders: VendorOrder[];
};

export type VendorPayments = {
  grossEarnings: number;
  platformFee: number;
  netPayable: number;
  pendingAmount: number;
  paidAmount: number;
  settlements: any[];
};

export type VendorEarningGraphItem = {
  date: string;
  label: string;
  earnings: number;
};

export type VendorCategory = {
  id: string;
  restaurantId?: string;
  restaurant_id?: string;

  name: string;
  description?: string | null;

  imageUrl?: string | null;
  image_url?: string | null;

  isActive?: boolean;
  is_active?: boolean;

  menuItems?: any[];
  menu_items?: any[];
  subCategories?: any[];
  sub_categories?: any[];
};

export type VendorMenuItem = {
  id: string;

  restaurantId?: string;
  restaurant_id?: string;

  name: string;
  description?: string | null;
  price: number | string;

  imageUrl?: string | null;
  image_url?: string | null;

  isVeg?: boolean;
  is_veg?: boolean;
  isVegetarian?: boolean;
  is_vegetarian?: boolean;

  isPopular?: boolean;
  is_popular?: boolean;
  isBestSeller?: boolean;
  is_best_seller?: boolean;
  isAvailable?: boolean;
  is_available?: boolean;

  prepTimeMin?: number | null;
  prep_time_min?: number | null;

  categoryId?: string | null;
  category_id?: string | null;
  subCategoryId?: string | null;
  sub_category_id?: string | null;

  vendorCategoryId?: string | null;
  vendor_category_id?: string | null;
  vendorSubCategoryId?: string | null;
  vendor_sub_category_id?: string | null;

  category?: any;
  subCategory?: any;
  vendorCategory?: VendorCategory | any;
  vendorSubCategory?: any;
};

export type RiderItem = {
  id: string;
  fullName?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  isAvailable?: boolean;
  is_available?: boolean;
  currentStatus?: string;
  current_status?: string;
};

export type VendorSettingsPayload = Partial<{
  name: string;
  phone: string;
  email: string | null;
  address: string;
  deliveryTime: string;
  minimumOrder: number;
  defaultPrepTime: number;
  openingTime: string;
  closingTime: string;
  weeklyOffDay: string;
  isOpen: boolean;
  isAcceptingOrders: boolean;
}>;

const normalizeError = (error: any): ApiError => {
  const data = error?.response?.data;

  return {
    success: false,
    message:
      data?.message ||
      data?.error ||
      error?.message ||
      "Something went wrong. Please try again.",
    raw: data || error,
  };
};

const unwrapData = (res: any) => {
  return (
    res?.data?.data ??
    res?.data?.dashboard ??
    res?.data?.order ??
    res?.data?.orders ??
    res?.data?.restaurant ??
    res?.data?.restaurants ??
    res?.data?.items ??
    res?.data?.menuItems ??
    res?.data?.item ??
    res?.data?.categories ??
    res?.data?.vendorCategories ??
    res?.data?.riders ??
    res?.data
  );
};

const normalizeStatusForBackend = (
  status: VendorOrderStatus
): VendorOrderStatus => {
  const map: Partial<Record<VendorOrderStatus, VendorOrderStatus>> = {
    ACCEPTED: "ACCEPTED_BY_VENDOR",
    READY: "READY_FOR_PICKUP",
    REJECTED: "CANCELLED",
  };

  return map[status] || status;
};

const normalizeMenuPayload = (payload: Partial<VendorMenuItem>) => {
  const isVeg =
    payload.isVeg ??
    payload.is_veg ??
    payload.isVegetarian ??
    payload.is_vegetarian ??
    true;

  return {
    name: payload.name?.trim?.() ?? payload.name,
    description: payload.description || null,
    price: Number(payload.price || 0),
    imageUrl: payload.imageUrl ?? payload.image_url ?? null,

    isVeg: Boolean(isVeg),
    isVegetarian: Boolean(
      payload.isVegetarian ??
        payload.is_vegetarian ??
        payload.isVeg ??
        payload.is_veg ??
        true
    ),

    isPopular: Boolean(payload.isPopular ?? payload.is_popular ?? false),
    isBestSeller: Boolean(
      payload.isBestSeller ?? payload.is_best_seller ?? false
    ),
    isAvailable: Boolean(payload.isAvailable ?? payload.is_available ?? true),

    prepTimeMin: Number(payload.prepTimeMin ?? payload.prep_time_min ?? 20),

    categoryId: payload.categoryId ?? payload.category_id ?? null,
    subCategoryId: payload.subCategoryId ?? payload.sub_category_id ?? null,

    vendorCategoryId:
      payload.vendorCategoryId ?? payload.vendor_category_id ?? null,
    vendorSubCategoryId:
      payload.vendorSubCategoryId ?? payload.vendor_sub_category_id ?? null,
  };
};

const normalizeSettingsPayload = (payload: VendorSettingsPayload) => {
  const body: any = {};

  if (payload.name !== undefined) {
    body.name = payload.name;
  }

  if (payload.phone !== undefined) {
    body.phone = payload.phone;
  }

  if (payload.email !== undefined) {
    body.email = payload.email;
  }

  if (payload.address !== undefined) {
    body.address = payload.address;
  }

  if (payload.deliveryTime !== undefined) {
    body.deliveryTime = payload.deliveryTime;
  }

  if (payload.minimumOrder !== undefined) {
    body.minimumOrder = Number(payload.minimumOrder);
  }

  if (payload.defaultPrepTime !== undefined) {
    body.defaultPrepTime = Number(payload.defaultPrepTime);
  }

  if (payload.openingTime !== undefined) {
    body.openingTime = payload.openingTime;
  }

  if (payload.closingTime !== undefined) {
    body.closingTime = payload.closingTime;
  }

  if (payload.weeklyOffDay !== undefined) {
    body.weeklyOffDay = payload.weeklyOffDay;
  }

  if (payload.isOpen !== undefined) {
    body.isOpen = Boolean(payload.isOpen);
  }

  if (payload.isAcceptingOrders !== undefined) {
    body.isAcceptingOrders = Boolean(payload.isAcceptingOrders);
  }

  return body;
};

export const vendorService = {
  getDashboard: async (): NullableApiResult<VendorDashboard> => {
    try {
      const res = await apiClient.get("/vendors/dashboard/me");

      return {
        data: unwrapData(res) as VendorDashboard,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getOrders: async (
    status?: VendorOrderStatus
  ): ApiResult<VendorOrder[]> => {
    try {
      const res = await apiClient.get("/vendors/orders/me", {
        params: status
          ? {
              status: normalizeStatusForBackend(status),
            }
          : undefined,
      });

      return {
        data: (unwrapData(res) || []) as VendorOrder[],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  updateOrderStatus: async (
    orderId: string,
    status: VendorOrderStatus,
    estimatedPreparationMinutes?: number,
    note?: string
  ): NullableApiResult<VendorOrder> => {
    try {
      const res = await apiClient.patch(`/vendors/orders/${orderId}/status`, {
        status: normalizeStatusForBackend(status),
        estimatedPreparationMinutes,
        note,
      });

      return {
        data: unwrapData(res) as VendorOrder,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  updatePreparationTime: async (
    orderId: string,
    estimatedPreparationMinutes: number
  ): NullableApiResult<VendorOrder> => {
    try {
      const res = await apiClient.patch(
        `/vendors/orders/${orderId}/preparation-time`,
        {
          estimatedPreparationMinutes,
        }
      );

      return {
        data: unwrapData(res) as VendorOrder,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getAvailableRiders: async (): ApiResult<RiderItem[]> => {
    try {
      const res = await apiClient.get("/vendors/riders/available");

      return {
        data: (unwrapData(res) || []) as RiderItem[],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  assignRider: async (
    orderId: string,
    riderId: string
  ): NullableApiResult<VendorOrder> => {
    try {
      const res = await apiClient.patch(
        `/vendors/orders/${orderId}/assign-rider`,
        {
          riderId,
        }
      );

      return {
        data: unwrapData(res) as VendorOrder,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getMenuItems: async (): ApiResult<VendorMenuItem[]> => {
    try {
      const res = await apiClient.get("/vendors/menu");

      return {
        data: (unwrapData(res) || []) as VendorMenuItem[],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  createMenuItem: async (
    payload: Partial<VendorMenuItem>
  ): NullableApiResult<VendorMenuItem> => {
    try {
      const res = await apiClient.post(
        "/vendors/menu",
        normalizeMenuPayload(payload)
      );

      return {
        data: unwrapData(res) as VendorMenuItem,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  updateMenuItem: async (
    itemId: string,
    payload: Partial<VendorMenuItem>
  ): NullableApiResult<VendorMenuItem> => {
    try {
      const res = await apiClient.patch(
        `/vendors/menu/${itemId}`,
        normalizeMenuPayload(payload)
      );

      return {
        data: unwrapData(res) as VendorMenuItem,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  deleteMenuItem: async (itemId: string) => {
    try {
      const res = await apiClient.delete(`/vendors/menu/${itemId}`);

      return {
        data: unwrapData(res) || true,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  toggleMenuItemAvailability: async (
    itemId: string,
    isAvailable: boolean
  ): NullableApiResult<VendorMenuItem> => {
    try {
      const res = await apiClient.patch(`/vendors/menu/${itemId}`, {
        isAvailable,
      });

      return {
        data: unwrapData(res) as VendorMenuItem,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getCategories: async (): ApiResult<VendorCategory[]> => {
    try {
      const res = await apiClient.get("/vendors/categories");

      return {
        data: (unwrapData(res) || []) as VendorCategory[],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  createCategory: async (
    payload: Partial<VendorCategory>
  ): NullableApiResult<VendorCategory> => {
    try {
      const res = await apiClient.post("/vendors/categories", {
        name: payload.name?.trim?.() ?? payload.name,
        description: payload.description || null,
        imageUrl: payload.imageUrl ?? payload.image_url ?? null,
        isActive: payload.isActive ?? payload.is_active ?? true,
      });

      return {
        data: unwrapData(res) as VendorCategory,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  updateCategory: async (
    categoryId: string,
    payload: Partial<VendorCategory>
  ): NullableApiResult<VendorCategory> => {
    try {
      const body: any = {};

      if (payload.name !== undefined) {
        body.name = payload.name?.trim?.() ?? payload.name;
      }

      if (payload.description !== undefined) {
        body.description = payload.description || null;
      }

      if (payload.imageUrl !== undefined || payload.image_url !== undefined) {
        body.imageUrl = payload.imageUrl ?? payload.image_url ?? null;
      }

      if (payload.isActive !== undefined || payload.is_active !== undefined) {
        body.isActive = payload.isActive ?? payload.is_active;
      }

      const res = await apiClient.patch(
        `/vendors/categories/${categoryId}`,
        body
      );

      return {
        data: unwrapData(res) as VendorCategory,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  deleteCategory: async (categoryId: string) => {
    try {
      const res = await apiClient.delete(`/vendors/categories/${categoryId}`);

      return {
        data: unwrapData(res) || true,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  toggleCategoryStatus: async (
    categoryId: string,
    isActive: boolean
  ): NullableApiResult<VendorCategory> => {
    try {
      const res = await apiClient.patch(`/vendors/categories/${categoryId}`, {
        isActive,
      });

      return {
        data: unwrapData(res) as VendorCategory,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getRestaurants: async (): ApiResult<VendorRestaurant[]> => {
    try {
      const dashboard = await vendorService.getDashboard();

      if (dashboard.error || !dashboard.data) {
        return {
          data: [],
          error: dashboard.error,
        };
      }

      return {
        data: dashboard.data.restaurants || [],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  updateSettings: async (
    payload: VendorSettingsPayload,
    restaurantId?: string
  ): NullableApiResult<VendorRestaurant> => {
    try {
      const url = restaurantId
        ? `/vendors/settings/${restaurantId}`
        : "/vendors/settings/me";

      const res = await apiClient.patch(url, normalizeSettingsPayload(payload));

      return {
        data: unwrapData(res) as VendorRestaurant,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  updateRestaurant: async (
    restaurantId: string,
    payload: Partial<VendorRestaurant>
  ): NullableApiResult<VendorRestaurant> => {
    try {
      const res = await apiClient.patch(
        `/vendors/settings/${restaurantId}`,
        normalizeSettingsPayload(payload as VendorSettingsPayload)
      );

      return {
        data: unwrapData(res) as VendorRestaurant,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  updateRestaurantStatus: async (
    restaurantId: string,
    isOpen: boolean
  ): NullableApiResult<VendorRestaurant> => {
    try {
      const res = await apiClient.patch(`/vendors/settings/${restaurantId}`, {
        isOpen,
        isAcceptingOrders: isOpen,
      });

      return {
        data: unwrapData(res) as VendorRestaurant,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  setBusyMode: async (minutes: number) => {
    try {
      const res = await apiClient.patch("/vendors/settings/busy-mode", {
        minutes,
      });

      return {
        data: unwrapData(res),
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getPayments: async (): NullableApiResult<VendorPayments> => {
    try {
      const res = await apiClient.get("/vendors/payments/me");

      return {
        data: unwrapData(res) as VendorPayments,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  getEarningsGraph: async (): ApiResult<VendorEarningGraphItem[]> => {
    try {
      const res = await apiClient.get("/vendors/earnings/graph");

      return {
        data: (unwrapData(res) || []) as VendorEarningGraphItem[],
        error: null,
      };
    } catch (error: any) {
      return {
        data: [],
        error: normalizeError(error),
      };
    }
  },

  uploadMenuItemImage: async (
    itemId: string,
    file: any
  ): NullableApiResult<VendorMenuItem> => {
    try {
      const formData = new FormData();

      formData.append("image", file);

      const res = await apiClient.post(
        `/vendors/menu/${itemId}/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return {
        data: unwrapData(res) as VendorMenuItem,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },

  uploadRestaurantImage: async (
    restaurantId: string,
    file: any,
    type: "logo" | "banner" = "logo"
  ): NullableApiResult<VendorRestaurant> => {
    try {
      const formData = new FormData();

      formData.append("image", file);
      formData.append("type", type);

      const res = await apiClient.post(
        `/vendors/settings/${restaurantId}/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return {
        data: unwrapData(res) as VendorRestaurant,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  },
};

export default vendorService;
