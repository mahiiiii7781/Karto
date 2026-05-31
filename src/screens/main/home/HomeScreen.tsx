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
  Alert,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Geolocation from "react-native-geolocation-service";

import { useAuth } from "@/context/AuthContext";
import {
  restaurantService,
  Category,
  Restaurant,
  cartService,
} from "@/services/api/restaurantService";
import { discountService, Discount } from "@/services/api/discountService";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#F7FFF9",
  card: "#FFFFFF",
  green: "#16A34A",
  greenDark: "#0B7A34",
  mint: "#DCFCE7",
  yellow: "#FACC15",
  text: "#101510",
  muted: "#6B7280",
  border: "#E5E7EB",
  soft: "#F1F5F9",
  black: "#050807",
  danger: "#EF4444",
};

const quickServices = [
  { id: "food", title: "Food", icon: "fast-food-outline" },
  { id: "grocery", title: "Grocery", icon: "basket-outline" },
  { id: "medicine", title: "Medicine", icon: "medkit-outline" },
  { id: "daily", title: "Daily Needs", icon: "bag-handle-outline" },
];

const trustChips = [
  { id: "fast", title: "Fast delivery", icon: "flash-outline" },
  { id: "safe", title: "Fresh & safe", icon: "shield-checkmark-outline" },
  { id: "local", title: "Local stores", icon: "storefront-outline" },
];

const img = (item: any) =>
  item?.image_url ||
  item?.imageUrl ||
  item?.image ||
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836";

