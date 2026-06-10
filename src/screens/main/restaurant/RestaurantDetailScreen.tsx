import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import {
  restaurantService,
  Restaurant,
  MenuItem,
} from "@/services/api/restaurantService";
import {
  cartService,
  isDifferentRestaurantError,
  getCartErrorMessage,
} from "@/services/api/cartService";
import { favoriteService } from "@/services/api/favouriteService";

const THEME = {
  bg: "#F8FAF5",

  card: "#FFFFFF",
  card2: "#F1F5EC",
  surface: "#F7FAF2",

  // Primary Karto Colors
  yellow: "#FACC15",
  yellowSoft: "#FEF9C3",

  green: "#22C55E",
  greenDark: "#15803D",

  black: "#111827",
  blackSoft: "#1F2937",

  text: "#111827",
  muted: "#6B7280",

  border: "#DDE5D7",

  orange: "#FACC15",
  orangeSoft: "#FEF9C3",

  blue: "#111827",

  purple: "#8B5CF6",
  pink: "#EC4899",

  danger: "#EF4444",
  white: "#FFFFFF",
};
type FilterType = "All" | "Recommended" | "Veg" | "Non Veg" | "Best Sellers";

type MenuGroup = {
  title: string;
  categoryId?: string | null;
  items: MenuItem[];
};

type RestaurantCategory = {
  id: string;
  title: string;
  imageUrl?: string | null;
};

const FILTERS: FilterType[] = ["All", "Recommended", "Veg", "Non Veg", "Best Sellers"];

const menuItemImageUri = (item: any) =>
  item?.imageUrl || item?.image_url || item?.photoUrl || item?.photo_url || item?.image || null;

const restaurantLogoUri = (item: any) =>
  item?.imageUrl || item?.image_url || item?.logoUrl || item?.logo_url || item?.image || null;

const restaurantBannerUri = (item: any) =>
  item?.bannerUrl || item?.banner_url || item?.coverUrl || item?.cover_url || restaurantLogoUri(item);

const categoryImageUri = (item: any) => {
  const category =
    item?.vendorCategory ||
    item?.vendor_category ||
    item?.category ||
    item?.menuCategory ||
    item?.menu_category ||
    null;

  return (
    item?.categoryImageUrl ||
    item?.category_image_url ||
    item?.vendorCategoryImageUrl ||
    item?.vendor_category_image_url ||
    category?.imageUrl ||
    category?.image_url ||
    category?.image ||
    null
  );
};

const restaurantName = (restaurant: any) =>
  restaurant?.restaurant_name || restaurant?.restaurantName || restaurant?.name || "Karto Store";

const boolAvailable = (item: any) =>
  item?.is_available !== false && item?.isAvailable !== false;

const boolVeg = (item: any) =>
  item?.is_vegetarian === true ||
  item?.isVegetarian === true ||
  item?.isVeg === true ||
  item?.veg === true;

const isPopular = (item: any) =>
  item?.is_popular === true ||
  item?.isPopular === true ||
  item?.isBestSeller === true ||
  item?.is_best_seller === true;

const price = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const normalizeRestaurantResponse = (value: any) =>
  value?.data?.data?.restaurant ||
  value?.data?.restaurant ||
  value?.data?.data ||
  value?.data ||
  value?.restaurant ||
  value ||
  null;

const normalizeMenuResponse = (value: any, restData?: any) => {
  const list =
    value?.data?.data?.items ||
    value?.data?.data?.menuItems ||
    value?.data?.data?.menu_items ||
    value?.data?.items ||
    value?.data?.menuItems ||
    value?.data?.menu_items ||
    value?.data ||
    value?.items ||
    value?.menuItems ||
    value?.menu_items ||
    restData?.menu_items ||
    restData?.menuItems ||
    [];

  return Array.isArray(list) ? list : [];
};

const normalizeRestaurantCategories = (restData: any): RestaurantCategory[] => {
  const list =
    restData?.vendorCategories ||
    restData?.vendor_categories ||
    restData?.categories ||
    restData?.menuCategories ||
    restData?.menu_categories ||
    [];

  if (!Array.isArray(list)) return [];

  return list
    .map((cat: any) => {
      const title = cleanCategoryTitle(
        cat?.name ||
          cat?.category_name ||
          cat?.title ||
          cat?.vendorCategoryName ||
          "Menu"
      );

      return {
        id: categoryKey(cat?.id || title),
        title,
        imageUrl:
          cat?.imageUrl ||
          cat?.image_url ||
          cat?.categoryImageUrl ||
          cat?.category_image_url ||
          cat?.photoUrl ||
          cat?.photo_url ||
          null,
      };
    })
    .filter((cat: RestaurantCategory) => cat.title && cat.title !== "Menu");
};

