import apiClient from "@/api/apiClient";

/* =====================================================
   TYPES
===================================================== */

export type ApiResult<T> = {
  data: T | null;
  error: any | null;
};

export interface Category {
  id: string;
  category_name: string;
  category_description?: string | null;
  image_url?: string | null;

  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface Restaurant {
  id: string;

  restaurant_name: string;
  name?: string | null;

  address?: string | null;
  phone?: string | null;
  email?: string | null;

  category_id?: string | null;
  categoryId?: string | null;

  image_url?: string | null;
  imageUrl?: string | null;

  rating?: number;
  total_reviews?: number;
  totalReviews?: number;

  delivery_fee?: number;
  deliveryFee?: number;

  minimum_order?: number;
  minimumOrder?: number;

  delivery_time?: string;
  deliveryTime?: string;

  is_open?: boolean;
  isOpen?: boolean;

  is_featured?: boolean;
  isFeatured?: boolean;

  isPureVeg?: boolean;
  is_pure_veg?: boolean;

  category?: Category | null;

  menu_items?: MenuItem[];
  menuItems?: MenuItem[];
}

export interface MenuItemAddon {
  id: string;
  menuItemId?: string | null;
  menu_item_id?: string | null;

  title: string;
  name?: string | null;

  price: number;

  imageUrl?: string | null;
  image_url?: string | null;

  isActive?: boolean;
  is_active?: boolean;
}

export interface MenuItemCustomization {
  id: string;
  menuItemId?: string | null;
  menu_item_id?: string | null;

  title: string;
  name?: string | null;

  price: number;

  isRequired?: boolean;
  is_required?: boolean;