const name = (item: any) =>
  item?.restaurant_name || item?.name || item?.title || "Karto Store";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [locationText, setLocationText] = useState("Fetching location...");
  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });

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
    }, [])
  );

  const getUserName = () =>
    ((user as any)?.fullName ||
      (user as any)?.user_metadata?.full_name ||
      "Customer")
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
        error => {
          console.log("Location error:", error);
          setLocationText("Tap to select location");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.log("Permission/location error:", error);
      setLocationText("Tap to select location");
    }
  };

  const loadCartSummary = async () => {
    try {
      const cartRes = await cartService.getCartTotal();

      if (!cartRes.error && cartRes.data) {
        setCartSummary({
          itemCount: Number(cartRes.data.itemCount || 0),
          total: Number(cartRes.data.total || 0),
        });
      } else {
        setCartSummary({ itemCount: 0, total: 0 });
      }
    } catch {
      setCartSummary({ itemCount: 0, total: 0 });
    }
  };

  const loadPersonalSections = async () => {
    if (!user?.id) return;

    try {
      const [recentRes, favRes] = await Promise.allSettled([
        apiClient.get("recently-viewed"),
        apiClient.get("favorites"),
      ]);

      if (recentRes.status === "fulfilled") {
        const data = recentRes.value.data?.data || recentRes.value.data?.items || [];
        setRecentlyViewed(Array.isArray(data) ? data : []);
      }

      if (favRes.status === "fulfilled") {
        const favData = favRes.value.data?.data || {};
        setFavoriteItems(favData.items || favRes.value.data?.items || []);
        setFavoriteRestaurants(
          favData.restaurants || favRes.value.data?.restaurants || []
        );
      }
    } catch {
      setRecentlyViewed([]);
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
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong");
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
    if (!user?.id) {
      Alert.alert("Login Required", "Please login to view your cart.");
      return;
    }

    navigation.navigate("Cart", { userId: user.id });
  };

  const openRestaurant = (restaurantId: string) => {
    navigation.navigate("RestaurantDetail", { restaurantId });
  };

  const openMenuItem = (itemId: string, restaurantId?: string) => {
    navigation.navigate("MenuItemDetail", {
      itemId,
      restaurantId,
    });
  };

  const openSearch = () => {
    navigation.navigate("SearchScreen");
  };

  const openNotifications = () => {
    navigation.navigate("Notifications");
  };

  const renderRestaurant = (rest: any) => {
    const deliveryFee = Number(rest.delivery_fee ?? rest.deliveryFee ?? 0);
    const isFreeDelivery = deliveryFee === 0;
    const rating = Number(rest.rating || 4);
    const restaurantId = rest.id;

    return (
      <TouchableOpacity
        key={restaurantId}
        style={styles.restaurantCard}
        activeOpacity={0.9}
        onPress={() => openRestaurant(restaurantId)}
      >
        <View>
          <Image source={{ uri: img(rest) }} style={styles.restaurantImage} />

          <View style={styles.imageTopBadges}>
            <View style={styles.openBadge}>
              <View
                style={[
                  styles.liveDot,
                  !rest.isOpen && { backgroundColor: THEME.danger },
                ]}
              />
              <Text
                style={[
                  styles.openBadgeText,
                  !rest.isOpen && { color: THEME.danger },
                ]}
              >
                {rest.isOpen === false ? "CLOSED" : "OPEN"}
              </Text>
            </View>

            {rating >= 4.5 ? (
              <View style={styles.topRatedBadge}>
                <Text style={styles.topRatedText}>⭐ TOP RATED</Text>
              </View>
            ) : isFreeDelivery ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE DELIVERY</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantTitleRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {name(rest)}
            </Text>

            {rest.isPureVeg && (
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
                {rating.toFixed(1)} ({rest.total_reviews || rest.totalReviews || 0})
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="time-outline" size={15} color={THEME.muted} />
              <Text style={styles.metaText}>
                {rest.delivery_time || rest.deliveryTime || "25-35 min"}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.deliveryFee}>
              Delivery: {isFreeDelivery ? "Free" : `₹${deliveryFee}`}
            </Text>
            <Text style={styles.dotSep}>•</Text>
            <Text style={styles.deliveryFee}>
              Min ₹{rest.minimum_order || rest.minimumOrder || 0}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSmallItem = ({ item }: { item: any }) => {
    const menuItem = item?.menuItem || item;
    const restaurant = menuItem?.restaurant || item?.restaurant;

    return (
      <TouchableOpacity
        style={styles.smallItemCard}
        activeOpacity={0.9}
        onPress={() => openMenuItem(menuItem.id, restaurant?.id || menuItem.restaurantId)}
      >
        <Image source={{ uri: img(menuItem) }} style={styles.smallItemImage} />

        <View style={styles.smallItemInfo}>
          <Text style={styles.smallItemName} numberOfLines={1}>
            {menuItem.name || menuItem.title || "Item"}
          </Text>

          <Text style={styles.smallItemStore} numberOfLines={1}>
            {restaurant?.name || restaurant?.restaurant_name || "Karto Store"}
          </Text>

          <Text style={styles.smallItemPrice}>
            ₹{Number(menuItem.price || 0).toFixed(0)}
          </Text>
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
        <Image source={{ uri: img(rest) }} style={styles.favoriteStoreImage} />
        <Text style={styles.favoriteStoreName} numberOfLines={1}>
          {name(rest)}
        </Text>
        <Text style={styles.favoriteStoreSub}>Tap to order again</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
                <Icon name="location" size={18} color={THEME.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>Delivering to</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>

              <Icon name="chevron-down" size={18} color="#D1FAE5" />
            </TouchableOpacity>

            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={openCart}>
                <Icon name="cart-outline" size={24} color={THEME.text} />
                {cartSummary.itemCount > 0 && (
                  <View style={styles.cartDot}>
                    <Text style={styles.cartDotText}>
                      {cartSummary.itemCount > 9 ? "9+" : cartSummary.itemCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconBtn} onPress={openNotifications}>
                <Icon name="notifications-outline" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>Karto</Text>
              <Text style={styles.heroTitle}>Hi {getUserName()} 👋</Text>
              <Text style={styles.heroSubtitle}>
                Food, grocery, medicines and daily needs from nearby trusted stores.
              </Text>

              <TouchableOpacity
                style={styles.heroAction}
                activeOpacity={0.9}
                onPress={openSearch}
              >
                <Text style={styles.heroActionText}>Explore nearby stores</Text>
                <Icon name="arrow-forward" size={17} color={THEME.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCircle}>
              <Icon name="bicycle-outline" size={42} color={THEME.greenDark} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={openSearch}>
          <Icon name="search-outline" size={21} color={THEME.green} />
          <Text style={styles.searchPlaceholder}>
            Search food, grocery, medicines...
          </Text>
          <View style={styles.searchMiniBtn}>
            <Icon name="options-outline" size={18} color={THEME.greenDark} />
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
                <Icon name={item.icon as any} size={23} color={THEME.green} />
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
              <Text style={styles.sectionHint}>View all</Text>
            </View>

            <FlatList
              horizontal
              data={discounts}
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.discountBanner} activeOpacity={0.9}>
                  <Image source={{ uri: img(item) }} style={styles.discountImage} />

                  <View style={styles.discountContent}>
                    <View style={styles.offerPill}>
                      <Icon name="pricetag" size={13} color={THEME.black} />
                      <Text style={styles.offerPillText}>LIMITED DEAL</Text>
                    </View>

                    <Text style={styles.discountText}>
                      {(item as any).discount_percent ||
                        (item as any).discountPercent ||
                        10}
                      % OFF
                    </Text>

                    <Text style={styles.discountSubText} numberOfLines={2}>
                      {item.description || "Save more on your next Karto order"}
                    </Text>
                  </View>
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
              keyExtractor={(item: any) => item.id}
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
                    <Image source={{ uri: img(item) }} style={styles.categoryImage} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.category_name || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {recentlyViewed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>Recently viewed</Text>
              <Text style={styles.sectionHint}>Continue</Text>
            </View>

            <FlatList
              horizontal
              data={recentlyViewed}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              renderItem={renderSmallItem}
            />
          </View>
        )}

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
              keyExtractor={(item: any) => item.id}
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
              keyExtractor={(item: any) => item.id}
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

      <TouchableOpacity
        style={styles.offerFloating}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("Coupons")}
      >
        <Text style={styles.offerFloatingText}>🎁</Text>
      </TouchableOpacity>

      {cartSummary.itemCount > 0 && (
        <TouchableOpacity style={styles.cartBanner} onPress={openCart} activeOpacity={0.92}>
          <View style={styles.cartLeft}>
            <View style={styles.cartIconCircle}>
              <Icon name="bag-handle" size={19} color={THEME.green} />
            </View>

            <View>
              <Text style={styles.cartBannerTitle}>
                {cartSummary.itemCount} item{cartSummary.itemCount > 1 ? "s" : ""} in cart
              </Text>
              <Text style={styles.cartBannerSub}>
                ₹{cartSummary.total.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.cartBannerRight}>
            <Text style={styles.cartBannerBtn}>View Cart</Text>
            <Icon name="arrow-forward" size={18} color={THEME.black} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FACC15" },
  container: { flex: 1, backgroundColor: "#FACC15" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FACC15",
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: "#22C55E",
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: "#111111",
    fontWeight: "800",
  },

  topArea: {
    backgroundColor: "#FACC15",
    paddingBottom: 26,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#111111",
    padding: 10,
    borderRadius: 18,
    marginRight: 12,
  },
  locationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },
  locationLabel: {
    color: "#FACC15",
    fontSize: 11,
    fontWeight: "900",
  },
  locationText: {
    color: "#FFFFFF",
    fontWeight: "900",
    maxWidth: 190,
    marginTop: 1,
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    marginLeft: 9,
    width: 43,
    height: 43,
    borderRadius: 18,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  cartDot: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#111111",
  },
  cartDotText: {
    color: "#111111",
    fontSize: 10,
    fontWeight: "900",
  },

  heroCard: {
    marginHorizontal: 20,
    backgroundColor: "#111111",
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 7,
  },
  brand: {
    color: "#FACC15",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#C9C9C9",
    marginTop: 7,
    lineHeight: 19,
    maxWidth: 220,
  },
  heroAction: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#22C55E",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  heroActionText: {
    color: "#111111",
    fontWeight: "900",
    fontSize: 12,
    marginRight: 6,
  },
  heroCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FACC15",
    justifyContent: "center",
    alignItems: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    marginHorizontal: 20,
    marginTop: -16,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 4,
  },
  searchPlaceholder: {
    marginLeft: 10,
    color: "#C9C9C9",
    flex: 1,
    fontWeight: "700",
  },
  searchMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#22C55E",
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
    backgroundColor: "#111111",
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 3,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },
  quickText: {
    color: "#FFFFFF",
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
    backgroundColor: "#111111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    marginRight: 9,
  },
  trustText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  section: { marginTop: 18 },
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
    color: "#111111",
  },
  sectionHint: {
    color: "#111111",
    fontWeight: "900",
    fontSize: 13,
  },
  emptyText: {
    color: "#111111",
    marginHorizontal: 20,
    fontWeight: "800",
  },

  discountBanner: {
    width: 305,
    height: 155,
    borderRadius: 26,
    overflow: "hidden",
    marginRight: 14,
    backgroundColor: "#111111",
    elevation: 5,
  },
  discountImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.28,
  },
  discountContent: {
    flex: 1,
    padding: 18,
    justifyContent: "flex-end",
  },
  offerPill: {
    alignSelf: "flex-start",
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  offerPillText: {
    marginLeft: 5,
    color: "#111111",
    fontSize: 10,
    fontWeight: "900",
  },
  discountText: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  discountSubText: {
    fontSize: 13,
    color: "#FACC15",
    marginTop: 4,
    fontWeight: "800",
    maxWidth: 230,
  },

  categoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 16,
    width: 84,
    backgroundColor: "#111111",
    borderRadius: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 3,
  },
  categoryImageWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FACC15",
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
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "900",
    maxWidth: 70,
  },

  restaurantCard: {
    backgroundColor: "#111111",
    borderRadius: 26,
    marginBottom: 18,
    marginHorizontal: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 5,
  },
  restaurantImage: {
    width: "100%",
    height: 178,
    backgroundColor: "#1F1F1F",
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
    backgroundColor: "#111111",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  openBadgeText: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "900",
  },
  freeBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  freeBadgeText: {
    color: "#111111",
    fontSize: 10,
    fontWeight: "900",
  },
  topRatedBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  topRatedText: {
    color: "#111111",
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
    color: "#FFFFFF",
  },
  vegBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    marginLeft: 8,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#111111",
    marginRight: 5,
  },
  vegText: {
    color: "#111111",
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
    backgroundColor: "#FACC15",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    marginRight: 10,
  },
  ratingText: {
    marginLeft: 4,
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
    color: "#C9C9C9",
    fontSize: 13,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  deliveryFee: {
    fontSize: 13,
    color: "#C9C9C9",
    fontWeight: "800",
  },
  dotSep: {
    marginHorizontal: 7,
    color: "#C9C9C9",
    fontWeight: "900",
  },

  smallItemCard: {
    width: 158,
    backgroundColor: "#111111",
    borderRadius: 22,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 3,
  },
  smallItemImage: {
    width: "100%",
    height: 92,
    backgroundColor: "#1F1F1F",
  },
  smallItemInfo: { padding: 11 },
  smallItemName: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  smallItemStore: {
    color: "#C9C9C9",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 3,
  },
  smallItemPrice: {
    color: "#22C55E",
    fontWeight: "900",
    fontSize: 13,
    marginTop: 6,
  },

  favoriteStoreCard: {
    width: 130,
    backgroundColor: "#111111",
    borderRadius: 22,
    marginRight: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    elevation: 3,
  },
  favoriteStoreImage: {
    width: "100%",
    height: 78,
    borderRadius: 17,
    backgroundColor: "#1F1F1F",
  },
  favoriteStoreName: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
    marginTop: 8,
  },
  favoriteStoreSub: {
    color: "#C9C9C9",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 3,
  },

  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    marginTop: 10,
  },
  emptySub: {
    color: "#C9C9C9",
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
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#111111",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cartBannerTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  cartBannerSub: {
    color: "#C9C9C9",
    fontWeight: "800",
    marginTop: 2,
  },
  cartBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
  },
  cartBannerBtn: {
    color: "#111111",
    fontWeight: "900",
    marginRight: 6,
  },
});