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
};

export type FavoriteItem = {
  id: string;
  restaurantId?: string;
  restaurant_id?: string;
  restaurant?: FavoriteRestaurant | null;
  createdAt?: string;
  created_at?: string;
};

type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

const normalizeData = (res: any) => {
  return res?.data?.data ?? res?.data?.favorites ?? res?.data ?? null;
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return { data: normalizeData(res) as T, error: null };
  } catch (error: any) {
    console.log("FAVORITE API ERROR:", error?.response?.data || error?.message);
    return { data: null, error: error?.response?.data || error };
  }
};

export const favoriteService = {
  getFavorites: async () => {
    return safe<FavoriteItem[]>(() => apiClient.get("/favorite"));
  },

  toggleFavorite: async (restaurantId: string) => {
    return safe<any>(() => apiClient.post(`/favorite/${restaurantId}`));
  },

  removeFavorite: async (restaurantId: string) => {
    return safe<any>(() => apiClient.post(`/favorite/${restaurantId}`));
  },
};