  isActive?: boolean;
  is_active?: boolean;
}

export interface MenuItemReview {
  id: string;
  rating: number;
  review?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  user?: {
    id?: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface MenuItem {
  id: string;

  restaurant_id: string;
  restaurantId?: string | null;

  restaurant?: Restaurant | null;

  name: string;
  description?: string | null;

  price: number;
  discountPrice?: number | null;
  discount_price?: number | null;

  image_url?: string | null;
  imageUrl?: string | null;

  is_vegetarian?: boolean;
  isVegetarian?: boolean;
  isVeg?: boolean;

  is_popular?: boolean;
  isPopular?: boolean;
  isBestSeller?: boolean;
  is_best_seller?: boolean;

  is_available?: boolean;
  isAvailable?: boolean;

  category?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  categoryName?: string | null;
  category_name?: string | null;

  calories?: number | null;
  servingInfo?: string | null;
  serving_info?: string | null;
  prepTimeMin?: number | null;
  prep_time_min?: number | null;
  spiceLevel?: number | null;
  spice_level?: number | null;

  rating?: number;
  totalReviews?: number;
  total_reviews?: number;

  addons?: MenuItemAddon[];
  customizations?: MenuItemCustomization[];
  reviews?: MenuItemReview[];
}

export interface CartItem {
  id: string;

  user_id?: string;
  userId?: string;

  menu_item_id?: string;
  menuItemId?: string;

  restaurant_id?: string;
  restaurantId?: string;

  quantity: number;
  price: number;
  total_price?: number;
  totalPrice?: number;

  note?: string | null;
  customizationJson?: any;
  customization_json?: any;
  addonJson?: any;
  addon_json?: any;

  menu_item?: MenuItem | null;
  menuItem?: MenuItem | null;

  restaurant?: Restaurant | null;
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

/* =====================================================
   HELPERS
===================================================== */

const unwrap = (res: any) => res?.data ?? res;

const getData = (res: any) => {
  const json = unwrap(res);
  return json?.data ?? json?.result ?? json?.payload ?? json;
};

const getList = (res: any) => {
  const json = unwrap(res);

  const possible = [
    json,
    json?.data,
    json?.data?.data,
    json?.result,
    json?.results,
    json?.payload,
    json?.payload?.data,
    json?.items,
    json?.data?.items,
    json?.payload?.items,
    json?.restaurants,
    json?.data?.restaurants,
    json?.payload?.restaurants,
    json?.menuItems,
    json?.data?.menuItems,
    json?.menu_items,
    json?.data?.menu_items,
    json?.categories,
    json?.data?.categories,
    json?.payload?.categories,
  ];

  for (const item of possible) {
    if (Array.isArray(item)) return item;
  }

  return [];
};

const safe = async <T>(fn: () => Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return {
      data: getData(res) as T,
      error: null,
    };
  } catch (error: any) {
    console.log(
      "RESTAURANT SERVICE API ERROR:",
      error?.response?.data || error?.message || error
    );

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

const safeMapped = async <T>(
  fn: () => Promise<any>,
  mapper: (value: any) => T
): Promise<ApiResult<T>> => {
  try {
    const res = await fn();
    return {
      data: mapper(getData(res)),
      error: null,
    };
  } catch (error: any) {
    console.log(
      "RESTAURANT SERVICE API ERROR:",
      error?.response?.data || error?.message || error
    );

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

const safeMappedList = async <T>(
  fn: () => Promise<any>,
  mapper: (value: any) => T
): Promise<ApiResult<T[]>> => {
  try {
    const res = await fn();
    const list = getList(res);

    return {
      data: list.map(mapper),
      error: null,
    };
  } catch (error: any) {
    console.log(
      "RESTAURANT SERVICE API ERROR:",
      error?.response?.data || error?.message || error
    );

    return {
      data: null,
      error: error?.response?.data || error,
    };
  }
};

const n = (value: any, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const b = (value: any, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  return ["true", "1", "yes", "y", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const s = (value: any, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);

/* =====================================================
   MAPPERS
===================================================== */

export const mapCategory = (item: any): Category => ({
  id: s(item?.id),
  category_name: s(item?.category_name ?? item?.name),
  category_description: item?.category_description ?? item?.description ?? null,
  image_url: item?.image_url ?? item?.imageUrl ?? null,

  name: item?.name ?? item?.category_name ?? null,
  description: item?.description ?? item?.category_description ?? null,
  imageUrl: item?.imageUrl ?? item?.image_url ?? null,
});

export const mapAddon = (item: any): MenuItemAddon => ({
  id: s(item?.id),
  menuItemId: item?.menuItemId ?? item?.menu_item_id ?? null,
  menu_item_id: item?.menu_item_id ?? item?.menuItemId ?? null,

  title: s(item?.title ?? item?.name ?? "Add-on"),
  name: item?.name ?? item?.title ?? null,

  price: n(item?.price),

  imageUrl: item?.imageUrl ?? item?.image_url ?? null,
  image_url: item?.image_url ?? item?.imageUrl ?? null,

  isActive: b(item?.isActive ?? item?.is_active, true),
  is_active: b(item?.is_active ?? item?.isActive, true),
});

export const mapCustomization = (item: any): MenuItemCustomization => ({
  id: s(item?.id),
  menuItemId: item?.menuItemId ?? item?.menu_item_id ?? null,
  menu_item_id: item?.menu_item_id ?? item?.menuItemId ?? null,

  title: s(item?.title ?? item?.name ?? "Customization"),
  name: item?.name ?? item?.title ?? null,

  price: n(item?.price),

  isRequired: b(item?.isRequired ?? item?.is_required, false),
  is_required: b(item?.is_required ?? item?.isRequired, false),

  isActive: b(item?.isActive ?? item?.is_active, true),
  is_active: b(item?.is_active ?? item?.isActive, true),
});

export const mapReview = (item: any): MenuItemReview => ({
  id: s(item?.id),
  rating: n(item?.rating),
  review: item?.review ?? null,
  isActive: b(item?.isActive ?? item?.is_active, true),
  is_active: b(item?.is_active ?? item?.isActive, true),
  user: item?.user
    ? {
        id: item.user.id,
        fullName: item.user.fullName ?? item.user.full_name ?? null,
        avatarUrl: item.user.avatarUrl ?? item.user.avatar_url ?? null,
        avatar_url: item.user.avatar_url ?? item.user.avatarUrl ?? null,
      }
    : null,
});

export const mapRestaurant = (item: any): Restaurant => {
  const name = item?.restaurant_name ?? item?.restaurantName ?? item?.name ?? "";

  const restaurant: Restaurant = {
    id: s(item?.id),

    restaurant_name: s(name),
    name: name || null,

    address: item?.address ?? null,
    phone: item?.phone ?? null,
    email: item?.email ?? null,

    category_id: item?.category_id ?? item?.categoryId ?? null,
    categoryId: item?.categoryId ?? item?.category_id ?? null,

    image_url: item?.image_url ?? item?.imageUrl ?? null,
    imageUrl: item?.imageUrl ?? item?.image_url ?? null,

    rating: n(item?.rating),
    total_reviews: n(item?.total_reviews ?? item?.totalReviews),
    totalReviews: n(item?.totalReviews ?? item?.total_reviews),

    delivery_fee: n(item?.delivery_fee ?? item?.deliveryFee),
    deliveryFee: n(item?.deliveryFee ?? item?.delivery_fee),

    minimum_order: n(item?.minimum_order ?? item?.minimumOrder),
    minimumOrder: n(item?.minimumOrder ?? item?.minimum_order),

    delivery_time: s(item?.delivery_time ?? item?.deliveryTime ?? "30-45 mins"),
    deliveryTime: s(item?.deliveryTime ?? item?.delivery_time ?? "30-45 mins"),

    is_open: b(item?.is_open ?? item?.isOpen, true),
    isOpen: b(item?.isOpen ?? item?.is_open, true),

    is_featured: b(item?.is_featured ?? item?.isFeatured, false),
    isFeatured: b(item?.isFeatured ?? item?.is_featured, false),

    isPureVeg: b(item?.isPureVeg ?? item?.is_pure_veg, false),
    is_pure_veg: b(item?.is_pure_veg ?? item?.isPureVeg, false),

    category: item?.category ? mapCategory(item.category) : null,
    menu_items: [],
    menuItems: [],
  };

  const rawMenuItems = Array.isArray(item?.menu_items)
    ? item.menu_items
    : Array.isArray(item?.menuItems)
    ? item.menuItems
    : [];

  restaurant.menu_items = rawMenuItems.map((menuItem: any) =>
    mapMenuItem({
      ...menuItem,
      restaurantId: menuItem?.restaurantId ?? menuItem?.restaurant_id ?? restaurant.id,
      restaurant_id: menuItem?.restaurant_id ?? menuItem?.restaurantId ?? restaurant.id,
      restaurant,
    })
  );

  restaurant.menuItems = restaurant.menu_items;

  return restaurant;
};

export const mapMenuItem = (item: any): MenuItem => {
  const restaurantId =
    item?.restaurant_id ??
    item?.restaurantId ??
    item?.restaurant?.id ??
    item?.vendorId ??
    item?.vendor_id ??
    "";

  const isVegetarian = b(
    item?.is_vegetarian ?? item?.isVegetarian ?? item?.isVeg,
    false
  );

  const isPopular = b(
    item?.is_popular ?? item?.isPopular ?? item?.isBestSeller ?? item?.is_best_seller,
    false
  );

  const isAvailable = b(item?.is_available ?? item?.isAvailable, true);

  const categoryName =
    item?.categoryName ??
    item?.category_name ??
    (typeof item?.category === "string" ? item.category : item?.category?.name) ??
    "";

  return {
    id: s(item?.id),

    restaurant_id: s(restaurantId),
    restaurantId: s(restaurantId),

    restaurant: item?.restaurant ? mapRestaurant(item.restaurant) : null,

    name: s(item?.name ?? item?.menuItem?.name ?? "Menu Item"),
    description: item?.description ?? "",

    price: n(item?.price),
    discountPrice:
      item?.discountPrice !== undefined || item?.discount_price !== undefined
        ? n(item?.discountPrice ?? item?.discount_price)
        : null,
    discount_price:
      item?.discount_price !== undefined || item?.discountPrice !== undefined
        ? n(item?.discount_price ?? item?.discountPrice)
        : null,

    image_url: item?.image_url ?? item?.imageUrl ?? item?.image ?? null,
    imageUrl: item?.imageUrl ?? item?.image_url ?? item?.image ?? null,

    is_vegetarian: isVegetarian,
    isVegetarian,
    isVeg: isVegetarian,

    is_popular: isPopular,
    isPopular,
    isBestSeller: b(item?.isBestSeller ?? item?.is_best_seller ?? isPopular, isPopular),
    is_best_seller: b(item?.is_best_seller ?? item?.isBestSeller ?? isPopular, isPopular),

    is_available: isAvailable,
    isAvailable,

    category: categoryName,
    categoryId: item?.categoryId ?? item?.category_id ?? item?.category?.id ?? null,
    category_id: item?.category_id ?? item?.categoryId ?? item?.category?.id ?? null,
    categoryName: categoryName,
    category_name: categoryName,

    calories: item?.calories ?? null,
    servingInfo: item?.servingInfo ?? item?.serving_info ?? null,
    serving_info: item?.serving_info ?? item?.servingInfo ?? null,
    prepTimeMin: item?.prepTimeMin ?? item?.prep_time_min ?? null,
    prep_time_min: item?.prep_time_min ?? item?.prepTimeMin ?? null,
    spiceLevel: item?.spiceLevel ?? item?.spice_level ?? null,
    spice_level: item?.spice_level ?? item?.spiceLevel ?? null,

    rating: n(item?.rating),
    totalReviews: n(item?.totalReviews ?? item?.total_reviews),
    total_reviews: n(item?.total_reviews ?? item?.totalReviews),

    addons: Array.isArray(item?.addons) ? item.addons.map(mapAddon) : [],
    customizations: Array.isArray(item?.customizations)
      ? item.customizations.map(mapCustomization)
      : [],
    reviews: Array.isArray(item?.reviews) ? item.reviews.map(mapReview) : [],
  };
};

export const mapCartItem = (item: any): CartItem => ({
  id: s(item?.id),

  user_id: item?.user_id ?? item?.userId ?? "",
  userId: item?.userId ?? item?.user_id ?? "",

  menu_item_id: item?.menu_item_id ?? item?.menuItemId ?? "",
  menuItemId: item?.menuItemId ?? item?.menu_item_id ?? "",

  restaurant_id: item?.restaurant_id ?? item?.restaurantId ?? "",
  restaurantId: item?.restaurantId ?? item?.restaurant_id ?? "",

  quantity: n(item?.quantity, 1),
  price: n(item?.price ?? item?.menuItem?.price ?? item?.menu_item?.price),
  total_price: n(item?.total_price ?? item?.totalPrice),
  totalPrice: n(item?.totalPrice ?? item?.total_price),

  note: item?.note ?? null,

  customizationJson: item?.customizationJson ?? item?.customization_json ?? null,
  customization_json: item?.customization_json ?? item?.customizationJson ?? null,

  addonJson: item?.addonJson ?? item?.addon_json ?? null,
  addon_json: item?.addon_json ?? item?.addonJson ?? null,

  menu_item: item?.menu_item
    ? mapMenuItem(item.menu_item)
    : item?.menuItem
    ? mapMenuItem(item.menuItem)
    : null,

  menuItem: item?.menuItem
    ? mapMenuItem(item.menuItem)
    : item?.menu_item
    ? mapMenuItem(item.menu_item)
    : null,

  restaurant: item?.restaurant ? mapRestaurant(item.restaurant) : null,
});

/* =====================================================
   RESTAURANT SERVICE
===================================================== */

class RestaurantService {
  /* ---------- Categories ---------- */

  async getCategories(): Promise<ApiResult<Category[]>> {
    return safeMappedList(
      () => apiClient.get("/vendor/categories/list"),
      mapCategory
    );
  }

  /* ---------- Restaurants ---------- */

  async getFeaturedRestaurants(): Promise<ApiResult<Restaurant[]>> {
    const endpoints = [
      "/restaurants/featured",
      "/restaurants",
      "/restaurant/featured",
      "/restaurant",
      "/vendor/restaurants/public",
    ];

    let fallback: ApiResult<Restaurant[]> | null = null;

    for (const endpoint of endpoints) {
      const result = await safeMappedList(() => apiClient.get(endpoint), mapRestaurant);

      if (!fallback) fallback = result;

      if (!result.error && Array.isArray(result.data) && result.data.length > 0) {
        return result;
      }
    }

    return fallback || { data: [], error: null };
  }

  async getRestaurantsByCategory(categoryId: string): Promise<ApiResult<Restaurant[]>> {
    if (!categoryId) {
      return { data: [], error: null };
    }

    return safeMappedList(
      () => apiClient.get(`/restaurants/category/${categoryId}`),
      mapRestaurant
    );
  }

  async getRestaurantById(id: string): Promise<ApiResult<Restaurant>> {
    if (!id) {
      return {
        data: null,
        error: { message: "Restaurant id is required" },
      };
    }

    return safeMapped(() => apiClient.get(`/restaurants/${id}`), mapRestaurant);
  }

  async getAllRestaurants(): Promise<ApiResult<Restaurant[]>> {
    /*
      NOTE:
      server.js me /restaurants route nahi dikh raha tha.
      Isliye pehle /restaurants try karega.
      Agar backend route missing hai to featured restaurants fallback.
    */
    const result = await safeMappedList(() => apiClient.get("/restaurants"), mapRestaurant);

    if (!result.error) return result;

    return this.getFeaturedRestaurants();
  }

  async searchRestaurants(query: string): Promise<ApiResult<Restaurant[]>> {
    const q = String(query || "").trim();

    if (!q) {
      return this.getAllRestaurants();
    }

    /*
      Backend me /restaurants/search route abhi missing ho sakta hai.
      Pehle API try, fallback me client-side search.
    */
    const apiSearch = await safeMappedList(
      () => apiClient.get(`/restaurants/search?q=${encodeURIComponent(q)}`),
      mapRestaurant
    );

    if (!apiSearch.error) return apiSearch;

    const all = await this.getAllRestaurants();

    if (all.error || !all.data) {
      return { data: [], error: all.error };
    }

    const lower = q.toLowerCase();

    return {
      data: all.data.filter(restaurant => {
        const searchable = [
          restaurant.restaurant_name,
          restaurant.name,
          restaurant.address,
          restaurant.category?.category_name,
          restaurant.category?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(lower);
      }),
      error: null,
    };
  }

  /* ---------- Menu ---------- */

  async getMenuItems(restaurantId: string): Promise<ApiResult<MenuItem[]>> {
    if (!restaurantId) {
      return { data: [], error: null };
    }

    /*
      Backend me /restaurants/:id/menu route ho to use karega.
      Agar missing hai to /restaurants/:id se menuItems fallback.
    */
    const direct = await safeMappedList(
      () => apiClient.get(`/restaurants/${restaurantId}/menu`),
      mapMenuItem
    );

    if (!direct.error && direct.data) {
      return direct;
    }

    const restaurantRes = await this.getRestaurantById(restaurantId);

    return {
      data: restaurantRes.data?.menu_items || restaurantRes.data?.menuItems || [],
      error: restaurantRes.error,
    };
  }

  async getGroupedMenuItems(restaurantId: string): Promise<
    ApiResult<
      {
        title: string;
        categoryId?: string | null;
        items: MenuItem[];
      }[]
    >
  > {
    const result = await this.getMenuItems(restaurantId);

    if (result.error || !result.data) {
      return { data: [], error: result.error };
    }

    const map = new Map<string, { title: string; categoryId?: string | null; items: MenuItem[] }>();

    const recommended = result.data.filter(
      item => item.isPopular || item.is_popular || item.isBestSeller || item.is_best_seller
    );

    if (recommended.length) {
      map.set("Recommended", {
        title: "Recommended",
        categoryId: "recommended",
        items: recommended,
      });
    }

    result.data.forEach(item => {
      const title =
        item.categoryName ||
        item.category_name ||
        item.category ||
        "Menu";

      const key = String(title || "Menu");

      if (!map.has(key)) {
        map.set(key, {
          title: key,
          categoryId: item.categoryId || item.category_id || null,
          items: [],
        });
      }

      map.get(key)?.items.push(item);
    });

    return {
      data: Array.from(map.values()),
      error: null,
    };
  }

  async getMenuItemById(itemId: string): Promise<ApiResult<MenuItem>> {
    if (!itemId) {
      return {
        data: null,
        error: { message: "Menu item id is required" },
      };
    }

    return safeMapped(() => apiClient.get(`/menu-items/${itemId}`), mapMenuItem);
  }

  /* ---------- Favorites - CORRECT BACKEND ROUTE: /favorite ---------- */

  async toggleRestaurantFavorite(restaurantId: string) {
    if (!restaurantId) {
      return { data: null, error: { message: "Restaurant id is required" } };
    }

    return safe<any>(() => apiClient.post(`/favorite/restaurant/${restaurantId}`));
  }

  async addToFavorites(restaurantId: string) {
    return this.toggleRestaurantFavorite(restaurantId);
  }

  async removeFromFavorites(restaurantId: string) {
    /*
      Backend toggle route POST hi use kar raha hai.
      Favorite exists ho to remove, nahi ho to add.
    */
    return this.toggleRestaurantFavorite(restaurantId);
  }

  async isFavorite(restaurantId: string): Promise<ApiResult<boolean>> {
    if (!restaurantId) {
      return { data: false, error: null };
    }

    const result = await safe<any>(() =>
      apiClient.get(`/favorite/restaurant/${restaurantId}/status`)
    );

    return {
      data: Boolean(
        result.data?.isFavorite ??
          result.data?.is_favorite ??
          result.data?.data?.isFavorite ??
          false
      ),
      error: result.error,
    };
  }

  async getUserFavorites(): Promise<ApiResult<Restaurant[]>> {
    const result = await safe<any>(() => apiClient.get("/favorite"));

    if (result.error) return { data: [], error: result.error };

    const restaurants =
      result.data?.restaurants ||
      result.data?.data?.restaurants ||
      [];

    return {
      data: Array.isArray(restaurants)
        ? restaurants.map((fav: any) => mapRestaurant(fav.restaurant || fav))
        : [],
      error: null,
    };
  }

  /* ---------- Menu Item Favorites - CORRECT BACKEND ROUTE: /favorite ---------- */

  async toggleMenuItemFavorite(menuItemId: string) {
    if (!menuItemId) {
      return { data: null, error: { message: "Menu item id is required" } };
    }

    return safe<any>(() => apiClient.post(`/favorite/item/${menuItemId}`));
  }

  async toggleItemFavorite(menuItemId: string) {
    return this.toggleMenuItemFavorite(menuItemId);
  }

  async isMenuItemFavorite(menuItemId: string): Promise<ApiResult<boolean>> {
    if (!menuItemId) {
      return { data: false, error: null };
    }

    const result = await safe<any>(() =>
      apiClient.get(`/favorite/item/${menuItemId}/status`)
    );

    return {
      data: Boolean(
        result.data?.isFavorite ??
          result.data?.is_favorite ??
          result.data?.data?.isFavorite ??
          false
      ),
      error: result.error,
    };
  }

  async isItemFavorite(menuItemId: string) {
    return this.isMenuItemFavorite(menuItemId);
  }

  /* ---------- Recently Viewed ---------- */

  async saveRecentlyViewed(menuItemId: string) {
    if (!menuItemId) {
      return { data: null, error: { message: "Menu item id is required" } };
    }

    return safe<any>(() => apiClient.post(`/recently-viewed/${menuItemId}`));
  }

  async getRecentlyViewed(): Promise<ApiResult<MenuItem[]>> {
    const result = await safe<any>(() => apiClient.get("/recently-viewed"));

    if (result.error) return { data: [], error: result.error };

    const items =
      result.data?.items ||
      result.data?.data?.items ||
      result.data ||
      [];

    return {
      data: Array.isArray(items)
        ? items.map((view: any) => mapMenuItem(view.menuItem || view.menu_item || view))
        : [],
      error: null,
    };
  }

  async removeRecentlyViewed(menuItemId: string) {
    if (!menuItemId) {
      return { data: null, error: { message: "Menu item id is required" } };
    }

    return safe<any>(() => apiClient.delete(`/recently-viewed/${menuItemId}`));
  }

  async clearRecentlyViewed() {
    return safe<any>(() => apiClient.delete("/recently-viewed"));
  }
}

export const restaurantService = new RestaurantService();

/* =====================================================
   COMPAT CART SERVICE
   NOTE:
   Agar tumhare paas separate cartService.ts hai to usi ko primary rakho.
   Ye compatibility ke liye yahan safe version hai.
===================================================== */

class CompatCartService {
  async addToCart(payloadOrMenuItemId: any, restaurantId?: string, quantity = 1, note?: string) {
    const payload =
      typeof payloadOrMenuItemId === "string"
        ? {
            menuItemId: payloadOrMenuItemId,
            restaurantId,
            quantity,
            note: note || null,
            customizationIds: [],
            addonIds: [],
          }
        : {
            menuItemId: payloadOrMenuItemId?.menuItemId,
            restaurantId: payloadOrMenuItemId?.restaurantId,
            quantity: payloadOrMenuItemId?.quantity ?? 1,
            note: payloadOrMenuItemId?.note ?? null,
            customizationIds: payloadOrMenuItemId?.customizationIds ?? [],
            addonIds: payloadOrMenuItemId?.addonIds ?? [],
          };

    const result = await safe<any>(() => apiClient.post("/cart/add", payload));

    if (result.error) return result;

    return {
      data: result.data ? mapCartItem(result.data?.cartItem || result.data) : null,
      error: null,
    };
  }

  async getCartItems(): Promise<ApiResult<CartItem[]>> {
    const result = await safe<any>(() => apiClient.get("/cart"));

    if (result.error) return { data: null, error: result.error };

    const rawItems = Array.isArray(result.data)
      ? result.data
      : result.data?.items || result.data?.cartItems || [];

    return {
      data: Array.isArray(rawItems) ? rawItems.map(mapCartItem) : [],
      error: null,
    };
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    return safe<any>(() =>
      apiClient.patch(`/cart/${cartItemId}`, {
        quantity,
      })
    );
  }

  async removeFromCart(cartItemId: string) {
    return safe<any>(() => apiClient.delete(`/cart/${cartItemId}`));
  }

  async clearCart() {
    return safe<any>(() => apiClient.delete("/cart"));
  }

  async getCartTotal() {
    const result = await safe<any>(() => apiClient.get("/cart/total"));

    if (!result.error) return result;

    const cart = await this.getCartItems();

    if (cart.error) return { data: null, error: cart.error };

    const items = cart.data || [];
    const total = items.reduce(
      (sum, item) => sum + n(item.total_price ?? item.totalPrice),
      0
    );

    const itemCount = items.reduce(
      (sum, item) => sum + n(item.quantity),
      0
    );

    return {
      data: {
        total,
        itemCount,
      },
      error: null,
    };
  }
}

export const cartService = new CompatCartService();

/* =====================================================
   COMPAT ORDER SERVICE
   NOTE:
   Agar separate orderService.ts use kar rahe ho to usko primary rakho.
===================================================== */

class CompatOrderService {
  async createOrder(payload: {
    addressId?: string | null;
    paymentMethod?: "COD" | "ONLINE" | "UPI" | "CARD" | "WALLET";
    customerNote?: string | null;
    couponCode?: string | null;
  }): Promise<ApiResult<Order>> {
    return safe<Order>(() => apiClient.post("/orders", payload));
  }

  async myOrders(): Promise<ApiResult<Order[]>> {
    const result = await safe<any>(() => apiClient.get("/orders/my"));

    if (result.error) return { data: [], error: result.error };

    const orders = Array.isArray(result.data)
      ? result.data
      : result.data?.orders || [];

    return {
      data: orders,
      error: null,
    };
  }

  async getOrderById(orderId: string): Promise<ApiResult<Order>> {
    return safe<Order>(() => apiClient.get(`/orders/${orderId}`));
  }
}

export const orderService = new CompatOrderService();

export default restaurantService;
