import apiClient from "@/api/apiClient";

export type CartMenuItem = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  imageUrl?: string | null;
};

export type CartRestaurant = {
  id: string;
  restaurant_name?: string | null;
  name?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
};

export type CartItem = {
  id: string;
  quantity: number;
  price: number | string;
  total_price?: number | string;
  totalPrice?: number | string;
  note?: string | null;
  menu_item?: CartMenuItem | null;
  menuItem?: CartMenuItem | null;
  restaurant?: CartRestaurant | null;
   itemName?: string | null;
};
type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return {
      data: res.data?.data ?? res.data ?? null,
      error: null,
    };
  } catch (error: any) {
    console.log("Cart API Error:", error?.response?.data || error?.message);
    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const cartService = {
  getCartItems: async () => {
    return safe<CartItem[]>(() => apiClient.get("/cart"));
  },

  addToCart: async (payload: {
    menuItemId: string;
    restaurantId?: string;
    quantity?: number;
    note?: string;
  }) => {
    return safe<CartItem>(() =>
      apiClient.post("/cart/add", {
        menuItemId: payload.menuItemId,
        restaurantId: payload.restaurantId,
        quantity: payload.quantity ?? 1,
        note: payload.note ?? "",
      })
    );
  },

  updateCartItem: async (cartItemId: string, quantity: number) => {
    return safe<CartItem>(() =>
      apiClient.patch(`/cart/${cartItemId}`, {
        quantity,
      })
    );
  },

  removeFromCart: async (cartItemId: string) => {
    return safe<{ success: boolean }>(() =>
      apiClient.delete(`/cart/${cartItemId}`)
    );
  },

  clearCart: async () => {
    return safe<{ success: boolean }>(() => apiClient.delete("/cart"));
  },
};