import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

import {
  restaurantService,
  Restaurant,
  MenuItem,
  cartService,
} from "@/services/api/restaurantService";
import apiClient from "@/api/apiClient";

type RootStackParamList = {
  MenuItemDetail: { itemId: string; restaurantId: string };
  Cart: { userId?: string };
};

const THEME = {
  bg: "#070A08",
  card: "#101510",
  card2: "#151C15",
  green: "#22C55E",
  yellow: "#FACC15",
  softYellow: "#FFF7CC",
  text: "#F8FAFC",
  muted: "#A3A3A3",
  border: "#263126",
  black: "#030503",
  danger: "#EF4444",
};

const img = (item: any, fallback?: string) =>
  item?.image_url ||
  item?.imageUrl ||
  item?.image ||
  fallback ||
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836";

const restaurantName = (restaurant: any) =>
  restaurant?.restaurant_name || restaurant?.name || "Karto Store";

const boolAvailable = (item: any) =>
  item?.is_available !== false && item?.isAvailable !== false;

const boolVeg = (item: any) =>
  item?.is_vegetarian === true || item?.isVegetarian === true || item?.isVeg === true;

export default function RestaurantDetailScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { restaurantId } = route.params;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    loadRestaurant();
    loadFavoriteStatus();
  }, [restaurantId]);

  useFocusEffect(
    React.useCallback(() => {
      loadCartSummary();
    }, [])
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems;

    return menuItems.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
    );
  }, [menuItems, search]);

  const bestSellers = useMemo(() => {
    return menuItems
      .filter((item: any) => item.is_popular || item.isPopular || item.isBestSeller)
      .slice(0, 6);
  }, [menuItems]);

  const loadCartSummary = async () => {
    try {
      const res = await cartService.getCartTotal();

      if (!res.error && res.data) {
        setCartSummary({
          itemCount: Number(res.data.itemCount || 0),
          total: Number(res.data.total || 0),
        });
      } else {
        setCartSummary({ itemCount: 0, total: 0 });
      }
    } catch {
      setCartSummary({ itemCount: 0, total: 0 });
    }
  };

  const loadFavoriteStatus = async () => {
    try {
      const res = await apiClient.get(`/favorites/restaurant/${restaurantId}/status`);
      setIsFav(!!res.data?.isFavorite);
    } catch (error) {
      console.log("Favorite status error:", error);
    }
  };

  const loadRestaurant = async () => {
    try {
      setLoading(true);

      const [restaurantRes, menuRes] = await Promise.all([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenuItems(restaurantId),
      ]);

      if (restaurantRes.error) {
        Alert.alert("Error", "Store load nahi ho paya.");
        return;
      }

      const restData: any = restaurantRes.data || null;
      const menuData: any[] = menuRes.data || restData?.menu_items || restData?.menuItems || [];

      setRestaurant(restData);
      setMenuItems(menuData);

      const previewReviews =
        restData?.ratings ||
        restData?.reviews ||
        restData?.restaurantReviews ||
        [];

      setReviews(Array.isArray(previewReviews) ? previewReviews.slice(0, 3) : []);

      await loadCartSummary();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Kuch problem aa gayi.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!restaurant?.id) return;

    try {
      const res = await apiClient.post(`/favorites/restaurant/${restaurant.id}`);
      setIsFav(!!res.data?.isFavorite);
    } catch (error) {
      Alert.alert("Error", "Favorite update failed");
    }
  };

  const quickAdd = async (item: MenuItem) => {
    if (!item?.id || !restaurantId) {
      Alert.alert("Error", "Invalid item/store.");
      return;
    }

    if (!boolAvailable(item)) {
      Alert.alert("Unavailable", "Ye item abhi available nahi hai.");
      return;
    }

    setAddingId(item.id);

    try {
      const res = await cartService.addToCart(item.id, restaurantId, 1);

      if (res.error) {
        if (res.error === "DIFFERENT_RESTAURANT") {
          Alert.alert(
            "Different Store",
            "Cart me dusre store ka item hai. Pehle cart clear karo."
          );
          return;
        }

        Alert.alert("Error", "Item add nahi ho paya.");
        return;
      }

      Toast.show({
        type: "success",
        text1: "Added to cart",
        text2: `${item.name} cart me add ho gaya`,
        position: "bottom",
        visibilityTime: 1500,
      });

      await loadCartSummary();
    } catch {
      Alert.alert("Error", "Item add nahi ho paya.");
    } finally {
      setAddingId(null);
    }
  };

  const renderBestSeller = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bestSellerCard}
      activeOpacity={0.9}
      onPress={() =>
        navigation.navigate("MenuItemDetail", {
          itemId: item.id,
          restaurantId,
        })
      }
    >
      <Image source={{ uri: img(item, img(restaurant)) }} style={styles.bestSellerImg} />

      <View style={styles.bestSellerInfo}>
        <Text style={styles.bestSellerName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.bestSellerPrice}>₹{Number(item.price || 0).toFixed(0)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }: { item: any }) => {
    const unavailable = !boolAvailable(item);
    const isBestSeller = item.is_popular || item.isPopular || item.isBestSeller;

    return (
      <TouchableOpacity
        style={[styles.itemCard, unavailable && styles.disabledCard]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("MenuItemDetail", {
            itemId: item.id,
            restaurantId,
          })
        }
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

            {isBestSeller && (
              <View style={styles.popularPill}>
                <Icon name="flame" size={12} color={THEME.yellow} />
                <Text style={styles.popularText}>Best Seller</Text>
              </View>
            )}

            {item.calories && (
              <View style={styles.caloriePill}>
                <Icon name="flame-outline" size={12} color={THEME.green} />
                <Text style={styles.calorieText}>{item.calories} kcal</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description || "Fresh, tasty aur carefully packed."}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>
              ₹{Number(item.price || 0).toFixed(0)}
            </Text>

            {unavailable && (
              <Text style={styles.unavailableText}>Unavailable</Text>
            )}
          </View>
        </View>

        <View style={styles.itemImageBox}>
          <Image
            source={{ uri: img(item, img(restaurant)) }}
            style={styles.itemImage}
          />

          <TouchableOpacity
            style={[styles.addBtn, unavailable && styles.addBtnDisabled]}
            activeOpacity={0.9}
            disabled={addingId === item.id || unavailable}
            onPress={() => quickAdd(item)}
          >
            {addingId === item.id ? (
              <ActivityIndicator size="small" color={THEME.black} />
            ) : (
              <Text style={styles.addBtnText}>ADD +</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Preparing your premium menu...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Store not found</Text>
      </View>
    );
  }

  const restAny: any = restaurant;
  const isOpen = restAny.isOpen !== false && restAny.is_open !== false;
  const deliveryFee = Number(restAny.delivery_fee ?? restAny.deliveryFee ?? 0);
  const minOrder = Number(restAny.minimum_order ?? restAny.minimumOrder ?? 0);
  const deliveryTime = restAny.delivery_time || restAny.deliveryTime || "25-35 min";
  const rating = Number(restAny.rating || 4.5);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: cartSummary.itemCount > 0 ? 125 : 40,
        }}
      >
        <View style={styles.hero}>
          <Image source={{ uri: img(restaurant) }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={25} color={THEME.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
            <Icon
              name={isFav ? "heart" : "heart-outline"}
              size={25}
              color={isFav ? THEME.danger : THEME.text}
            />
          </TouchableOpacity>

          <View style={styles.heroTextBox}>
            <Text style={styles.heroTag}>PREMIUM PICKS NEAR YOU</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {restaurantName(restaurant)}
            </Text>

            <View style={styles.heroChips}>
              {restAny.isPureVeg && (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>Pure Veg</Text>
                </View>
              )}
              {rating >= 4.5 && (
                <View style={styles.heroChipYellow}>
                  <Text style={styles.heroChipYellowText}>Top Rated</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.statusRow}>
            <View style={[styles.openBadge, !isOpen && styles.closedBadge]}>
              <View style={[styles.liveDot, !isOpen && { backgroundColor: THEME.danger }]} />
              <Text style={[styles.openBadgeText, !isOpen && { color: THEME.danger }]}>
                {isOpen ? "OPEN NOW" : "CLOSED"}
              </Text>
            </View>

            <Text style={styles.ratingText}>
              ⭐ {rating.toFixed(1)}{" "}
              <Text style={styles.ratingCount}>
                ({restAny.total_reviews || restAny.totalReviews || 0})
              </Text>
            </Text>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Icon name="time-outline" size={18} color={THEME.yellow} />
              <Text style={styles.metaTitle}>{deliveryTime}</Text>
              <Text style={styles.metaSub}>Delivery ETA</Text>
            </View>

            <View style={styles.metaBox}>
              <Icon name="bicycle-outline" size={18} color={THEME.green} />
              <Text style={styles.metaTitle}>
                {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
              </Text>
              <Text style={styles.metaSub}>Delivery fee</Text>
            </View>

            <View style={styles.metaBox}>
              <Icon name="bag-check-outline" size={18} color={THEME.yellow} />
              <Text style={styles.metaTitle}>₹{minOrder}</Text>
              <Text style={styles.metaSub}>Min order</Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <Icon name="location-outline" size={18} color={THEME.green} />
            <Text style={styles.addressText} numberOfLines={2}>
              {restAny.address || "Nearby Karto partner store"}
            </Text>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <Icon name="shield-checkmark-outline" size={15} color={THEME.green} />
              <Text style={styles.featureText}>Hygienic</Text>
            </View>
            <View style={styles.featureChip}>
              <Icon name="flash-outline" size={15} color={THEME.green} />
              <Text style={styles.featureText}>Fast Delivery</Text>
            </View>
            <View style={styles.featureChip}>
              <Icon name="cube-outline" size={15} color={THEME.green} />
              <Text style={styles.featureText}>Safe Packing</Text>
            </View>
          </View>

          <View style={styles.offerRow}>
            <MaterialCommunityIcons name="brightness-percent" size={22} color={THEME.black} />
            <Text style={styles.offerText}>
              Smart Deal: Fresh food, quick delivery aur premium packing.
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={THEME.yellow} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search biryani, pizza, burger..."
            placeholderTextColor={THEME.muted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="close-circle" size={20} color={THEME.muted} />
            </TouchableOpacity>
          )}
        </View>

        {bestSellers.length > 0 && (
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
              keyExtractor={(item: any) => item.id}
              renderItem={renderBestSeller}
              contentContainerStyle={{ paddingHorizontal: 16 }}
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
            <Text style={styles.menuTitle}>Recommended for you</Text>
          </View>
          <Text style={styles.menuCount}>{filteredItems.length} items</Text>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Icon name="fast-food-outline" size={48} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No matching item</Text>
            <Text style={styles.emptyText}>Search thoda simple karke try karo.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item: any) => item.id}
            renderItem={renderMenuItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        )}
      </ScrollView>

      {cartSummary.itemCount > 0 && (
        <TouchableOpacity
          style={styles.cartBanner}
          activeOpacity={0.94}
          onPress={() => navigation.navigate("Cart", {})}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartIconBox}>
              <Icon name="bag-handle" size={20} color={THEME.black} />
            </View>

            <View>
              <Text style={styles.cartBannerTitle}>
                {cartSummary.itemCount} item{cartSummary.itemCount > 1 ? "s" : ""} selected
              </Text>
              <Text style={styles.cartBannerSub}>Total ₹{cartSummary.total.toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.cartRight}>
            <Text style={styles.cartBannerBtn}>View Cart</Text>
            <Icon name="arrow-forward" size={18} color={THEME.black} />
          </View>
        </TouchableOpacity>
      )}
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
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "700",
  },
  hero: { height: 315, position: "relative" },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.black,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.54)",
  },
  backBtn: {
    position: "absolute",
    top: 38,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  favBtn: {
    position: "absolute",
    top: 38,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroTextBox: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 48,
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 37,
  },
  heroChips: {
    flexDirection: "row",
    marginTop: 12,
  },
  heroChip: {
    backgroundColor: "#123D22",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    marginRight: 8,
  },
  heroChipText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  heroChipYellow: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  heroChipYellowText: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "900",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -38,
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 9,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#142015",
    borderWidth: 1,
    borderColor: "#2A4D2E",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  closedBadge: {
    backgroundColor: "#2A1111",
    borderColor: "#5C2020",
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
  ratingText: {
    color: THEME.yellow,
    fontSize: 14,
    fontWeight: "900",
  },
  ratingCount: {
    color: THEME.muted,
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  metaBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  metaTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 7,
  },
  metaSub: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 3,
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
    backgroundColor: THEME.card2,
    borderColor: THEME.border,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 99,
  },
  featureText: {
    marginLeft: 5,
    color: THEME.text,
    fontSize: 11,
    fontWeight: "800",
  },
  offerRow: {
    marginTop: 15,
    backgroundColor: THEME.yellow,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  offerText: {
    flex: 1,
    color: THEME.black,
    fontWeight: "900",
    fontSize: 13,
    marginLeft: 8,
  },
  searchBox: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    paddingVertical: 14,
    marginLeft: 9,
    fontWeight: "700",
  },
  bestSection: {
    marginBottom: 18,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  menuSmall: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  menuTitle: {
    color: THEME.text,
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
    width: 150,
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
    marginRight: 12,
  },
  bestSellerImg: {
    width: "100%",
    height: 95,
    backgroundColor: THEME.black,
  },
  bestSellerInfo: {
    padding: 11,
  },
  bestSellerName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
  },
  bestSellerPrice: {
    color: THEME.yellow,
    fontWeight: "900",
    marginTop: 6,
  },
  reviewSection: {
    marginBottom: 18,
  },
  reviewCard: {
    marginHorizontal: 16,
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewName: {
    color: THEME.text,
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
  itemCard: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  disabledCard: { opacity: 0.6 },
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
    backgroundColor: "#071007",
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
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  popularText: {
    color: THEME.yellow,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  caloriePill: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  calorieText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  itemName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 21,
  },
  itemDesc: {
    color: THEME.muted,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 18,
  },
  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    color: THEME.yellow,
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
    backgroundColor: THEME.black,
  },
  addBtn: {
    marginTop: -17,
    backgroundColor: THEME.green,
    minWidth: 82,
    minHeight: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: THEME.card,
  },
  addBtnDisabled: {
    backgroundColor: "#555",
  },
  addBtnText: {
    color: THEME.black,
    fontSize: 13,
    fontWeight: "900",
  },
  separator: { height: 14 },
  emptyMenu: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 55,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
  },
  cartBanner: {
    position: "absolute",
    bottom: 15,
    left: 16,
    right: 16,
    backgroundColor: THEME.yellow,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 12,
  },
  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cartBannerTitle: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 15,
  },
  cartBannerSub: {
    color: THEME.black,
    fontWeight: "800",
    marginTop: 2,
    opacity: 0.8,
  },
  cartRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartBannerBtn: {
    color: THEME.black,
    fontWeight: "900",
    marginRight: 6,
    fontSize: 14,
  },
});