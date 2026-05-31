import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  favoriteService,
  FavoriteItem,
  FavoriteRestaurant,
} from "@/services/api/favouriteService";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4";

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadFavorites(false);
    }, [])
  );

  const loadFavorites = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    const { data, error } = await favoriteService.getFavorites();

    if (error) {
      setFavorites([]);
    } else {
      setFavorites(Array.isArray(data) ? data : []);
    }

    setLoading(false);
    setRefreshing(false);
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

  const removeFavorite = async (item: FavoriteItem) => {
    const restaurantId = getRestaurantId(item);

    if (!restaurantId) {
      Alert.alert("Error", "Restaurant id not found.");
      return;
    }

    try {
      setRemovingId(restaurantId);

      const { error } = await favoriteService.removeFavorite(restaurantId);

      if (error) {
        Alert.alert("Error", error?.message || "Failed to remove favorite.");
        return;
      }

      setFavorites((prev) =>
        prev.filter((x) => getRestaurantId(x) !== restaurantId)
      );
    } finally {
      setRemovingId(null);
    }
  };

  const openRestaurant = (item: FavoriteItem) => {
    const restaurant = getRestaurant(item);
    const restaurantId = getRestaurantId(item);

    if (!restaurantId) return;

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

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => openRestaurant(item)}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: getImage(restaurant) }} style={styles.image} />

          <View style={[styles.openPill, !open && styles.closedPill]}>
            <Text style={[styles.openText, !open && styles.closedText]}>
              {open ? "OPEN NOW" : "CLOSED"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => removeFavorite(item)}
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
          <Text style={styles.name} numberOfLines={1}>
            {getName(restaurant)}
          </Text>

          {!!restaurant.address && (
            <Text style={styles.address} numberOfLines={1}>
              {restaurant.address}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Icon name="star" size={14} color={THEME.yellow} />
              <Text style={styles.metaText}>
                {restaurant.rating || 0} (
                {restaurant.totalReviews || restaurant.total_reviews || 0})
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Icon name="time-outline" size={14} color={THEME.green} />
              <Text style={styles.metaText}>
                {restaurant.deliveryTime ||
                  restaurant.delivery_time ||
                  "30-45 mins"}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.deliveryText}>
              Delivery:{" "}
              {Number(restaurant.deliveryFee ?? restaurant.delivery_fee ?? 0) === 0
                ? "Free"
                : `₹${restaurant.deliveryFee ?? restaurant.delivery_fee}`}
              {"  "}• Min: ₹
              {restaurant.minimumOrder ?? restaurant.minimum_order ?? 0}
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
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.muted}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved stores and restaurants</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadFavorites(true)}>
          <Icon name="refresh" size={21} color={THEME.green} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderFavorite}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFavorites(true)}
            tintColor={THEME.green}
          />
        }
        contentContainerStyle={
          favorites.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="heart-outline" size={58} color={THEME.green} />
            </View>

            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
              Tap heart on any store to save it here for quick ordering.
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.exploreText}>Explore Stores</Text>
              <Icon name="arrow-forward" size={17} color={THEME.black} />
            </TouchableOpacity>
          </View>
        }
      />
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

  muted: {
    color: THEME.muted,
    marginTop: 10,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 4,
  },

  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 35,
  },

  emptyList: {
    flex: 1,
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
    borderRadius: 54,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
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

  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
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
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
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

  info: {
    padding: 14,
  },

  name: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },

  address: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 12,
  },

  metaRow: {
    flexDirection: "row",
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
});