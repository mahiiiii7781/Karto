import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Geolocation from "react-native-geolocation-service";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  restaurantService,
  Category,
  Restaurant,
} from "@/services/api/restaurantService";
import { cartService } from "@/services/api/cartService";
import { orderService, Order } from "@/services/api/orderService";
import {
  connectSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderUpdated,
} from "@/api/socketClient";
import { discountService, Discount } from "@/services/api/discountService";
import { favoriteService } from "@/services/api/favouriteService";
import AuthRequiredModal from "@/components/AuthRequiredModal";

const { width } = Dimensions.get("window");

const THEME = {
  bg: "#F8FAF5",

  surface: "#F7FAF2",
  card: "#FFFFFF",
  card2: "#F1F5EC",

  // Karto premium brand palette
  orange: "#FACC15",
  orangeSoft: "#FEF9C3",

  blue: "#111827",

  green: "#22C55E",
  greenDark: "#15803D",

  yellow: "#FACC15",
  yellowSoft: "#FEF9C3",

  text: "#111827",
  muted: "#6B7280",
  border: "#DDE5D7",

  black: "#111827",
  blackSoft: "#1F2937",

  white: "#FFFFFF",
  danger: "#EF4444",
};

const getImage = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || item?.logoUrl || null;

const getName = (item: any) =>
  item?.restaurant_name ||
  item?.restaurantName ||
  item?.name ||
  item?.title ||
  "Karto Store";

const money = (value: any) => `₹${Number(value || 0).toFixed(0)}`;

const getDeliveryOtp = (order: any) =>
  String(
    order?.deliveryOtp ||
      order?.delivery_otp ||
      order?.otp ||
      order?.deliveryCode ||
      order?.delivery_code ||
      ""
  ).trim();

const shortText = (value?: string | null) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const formatSavedAddress = (addr: any) => {
  if (!addr) return "";

  const address = shortText(addr.address);
  const landmark = shortText(addr.landmark);
  const city = shortText(addr.city);
  const state = shortText(addr.state);
  const pincode = shortText(addr.pincode);

  const firstLine = [address, landmark].filter(Boolean).join(", ");
  const secondLine = [city, state].filter(Boolean).join(", ");

  if (firstLine && secondLine && pincode) return `${firstLine}, ${secondLine} - ${pincode}`;
  if (firstLine && secondLine) return `${firstLine}, ${secondLine}`;
  if (firstLine && pincode) return `${firstLine} - ${pincode}`;
  if (firstLine) return firstLine;

  return "Tap to select address";
};


const ACTIVE_ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_RIDER",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
];

const STEPS_INDEX: Record<string, number> = {
  PLACED: 1,
  ACCEPTED_BY_VENDOR: 2,
  PREPARING: 3,
  READY_FOR_PICKUP: 4,
  ASSIGNED_TO_RIDER: 5,
  PICKED_UP: 6,
  OUT_FOR_DELIVERY: 7,
};

const STATUS_ALIASES: Record<string, string> = {
  ACCEPTED: "ACCEPTED_BY_VENDOR",
  VENDOR_ACCEPTED: "ACCEPTED_BY_VENDOR",
  READY: "READY_FOR_PICKUP",
  READY_FOR_DELIVERY: "READY_FOR_PICKUP",
  RIDER_ASSIGNED: "ASSIGNED_TO_RIDER",
  ASSIGNED: "ASSIGNED_TO_RIDER",
  PICKED: "PICKED_UP",
  PICKUP_DONE: "PICKED_UP",
  ON_THE_WAY: "OUT_FOR_DELIVERY",
  COMPLETED: "DELIVERED",
};

const normalizeOrderStatus = (value: any) => {
  const raw = String(value || "PLACED").toUpperCase();
  return STATUS_ALIASES[raw] || raw;
};

const getOrderIdFromSocketPayload = (payload: any) =>
  payload?.orderId ||
  payload?.id ||
  payload?.order?.id ||
  payload?.data?.orderId ||
  payload?.data?.order?.id;

const getStatusFromSocketPayload = (payload: any) =>
  payload?.status ||
  payload?.order?.status ||
  payload?.data?.status ||
  payload?.data?.order?.status;

const getActiveOrderEta = (order: any) => {
  const status = normalizeOrderStatus(order?.status);

  if (status === "DELIVERED" || status === "CANCELLED") return 0;

  const base =
    Number(order?.estimatedPreparationMinutes || order?.estimated_preparation_minutes || 30) +
    15;

  const createdAt = order?.createdAt || order?.created_at;

  if (!createdAt) return base;

  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);

  return Math.max(base - elapsed, 5);
};

