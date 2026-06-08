import apiClient from "@/api/apiClient";

export type FavoriteRestaurant = {
  id: string;
  name?: string | null;
  restaurant_name?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  rating?: number | string | null;
  totalReviews?: number | string | null;
  total_reviews?: number | string | null;
  deliveryTime?: string | null;
  delivery_time?: string | null;
  deliveryFee?: number | string | null;
  delivery_fee?: number | string | null;
  minimumOrder?: number | string | null;
  minimum_order?: number | string | null;
  isOpen?: boolean;
  is_open?: boolean;
  address?: string | null;
  cuisine?: string | null;
};

export type FavoriteItem = {
  id: string;
  userId?: string;
  restaurantId?: string;
  restaurant_id?: string;
  restaurant?: FavoriteRestaurant | null;
  createdAt?: string;
  created_at?: string;
};

export type FavoriteMenuItem = {
  id: string;
  userId?: string;
  menuItemId?: string;
  menu_item_id?: string;
  menuItem?: any;
  menu_item?: any;
  restaurant?: FavoriteRestaurant | null;
  createdAt?: string;
  created_at?: string;
};

export type FavoritesResponse = {
  restaurants: FavoriteItem[];
  items: FavoriteMenuItem[];
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return res?.data?.data ?? res?.data ?? null;
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
      "FAVORITE API ERROR:",
      error?.response?.data || error?.message
    );

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

export const favoriteService = {
  /* =========================
     ALL FAVORITES
  ========================= */

  getFavorites: async () => {
    return safe<FavoritesResponse>(() =>
      apiClient.get("/favorite")
    );
  },

  getFavoriteRestaurants: async () => {
    const result = await safe<FavoritesResponse>(() =>
      apiClient.get("/favorite")
    );

    return {
      data: result.data?.restaurants || [],
      error: result.error,
    } as ApiResult<FavoriteItem[]>;
  },

  getFavoriteItems: async () => {
    const result = await safe<FavoritesResponse>(() =>
      apiClient.get("/favorite")
    );

    return {
      data: result.data?.items || [],
      error: result.error,
    } as ApiResult<FavoriteMenuItem[]>;
  },

  /* =========================
     RESTAURANTS
  ========================= */

  toggleRestaurantFavorite: async (
    restaurantId: string
  ) => {
    return safe<any>(() =>
      apiClient.post(
        `/favorite/restaurant/${restaurantId}`
      )
    );
  },

  addFavorite: async (restaurantId: string) => {
    return safe<any>(() =>
      apiClient.post(
        `/favorite/restaurant/${restaurantId}`
      )
    );
  },

  removeFavorite: async (restaurantId: string) => {
    return safe<any>(() =>
      apiClient.post(
        `/favorite/restaurant/${restaurantId}`
      )
    );
  },

  isFavorite: async (restaurantId: string) => {
    return safe<{
      success: boolean;
      isFavorite: boolean;
    }>(() =>
      apiClient.get(
        `/favorite/restaurant/${restaurantId}/status`
      )
    );
  },

  /* =========================
     MENU ITEMS
  ========================= */

  toggleItemFavorite: async (
    menuItemId: string
  ) => {
    return safe<any>(() =>
      apiClient.post(
        `/favorite/item/${menuItemId}`
      )
    );
  },

  removeFavoriteItem: async (
    menuItemId: string
  ) => {
    return safe<any>(() =>
      apiClient.post(
        `/favorite/item/${menuItemId}`
      )
    );
  },

  isItemFavorite: async (
    menuItemId: string
  ) => {
    return safe<{
      success: boolean;
      isFavorite: boolean;
    }>(() =>
      apiClient.get(
        `/favorite/item/${menuItemId}/status`
      )
    );
  },
};

export default favoriteService;