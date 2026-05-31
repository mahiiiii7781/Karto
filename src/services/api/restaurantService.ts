import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";

export interface Category {
  id: string;
  category_name: string;
  category_description: string;
  image_url?: string;
}

export interface Restaurant {
  id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  email: string;
  category_id: string;
  image_url?: string;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  minimum_order: number;
  delivery_time: string;
  is_open: boolean;
  is_featured: boolean;
  isPureVeg?: boolean;
  category?: Category;
  menu_items?: MenuItem[];
}

export interface MenuItemAddon {
  id: string;
  menuItemId?: string;
  title: string;
  price: number;
  imageUrl?: string | null;
  image_url?: string | null;
  isActive?: boolean;
}

export interface MenuItemCustomization {
  id: string;
  menuItemId?: string;
  title: string;
  price: number;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface MenuItemReview {
  id: string;
  rating: number;
  review?: string | null;
  isActive?: boolean;
  user?: {
    id?: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  restaurantId?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  imageUrl?: string;

  is_vegetarian: boolean;
  isVegetarian?: boolean;
  isVeg?: boolean;
  is_popular: boolean;
  isPopular?: boolean;
  isBestSeller?: boolean;
  is_available: boolean;
  isAvailable?: boolean;

  category?: string;
  calories?: number | null;
  servingInfo?: string | null;
  prepTimeMin?: number | null;
  spiceLevel?: number | null;
  rating?: number;
  totalReviews?: number;

  addons?: MenuItemAddon[];
  customizations?: MenuItemCustomization[];
  reviews?: MenuItemReview[];
}

export interface CartItem {
  id: string;
  user_id: string;
  menu_item_id: string;
  restaurant_id: string;
  quantity: number;
  price: number;
  total_price: number;
  note?: string;
  customizationJson?: any;
  addonJson?: any;
  menu_item?: MenuItem;
  restaurant?: Restaurant;
}

export interface Order {
  id: string;
  orderNumber?: string;
  order_number?: string;
  status: string;
  totalAmount?: number;
  total_amount?: number;
  createdAt?: string;
  created_at?: string;
}

type ApiResult<T> = Promise<{ data: T | null; error: any }>;

const getToken = async () => {
  return (
    (await AsyncStorage.getItem("accessToken")) ||
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("authToken"))
  );
};

const apiRequest = async (path: string, options: RequestInit = {}) => {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "API request failed");
  }

  return json;
};

const mapCategory = (item: any): Category => ({
  id: item?.id ?? "",
  category_name: item?.category_name ?? item?.name ?? "",
  category_description: item?.category_description ?? item?.description ?? "",
  image_url: item?.image_url ?? item?.imageUrl ?? "",
});

const mapAddon = (item: any): MenuItemAddon => ({
  id: item?.id ?? "",
  menuItemId: item?.menuItemId ?? item?.menu_item_id ?? "",
  title: item?.title ?? "",
  price: Number(item?.price ?? 0),
  imageUrl: item?.imageUrl ?? item?.image_url ?? null,
  image_url: item?.image_url ?? item?.imageUrl ?? null,
  isActive: item?.isActive ?? item?.is_active ?? true,
});

const mapCustomization = (item: any): MenuItemCustomization => ({
  id: item?.id ?? "",
  menuItemId: item?.menuItemId ?? item?.menu_item_id ?? "",
  title: item?.title ?? "",
  price: Number(item?.price ?? 0),
  isRequired: item?.isRequired ?? item?.is_required ?? false,
  isActive: item?.isActive ?? item?.is_active ?? true,
});

const mapReview = (item: any): MenuItemReview => ({
  id: item?.id ?? "",
  rating: Number(item?.rating ?? 0),
  review: item?.review ?? null,
  isActive: item?.isActive ?? item?.is_active ?? true,
  user: item?.user,
});