const normalizeFavoriteValue = (value: any) =>
  Boolean(
    value?.isFavorite ??
      value?.is_favorite ??
      value?.favorite ??
      value?.data?.isFavorite ??
      value?.data?.is_favorite ??
      false
  );

const getMenuCategoryTitle = (item: any) => {
  const category =
    item?.vendorCategory ||
    item?.vendor_category ||
    item?.category ||
    item?.menuCategory ||
    item?.menu_category ||
    null;

  return (
    item?.categoryName ||
    item?.category_name ||
    item?.vendorCategoryName ||
    item?.vendor_category_name ||
    category?.name ||
    category?.category_name ||
    category?.title ||
    (typeof category === "string" ? category : "") ||
    "Menu"
  );
};

const getMenuCategoryId = (item: any) => {
  const category =
    item?.vendorCategory ||
    item?.vendor_category ||
    item?.category ||
    item?.menuCategory ||
    item?.menu_category ||
    null;

  return (
    item?.vendorCategoryId ||
    item?.vendor_category_id ||
    item?.categoryId ||
    item?.category_id ||
    item?.menuCategoryId ||
    item?.menu_category_id ||
    category?.id ||
    getMenuCategoryTitle(item)
  );
};

const cleanCategoryTitle = (value: any) => {
  const title = String(value || "Menu")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  if (!title) return "Menu";

  return title
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const categoryKey = (value: any) =>
  cleanCategoryTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");


const showToast = (
  type: "success" | "error" | "info",
  text1: string,
  text2?: string
) => {
  Toast.show({
    type,
    text1,
    text2,
    position: "bottom",
    visibilityTime: 1900,
  });
};

export default function RestaurantDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const initialRestaurant = route.params?.restaurant || null;
  const restaurantId = route.params?.restaurantId || route.params?.id || initialRestaurant?.id;

  const scrollRef = useRef<ScrollView | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const [restaurant, setRestaurant] = useState<Restaurant | any>(initialRestaurant);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantCategories, setRestaurantCategories] = useState<RestaurantCategory[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [activeCategory, setActiveCategory] = useState("All");

  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });
  const [addingId, setAddingId] = useState<string | null>(null);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const requireAuth = (message = "Please sign in to continue.") => {
    if (user?.id) return true;

    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  const startIntro = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(16);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadCartSummary = async () => {
    if (!user?.id) {
      setCartSummary({ itemCount: 0, total: 0 });
      return;
    }

    try {
      const { data } = await cartService.getCartTotal();

      const summary: any = data?.data || data || {};
      setCartSummary({
        itemCount: Number(summary?.itemCount || summary?.item_count || summary?.count || 0),
        total: Number(
          summary?.total ||
            summary?.totalAmount ||
            summary?.total_amount ||
            summary?.grandTotal ||
            0
        ),
      });
    } catch {
      setCartSummary({ itemCount: 0, total: 0 });
    }
  };

  const loadFavoriteStatus = async () => {
    if (!user?.id || !restaurantId) return;

    try {
      const result =
        typeof favoriteService.isFavorite === "function"
          ? await favoriteService.isFavorite(restaurantId)
          : await restaurantService.isFavorite(restaurantId);

      setIsFav(normalizeFavoriteValue(result?.data));
    } catch {
      setIsFav(false);
    }
  };

  const loadRestaurant = async (isRefresh = false) => {
    if (!restaurantId) {
      setLoading(false);
      setRefreshing(false);
      showToast("error", "Store unavailable", "Restaurant details are missing.");
      return;
    }

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const [restaurantRes, menuRes] = await Promise.allSettled([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenuItems(restaurantId),
      ]);

      if (restaurantRes.status === "rejected" || restaurantRes.value?.error) {
        showToast("error", "Store load failed", "Please try again.");
        return;
      }

      const restData: any = normalizeRestaurantResponse(restaurantRes.value);
      const menuData: any[] =
        menuRes.status === "fulfilled"
          ? normalizeMenuResponse(menuRes.value, restData)
          : normalizeMenuResponse(null, restData);

      if (!restData?.id) {
        setRestaurant(null);
        setMenuItems([]);
        setRestaurantCategories([]);
        showToast("error", "Store unavailable", "Restaurant details are missing.");
        return;
      }

      setRestaurant(restData);
      setMenuItems(menuData);
      setRestaurantCategories(normalizeRestaurantCategories(restData));

      const previewReviews =
        restData?.ratings ||
        restData?.reviews ||
        restData?.restaurantReviews ||
        restData?.restaurant_reviews ||
        [];

      setReviews(Array.isArray(previewReviews) ? previewReviews.slice(0, 4) : []);

      await Promise.all([loadCartSummary(), loadFavoriteStatus()]);

      if (isRefresh) {
        showToast("success", "Store refreshed", "Latest menu loaded.");
      }

      startIntro();
    } catch {
      showToast("error", "Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRestaurant(false);
  }, [restaurantId]);

  useEffect(() => {
    if (user?.id && restaurantId) {
      loadFavoriteStatus();
    } else {
      setIsFav(false);
    }
  }, [user?.id, restaurantId]);

  useFocusEffect(
    useCallback(() => {
      loadCartSummary();
    }, [user?.id])
  );

  const restAny: any = restaurant || {};

  const isOpen = restAny.isOpen !== false && restAny.is_open !== false;
  const deliveryFee = Number(restAny.delivery_fee ?? restAny.deliveryFee ?? 0);
  const minOrder = Number(restAny.minimum_order ?? restAny.minimumOrder ?? 0);
  const deliveryTime = restAny.delivery_time || restAny.deliveryTime || "25-35 min";
  const rating = Number(restAny.rating || 4.5);
  const totalReviews = Number(restAny.total_reviews ?? restAny.totalReviews ?? 0);
  const closingTime = restAny.closingTime || restAny.closing_time || "";
  const address = restAny.address || "Nearby Karto partner store";
  const pureVeg = Boolean(restAny.isPureVeg || restAny.is_pure_veg);

  const filteredItems = useMemo(() => {
    let list = [...menuItems];

    if (activeFilter === "Veg") {
      list = list.filter((item: any) => boolVeg(item));
    }

    if (activeFilter === "Non Veg") {
      list = list.filter((item: any) => !boolVeg(item));
    }

    if (activeFilter === "Best Sellers") {
      list = list.filter((item: any) => isPopular(item));
    }

    if (activeFilter === "Recommended") {
      list = list.filter((item: any) => boolAvailable(item) && isPopular(item));
      if (list.length === 0) list = menuItems.filter((item: any) => boolAvailable(item));
    }

    if (activeCategory !== "All") {
      list = list.filter(
        (item: any) =>
          categoryKey(getMenuCategoryId(item) || getMenuCategoryTitle(item)) === String(activeCategory) ||
          categoryKey(getMenuCategoryTitle(item)) === String(activeCategory)
      );
    }

    const q = search.trim().toLowerCase();

    if (!q) return list;

    return list.filter((item: any) => {
      const searchable = [
        item.name,
        item.description,
        getMenuCategoryTitle(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [menuItems, search, activeFilter, activeCategory]);

  const menuGroups: MenuGroup[] = useMemo(() => {
    const groups = new Map<string, MenuGroup>();

    filteredItems.forEach((item: any) => {
      const title = cleanCategoryTitle(getMenuCategoryTitle(item));
      const key = categoryKey(title);

      if (!groups.has(key)) {
        groups.set(key, {
          title,
          categoryId: key,
          items: [],
        });
      }

      const existingItems = groups.get(key)?.items || [];
      const alreadyAdded = existingItems.some((x: any) => x.id === item.id);

      if (!alreadyAdded) {
        groups.get(key)?.items.push(item);
      }
    });

    return Array.from(groups.values()).filter(group => group.items.length > 0);
  }, [filteredItems]);

  const categoryTabs = useMemo(() => {
    const categories = new Map<string, { id: string; title: string; imageUrl?: string | null }>();

    // First add categories directly returned with restaurant.
    // This keeps restaurant category image separate from menu item image.
    restaurantCategories.forEach((cat) => {
      const title = cleanCategoryTitle(cat.title);
      const key = categoryKey(cat.id || title);

      if (!title || ["recommended", "all"].includes(title.toLowerCase())) {
        return;
      }

      categories.set(key, {
        id: key,
        title,
        imageUrl: cat.imageUrl || null,
      });
    });

    // Then merge categories found inside menu items.
    // This keeps existing behavior and fills missing counts/tabs.
    menuItems.forEach((menuItem: any) => {
      const rawId = getMenuCategoryId(menuItem);
      const title = cleanCategoryTitle(getMenuCategoryTitle(menuItem));
      const key = categoryKey(rawId || title);

      if (!title || ["recommended", "all"].includes(title.toLowerCase())) {
        return;
      }

      const current = categories.get(key);
      categories.set(key, {
        id: key,
        title: current?.title || title,
        imageUrl:
          current?.imageUrl ||
          categoryImageUri(menuItem) ||
          null,
      });
    });

    return [
      { id: "All", title: "All", imageUrl: null },
      ...Array.from(categories.values()),
    ];
  }, [menuItems, restaurantCategories]);

  const bestSellers = useMemo(() => {
    return menuItems.filter((item: any) => isPopular(item)).slice(0, 8);
  }, [menuItems]);

  const offers = useMemo(
    () => [
      {
        id: "free-delivery",
        icon: "bicycle-outline",
        title: deliveryFee === 0 ? "Free Delivery" : `${price(deliveryFee)} delivery`,
        sub: "Fast rider pickup from this store",
        color: THEME.green,
      },
      {
        id: "smart-deal",
        icon: "pricetag-outline",
        title: "Smart Deal",
        sub: "Fresh packing and quick support",
        color: THEME.orange,
      },
      {
        id: "karto-care",
        icon: "shield-checkmark-outline",
        title: "Karto Care",
        sub: "Quality checked partner store",
        color: THEME.blue,
      },
    ],
    [deliveryFee]
  );

const toggleFavorite = async () => {
  if (!requireAuth("Please sign in to save favorite stores.")) return;
  if (!restaurant?.id || favLoading) return;

  try {
    setFavLoading(true);

    const { data, error } = await favoriteService.toggleRestaurantFavorite(
      restaurant.id
    );

    if (error) {
      showToast(
        "error",
        "Favorite update failed",
        error?.message || "Please try again."
      );
      return;
    }

    const next =
      data?.isFavorite ??
      data?.is_favorite ??
      data?.data?.isFavorite ??
      !isFav;

    setIsFav(Boolean(next));

    showToast(
      "success",
      Boolean(next) ? "Added to favorites" : "Removed from favorites",
      restaurantName(restaurant)
    );
  } catch {
    showToast("error", "Favorite update failed", "Please try again.");
  } finally {
    setFavLoading(false);
  }
};

  const quickAdd = async (item: MenuItem) => {
    if (!requireAuth("Please sign in to add items to cart.")) return;

    if (!item?.id || !restaurantId) {
      showToast("error", "Invalid item", "This item cannot be added.");
      return;
    }

    if (!boolAvailable(item)) {
      showToast("info", "Item unavailable", "This item is not available right now.");
      return;
    }

    setAddingId(item.id);

    try {
      const res = await cartService.addToCart({
        menuItemId: item.id,
        restaurantId,
        quantity: 1,
        note: null,
        customizationIds: [],
        addonIds: [],
      });

      if (res.error) {
        const message = getCartErrorMessage(res.error);

        showToast(
          isDifferentRestaurantError(res.error) ? "info" : "error",
          message.title,
          message.message
        );
        return;
      }

      showToast("success", "Added to cart", `${item.name} has been added.`);
      await loadCartSummary();
    } catch {
      showToast("error", "Unable to add item", "Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const openCart = () => {
    if (!requireAuth("Please sign in to view your cart.")) return;
    navigation.navigate("Cart", { userId: user?.id });
  };

  const openMenuItem = (item: any) => {
    const itemId = item?.id;

    if (!itemId) {
      showToast("error", "Item unavailable", "This item cannot be opened.");
      return;
    }

    navigation.navigate("MenuItemDetail", {
      itemId,
      restaurantId,
      item,
      restaurant,
    });
  };

  const renderImage = (sourceItem: any, style: any, fallbackIcon = "fast-food-outline") => {
    const uri = menuItemImageUri(sourceItem);

    if (uri) {
      return <Image source={{ uri }} style={style} />;
    }

    return (
      <View style={[style, styles.imageFallback]}>
        <Icon name={fallbackIcon as any} size={34} color={THEME.orange} />
      </View>
    );
  };

  const scrollToMenu = () => {
    scrollRef.current?.scrollTo({
      y: 650,
      animated: true,
    });
  };

  const renderBestSeller = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bestSellerCard}
      activeOpacity={0.9}
      onPress={() => openMenuItem(item)}
    >
      <View style={styles.bestSellerImageWrap}>
        {renderImage(item, styles.bestSellerImg)}

        <View style={styles.bestHeart}>
          <Icon name="flame" size={14} color={THEME.white} />
        </View>
      </View>

      <View style={styles.bestSellerInfo}>
        <Text style={styles.bestSellerName} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.bestSellerDesc} numberOfLines={1}>
          {item.description || "Freshly prepared"}
        </Text>

        <View style={styles.bestSellerFooter}>
          <Text style={styles.bestSellerPrice}>{price(item.price)}</Text>
          <TouchableOpacity
            style={styles.bestAddBtn}
            disabled={addingId === item.id || !boolAvailable(item)}
            onPress={() => quickAdd(item)}
          >
            {addingId === item.id ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Icon name="add" size={17} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMenuItem = (item: any, index: number) => {
    const unavailable = !boolAvailable(item);
    const itemBestSeller = isPopular(item);
    const itemRating = Number(item.rating || 0);
    const hasCustomization =
      (Array.isArray(item.addons) && item.addons.length > 0) ||
      (Array.isArray(item.customizations) && item.customizations.length > 0);

    return (
      <TouchableOpacity
        key={item?.id || String(index)}
        style={[styles.itemCard, unavailable && styles.disabledCard]}
        activeOpacity={0.92}
        onPress={() => openMenuItem(item)}
      >
        <View style={styles.itemInfo}>
          <View style={styles.itemTopRow}>
            <View
              style={[
                styles.vegDotBox,
                !boolVeg(item) && { borderColor: THEME.danger },
              ]}
            >
              <View
                style={[
                  styles.vegDot,
                  !boolVeg(item) && { backgroundColor: THEME.danger },
                ]}
              />
            </View>

            {itemBestSeller && (
              <View style={styles.popularPill}>
                <Icon name="flame" size={12} color={THEME.white} />
                <Text style={styles.popularText}>Best Seller</Text>
              </View>
            )}

            {hasCustomization && (
              <View style={styles.customPill}>
                <Text style={styles.customText}>Customisable</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.itemRatingRow}>
            {itemRating > 0 && (
              <View style={styles.itemRatingPill}>
                <Icon name="star" size={11} color={THEME.yellow} />
                <Text style={styles.itemRatingText}>{itemRating.toFixed(1)}</Text>
              </View>
            )}

            {!!item.calories && (
              <View style={styles.caloriePill}>
                <Icon name="flame-outline" size={11} color={THEME.green} />
                <Text style={styles.calorieText}>{item.calories} kcal</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description || "Fresh, tasty and carefully packed."}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>{price(item.price)}</Text>
            {unavailable && <Text style={styles.unavailableText}>Unavailable</Text>}
          </View>
        </View>

        <View style={styles.itemImageBox}>
          {renderImage(item, styles.itemImage)}

          <TouchableOpacity
            style={[styles.addBtn, unavailable && styles.addBtnDisabled]}
            activeOpacity={0.9}
            disabled={addingId === item.id || unavailable}
            onPress={() => quickAdd(item)}
          >
            {addingId === item.id ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Text style={styles.addBtnText}>ADD</Text>
            )}
          </TouchableOpacity>

          {hasCustomization && <Text style={styles.customisableHint}>customisable</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Preparing your menu...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.emptyIcon}>
          <Icon name="storefront-outline" size={52} color={THEME.orange} />
        </View>
        <Text style={styles.emptyTitle}>Store not found</Text>
        <Text style={styles.emptyText}>This store is unavailable right now.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRestaurant(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
        contentContainerStyle={{
          paddingBottom: cartSummary.itemCount > 0 ? 130 : 42,
        }}
      >
        <View style={styles.hero}>
          {restaurantBannerUri(restaurant) ? (
            <Image source={{ uri: restaurantBannerUri(restaurant) }} style={styles.heroImage} />
          ) : restaurantLogoUri(restaurant) ? (
            <Image source={{ uri: restaurantLogoUri(restaurant) }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.imageFallback]}>
              <Icon name="storefront-outline" size={42} color={THEME.orange} />
            </View>
          )}
          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={25} color={THEME.white} />
          </TouchableOpacity>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.actionCircle}
              onPress={() =>
                showToast("info", "Sharing coming soon", "Store sharing will be available soon.")
              }
            >
              <Icon name="share-social-outline" size={22} color={THEME.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCircle} onPress={toggleFavorite} disabled={favLoading}>
              {favLoading ? (
                <ActivityIndicator size="small" color={THEME.white} />
              ) : (
                <Icon
                  name={isFav ? "heart" : "heart-outline"}
                  size={25}
                  color={isFav ? THEME.danger : THEME.white}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroTextBox}>
            <Text style={styles.heroTag}>PREMIUM PICKS NEAR YOU</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {restaurantName(restaurant)}
            </Text>

            <View style={styles.heroChips}>
              {pureVeg && (
                <View style={styles.heroChipGreen}>
                  <Text style={styles.heroChipGreenText}>Pure Veg</Text>
                </View>
              )}

              {rating >= 4.4 && (
                <View style={styles.heroChipOrange}>
                  <Text style={styles.heroChipOrangeText}>Top Rated</Text>
                </View>
              )}

              <View style={styles.heroChipWhite}>
                <Text style={styles.heroChipWhiteText}>{menuItems.length} items</Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.infoCard}>
            <View style={styles.statusRow}>
              <View style={[styles.openBadge, !isOpen && styles.closedBadge]}>
                <View style={[styles.liveDot, !isOpen && { backgroundColor: THEME.danger }]} />
                <Text style={[styles.openBadgeText, !isOpen && { color: THEME.danger }]}>
                  {isOpen ? "OPEN NOW" : "CLOSED"}
                </Text>
              </View>

              <View style={styles.ratingPill}>
                <Icon name="star" size={14} color={THEME.white} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({totalReviews})</Text>
              </View>
            </View>

            {!!closingTime && (
              <Text style={styles.closingText}>
                {isOpen ? `Closes at ${closingTime}` : "Opens again soon"}
              </Text>
            )}

            <View style={styles.metaGrid}>
              <View style={styles.metaBox}>
                <Icon name="time-outline" size={19} color={THEME.orange} />
                <Text style={styles.metaTitle}>{deliveryTime}</Text>
                <Text style={styles.metaSub}>Delivery ETA</Text>
              </View>

              <View style={styles.metaBox}>
                <Icon name="bicycle-outline" size={19} color={THEME.green} />
                <Text style={styles.metaTitle}>
                  {deliveryFee === 0 ? "Free" : price(deliveryFee)}
                </Text>
                <Text style={styles.metaSub}>Delivery fee</Text>
              </View>

              <View style={styles.metaBox}>
                <Icon name="bag-check-outline" size={19} color={THEME.yellow} />
                <Text style={styles.metaTitle}>{price(minOrder)}</Text>
                <Text style={styles.metaSub}>Min order</Text>
              </View>
            </View>

            <View style={styles.addressRow}>
              <Icon name="location-outline" size={18} color={THEME.orange} />
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            </View>

            <View style={styles.featureRow}>
              <FeatureChip icon="shield-checkmark-outline" text="Hygienic" color={THEME.green} />
              <FeatureChip icon="flash-outline" text="Fast Delivery" color={THEME.orange} />
              <FeatureChip icon="cube-outline" text="Safe Packing" color={THEME.blue} />
            </View>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={offers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.offerList}
            renderItem={({ item }) => (
              <View style={styles.offerCard}>
                <View style={[styles.offerIcon, { backgroundColor: `${item.color}16` }]}>
                  <Icon name={item.icon as any} size={21} color={item.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.offerTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.offerSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </View>
              </View>
            )}
          />

          <View style={styles.searchBox}>
            <Icon name="search-outline" size={20} color={THEME.orange} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search biryani, pizza, burger..."
              placeholderTextColor={THEME.muted}
              style={styles.searchInput}
            />
            {!!search.trim() && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Icon name="close-circle" size={20} color={THEME.muted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={item => item}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const active = activeFilter === item;

              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(item)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categoryTabs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => {
              const active = activeCategory === item.id;

              return (
                <TouchableOpacity
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => {
                    setActiveCategory(item.id);
                    scrollToMenu();
                  }}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {categoryTabs.length > 1 && (
            <View style={styles.menuCategoryOverview}>
              <View style={styles.menuHeader}>
                <View>
                  <Text style={styles.menuSmall}>EXPLORE MENU</Text>
                  <Text style={styles.menuTitle}>Menu sections</Text>
                </View>
                <Text style={styles.menuCount}>{categoryTabs.length - 1} sections</Text>
              </View>

              <View style={styles.categoryGrid}>
                {categoryTabs
                  .filter(item => item.id !== "All")
                  .map(item => {
                    const count = menuItems.filter(
                      (menuItem: any) =>
                        categoryKey(getMenuCategoryId(menuItem) || getMenuCategoryTitle(menuItem)) === String(item.id) ||
                        categoryKey(getMenuCategoryTitle(menuItem)) === String(item.id)
                    ).length;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.categoryTile,
                          activeCategory === item.id && styles.categoryTileActive,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => {
                          setActiveCategory(item.id);
                          setActiveFilter("All");
                          setSearch("");
                          scrollToMenu();
                        }}
                      >
                        <View
                          style={[
                            styles.categoryTileIcon,
                            activeCategory === item.id && styles.categoryTileIconActive,
                          ]}
                        >
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.categoryTileImage} />
                          ) : (
                            <Icon
                              name="restaurant-outline"
                              size={20}
                              color={activeCategory === item.id ? THEME.white : THEME.orange}
                            />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.categoryTileTitle,
                              activeCategory === item.id && styles.categoryTileTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.categoryTileCount,
                              activeCategory === item.id && styles.categoryTileCountActive,
                            ]}
                          >
                            {count} item{count > 1 ? "s" : ""}
                          </Text>
                        </View>

                        <Icon
                          name="chevron-forward"
                          size={17}
                          color={activeCategory === item.id ? THEME.white : THEME.muted}
                        />
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}

          {bestSellers.length > 0 && activeFilter === "All" && activeCategory === "All" && !search.trim() && (
            <View style={styles.bestSection}>
              <View style={styles.menuHeader}>
                <View>
                  <Text style={styles.menuSmall}>MOST LOVED</Text>
                  <Text style={styles.menuTitle}>Best sellers</Text>
                </View>
                <Text style={styles.menuCount}>{bestSellers.length} items</Text>
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={bestSellers}
                keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
                renderItem={renderBestSeller}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </View>
          )}

          {reviews.length > 0 && (
            <View style={styles.reviewSection}>
              <View style={styles.menuHeader}>
                <View>
                  <Text style={styles.menuSmall}>CUSTOMER LOVE</Text>
                  <Text style={styles.menuTitle}>Top reviews</Text>
                </View>
                <Text style={styles.menuCount}>⭐ {rating.toFixed(1)}</Text>
              </View>

              {reviews.map((review: any, index: number) => (
                <View key={review.id || index} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewName}>
                      {review.user?.fullName || review.name || "Karto User"}
                    </Text>
                    <Text style={styles.reviewRating}>⭐ {review.rating || 5}</Text>
                  </View>
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {review.review || review.text || "Good food and fast delivery."}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.menuHeader}>
            <View>
              <Text style={styles.menuSmall}>CURATED MENU</Text>
              <Text style={styles.menuTitle}>
                {activeCategory === "All"
                  ? "Full menu"
                  : categoryTabs.find(x => x.id === activeCategory)?.title || "Menu"}
              </Text>
            </View>
            <Text style={styles.menuCount}>{filteredItems.length} items</Text>
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyMenu}>
              <Icon name="fast-food-outline" size={48} color={THEME.orange} />
              <Text style={styles.emptyTitle}>No matching item</Text>
              <Text style={styles.emptyText}>Try a different search or filter.</Text>

              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSearch("");
                  setActiveFilter("All");
                  setActiveCategory("All");
                }}
              >
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupWrap}>
              {menuGroups.map((group, groupIndex) => (
                <View key={`${group.title}-${groupIndex}`} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupCount}>
                      {group.items.length} item{group.items.length > 1 ? "s" : ""}
                    </Text>
                  </View>

                  {group.items.map((item, index) => (
                    <View key={item?.id || `${group.title}-${index}`}>
                      {renderMenuItem(item, index)}
                      {index !== group.items.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={styles.footerNote}>
            <MaterialCommunityIcons
              name="food-fork-drink"
              size={22}
              color={THEME.orange}
            />
            <Text style={styles.footerNoteText}>
              Menu availability, prices and prep time may change based on store status.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {cartSummary.itemCount > 0 && (
        <TouchableOpacity style={styles.cartBanner} activeOpacity={0.94} onPress={openCart}>
          <View style={styles.cartLeft}>
            <View style={styles.cartIconBox}>
              <Icon name="bag-handle" size={20} color={THEME.white} />
            </View>

            <View>
              <Text style={styles.cartBannerTitle}>
                {cartSummary.itemCount} item{cartSummary.itemCount > 1 ? "s" : ""} selected
              </Text>
              <Text style={styles.cartBannerSub}>
                Total ₹{cartSummary.total.toFixed(0)} • ETA {deliveryTime}
              </Text>
            </View>
          </View>

          <View style={styles.cartRight}>
            <Text style={styles.cartBannerBtn}>View Cart</Text>
            <Icon name="arrow-forward" size={18} color={THEME.white} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FeatureChip = ({ icon, text, color }: any) => (
  <View style={styles.featureChip}>
    <Icon name={icon} size={15} color={color} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  animatedContent: {
    backgroundColor: THEME.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
    paddingHorizontal: 24,
  },
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
    textAlign: "center",
  },
  imageFallback: {
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 34,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  backHomeBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    ...shadow,
  },
  backHomeText: {
    color: THEME.white,
    fontWeight: "900",
  },
  hero: { height: 336, position: "relative", backgroundColor: THEME.card2 },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.card2,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 38,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroActions: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 38,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBox: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 52,
  },
  heroTag: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: THEME.white,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 13,
    gap: 8,
  },
  heroChipGreen: {
    backgroundColor: "rgba(34,197,94,0.95)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  heroChipGreenText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: "900",
  },
  heroChipOrange: {
    backgroundColor: THEME.orange,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  heroChipOrangeText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: "900",
  },
  heroChipWhite: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  heroChipWhiteText: {
    color: THEME.blue,
    fontSize: 11,
    fontWeight: "900",
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: -42,
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 16,
    ...shadow,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAFBF1",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  closedBadge: {
    backgroundColor: "#FFF1F1",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  openBadgeText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.green,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ratingText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 5,
  },
  ratingCount: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
  closingText: {
    color: THEME.muted,
    marginTop: 9,
    fontWeight: "700",
    fontSize: 12,
  },
  metaGrid: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  metaBox: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  metaTitle: {
    color: THEME.blue,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 7,
  },
  metaSub: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 15,
  },
  addressText: {
    color: THEME.muted,
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 8,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 99,
  },
  featureText: {
    marginLeft: 5,
    color: THEME.blue,
    fontSize: 11,
    fontWeight: "800",
  },
  offerList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 10,
  },
  offerCard: {
    width: 260,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    ...shadow,
  },
  offerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  offerTitle: {
    color: THEME.blue,
    fontWeight: "900",
  },
  offerSub: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "700",
    fontSize: 12,
  },
  searchBox: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: THEME.card,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 54,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    color: THEME.blue,
    paddingVertical: 14,
    marginLeft: 9,
    fontWeight: "800",
  },
  filterList: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: THEME.card,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 9,
    ...shadow,
  },
  filterChipActive: {
    backgroundColor: THEME.orange,
  },
  filterText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: THEME.white,
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  categoryChip: {
    backgroundColor: THEME.card,
    borderRadius: 99,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 9,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  categoryChipActive: {
    backgroundColor: THEME.blue,
    borderColor: THEME.blue,
  },
  categoryText: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  categoryTextActive: {
    color: THEME.white,
  },
  menuCategoryOverview: {
    marginBottom: 18,
  },
  categoryGrid: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryTile: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    ...shadow,
  },
  categoryTileActive: {
    backgroundColor: THEME.orange,
    borderColor: THEME.orange,
  },
  categoryTileIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  categoryTileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  categoryTileIconActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  categoryTileTitle: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
  },
  categoryTileTitleActive: {
    color: THEME.white,
  },
  categoryTileCount: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 3,
  },
  categoryTileCountActive: {
    color: "rgba(255,255,255,0.86)",
  },
  bestSection: {
    marginBottom: 18,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 14,
  },
  menuSmall: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  menuTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 3,
  },
  menuCount: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  bestSellerCard: {
    width: 164,
    backgroundColor: THEME.card,
    borderRadius: 22,
    overflow: "hidden",
    marginRight: 12,
    ...shadow,
  },
  bestSellerImageWrap: {
    position: "relative",
  },
  bestSellerImg: {
    width: "100%",
    height: 105,
    backgroundColor: THEME.card2,
  },
  bestHeart: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  bestSellerInfo: {
    padding: 11,
  },
  bestSellerName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 14,
  },
  bestSellerDesc: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
    marginTop: 4,
  },
  bestSellerFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bestSellerPrice: {
    color: THEME.orange,
    fontWeight: "900",
  },
  bestAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSection: {
    marginBottom: 16,
  },
  reviewCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    ...shadow,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewName: {
    color: THEME.blue,
    fontWeight: "900",
  },
  reviewRating: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  reviewText: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 7,
    lineHeight: 18,
  },
  groupWrap: {
    paddingHorizontal: 20,
  },
  groupCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    ...shadow,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  groupTitle: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 18,
  },
  groupCount: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 20,
    paddingVertical: 13,
  },
  disabledCard: { opacity: 0.58 },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    flexWrap: "wrap",
  },
  vegDotBox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.green,
  },
  popularPill: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.orange,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  popularText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  customPill: {
    marginLeft: 8,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  customText: {
    color: THEME.orange,
    fontSize: 10,
    fontWeight: "900",
  },
  itemName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 21,
  },
  itemRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 7,
  },
  itemRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 4,
  },
  itemRatingText: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 11,
  },
  caloriePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAFBF1",
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  calorieText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  itemDesc: {
    color: THEME.muted,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 18,
    fontWeight: "700",
  },
  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 17,
  },
  unavailableText: {
    color: THEME.danger,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 9,
  },
  itemImageBox: {
    width: 118,
    alignItems: "center",
  },
  itemImage: {
    width: 112,
    height: 108,
    borderRadius: 20,
    backgroundColor: THEME.card2,
  },
  addBtn: {
    marginTop: -18,
    backgroundColor: THEME.white,
    minWidth: 82,
    minHeight: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: THEME.orange,
    ...shadow,
  },
  addBtnDisabled: {
    backgroundColor: THEME.card2,
    borderColor: THEME.muted,
  },
  addBtnText: {
    color: THEME.orange,
    fontSize: 13,
    fontWeight: "900",
  },
  customisableHint: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },
  separator: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  emptyMenu: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 52,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: THEME.blue,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },
  clearFilterBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  clearFilterText: {
    color: THEME.white,
    fontWeight: "900",
  },
  footerNote: {
    marginHorizontal: 20,
    marginTop: 2,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  footerNoteText: {
    flex: 1,
    color: THEME.orange,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  cartBanner: {
    position: "absolute",
    bottom: 15,
    left: 16,
    right: 16,
    backgroundColor: THEME.orange,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cartIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cartBannerTitle: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 15,
  },
  cartBannerSub: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "800",
    marginTop: 2,
    fontSize: 12,
  },
  cartRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  cartBannerBtn: {
    color: THEME.white,
    fontWeight: "900",
    marginRight: 6,
    fontSize: 14,
  },
});
