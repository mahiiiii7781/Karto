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
  Modal,
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

const THEME = {
  bg: "#F7FAF6",
  soft: "#ECFDF3",
  card: "#FFFFFF",
  card2: "#F1F8F3",
  green: "#16A34A",
  green2: "#22C55E",
  yellow: "#FACC15",
  yellow2: "#FFF7CC",
  text: "#101713",
  muted: "#647067",
  border: "#DDE7DE",
  black: "#07110B",
  danger: "#EF4444",
};

const quickServices = [
  { id: "food", title: "Food", icon: "fast-food-outline" },
  { id: "grocery", title: "Grocery", icon: "basket-outline" },
  { id: "medicine", title: "Medicine", icon: "medkit-outline" },
  { id: "daily", title: "Daily", icon: "bag-handle-outline" },
];

const trustChips = [
  { id: "fast", title: "Fast delivery", icon: "flash-outline" },
  { id: "safe", title: "Fresh & safe", icon: "shield-checkmark-outline" },
  { id: "local", title: "Local stores", icon: "storefront-outline" },
];

const getImage = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || null;

const getName = (item: any) =>
  item?.restaurant_name || item?.name || item?.title || "Karto Store";

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

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
  const [authMessage, setAuthMessage] = useState(
    "Please login to use cart, orders, profile and checkout."
  );

  const isLoggedIn = !!user?.id;

  const topRated = useMemo(() => {
    return [...featuredRestaurants]
      .filter((r: any) => Number(r.rating || 0) >= 4)
      .slice(0, 5);
  }, [featuredRestaurants]);

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

  const openLogin = () => {
    setAuthModal(false);
    navigation.navigate("Auth");
  };

  const getUserName = () =>
    (
      (user as any)?.fullName ||
      (user as any)?.name ||
      "Customer"
    )
      .toString()
      .split(" ")[0];

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
        () => {
          setLocationText("Tap to select location");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
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
          itemCount: Number(cartRes.data.itemCount || 0),
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

      setFavoriteRestaurants(Array.isArray((data as any)?.restaurants) ? (data as any).restaurants : []);
      setFavoriteItems(Array.isArray((data as any)?.items) ? (data as any).items : []);
    } catch {
      setFavoriteItems([]);
      setFavoriteRestaurants([]);
    }
  };

  const loadData = async () => {
    try {
      const [catRes, restRes, discRes] = await Promise.all([
        restaurantService.getCategories(),
        restaurantService.getFeaturedRestaurants(),
        discountService.getActiveDiscounts(),
      ]);

      if (!catRes.error) setCategories(catRes.data || []);
      if (!restRes.error) setFeaturedRestaurants(restRes.data || []);
      if (!discRes.error) setDiscounts(discRes.data || []);

      await loadCartSummary();
      await loadPersonalSections();
    } catch {
      showToast("error", "Something went wrong", "Unable to refresh home right now.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await requestLocation();
    setRefreshing(false);
  };

  const openCart = () => {
    if (!requireAuth("Login to view your cart and continue checkout.")) return;
    navigation.navigate("Cart", { userId: user?.id });
  };

  const openNotifications = () => {
    if (!requireAuth("Login to view your notifications and order updates.")) return;
    navigation.navigate("Notifications");
  };

  const openCoupons = () => {
    if (!requireAuth("Login to unlock coupons and personal offers.")) return;
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

    if (uri) {
      return <Image source={{ uri }} style={style} />;
    }

    return (
      <View style={[style, styles.imageFallback]}>
        <Icon name={icon as any} size={28} color={THEME.green} />
      </View>
    );
  };

  const renderRestaurant = (rest: any) => {
    const deliveryFee = Number(rest.delivery_fee ?? rest.deliveryFee ?? 0);
    const rating = Number(rest.rating || 4);
    const restaurantId = rest.id;
    const isOpen = rest.isOpen !== false && rest.is_open !== false;

    return (
      <TouchableOpacity
        key={restaurantId}
        style={styles.restaurantCard}
        activeOpacity={0.9}
        onPress={() => openRestaurant(restaurantId)}
      >
        <View>
          <RenderImage item={rest} style={styles.restaurantImage} />

          <View style={styles.imageTopBadges}>
            <View style={[styles.openBadge, !isOpen && styles.closedBadge]}>
              <View style={[styles.liveDot, !isOpen && { backgroundColor: THEME.danger }]} />
              <Text style={[styles.openBadgeText, !isOpen && { color: THEME.danger }]}>
                {isOpen ? "OPEN" : "CLOSED"}
              </Text>
            </View>

            {rating >= 4.5 ? (
              <View style={styles.topRatedBadge}>
                <Text style={styles.topRatedText}>⭐ TOP RATED</Text>
              </View>
            ) : deliveryFee === 0 ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE DELIVERY</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantTitleRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {getName(rest)}
            </Text>

            {(rest.isPureVeg || rest.is_pure_veg) && (
              <View style={styles.vegBadge}>
                <View style={styles.vegDot} />
                <Text style={styles.vegText}>Pure Veg</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.ratingPill}>
              <Icon name="star" size={13} color={THEME.black} />
              <Text style={styles.ratingText}>
                {rating.toFixed(1)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="time-outline" size={15} color={THEME.muted} />
              <Text style={styles.metaText}>
                {rest.delivery_time || rest.deliveryTime || "25-35 min"}
              </Text>
            </View>
          </View>

          <Text style={styles.deliveryLine}>
            Delivery {deliveryFee === 0 ? "Free" : money(deliveryFee)} • Min{" "}
            {money(rest.minimum_order || rest.minimumOrder || 0)}
          </Text>
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

        <View style={styles.smallItemInfo}>
          <Text style={styles.smallItemName} numberOfLines={1}>
            {menuItem.name || menuItem.title || "Item"}
          </Text>

          <Text style={styles.smallItemStore} numberOfLines={1}>
            {restaurant?.name || restaurant?.restaurant_name || "Karto Store"}
          </Text>

          <Text style={styles.smallItemPrice}>{money(menuItem.price)}</Text>
        </View>
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
        <Text style={styles.favoriteStoreSub}>Tap to order again</Text>
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
        <Text style={styles.loadingText}>Preparing Karto for you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: cartSummary.itemCount > 0 ? 128 : 42,
        }}
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
        <View style={styles.topArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={requestLocation}
              activeOpacity={0.8}
            >
              <View style={styles.locationIconWrap}>
                <Icon name="location" size={17} color={THEME.card} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>Delivering to</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>

              <Icon name="chevron-down" size={17} color={THEME.green} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerIconBtn} onPress={openCart}>
              <Icon name="cart-outline" size={23} color={THEME.text} />
              {cartSummary.itemCount > 0 && (
                <View style={styles.cartDot}>
                  <Text style={styles.cartDotText}>
                    {cartSummary.itemCount > 9 ? "9+" : cartSummary.itemCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerIconBtn} onPress={openNotifications}>
              <Icon name="notifications-outline" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>KARTO LOCAL</Text>
              <Text style={styles.heroTitle}>Hi {getUserName()} 👋</Text>
              <Text style={styles.heroSubtitle}>
                Fresh food, groceries and daily needs from trusted stores near you.
              </Text>

              <TouchableOpacity
                style={styles.heroAction}
                activeOpacity={0.9}
                onPress={openSearch}
              >
                <Text style={styles.heroActionText}>Explore stores</Text>
                <Icon name="arrow-forward" size={17} color={THEME.card} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCircle}>
              <Icon name="bicycle-outline" size={42} color={THEME.black} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={openSearch}>
          <Icon name="search-outline" size={21} color={THEME.green} />
          <Text style={styles.searchPlaceholder}>
            Search food, grocery, medicines...
          </Text>
          <View style={styles.searchMiniBtn}>
            <Icon name="options-outline" size={18} color={THEME.card} />
          </View>
        </TouchableOpacity>

        <FlatList
          horizontal
          data={quickServices}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.quickList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickCard} activeOpacity={0.9}>
              <View style={styles.quickIcon}>
                <Icon name={item.icon as any} size={23} color={THEME.black} />
              </View>
              <Text style={styles.quickText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <FlatList
          horizontal
          data={trustChips}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.trustList}
          renderItem={({ item }) => (
            <View style={styles.trustChip}>
              <Icon name={item.icon as any} size={16} color={THEME.green} />
              <Text style={styles.trustText}>{item.title}</Text>
            </View>
          )}
        />

        {discounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Today’s best offers</Text>
              <TouchableOpacity onPress={openCoupons}>
                <Text style={styles.sectionHint}>View all</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              horizontal
              data={discounts}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.discountBanner} activeOpacity={0.9}>
                  <View style={styles.discountDecor} />
                  <View style={styles.offerPill}>
                    <Icon name="pricetag" size={13} color={THEME.card} />
                    <Text style={styles.offerPillText}>LIMITED DEAL</Text>
                  </View>

                  <Text style={styles.discountText}>
                    {(item as any).discount_percent || (item as any).discountPercent || 10}% OFF
                  </Text>

                  <Text style={styles.discountSubText} numberOfLines={2}>
                    {item.description || "Save more on your next Karto order"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>What are you looking for?</Text>
            <Text style={styles.sectionHint}>{categories.length} items</Text>
          </View>

          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No categories available.</Text>
          ) : (
            <FlatList
              horizontal
              data={categories}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              contentContainerStyle={styles.categoriesList}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("CategoryRestaurants", {
                      categoryId: item.id,
                    })
                  }
                >
                  <View style={styles.categoryImageWrap}>
                    <RenderImage item={item} style={styles.categoryImage} icon="grid-outline" />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category_name || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {favoriteRestaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Your favorite stores</Text>
              <Text style={styles.sectionHint}>Loved</Text>
            </View>

            <FlatList
              horizontal
              data={favoriteRestaurants}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={renderFavoriteRestaurant}
            />
          </View>
        )}

        {favoriteItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Your favorite items</Text>
              <Text style={styles.sectionHint}>Reorder</Text>
            </View>

            <FlatList
              horizontal
              data={favoriteItems}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any, index) => item?.id?.toString() || index.toString()}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={renderSmallItem}
            />
          </View>
        )}

        {topRated.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Top rated near you</Text>
              <Text style={styles.sectionHint}>4★+</Text>
            </View>

            {topRated.map(renderRestaurant)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>Popular near you</Text>
            <Text style={styles.sectionHint}>{featuredRestaurants.length} open</Text>
          </View>

          {featuredRestaurants.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="storefront-outline" size={34} color={THEME.green} />
              <Text style={styles.emptyTitle}>No stores available</Text>
              <Text style={styles.emptySub}>
                Stores around you will appear here soon.
              </Text>
            </View>
          ) : (
            featuredRestaurants.map(renderRestaurant)
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.offerFloating} activeOpacity={0.9} onPress={openCoupons}>
        <Text style={styles.offerFloatingText}>🎁</Text>
      </TouchableOpacity>

      {cartSummary.itemCount > 0 && (
        <TouchableOpacity style={styles.cartBanner} onPress={openCart} activeOpacity={0.92}>
          <View style={styles.cartLeft}>
            <View style={styles.cartIconCircle}>
              <Icon name="bag-handle" size={19} color={THEME.card} />
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
            <Icon name="arrow-forward" size={18} color={THEME.card} />
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={authModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.authBox}>
            <View style={styles.authIcon}>
              <Icon name="lock-closed-outline" size={32} color={THEME.yellow} />
            </View>

            <Text style={styles.authTitle}>Login required</Text>
            <Text style={styles.authMessage}>{authMessage}</Text>

            <TouchableOpacity style={styles.loginBtn} onPress={openLogin}>
              <Text style={styles.loginBtnText}>Login / Sign up</Text>
              <Icon name="arrow-forward" size={20} color={THEME.card} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.browseBtn} onPress={() => setAuthModal(false)}>
              <Text style={styles.browseText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.black,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: THEME.text,
    fontWeight: "800",
  },

  imageFallback: {
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },

  topArea: {
    backgroundColor: THEME.soft,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingBottom: 16,
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: THEME.card,
    padding: 10,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  locationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  locationLabel: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  locationText: {
    color: THEME.text,
    fontWeight: "900",
    maxWidth: 190,
    marginTop: 1,
  },
  headerIconBtn: {
    marginLeft: 8,
    width: 43,
    height: 43,
    borderRadius: 18,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
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
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  heroKicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.muted,
    marginTop: 7,
    lineHeight: 19,
    maxWidth: 220,
    fontWeight: "700",
  },
  heroAction: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: THEME.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  heroActionText: {
    color: THEME.card,
    fontWeight: "900",
    fontSize: 12,
    marginRight: 6,
  },
  heroCircle: {
    width: 78,
    height: 78,
    borderRadius: 28,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchPlaceholder: {
    marginLeft: 10,
    color: THEME.muted,
    flex: 1,
    fontWeight: "700",
  },
  searchMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },

  quickList: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  quickCard: {
    width: 92,
    backgroundColor: THEME.card,
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },
  quickText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "900",
  },

  trustList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    marginRight: 9,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  trustText: {
    marginLeft: 6,
    color: THEME.text,
    fontSize: 12,
    fontWeight: "800",
  },

  section: { marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleNoMargin: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
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

  discountBanner: {
    width: 305,
    minHeight: 150,
    borderRadius: 26,
    overflow: "hidden",
    marginRight: 14,
    backgroundColor: THEME.yellow2,
    borderWidth: 1,
    borderColor: "#F4DE7A",
    padding: 18,
  },
  discountDecor: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.yellow,
    right: -35,
    top: -30,
    opacity: 0.8,
  },
  offerPill: {
    alignSelf: "flex-start",
    backgroundColor: THEME.green,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  offerPillText: {
    marginLeft: 5,
    color: THEME.card,
    fontSize: 10,
    fontWeight: "900",
  },
  discountText: {
    fontSize: 29,
    fontWeight: "900",
    color: THEME.black,
  },
  discountSubText: {
    fontSize: 13,
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "800",
    maxWidth: 230,
  },

  categoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 14,
    width: 86,
    backgroundColor: THEME.card,
    borderRadius: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  categoryImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: THEME.yellow2,
    padding: 4,
    marginBottom: 8,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  categoryName: {
    fontSize: 12,
    color: THEME.text,
    textAlign: "center",
    fontWeight: "900",
    maxWidth: 70,
  },

  restaurantCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    marginBottom: 18,
    marginHorizontal: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  restaurantImage: {
    width: "100%",
    height: 178,
    backgroundColor: THEME.soft,
  },
  imageTopBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  openBadge: {
    backgroundColor: THEME.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 10,
    fontWeight: "900",
  },
  freeBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  freeBadgeText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },
  topRatedBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  topRatedText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },
  restaurantInfo: { padding: 15 },
  restaurantTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: THEME.text,
  },
  vegBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.soft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    marginLeft: 8,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 5,
  },
  vegText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.yellow,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    marginRight: 10,
  },
  ratingText: {
    marginLeft: 4,
    color: THEME.black,
    fontSize: 12,
    fontWeight: "900",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  deliveryLine: {
    fontSize: 13,
    color: THEME.muted,
    fontWeight: "800",
    marginTop: 10,
  },

  smallItemCard: {
    width: 158,
    backgroundColor: THEME.card,
    borderRadius: 22,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  smallItemImage: {
    width: "100%",
    height: 92,
    backgroundColor: THEME.soft,
  },
  smallItemInfo: { padding: 11 },
  smallItemName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
  },
  smallItemStore: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
    marginTop: 3,
  },
  smallItemPrice: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 13,
    marginTop: 6,
  },

  favoriteStoreCard: {
    width: 130,
    backgroundColor: THEME.card,
    borderRadius: 22,
    marginRight: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  favoriteStoreImage: {
    width: "100%",
    height: 78,
    borderRadius: 17,
    backgroundColor: THEME.soft,
  },
  favoriteStoreName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
    marginTop: 8,
  },
  favoriteStoreSub: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
    marginTop: 3,
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

  offerFloating: {
    position: "absolute",
    right: 18,
    bottom: 92,
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4DE7A",
    elevation: 8,
  },
  offerFloatingText: {
    fontSize: 24,
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
    color: THEME.card,
    fontWeight: "900",
    marginRight: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,17,11,0.56)",
    justifyContent: "center",
    padding: 22,
  },
  authBox: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    alignItems: "center",
  },
  authIcon: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: THEME.yellow2,
    borderWidth: 1,
    borderColor: "#F4DE7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  authTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
  },
  authMessage: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  loginBtn: {
    marginTop: 22,
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loginBtnText: {
    color: THEME.card,
    fontSize: 16,
    fontWeight: "900",
  },
  browseBtn: {
    marginTop: 12,
    width: "100%",
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: {
    color: THEME.text,
    fontWeight: "900",
  },
});