const mapMenuItem = (item: any): MenuItem => ({
  id: item?.id ?? "",
  restaurant_id: item?.restaurant_id ?? item?.restaurantId ?? "",
  restaurantId: item?.restaurantId ?? item?.restaurant_id ?? "",

  name: item?.name ?? item?.menuItem?.name ?? "",
  description: item?.description ?? "",
  price: Number(item?.price ?? 0),

  image_url: item?.image_url ?? item?.imageUrl ?? "",
  imageUrl: item?.imageUrl ?? item?.image_url ?? "",

  is_vegetarian:
    item?.is_vegetarian ?? item?.isVegetarian ?? item?.isVeg ?? false,
  isVegetarian:
    item?.isVegetarian ?? item?.is_vegetarian ?? item?.isVeg ?? false,
  isVeg: item?.isVeg ?? item?.is_vegetarian ?? item?.isVegetarian ?? false,

  is_popular:
    item?.is_popular ?? item?.isPopular ?? item?.isBestSeller ?? false,
  isPopular: item?.isPopular ?? item?.is_popular ?? false,
  isBestSeller: item?.isBestSeller ?? false,

  is_available: item?.is_available ?? item?.isAvailable ?? true,
  isAvailable: item?.isAvailable ?? item?.is_available ?? true,

  category: item?.category ?? "",

  calories: item?.calories ?? null,
  servingInfo: item?.servingInfo ?? item?.serving_info ?? null,
  prepTimeMin: item?.prepTimeMin ?? item?.prep_time_min ?? null,
  spiceLevel: item?.spiceLevel ?? item?.spice_level ?? null,

  rating: Number(item?.rating ?? 0),
  totalReviews: Number(item?.totalReviews ?? item?.total_reviews ?? 0),

  addons: Array.isArray(item?.addons) ? item.addons.map(mapAddon) : [],
  customizations: Array.isArray(item?.customizations)
    ? item.customizations.map(mapCustomization)
    : [],
  reviews: Array.isArray(item?.reviews) ? item.reviews.map(mapReview) : [],
});

const mapRestaurant = (item: any): Restaurant => ({
  id: item?.id ?? "",
  restaurant_name: item?.restaurant_name ?? item?.name ?? "",
  address: item?.address ?? "",
  phone: item?.phone ?? "",
  email: item?.email ?? "",
  category_id: item?.category_id ?? item?.categoryId ?? "",
  image_url: item?.image_url ?? item?.imageUrl ?? "",
  rating: Number(item?.rating ?? 0),
  total_reviews: Number(item?.total_reviews ?? item?.totalReviews ?? 0),
  delivery_fee: Number(item?.delivery_fee ?? item?.deliveryFee ?? 0),
  minimum_order: Number(item?.minimum_order ?? item?.minimumOrder ?? 0),
  delivery_time: item?.delivery_time ?? item?.deliveryTime ?? "30-45 mins",
  is_open: item?.is_open ?? item?.isOpen ?? true,
  is_featured: item?.is_featured ?? item?.isFeatured ?? false,
  isPureVeg: item?.isPureVeg ?? item?.is_pure_veg ?? false,
  category: item?.category ? mapCategory(item.category) : undefined,
  menu_items: Array.isArray(item?.menu_items)
    ? item.menu_items.map(mapMenuItem)
    : Array.isArray(item?.menuItems)
    ? item.menuItems.map(mapMenuItem)
    : [],
});

const mapCartItem = (item: any): CartItem => ({
  id: item?.id ?? "",
  user_id: item?.user_id ?? item?.userId ?? "",
  menu_item_id: item?.menu_item_id ?? item?.menuItemId ?? "",
  restaurant_id: item?.restaurant_id ?? item?.restaurantId ?? "",
  quantity: Number(item?.quantity ?? 1),
  price: Number(item?.price ?? item?.menuItem?.price ?? 0),
  total_price: Number(item?.total_price ?? item?.totalPrice ?? 0),
  note: item?.note ?? "",
  customizationJson: item?.customizationJson ?? item?.customization_json ?? null,
  addonJson: item?.addonJson ?? item?.addon_json ?? null,
  menu_item: item?.menu_item
    ? mapMenuItem(item.menu_item)
    : item?.menuItem
    ? mapMenuItem(item.menuItem)
    : undefined,
  restaurant: item?.restaurant ? mapRestaurant(item.restaurant) : undefined,
});

