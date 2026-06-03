import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import {
  favoriteService,
  FavoriteItem,
  FavoriteRestaurant,
} from "@/services/api/favouriteService";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

const FALLBACK_IMAGE = "https://via.placeholder.com/600x360.png?text=Karto+Store";

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FavoriteItem | null>(null);

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

  const requireAuth = () => {
    if (user?.id) return true;

    showToast("info", "Login required", "Please sign in to view favorites.");
    navigation.navigate("Auth");
    return false;
  };

  useFocusEffect(
    useCallback(() => {
      if (!requireAuth()) {
        setLoading(false);
        return;
      }

      loadFavorites(false);
    }, [user?.id])
  );

  const loadFavorites = async (isRefresh = false) => {
    if (!user?.id) {
      setFavorites([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
     const { data, error } = await favoriteService.getFavoriteRestaurants();

      if (error) {
        setFavorites([]);
        showToast(
          "error",
          "Unable to load favorites",
          error?.message || "Please try again."
        );
        return;
      }

      setFavorites(Array.isArray(data) ? data : []);

      if (isRefresh) {
        showToast("success", "Favorites updated", "Your saved stores are refreshed.");
      }
    } catch {
      setFavorites([]);
      showToast("error", "Unable to load favorites", "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRestaurant = (item: FavoriteItem): FavoriteRestaurant => {
    return item.restaurant || ({} as FavoriteRestaurant);
  };

  const getRestaurantId = (item: FavoriteItem) => {
    const restaurant = getRestaurant(item);
    return restaurant.id || item.restaurantId || item.restaurant_id || "";
  };

  const getName = (restaurant: FavoriteRestaurant) =>
    restaurant.name || restaurant.restaurant_name || "Karto Store";

  const getImage = (restaurant: FavoriteRestaurant) =>
    restaurant.imageUrl || restaurant.image_url || FALLBACK_IMAGE;

  const isOpen = (restaurant: FavoriteRestaurant) =>
    Boolean(restaurant.isOpen ?? restaurant.is_open ?? true);

  const getRating = (restaurant: FavoriteRestaurant) =>
    Number(restaurant.rating || 0).toFixed(1);

  const getReviews = (restaurant: FavoriteRestaurant) =>
    restaurant.totalReviews || restaurant.total_reviews || 0;

  const getDeliveryTime = (restaurant: FavoriteRestaurant) =>
    restaurant.deliveryTime || restaurant.delivery_time || "30-45 mins";

  const getDeliveryFee = (restaurant: FavoriteRestaurant) => {
    const fee = Number(restaurant.deliveryFee ?? restaurant.delivery_fee ?? 0);
    return fee === 0 ? "Free" : `₹${fee}`;
  };

  const getMinimumOrder = (restaurant: FavoriteRestaurant) =>
    Number(restaurant.minimumOrder ?? restaurant.minimum_order ?? 0);

  const filteredFavorites = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return favorites;

    return favorites.filter(item => {
      const restaurant = getRestaurant(item);
      const name = getName(restaurant).toLowerCase();
      const address = String(restaurant.address || "").toLowerCase();
      const cuisine = String((restaurant as any).cuisine || "").toLowerCase();

      return (
        name.includes(cleanQuery) ||
        address.includes(cleanQuery) ||
        cuisine.includes(cleanQuery)
      );
    });
  }, [favorites, query]);

  const confirmRemoveFavorite = (item: FavoriteItem) => {
    if (!requireAuth()) return;

    const restaurantId = getRestaurantId(item);

    if (!restaurantId) {
      showToast("error", "Unable to remove favorite", "Restaurant id not found.");
      return;
    }

    setRemoveTarget(item);
  };

  const removeFavorite = async () => {
    if (!removeTarget) return;

    const restaurantId = getRestaurantId(removeTarget);

    if (!restaurantId) {
      showToast("error", "Unable to remove favorite", "Restaurant id not found.");
      setRemoveTarget(null);
      return;
    }

    try {
      setRemovingId(restaurantId);

      const { error } = await favoriteService.removeFavorite(restaurantId);

      if (error) {
        showToast(
          "error",
          "Unable to remove favorite",
          error?.message || "Please try again."
        );
        return;
      }

      setFavorites(prev => prev.filter(x => getRestaurantId(x) !== restaurantId));
      setRemoveTarget(null);
      showToast("success", "Removed from favorites", "Store removed from your saved list.");
    } catch {
      showToast("error", "Unable to remove favorite", "Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const openRestaurant = (item: FavoriteItem) => {
    if (!requireAuth()) return;

    const restaurant = getRestaurant(item);
    const restaurantId = getRestaurantId(item);

    if (!restaurantId) {
      showToast("error", "Store unavailable", "Restaurant details are missing.");
      return;
    }

    navigation.navigate("RestaurantDetail", {
      restaurantId,
      restaurant,
    });
  };

  const renderFavorite = ({ item }: { item: FavoriteItem }) => {
    const restaurant = getRestaurant(item);
    const restaurantId = getRestaurantId(item);
    const open = isOpen(restaurant);
    const removing = removingId === restaurantId;
    const deliveryFee = getDeliveryFee(restaurant);
    const minimumOrder = getMinimumOrder(restaurant);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => openRestaurant(item)}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: getImage(restaurant) }} style={styles.image} />

          <View style={styles.imageOverlay} />

          <View style={[styles.openPill, !open && styles.closedPill]}>
            <Text style={[styles.openText, !open && styles.closedText]}>
              {open ? "OPEN NOW" : "CLOSED"}
            </Text>
          </View>

          {deliveryFee === "Free" && (
            <View style={styles.freePill}>
              <Icon name="flash" size={12} color={THEME.black} />
              <Text style={styles.freePillText}>FREE DELIVERY</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => confirmRemoveFavorite(item)}
            disabled={removing}
          >
            {removing ? (
              <ActivityIndicator size="small" color={THEME.danger} />
            ) : (
              <Icon name="heart" size={22} color={THEME.danger} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {getName(restaurant)}
              </Text>

              {!!restaurant.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {restaurant.address}
                </Text>
              )}
            </View>

            <View style={styles.savedBadge}>
              <Icon name="bookmark" size={13} color={THEME.yellow} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Icon name="star" size={14} color={THEME.yellow} />
              <Text style={styles.metaText}>
                {getRating(restaurant)} ({getReviews(restaurant)})
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Icon name="time-outline" size={14} color={THEME.green} />
              <Text style={styles.metaText}>{getDeliveryTime(restaurant)}</Text>
            </View>

            <View style={styles.metaPill}>
              <Icon name="bag-handle-outline" size={14} color={THEME.green} />
              <Text style={styles.metaText}>Min ₹{minimumOrder}</Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.deliveryText}>
              Delivery: {deliveryFee} • Tap to order again
            </Text>

            <View style={styles.viewBtn}>
              <Text style={styles.viewText}>View</Text>
              <Icon name="arrow-forward" size={15} color={THEME.black} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.muted}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved stores and restaurants</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadFavorites(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={THEME.black} />
          ) : (
            <Icon name="refresh" size={21} color={THEME.black} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>KARTO SAVED STORES</Text>
          <Text style={styles.heroTitle}>
            {favorites.length} saved favorite{favorites.length === 1 ? "" : "s"}
          </Text>
          <Text style={styles.heroSub}>
            Quick access to stores you love. Reorder faster with one tap.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="heart" size={33} color={THEME.black} />
        </View>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search-outline" size={20} color={THEME.green} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search saved stores..."
          placeholderTextColor={THEME.muted}
          style={styles.searchInput}
        />
        {!!query.trim() && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Icon name="close-circle" size={20} color={THEME.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        renderItem={renderFavorite}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFavorites(true)}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        contentContainerStyle={
          filteredFavorites.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={query.trim() ? "search-outline" : "heart-outline"}
                size={58}
                color={THEME.yellow}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {query.trim() ? "No matching stores" : "No favorites yet"}
            </Text>

            <Text style={styles.emptyText}>
              {query.trim()
                ? "Try another store name or clear the search."
                : "Tap heart on any store to save it here for quick ordering."}
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => (query.trim() ? setQuery("") : navigation.goBack())}
            >
              <Text style={styles.exploreText}>
                {query.trim() ? "Clear Search" : "Explore Stores"}
              </Text>
              <Icon name="arrow-forward" size={17} color={THEME.black} />
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={!!removeTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="heart-dislike-outline" size={31} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Remove favorite?</Text>
            <Text style={styles.confirmText}>
              This store will be removed from your saved favorites.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setRemoveTarget(null)}
                disabled={!!removingId}
              >
                <Text style={styles.keepText}>Keep Store</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeConfirmBtn}
                onPress={removeFavorite}
                disabled={!!removingId}
              >
                {removingId ? (
                  <ActivityIndicator color={THEME.black} />
                ) : (
                  <Text style={styles.removeConfirmText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bg,
  },
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
    fontSize: 38,
    fontWeight: "900",
  },
  muted: {
    color: THEME.muted,
    marginTop: 10,
    fontWeight: "800",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "700",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  searchBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    height: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 10,
    fontWeight: "800",
  },
  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 35,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyBox: {
    alignItems: "center",
  },
  emptyIcon: {
    width: 108,
    height: 108,
    borderRadius: 36,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 16,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  exploreBtn: {
    marginTop: 22,
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exploreText: {
    color: THEME.black,
    fontWeight: "900",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 164,
    backgroundColor: THEME.card2,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#1B0E0E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3F1717",
  },
  openPill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closedPill: {
    backgroundColor: "#1B0E0E",
    borderColor: "#3F1717",
  },
  openText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  closedText: {
    color: THEME.danger,
  },
  freePill: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: THEME.yellow,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freePillText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },
  info: {
    padding: 14,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  name: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  savedBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
  },
  address: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 11,
    gap: 9,
  },
  metaPill: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    color: THEME.muted,
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "700",
  },
  bottomRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deliveryText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  viewBtn: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  viewText: {
    color: THEME.black,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
  },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: {
    color: THEME.text,
    fontWeight: "900",
  },
  removeConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  removeConfirmText: {
    color: THEME.black,
    fontWeight: "900",
  },
});