const getActiveOrderMeta = (statusValue: any) => {
  const status = normalizeOrderStatus(statusValue);

  switch (status) {
    case "PLACED":
      return {
        title: "Order placed",
        subtitle: "Waiting for store confirmation",
        icon: "receipt-outline",
        color: THEME.yellow,
      };
    case "ACCEPTED_BY_VENDOR":
      return {
        title: "Order accepted",
        subtitle: "Store is getting ready",
        icon: "checkmark-done-outline",
        color: THEME.green,
      };
    case "PREPARING":
      return {
        title: "Preparing your order",
        subtitle: "Fresh food is being prepared",
        icon: "restaurant-outline",
        color: THEME.yellow,
      };
    case "READY_FOR_PICKUP":
      return {
        title: "Ready for pickup",
        subtitle: "Waiting for rider pickup",
        icon: "bag-check-outline",
        color: THEME.green,
      };
    case "ASSIGNED_TO_RIDER":
      return {
        title: "Rider assigned",
        subtitle: "Rider is heading to the store",
        icon: "person-add-outline",
        color: THEME.green,
      };
    case "PICKED_UP":
      return {
        title: "Order picked up",
        subtitle: "Your order is with the rider",
        icon: "cube-outline",
        color: THEME.green,
      };
    case "OUT_FOR_DELIVERY":
      return {
        title: "Out for delivery",
        subtitle: "Your order is arriving soon",
        icon: "bicycle-outline",
        color: THEME.green,
      };
    default:
      return {
        title: "Order in progress",
        subtitle: "Track latest order status",
        icon: "time-outline",
        color: THEME.yellow,
      };
  }
};

const getOrderFromSocketPayload = (payload: any) =>
  payload?.order || payload?.data?.order || payload?.data || payload;