class RestaurantService {
  async getCategories(): ApiResult<Category[]> {
    try {
      const json = await apiRequest("/categories");
      return { data: (json.data || []).map(mapCategory), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getFeaturedRestaurants(): ApiResult<Restaurant[]> {
    try {
      const json = await apiRequest("/restaurants/featured");
      return { data: (json.data || []).map(mapRestaurant), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getRestaurantsByCategory(categoryId: string): ApiResult<Restaurant[]> {
    try {
      const json = await apiRequest(`/restaurants/category/${categoryId}`);
      return { data: (json.data || []).map(mapRestaurant), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async searchRestaurants(query: string): ApiResult<Restaurant[]> {
    try {
      const json = await apiRequest(
        `/restaurants/search?q=${encodeURIComponent(query)}`
      );
      return { data: (json.data || []).map(mapRestaurant), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getRestaurantById(id: string): ApiResult<Restaurant> {
    try {
      const json = await apiRequest(`/restaurants/${id}`);
      return { data: mapRestaurant(json.data), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getMenuItems(restaurantId: string): ApiResult<MenuItem[]> {
    try {
      const json = await apiRequest(`/restaurants/${restaurantId}/menu`);
      return { data: (json.data || []).map(mapMenuItem), error: null };
    } catch (error) {
      try {
        const restaurantRes = await this.getRestaurantById(restaurantId);
        return { data: restaurantRes.data?.menu_items || [], error: null };
      } catch (fallbackError) {
        return { data: null, error: fallbackError };
      }
    }
  }

  async getMenuItemById(itemId: string): ApiResult<MenuItem> {
    try {
      const json = await apiRequest(`/menu-items/${itemId}`);
      return { data: mapMenuItem(json.data), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getAllRestaurants(): ApiResult<Restaurant[]> {
    try {
      const json = await apiRequest("/restaurants");
      return { data: (json.data || []).map(mapRestaurant), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async addToFavorites(restaurantId: string) {
    try {
      const json = await apiRequest(`/favorites/restaurant/${restaurantId}`, {
        method: "POST",
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async removeFromFavorites(restaurantId: string) {
    try {
      const json = await apiRequest(`/favorites/restaurant/${restaurantId}`, {
        method: "DELETE",
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async isFavorite(restaurantId: string) {
    try {
      const json = await apiRequest(`/favorites/restaurant/${restaurantId}/status`);
      return { data: !!json.isFavorite, error: null };
    } catch {
      return { data: false, error: null };
    }
  }

  async getUserFavorites(): ApiResult<Restaurant[]> {
    try {
      const json = await apiRequest("/favorites");
      const restaurants = json.data?.restaurants || json.restaurants || json.data || [];
      return { data: restaurants.map(mapRestaurant), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async toggleMenuItemFavorite(menuItemId: string) {
    try {
      const json = await apiRequest(`/favorites/item/${menuItemId}`, {
        method: "POST",
      });
      return { data: json, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async isMenuItemFavorite(menuItemId: string) {
    try {
      const json = await apiRequest(`/favorites/item/${menuItemId}/status`);
      return { data: !!json.isFavorite, error: null };
    } catch {
      return { data: false, error: null };
    }
  }

  async saveRecentlyViewed(menuItemId: string) {
    try {
      const json = await apiRequest(`/recently-viewed/${menuItemId}`, {
        method: "POST",
      });
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const restaurantService = new RestaurantService();

class CartService {
  async addToCart(
    menuItemId: string,
    restaurantId: string,
    quantity: number = 1,
    note?: string,
    customizationIds: string[] = [],
    addonIds: string[] = []
  ) {
    try {
      const json = await apiRequest("/cart/add", {
        method: "POST",
        body: JSON.stringify({
          menuItemId,
          restaurantId,
          quantity,
          note,
          customizationIds,
          addonIds,
        }),
      });

      return { data: json.data ? mapCartItem(json.data) : null, error: null };
    } catch (error: any) {
      if (
        error.message?.toLowerCase()?.includes("different") ||
        error.message?.toLowerCase()?.includes("one restaurant") ||
        error.message?.toLowerCase()?.includes("one store")
      ) {
        return { data: null, error: "DIFFERENT_RESTAURANT" };
      }
      return { data: null, error };
    }
  }

  async getCartItems(): ApiResult<CartItem[]> {
    try {
      const json = await apiRequest("/cart");
      const rawItems = Array.isArray(json.data)
        ? json.data
        : json.data?.items || [];
      return { data: rawItems.map(mapCartItem), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    try {
      const json = await apiRequest(`/cart/${cartItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      return { data: json.data ? mapCartItem(json.data) : null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async removeFromCart(cartItemId: string) {
    try {
      const json = await apiRequest(`/cart/${cartItemId}`, { method: "DELETE" });
      return { data: json.data || true, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async clearCart() {
    try {
      const json = await apiRequest("/cart", { method: "DELETE" });
      return { data: json.data || true, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getCartTotal() {
    try {
      const cart = await this.getCartItems();
      if (cart.error) return { data: null, error: cart.error };

      const items = cart.data || [];
      const total = items.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0
      );
      const itemCount = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );

      return { data: { total, itemCount }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const cartService = new CartService();

class OrderService {
  async createOrder(payload: {
    addressId?: string | null;
    paymentMethod?: "COD" | "ONLINE" | "UPI" | "CARD" | "WALLET";
    customerNote?: string;
    couponCode?: string;
  }): ApiResult<Order> {
    try {
      const json = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async myOrders(): ApiResult<Order[]> {
    try {
      const json = await apiRequest("/orders/my");
      return { data: json.data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getOrderById(orderId: string): ApiResult<Order> {
    try {
      const json = await apiRequest(`/orders/${orderId}`);
      return { data: json.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const orderService = new OrderService();