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
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Geolocation from "react-native-geolocation-service";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import {
  restaurantService,
  Category,
  Restaurant,
} from "@/services/api/restaurantService";
import { cartService } from "@/services/api/cartService";
import { discountService, Discount } from "@/services/api/discountService";
import { favoriteService } from "@/services/api/favouriteService";
import AuthRequiredModal from "@/components/AuthRequiredModal";

const { width } = Dimensions.get("window");

const THEME = {
  bg: "#070A08",
  surface: "#0B110E",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  greenDark: "#16A34A",
  yellow: "#FACC15",
  yellowSoft: "#2A260B",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
  danger: "#EF4444",
};

const getImage = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || item?.logoUrl || null;

const getName = (item: any) =>
  item?.restaurant_name || item?.restaurantName || item?.name || item?.title || "Karto Store";

const money = (value: any) => `₹${Number(value || 0).toFixed(0)}`;

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
  const [locationText, setLocationText] = useState("Select delivery location");
  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });

  const [authModal, setAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState("Login to continue.");

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

  const requestLocation = async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationText("Tap to select location");
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setLocationText(`Near you • ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        },
        () => setLocationText("Tap to select location"),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
      );
    } catch {
      setLocationText("Tap to select location");
    }
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

  const loadPersonalSections = async () => {
    if (!isLoggedIn) {
      setFavoriteItems([]);
      setFavoriteRestaurants([]);
      return;
    }

    try {
      const { data } = await favoriteService.getFavorites();
      const anyData: any = data || {};

      setFavoriteRestaurants(
        Array.isArray(anyData.restaurants) ? anyData.restaurants : []
      );
      setFavoriteItems(Array.isArray(anyData.items) ? anyData.items : []);
    } catch {
      setFavoriteItems([]);
      setFavoriteRestaurants([]);
    }
  };

  const normalizeList = (value: any) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.restaurants)) return value.restaurants;
    if (Array.isArray(value?.categories)) return value.categories;
    return [];
  };

  const loadData = async () => {
    try {
      const [catRes, restRes, discRes] = await Promise.allSettled([
        restaurantService.getCategories(),
        restaurantService.getFeaturedRestaurants(),
        discountService.getActiveDiscounts(),
      ]);

      if (catRes.status === "fulfilled" && !catRes.value.error) {
        setCategories(normalizeList(catRes.value.data));
      }

      if (restRes.status === "fulfilled" && !restRes.value.error) {
        setFeaturedRestaurants(normalizeList(restRes.value.data));
      }

      if (discRes.status === "fulfilled" && !discRes.value.error) {
        setDiscounts(normalizeList(discRes.value.data));
      }

      await Promise.all([loadCartSummary(), loadPersonalSections()]);
    } catch {
      showToast("error", "Unable to refresh home", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    requestLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCartSummary();
      loadPersonalSections();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), requestLocation()]);
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
              {isOpen ? "Open now" : "Closed"} • Delivery {deliveryFee === 0 ? "Free" : money(deliveryFee)}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
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
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

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
            <TouchableOpacity style={styles.locationPill} onPress={requestLocation} activeOpacity={0.85}>
              <View style={styles.locationIcon}>
                <Icon name="location" size={16} color={THEME.black} />
              </View>

              <View style={styles.locationTextBox}>
                <Text style={styles.locationLabel}>Delivering to</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>

              <Icon name="chevron-down" size={16} color={THEME.green} />
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

            <TouchableOpacity style={styles.roundBtn} onPress={openNotifications} activeOpacity={0.85}>
              <Icon name="notifications-outline" size={22} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroLeft}>
              <Text style={styles.heroBrand}>KARTO</Text>
              <Text style={styles.heroTitle}>Everything nearby, delivered fast.</Text>
              <Text style={styles.heroSub}>Food, groceries, gifts and daily essentials from trusted local stores.</Text>

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

        {favoriteRestaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Favorite stores</Text>
              <Text style={styles.sectionHint}>Loved</Text>
            </View>

            <FlatList
              horizontal
              data={favoriteRestaurants}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={renderFavoriteRestaurant}
            />
          </View>
        )}

        {favoriteItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Favorite items</Text>
              <Text style={styles.sectionHint}>Reorder</Text>
            </View>

            <FlatList
              horizontal
              data={favoriteItems}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={renderSmallItem}
            />
          </View>
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

      <AuthRequiredModal
        visible={authModal}
        message={authMessage}
        onClose={() => setAuthModal(false)}
      />
    </View>
  );
}

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
  loadingLogoText: {
    color: THEME.yellow,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  imageFallback: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  heroArea: {
    backgroundColor: THEME.bg,
    paddingBottom: 18,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingBottom: 12,
    alignItems: "center",
  },
  locationPill: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  locationIcon: {
    width: 33,
    height: 33,
    borderRadius: 17,
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
  },
  locationText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "900",
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
  cartDotText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },
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
    backgroundColor: "#183A23",
  },
  heroLeft: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
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
  heroBtnText: {
    color: THEME.black,
    fontSize: 13,
    fontWeight: "900",
  },
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
  sectionTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  sectionHint: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 13,
  },
  emptyText: {
    color: THEME.muted,
    marginHorizontal: 20,
    fontWeight: "800",
  },
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
  categoryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
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
    borderColor: "#57470A",
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
    backgroundColor: "rgba(250,204,21,0.18)",
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
  restaurantImage: {
    width: "100%",
    height: 172,
    backgroundColor: THEME.card2,
  },
  restaurantBody: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantInfo: { flex: 1 },
  restaurantName: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  ratingPill: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: THEME.black,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 4,
  },
  metaText: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },
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
  smallItemImage: {
    width: "100%",
    height: 92,
    backgroundColor: THEME.card2,
  },
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
  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cartBannerTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  cartBannerSub: {
    color: THEME.muted,
    fontWeight: "800",
    marginTop: 2,
  },
  cartBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.green,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
  },
  cartBannerBtn: {
    color: THEME.black,
    fontWeight: "900",
    marginRight: 6,
  },
});