const formatReverseAddress = (data: any) => {
  const a = data?.address || {};

  const house =
    a.house_number ||
    a.building ||
    a.residential ||
    a.neighbourhood ||
    "";

  const road =
    a.road ||
    a.suburb ||
    a.quarter ||
    a.hamlet ||
    a.village ||
    "";

  const area =
    a.sector ||
    a.neighbourhood ||
    a.suburb ||
    a.locality ||
    "";

  const city =
    a.city ||
    a.town ||
    a.village ||
    a.county ||
    "";

  const state = a.state || "";
  const pincode = a.postcode || "";

  const main = [house, road || area].filter(Boolean).join(" ");
  const location = [city, state].filter(Boolean).join(", ");

  if (main && location && pincode) return `${main}, ${location} - ${pincode}`;
  if (road && location && pincode) return `${road}, ${location} - ${pincode}`;
  if (location && pincode) return `${location} - ${pincode}`;
  if (data?.display_name) {
    return String(data.display_name).split(",").slice(0, 4).join(",").trim();
  }

  return "Tap to select address";
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<any[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [locationSubText, setLocationSubText] = useState("Delivering to");
  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });
  const [activeOrder, setActiveOrder] = useState<Order | any>(null);
  const [activeOrderLoading, setActiveOrderLoading] = useState(false);

  const [authModal, setAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState("Login to continue.");
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const isLoggedIn = Boolean(user?.id);

  const topRated = useMemo(() => {
    return [...featuredRestaurants]
      .filter((item: any) => Number(item.rating || 0) >= 4)
      .slice(0, 5);
  }, [featuredRestaurants]);

  const popularRestaurants = useMemo(() => {
    if (!topRated.length) return featuredRestaurants;
    const topIds = new Set(topRated.map((item: any) => item.id));
    const remaining = featuredRestaurants.filter((item: any) => !topIds.has(item.id));
    return remaining.length ? remaining : featuredRestaurants;
  }, [featuredRestaurants, topRated]);

  const activeOrderMeta = useMemo(
    () => getActiveOrderMeta(activeOrder?.status),
    [activeOrder?.status]
  );

  const activeOrderEta = useMemo(
    () => getActiveOrderEta(activeOrder),
    [activeOrder?.id, activeOrder?.status, activeOrder?.createdAt, activeOrder?.created_at]
  );

  const activeOrderNumber =
    activeOrder?.orderNumber ||
    activeOrder?.order_number ||
    activeOrder?.id?.slice?.(0, 8) ||
    "ORDER";

  const activeOrderRestaurant =
    activeOrder?.restaurant?.restaurant_name ||
    activeOrder?.restaurant?.restaurantName ||
    activeOrder?.restaurant?.name ||
    activeOrder?.vendor?.fullName ||
    activeOrder?.vendor?.name ||
    "Karto Store";

  const activeOrderOtp = getDeliveryOtp(activeOrder);

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

  const requireAuth = (message: string) => {
    if (isLoggedIn) return true;
    setAuthMessage(message);
    setAuthModal(true);
    return false;
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "KartoApp/1.0",
          Accept: "application/json",
        },
      });

      const json = await res.json();
      const formatted = formatReverseAddress(json);

      setLocationSubText("Current location");
      setLocationText(formatted || "Tap to select address");
    } catch {
      setLocationSubText("Current location");
      setLocationText("Tap to select address");
    }
  };

  const fetchCurrentAddress = async () => {
    try {
      setLocationText("Fetching location...");

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationSubText("Location permission needed");
          setLocationText("Tap to select address");
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          reverseGeocode(latitude, longitude);
        },
        () => {
          setLocationSubText("Location unavailable");
          setLocationText("Tap to select address");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch {
      setLocationSubText("Location unavailable");
      setLocationText("Tap to select address");
    }
  };

  const loadDefaultAddress = async () => {
    if (!isLoggedIn) {
      await fetchCurrentAddress();
      return;
    }

    try {
      const res = await apiClient.get("/address/default");
      const addr = res.data?.address || res.data?.data;

      if (addr?.id) {
        setLocationSubText(addr.label || "Selected address");
        setLocationText(formatSavedAddress(addr));
      } else {
        await fetchCurrentAddress();
      }
    } catch {
      await fetchCurrentAddress();
    }
  };

  const openAddress = () => {
    if (!requireAuth("Login to select or save delivery address.")) return;
    setAddressModalVisible(true);
  };

  const changeAddress = () => {
    setAddressModalVisible(false);

    /*
      Modal close ke turant baad navigate karne par kuch devices/navigation stacks me
      action ignore ho jata hai. Isliye small delay rakha hai.
      Route name "Address" existing app flow ke hisaab se same rakha hai.
    */
    setTimeout(() => {
      navigation.navigate("Address", {
        fromHome: true,
        returnTo: "Home",
      });
    }, 120);
  };

  const useCurrentLocationFromPopup = async () => {
    setAddressModalVisible(false);
    await fetchCurrentAddress();
    showToast("success", "Current location refreshed", "We updated your delivery location.");
  };

  const loadCartSummary = async () => {
    if (!isLoggedIn) {
      setCartSummary({ itemCount: 0, total: 0 });
      return;
    }

    try {
      const cartRes = await cartService.getCartTotal();

      if (!cartRes.error && cartRes.data) {
        setCartSummary({
          itemCount: Number(cartRes.data.itemCount || cartRes.data.count || 0),
          total: Number(cartRes.data.total || cartRes.data.totalAmount || 0),
        });
      } else {
        setCartSummary({ itemCount: 0, total: 0 });
      }
    } catch {
      setCartSummary({ itemCount: 0, total: 0 });
    }
  };

  const loadActiveOrder = async () => {
    if (!isLoggedIn) {
      setActiveOrder(null);
      return;
    }

    try {
      setActiveOrderLoading(true);

      const { data, error } = await orderService.getMyOrders();

      if (error) {
        setActiveOrder(null);
        return;
      }

      const list =
        Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.orders)
          ? (data as any).orders
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : [];

      const active = list
        .filter((order: any) =>
          ACTIVE_ORDER_STATUSES.includes(normalizeOrderStatus(order?.status))
        )
        .sort((a: any, b: any) => {
          const aDate = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const bDate = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return bDate - aDate;
        })?.[0];

      setActiveOrder(active || null);
    } catch {
      setActiveOrder(null);
    } finally {
      setActiveOrderLoading(false);
    }
  };

  const loadPersonalSections = async () => {
    if (!isLoggedIn) {
      setFavoriteItems([]);
      setFavoriteRestaurants([]);
      return;
    }

    try {
      const { data } = await favoriteService.getFavorites();
      const anyData: any = data || {};

      setFavoriteRestaurants(Array.isArray(anyData.restaurants) ? anyData.restaurants : []);
      setFavoriteItems(Array.isArray(anyData.items) ? anyData.items : []);
    } catch {
      setFavoriteItems([]);
      setFavoriteRestaurants([]);
    }
  };

  const normalizeList = (value: any) => {
    const possible = [
      value,
      value?.data,
      value?.data?.data,
      value?.data?.categories,
      value?.data?.restaurants,
      value?.data?.items,
      value?.categories,
      value?.restaurants,
      value?.items,
      value?.result,
      value?.results,
      value?.payload,
      value?.payload?.data,
      value?.payload?.categories,
      value?.payload?.restaurants,
    ];

    for (const item of possible) {
      if (Array.isArray(item)) return item;
    }

    return [];
  };

  const loadData = async () => {
    try {
      const [catRes, restRes, discRes] = await Promise.allSettled([
        restaurantService.getCategories(),
        restaurantService.getFeaturedRestaurants(),
        discountService.getActiveDiscounts(),
      ]);

      if (catRes.status === "fulfilled") {
        const list = normalizeList(catRes.value?.data);
        setCategories(list);
        console.log("HOME CATEGORIES:", list.length, catRes.value?.data);
      } else {
        console.log("HOME CATEGORIES ERROR:", catRes.reason);
        setCategories([]);
      }

      if (restRes.status === "fulfilled") {
        const list = normalizeList(restRes.value?.data);
        setFeaturedRestaurants(list);
        console.log("HOME RESTAURANTS:", list.length, restRes.value?.data);
      } else {
        console.log("HOME RESTAURANTS ERROR:", restRes.reason);
        setFeaturedRestaurants([]);
      }

      if (discRes.status === "fulfilled") {
        setDiscounts(normalizeList(discRes.value?.data));
      } else {
        setDiscounts([]);
      }

      await Promise.all([loadCartSummary(), loadPersonalSections(), loadActiveOrder()]);
    } catch (error) {
      console.log("HOME LOAD ERROR:", error);
      showToast("error", "Unable to refresh home", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadDefaultAddress();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCartSummary();
      loadPersonalSections();
      loadActiveOrder();
      loadDefaultAddress();
    }, [user?.id])
  );

  useEffect(() => {
    if (!isLoggedIn || !activeOrder?.id) return;

    connectSocket().catch(() => {});
    joinOrderRoom(activeOrder.id);

    const cleanup = onOrderUpdated((payload: any) => {
      const payloadOrderId = getOrderIdFromSocketPayload(payload);
      const nextStatus = getStatusFromSocketPayload(payload);

      if (payloadOrderId !== activeOrder.id) return;

      const normalizedStatus = normalizeOrderStatus(nextStatus || activeOrder.status);

      if (!ACTIVE_ORDER_STATUSES.includes(normalizedStatus)) {
        setActiveOrder(null);
        return;
      }

      setActiveOrder((prev: any) => ({
        ...(prev || {}),
        ...getOrderFromSocketPayload(payload),
        ...(payload?.order || {}),
        status: normalizedStatus,
        updatedAt: payload?.updatedAt || payload?.order?.updatedAt || prev?.updatedAt,
      }));
    });

    return () => {
      cleanup?.();
      leaveOrderRoom(activeOrder.id);
    };
  }, [isLoggedIn, activeOrder?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadDefaultAddress(), loadActiveOrder()]);
    setRefreshing(false);
  };

  const openCart = () => {
    if (!requireAuth("Login to view your cart and checkout.")) return;
    navigation.navigate("Cart");
  };

  const openNotifications = () => {
    if (!requireAuth("Login to view notifications and order updates.")) return;
    navigation.navigate("Notifications");
  };

  const openFavorites = () => {
    if (!requireAuth("Login to view your favorite stores and items.")) return;
    navigation.navigate("Favorites");
  };

  const openActiveOrder = () => {
    if (!activeOrder?.id) return;

    navigation.navigate("OrderDetail", {
      orderId: activeOrder.id,
      order: activeOrder,
    });
  };

  const openCoupons = () => {
    if (!requireAuth("Login to unlock offers.")) return;
    navigation.navigate("Coupons");
  };

  const openSearch = () => navigation.navigate("SearchScreen");

  const openRestaurant = (restaurantId: string) => {
    if (!restaurantId) {
      showToast("error", "Store unavailable", "This store cannot be opened right now.");
      return;
    }

    navigation.navigate("RestaurantDetail", { restaurantId });
  };

  const openMenuItem = (itemId: string, restaurantId?: string) => {
    if (!itemId) {
      showToast("error", "Item unavailable", "This item cannot be opened right now.");
      return;
    }

    navigation.navigate("MenuItemDetail", { itemId, restaurantId });
  };

  const RenderImage = ({
    item,
    style,
    icon = "storefront-outline",
  }: {
    item: any;
    style: any;
    icon?: string;
  }) => {
    const uri = getImage(item);

    if (uri) return <Image source={{ uri }} style={style} />;

    return (
      <View style={[style, styles.imageFallback]}>
        <Icon name={icon as any} size={26} color={THEME.yellow} />
      </View>
    );
  };

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      activeOpacity={0.9}
      onPress={() => navigation.navigate("CategoryRestaurants", { categoryId: item.id })}
    >
      <View style={styles.categoryImageWrap}>
        <RenderImage item={item} style={styles.categoryImage} icon="grid-outline" />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>
        {item.category_name || item.categoryName || item.name || "Category"}
      </Text>
    </TouchableOpacity>
  );

  const renderRestaurant = (rest: any) => {
    const deliveryFee = Number(rest.delivery_fee ?? rest.deliveryFee ?? 0);
    const rating = Number(rest.rating || 4);
    const isOpen = rest.isOpen !== false && rest.is_open !== false;

    return (
      <TouchableOpacity
        key={rest.id}
        style={styles.restaurantCard}
        activeOpacity={0.9}
        onPress={() => openRestaurant(rest.id)}
      >
        <RenderImage item={rest} style={styles.restaurantImage} />

        <View style={styles.restaurantBody}>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {getName(rest)}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Icon name="star" size={12} color={THEME.black} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>

              <Text style={styles.metaText} numberOfLines={1}>
                {rest.delivery_time || rest.deliveryTime || "25-35 min"}
              </Text>
            </View>

            <Text style={styles.deliveryLine} numberOfLines={1}>
              {isOpen ? "Open now" : "Closed"} • Delivery{" "}
              {deliveryFee === 0 ? "Free" : money(deliveryFee)}
            </Text>
          </View>

          <View style={styles.storeArrow}>
            <Icon name="chevron-forward" size={18} color={THEME.green} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSmallItem = ({ item }: { item: any }) => {
    const menuItem = item?.menuItem || item?.menu_item || item;
    const restaurant = menuItem?.restaurant || item?.restaurant;

    return (
      <TouchableOpacity
        style={styles.smallItemCard}
        activeOpacity={0.9}
        onPress={() => openMenuItem(menuItem.id, restaurant?.id || menuItem.restaurantId)}
      >
        <RenderImage item={menuItem} style={styles.smallItemImage} icon="fast-food-outline" />

        <Text style={styles.smallItemName} numberOfLines={1}>
          {menuItem.name || menuItem.title || "Item"}
        </Text>

        <Text style={styles.smallItemPrice}>{money(menuItem.price)}</Text>
      </TouchableOpacity>
    );
  };

  const renderFavoriteRestaurant = ({ item }: { item: any }) => {
    const rest = item.restaurant || item;

    return (
      <TouchableOpacity
        style={styles.favoriteStoreCard}
        activeOpacity={0.9}
        onPress={() => openRestaurant(rest.id)}
      >
        <RenderImage item={rest} style={styles.favoriteStoreImage} />
        <Text style={styles.favoriteStoreName} numberOfLines={1}>
          {getName(rest)}
        </Text>
      </TouchableOpacity>
    );
  };

  const ActiveOrderBanner = () => {
    if (!activeOrder || activeOrderLoading) return null;

    return (
      <TouchableOpacity
        style={styles.activeOrderCard}
        activeOpacity={0.92}
        onPress={openActiveOrder}
      >
        <View style={styles.activeOrderGlow} />

        <View style={[styles.activeOrderIcon, { backgroundColor: activeOrderMeta.color }]}>
          <Icon name={activeOrderMeta.icon as any} size={24} color={THEME.black} />
        </View>

        <View style={styles.activeOrderContent}>
          <Text style={styles.activeOrderLabel}>LIVE ORDER</Text>
          <Text style={styles.activeOrderTitle} numberOfLines={1}>
            {activeOrderMeta.title}
          </Text>
          <Text style={styles.activeOrderSub} numberOfLines={1}>
            {activeOrderRestaurant} • #{activeOrderNumber}
          </Text>

          {!!activeOrderOtp && (
            <View style={styles.activeOtpPill}>
              <Icon name="keypad-outline" size={13} color={THEME.black} />
              <Text style={styles.activeOtpLabel}>Delivery OTP</Text>
              <Text style={styles.activeOtpValue}>{activeOrderOtp}</Text>
            </View>
          )}

          <View style={styles.activeProgressTrack}>
            <View
              style={[
                styles.activeProgressFill,
                {
                  width: `${
                    Math.max(
                      12,
                      ((STEPS_INDEX[normalizeOrderStatus(activeOrder.status)] || 1) / 7) * 100
                    )
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.activeEtaBox}>
          <Text style={styles.activeEtaValue}>{activeOrderEta}</Text>
          <Text style={styles.activeEtaLabel}>min</Text>
          <View style={styles.trackPill}>
            <Text style={styles.trackPillText}>Track</Text>
          </View>
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
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Preparing Karto...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: cartSummary.itemCount > 0 ? 128 : 42 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroArea}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.locationPill}
              onPress={openAddress}
              activeOpacity={0.85}
            >
              <View style={styles.locationIcon}>
                <Icon name="location" size={18} color={THEME.black} />
              </View>

              <View style={styles.locationTextBox}>
                <Text style={styles.locationLabel} numberOfLines={1}>
                  {locationSubText}
                </Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>

              <Icon name="chevron-down" size={17} color={THEME.green} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundBtn} onPress={openCart} activeOpacity={0.85}>
              <Icon name="cart-outline" size={22} color={THEME.text} />
              {cartSummary.itemCount > 0 && (
                <View style={styles.cartDot}>
                  <Text style={styles.cartDotText}>
                    {cartSummary.itemCount > 9 ? "9+" : cartSummary.itemCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundBtn} onPress={openFavorites} activeOpacity={0.85}>
              <Icon name="heart-outline" size={22} color={THEME.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roundBtn} onPress={openNotifications} activeOpacity={0.85}>
              <Icon name="notifications-outline" size={22} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroLeft}>
              <Text style={styles.heroBrand}>KARTO</Text>
              <Text style={styles.heroTitle}>Everything nearby, delivered fast.</Text>
              <Text style={styles.heroSub}>
                Food, groceries, gifts and daily essentials from trusted local stores.
              </Text>

              <TouchableOpacity style={styles.heroBtn} onPress={openSearch} activeOpacity={0.9}>
                <Text style={styles.heroBtnText}>Start shopping</Text>
                <Icon name="arrow-forward" size={16} color={THEME.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroVisual}>
              <View style={styles.visualCardPrimary}>
                <Icon name="bag-handle" size={30} color={THEME.black} />
              </View>
              <View style={styles.visualCardSmallTop}>
                <Icon name="flash" size={18} color={THEME.black} />
              </View>
              <View style={styles.visualCardSmallBottom}>
                <Icon name="leaf" size={18} color={THEME.black} />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.86} onPress={openSearch}>
          <Icon name="search-outline" size={21} color={THEME.green} />
          <Text style={styles.searchPlaceholder}>Search stores, food, grocery...</Text>
          <View style={styles.searchAction}>
            <Icon name="options-outline" size={18} color={THEME.black} />
          </View>
        </TouchableOpacity>

        <ActiveOrderBanner />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Shop by category</Text>
            <Text style={styles.sectionHint}>{categories.length}</Text>
          </View>

          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No categories available.</Text>
          ) : (
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              renderItem={renderCategory}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          )}
        </View>

        {discounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Best offers</Text>
              <TouchableOpacity onPress={openCoupons} activeOpacity={0.85}>
                <Text style={styles.sectionHint}>View</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={discounts}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const discount =
                  (item as any).discount_percent ||
                  (item as any).discountPercent ||
                  (item as any).discountValue ||
                  10;

                return (
                  <TouchableOpacity style={styles.offerCard} activeOpacity={0.9} onPress={openCoupons}>
                    <View style={styles.offerCircle} />
                    <Text style={styles.offerTag}>LIMITED</Text>
                    <Text style={styles.offerTitle}>{discount}% OFF</Text>
                    <Text style={styles.offerSub} numberOfLines={1}>
                      {(item as any).title || item.description || "Save more today"}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {isLoggedIn && (favoriteRestaurants.length > 0 || favoriteItems.length > 0) && (
          <TouchableOpacity
            style={styles.favoriteShortcutCard}
            activeOpacity={0.9}
            onPress={openFavorites}
          >
            <View style={styles.favoriteShortcutIcon}>
              <Icon name="heart" size={24} color={THEME.black} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.favoriteShortcutTitle}>Your favorites are ready</Text>
              <Text style={styles.favoriteShortcutSub}>
                {favoriteRestaurants.length} store{favoriteRestaurants.length === 1 ? "" : "s"} •{" "}
                {favoriteItems.length} item{favoriteItems.length === 1 ? "" : "s"}
              </Text>
            </View>

            <View style={styles.favoriteShortcutBtn}>
              <Text style={styles.favoriteShortcutBtnText}>Open</Text>
              <Icon name="arrow-forward" size={16} color={THEME.black} />
            </View>
          </TouchableOpacity>
        )}

        {topRated.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Top rated near you</Text>
              <Text style={styles.sectionHint}>4★+</Text>
            </View>

            {topRated.map(renderRestaurant)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Popular near you</Text>
            <Text style={styles.sectionHint}>{featuredRestaurants.length}</Text>
          </View>

          {featuredRestaurants.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="storefront-outline" size={34} color={THEME.yellow} />
              <Text style={styles.emptyTitle}>No stores available</Text>
              <Text style={styles.emptySub}>Stores around you will appear here soon.</Text>
            </View>
          ) : (
            popularRestaurants.map(renderRestaurant)
          )}
        </View>
      </ScrollView>

      {cartSummary.itemCount > 0 && (
        <TouchableOpacity style={styles.cartBanner} onPress={openCart} activeOpacity={0.92}>
          <View style={styles.cartLeft}>
            <View style={styles.cartIconCircle}>
              <Icon name="bag-handle" size={19} color={THEME.black} />
            </View>

            <View>
              <Text style={styles.cartBannerTitle}>
                {cartSummary.itemCount} item{cartSummary.itemCount > 1 ? "s" : ""} in cart
              </Text>
              <Text style={styles.cartBannerSub}>₹{cartSummary.total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.cartBannerRight}>
            <Text style={styles.cartBannerBtn}>View Cart</Text>
            <Icon name="arrow-forward" size={18} color={THEME.black} />
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={addressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.addressModalOverlay}>
          <View style={styles.addressModalCard}>
            <View style={styles.addressModalHandle} />

            <View style={styles.addressModalIcon}>
              <Icon name="location" size={30} color={THEME.white} />
            </View>

            <Text style={styles.addressModalTitle}>Delivery address</Text>
            <Text style={styles.addressModalSub}>
              Confirm where you want your order to be delivered.
            </Text>

            <TouchableOpacity
              style={styles.selectedAddressBox}
              activeOpacity={0.9}
              onPress={changeAddress}
            >
              <View style={styles.selectedAddressIcon}>
                <Icon name="navigate-outline" size={20} color={THEME.orange} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.selectedAddressLabel} numberOfLines={1}>
                  {locationSubText || "Selected address"}
                </Text>
                <Text style={styles.selectedAddressText} numberOfLines={3}>
                  {locationText || "Tap change address to select delivery address"}
                </Text>
              </View>

              <Icon name="chevron-forward" size={20} color={THEME.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeAddressBtn}
              activeOpacity={0.9}
              onPress={changeAddress}
            >
              <Text style={styles.changeAddressText}>Change Address</Text>
              <Icon name="arrow-forward-circle" size={21} color={THEME.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.currentLocationBtn}
              activeOpacity={0.85}
              onPress={useCurrentLocationFromPopup}
            >
              <Icon name="locate-outline" size={19} color={THEME.orange} />
              <Text style={styles.currentLocationText}>Use current location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addressModalClose}
              activeOpacity={0.85}
              onPress={() => setAddressModalVisible(false)}
            >
              <Text style={styles.addressModalCloseText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AuthRequiredModal
        visible={authModal}
        message={authMessage}
        onClose={() => setAuthModal(false)}
      />
    </View>
  );
}

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loadingLogoText: { color: THEME.yellow, fontSize: 38, fontWeight: "900" },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: "800" },
  imageFallback: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  heroArea: { backgroundColor: THEME.bg, paddingBottom: 18 },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingBottom: 12,
    alignItems: "center",
  },
  locationPill: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 17,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1.2,
    borderColor: THEME.border,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  locationTextBox: { flex: 1 },
  locationLabel: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 2,
  },
  locationText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 7,
  },
  cartDot: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME.card,
  },
  cartDotText: { color: THEME.black, fontSize: 10, fontWeight: "900" },
  heroCard: {
    marginHorizontal: 16,
    minHeight: 176,
    backgroundColor: THEME.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    flexDirection: "row",
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: THEME.orangeSoft,
  },
  heroLeft: { flex: 1, padding: 18, justifyContent: "center" },
  heroBrand: {
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: width < 370 ? 25 : 28,
    fontWeight: "900",
    marginTop: 6,
    lineHeight: width < 370 ? 30 : 34,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
    lineHeight: 18,
  },
  heroBtn: {
    marginTop: 15,
    alignSelf: "flex-start",
    backgroundColor: THEME.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroBtnText: { color: THEME.black, fontSize: 13, fontWeight: "900" },
  heroVisual: {
    width: 116,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  visualCardPrimary: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-8deg" }],
  },
  visualCardSmallTop: {
    position: "absolute",
    top: 33,
    right: 7,
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  visualCardSmallBottom: {
    position: "absolute",
    bottom: 32,
    left: 5,
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    marginTop: 4,
    marginHorizontal: 16,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    color: THEME.muted,
    fontWeight: "800",
  },
  searchAction: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  section: { marginTop: 20 },
  sectionHeaderRow: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  sectionHint: { color: THEME.green, fontWeight: "900", fontSize: 13 },
  emptyText: { color: THEME.muted, marginHorizontal: 20, fontWeight: "800" },
  horizontalList: { paddingHorizontal: 20 },
  categoryItem: {
    width: 88,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    marginRight: 13,
  },
  categoryImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 21,
    padding: 4,
    backgroundColor: THEME.yellowSoft,
    marginBottom: 8,
  },
  categoryImage: { width: "100%", height: "100%", borderRadius: 18 },
  categoryName: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 74,
    textAlign: "center",
  },
  offerCard: {
    width: 250,
    minHeight: 128,
    borderRadius: 24,
    backgroundColor: THEME.yellowSoft,
    borderWidth: 1,
    borderColor: "#FFD6C8",
    padding: 16,
    marginRight: 13,
    overflow: "hidden",
  },
  offerCircle: {
    position: "absolute",
    right: -32,
    top: -32,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,77,24,0.10)",
  },
  offerTag: {
    alignSelf: "flex-start",
    backgroundColor: THEME.green,
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  offerTitle: {
    color: THEME.yellow,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 12,
  },
  offerSub: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  restaurantCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  restaurantImage: { width: "100%", height: 172, backgroundColor: THEME.card2 },
  restaurantBody: { padding: 14, flexDirection: "row", alignItems: "center" },
  restaurantInfo: { flex: 1 },
  restaurantName: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  ratingPill: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: { color: THEME.black, fontSize: 12, fontWeight: "900", marginLeft: 4 },
  metaText: { color: THEME.muted, fontSize: 13, fontWeight: "800" },
  deliveryLine: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  storeArrow: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    justifyContent: "center",
    alignItems: "center",
  },
  smallItemCard: {
    width: 150,
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingBottom: 10,
    marginRight: 13,
    overflow: "hidden",
  },
  smallItemImage: { width: "100%", height: 92, backgroundColor: THEME.card2 },
  smallItemName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 9,
    marginHorizontal: 10,
  },
  smallItemPrice: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
    marginHorizontal: 10,
  },
  favoriteStoreCard: {
    width: 128,
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 9,
    marginRight: 13,
  },
  favoriteStoreImage: {
    width: "100%",
    height: 78,
    borderRadius: 17,
    backgroundColor: THEME.card2,
  },
  favoriteStoreName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 16,
    marginTop: 10,
  },
  emptySub: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },

  favoriteShortcutCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  favoriteShortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  favoriteShortcutTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
  },
  favoriteShortcutSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  favoriteShortcutBtn: {
    backgroundColor: THEME.green,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 10,
  },
  favoriteShortcutBtnText: {
    color: THEME.black,
    fontSize: 12,
    fontWeight: "900",
  },

  activeOrderCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FFD6C8",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  activeOrderGlow: {
    position: "absolute",
    right: -34,
    top: -42,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,77,24,0.10)",
  },
  activeOrderIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeOrderContent: {
    flex: 1,
  },
  activeOrderLabel: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  activeOrderTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  activeOrderSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  activeOtpPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: THEME.yellowSoft,
    borderWidth: 1,
    borderColor: THEME.yellow,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeOtpLabel: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  activeOtpValue: {
    color: THEME.black,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  activeProgressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: THEME.card2,
    overflow: "hidden",
    marginTop: 10,
  },
  activeProgressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: THEME.green,
  },
  activeEtaBox: {
    width: 62,
    alignItems: "center",
    marginLeft: 10,
  },
  activeEtaValue: {
    color: THEME.yellow,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 26,
  },
  activeEtaLabel: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  trackPill: {
    marginTop: 7,
    backgroundColor: THEME.green,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  trackPillText: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "900",
  },


  addressModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5,8,7,0.42)",
    justifyContent: "flex-end",
  },
  addressModalCard: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  addressModalHandle: {
    width: 48,
    height: 5,
    borderRadius: 99,
    backgroundColor: THEME.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  addressModalIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: THEME.orange,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  addressModalTitle: {
    color: THEME.blue,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
  },
  addressModalSub: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 7,
    lineHeight: 19,
  },
  selectedAddressBox: {
    marginTop: 18,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  selectedAddressIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orangeSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedAddressLabel: {
    color: THEME.orange,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedAddressText: {
    color: THEME.blue,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 4,
  },
  changeAddressBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.orange,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    ...shadow,
  },
  changeAddressText: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: "900",
  },
  currentLocationBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.orangeSoft,
    borderWidth: 1,
    borderColor: "#FFD6C8",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  currentLocationText: {
    color: THEME.orange,
    fontSize: 15,
    fontWeight: "900",
  },
  addressModalClose: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  addressModalCloseText: {
    color: THEME.muted,
    fontWeight: "900",
  },

  cartBanner: {
    position: "absolute",
    bottom: 14,
    left: 16,
    right: 16,
    backgroundColor: THEME.card,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 10,
  },
  cartLeft: { flexDirection: "row", alignItems: "center" },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cartBannerTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  cartBannerSub: { color: THEME.muted, fontWeight: "800", marginTop: 2 },
  cartBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.green,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
  },
  cartBannerBtn: { color: THEME.black, fontWeight: "900", marginRight: 6 },
});