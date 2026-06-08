import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { restaurantService, Restaurant } from "@/services/api/restaurantService";

const THEME = {
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  surface: "#F9FAFC",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  green: "#22C55E",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#050807",
};

type SortType = "recommended" | "rating" | "delivery" | "fee";
type FilterType = "all" | "open" | "free";

const normalizeList = (res: any): Restaurant[] => {
  const value =
    res?.data?.data?.restaurants ||
    res?.data?.restaurants ||
    res?.data?.stores ||
    res?.data?.data ||
    res?.data ||
    res?.restaurants ||
    res?.stores ||
    [];

  return Array.isArray(value) ? value : [];
};

const getImage = (item: any) =>
  item?.image_url ||
  item?.imageUrl ||
  item?.image ||
  item?.coverImage ||
  item?.cover_image ||
  item?.logoUrl ||
  item?.logo_url ||
  "";

const getStoreName = (item: any) =>
  item?.restaurant_name || item?.restaurantName || item?.name || item?.title || "Karto Store";

const getStoreCuisine = (item: any) =>
  item?.cuisine ||
  item?.category?.name ||
  item?.category?.category_name ||
  item?.category_name ||
  "Local store";

const isStoreOpen = (item: any) => item?.is_open !== false && item?.isOpen !== false;

const getRating = (item: any) => Number(item?.rating || 4.2);

const getDeliveryFee = (item: any) => Number(item?.delivery_fee ?? item?.deliveryFee ?? 0);

const getMinOrder = (item: any) => Number(item?.minimum_order ?? item?.minimumOrder ?? 0);

const getDeliveryTime = (item: any) =>
  item?.delivery_time || item?.deliveryTime || "25-35 min";

const getTotalReviews = (item: any) => Number(item?.total_reviews ?? item?.totalReviews ?? 0);

const money = (value: any) => `₹${Number(value || 0).toFixed(0)}`;

const extractMinutes = (value: any) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
};

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
    visibilityTime: 1800,
  });
};

export default function CategoryRestaurantsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const categoryId = route.params?.categoryId || route.params?.id || route.params?.category?.id;
  const categoryName =
    route.params?.categoryName ||
    route.params?.name ||
    route.params?.title ||
    route.params?.category?.name ||
    route.params?.category?.category_name ||
    "Stores";

  const categoryImage =
    route.params?.imageUrl ||
    route.params?.image_url ||
    route.params?.category?.imageUrl ||
    route.params?.category?.image_url ||
    "";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("recommended");

  const openStores = useMemo(
    () => restaurants.filter((item: any) => isStoreOpen(item)),
    [restaurants]
  );

  const freeDeliveryStores = useMemo(
    () => restaurants.filter((item: any) => getDeliveryFee(item) === 0),
    [restaurants]
  );

  const filteredStores = useMemo(() => {
    let list = [...restaurants];

    if (filter === "open") {
      list = list.filter((item: any) => isStoreOpen(item));
    }

    if (filter === "free") {
      list = list.filter((item: any) => getDeliveryFee(item) === 0);
    }

    const q = query.trim().toLowerCase();

    if (q) {
      list = list.filter((item: any) => {
        const searchable = [
          getStoreName(item),
          getStoreCuisine(item),
          item?.address,
          item?.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(q);
      });
    }

    if (sortBy === "rating") {
      list.sort((a: any, b: any) => getRating(b) - getRating(a));
    }

    if (sortBy === "delivery") {
      list.sort(
        (a: any, b: any) =>
          extractMinutes(getDeliveryTime(a)) - extractMinutes(getDeliveryTime(b))
      );
    }

    if (sortBy === "fee") {
      list.sort((a: any, b: any) => getDeliveryFee(a) - getDeliveryFee(b));
    }

    if (sortBy === "recommended") {
      list.sort((a: any, b: any) => {
        const openDiff = Number(isStoreOpen(b)) - Number(isStoreOpen(a));
        if (openDiff !== 0) return openDiff;

        const featuredDiff =
          Number(b?.isFeatured || b?.is_featured || false) -
          Number(a?.isFeatured || a?.is_featured || false);
        if (featuredDiff !== 0) return featuredDiff;

        return getRating(b) - getRating(a);
      });
    }

    return list;
  }, [restaurants, query, filter, sortBy]);

  const loadRestaurants = useCallback(
    async (isRefresh = false) => {
      if (!categoryId) {
        setRestaurants([]);
        setLoading(false);
        setRefreshing(false);
        showToast("error", "Category unavailable", "Please go back and try again.");
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const res = await restaurantService.getRestaurantsByCategory(categoryId);

        if (res?.error) {
          setRestaurants([]);
          showToast("error", "Unable to load stores", res.error?.message || "Please try again.");
          return;
        }

        setRestaurants(normalizeList(res));

        if (isRefresh) {
          showToast("success", "Stores refreshed", "Latest stores loaded.");
        }
      } catch {
        setRestaurants([]);
        showToast("error", "Something went wrong", "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryId]
  );

  useEffect(() => {
    loadRestaurants(false);
  }, [loadRestaurants]);

  const openRestaurant = (item: any) => {
    const restaurantId = item?.id;

    if (!restaurantId) {
      showToast("error", "Store unavailable", "This store cannot be opened right now.");
      return;
    }

    navigation.navigate("RestaurantDetail", {
      restaurantId,
      restaurant: item,
    });
  };

  const renderStoreImage = (item: any) => {
    const imageUri = getImage(item);

    if (imageUri) {
      return <Image source={{ uri: imageUri }} style={styles.restaurantImage} />;
    }

    return (
      <View style={[styles.restaurantImage, styles.imageFallback]}>
        <Icon name="storefront-outline" size={38} color={THEME.orange} />
      </View>
    );
  };

  const renderRestaurant = ({ item }: { item: any }) => {
    const isOpen = isStoreOpen(item);
    const rating = getRating(item);
    const deliveryFee = getDeliveryFee(item);
    const deliveryTime = getDeliveryTime(item);
    const minOrder = getMinOrder(item);
    const totalReviews = getTotalReviews(item);
    const featured = Boolean(item?.isFeatured || item?.is_featured);

    return (
      <TouchableOpacity
        style={[styles.restaurantCard, !isOpen && styles.closedCard]}
        activeOpacity={0.92}
        onPress={() => openRestaurant(item)}
      >
        <View style={styles.imageBox}>
          {renderStoreImage(item)}

          <View style={styles.imageOverlay} />

          <View style={styles.imageBadges}>
            <View style={[styles.statusBadge, !isOpen && styles.closedBadge]}>
              <View style={[styles.statusDot, !isOpen && styles.closedDot]} />
              <Text style={[styles.statusText, !isOpen && styles.closedText]}>
                {isOpen ? "OPEN NOW" : "CLOSED"}
              </Text>
            </View>

            {featured ? (
              <View style={styles.topBadge}>
                <Icon name="sparkles" size={12} color={THEME.white} />
                <Text style={styles.topBadgeText}>FEATURED</Text>
              </View>
            ) : rating >= 4.5 ? (
              <View style={styles.topBadge}>
                <Icon name="star" size={12} color={THEME.white} />
                <Text style={styles.topBadgeText}>TOP RATED</Text>
              </View>
            ) : deliveryFee === 0 ? (
              <View style={styles.freeBadge}>
                <Icon name="bicycle" size={12} color={THEME.white} />
                <Text style={styles.topBadgeText}>FREE DELIVERY</Text>
              </View>
            ) : (
              <View style={styles.fastBadge}>
                <Icon name="flash" size={12} color={THEME.white} />
                <Text style={styles.topBadgeText}>FAST</Text>
              </View>
            )}
          </View>

          <View style={styles.deliveryOverlay}>
            <Icon name="time-outline" size={14} color={THEME.white} />
            <Text style={styles.deliveryOverlayText}>{deliveryTime}</Text>
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {getStoreName(item)}
              </Text>

              <Text style={styles.restaurantSub} numberOfLines={1}>
                {getStoreCuisine(item)}
              </Text>
            </View>

            <View style={styles.arrowBox}>
              <Icon name="chevron-forward" size={18} color={THEME.white} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.ratingPill}>
              <Icon name="star" size={13} color={THEME.white} />
              <Text style={styles.ratingText}>
                {rating.toFixed(1)}
                {totalReviews > 0 ? ` (${totalReviews})` : ""}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Icon name="bicycle-outline" size={14} color={THEME.green} />
              <Text style={styles.metaText}>
                {deliveryFee === 0 ? "Free delivery" : `${money(deliveryFee)} delivery`}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.deliveryFee}>
              {minOrder > 0 ? `Min order ${money(minOrder)}` : "No minimum order"}
            </Text>

            <View style={styles.dot} />

            <Text style={styles.deliveryFee} numberOfLines={1}>
              {item?.address || "Near you"}
            </Text>
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
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Finding nearby stores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color={THEME.blue} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.subtitle}>
            {restaurants.length} stores • {openStores.length} open now
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, refreshing && styles.disabledBtn]}
          onPress={() => loadRestaurants(true)}
          disabled={refreshing}
          activeOpacity={0.85}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={THEME.white} />
          ) : (
            <Icon name="refresh" size={21} color={THEME.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.heroTag}>CURATED FOR YOU</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.heroSub}>
            Trusted stores, fresh products and quick delivery around you.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          {categoryImage ? (
            <Image source={{ uri: categoryImage }} style={styles.heroImage} />
          ) : (
            <Icon name="storefront-outline" size={34} color={THEME.white} />
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="storefront-outline" value={restaurants.length} label="Stores" color={THEME.orange} />
        <StatCard icon="radio-button-on-outline" value={openStores.length} label="Open" color={THEME.green} />
        <StatCard icon="bicycle-outline" value={freeDeliveryStores.length} label="Free delivery" color={THEME.blue} />
      </View>

      <View style={styles.searchBox}>
        <Icon name="search-outline" size={20} color={THEME.orange} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${categoryName} stores...`}
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
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: "all", label: "All" },
          { id: "open", label: "Open Now" },
          { id: "free", label: "Free Delivery" },
        ]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = filter === item.id;

          return (
            <TouchableOpacity
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.id as FilterType)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: "recommended", label: "Recommended" },
          { id: "rating", label: "Rating" },
          { id: "delivery", label: "Fastest" },
          { id: "fee", label: "Low Fee" },
        ]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.sortList}
        renderItem={({ item }) => {
          const active = sortBy === item.id;

          return (
            <TouchableOpacity
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortBy(item.id as SortType)}
              activeOpacity={0.85}
            >
              <Icon
                name={
                  item.id === "rating"
                    ? "star-outline"
                    : item.id === "delivery"
                    ? "flash-outline"
                    : item.id === "fee"
                    ? "cash-outline"
                    : "sparkles-outline"
                }
                size={14}
                color={active ? THEME.white : THEME.blue}
              />
              <Text style={[styles.sortText, active && styles.sortTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filteredStores}
        keyExtractor={(item: any, index) => item?.id?.toString() || String(index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredStores.length === 0 ? styles.emptyList : styles.listContent}
        renderItem={renderRestaurant}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRestaurants(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="storefront-outline" size={46} color={THEME.orange} />
            </View>

            <Text style={styles.emptyTitle}>
              {query.trim() || filter !== "all" ? "No matching stores" : "No stores available"}
            </Text>

            <Text style={styles.emptyText}>
              {query.trim() || filter !== "all"
                ? "Try clearing search or changing filters."
                : "We could not find stores in this category right now."}
            </Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                if (query.trim() || filter !== "all") {
                  setQuery("");
                  setFilter("all");
                  setSortBy("recommended");
                } else {
                  loadRestaurants(true);
                }
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.retryText}>
                {query.trim() || filter !== "all" ? "Clear Filters" : "Try Again"}
              </Text>
              <Icon
                name={query.trim() || filter !== "all" ? "close" : "refresh"}
                size={17}
                color={THEME.white}
              />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const StatCard = ({ icon, value, label, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}16` }]}>
      <Icon name={icon} size={19} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
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
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === "ios" ? 54 : 30,
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
    justifyContent: "center",
    alignItems: "center",
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.blue,
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "700",
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroText: {
    flex: 1,
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.blue,
    fontSize: 23,
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
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: THEME.orange,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 14,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    ...shadow,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: THEME.blue,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  statLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "800",
    textAlign: "center",
  },
  searchBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: THEME.card,
    borderRadius: 18,
    height: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  searchInput: {
    flex: 1,
    color: THEME.blue,
    paddingHorizontal: 10,
    fontWeight: "800",
  },
  filterList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  sortList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sortChip: {
    backgroundColor: THEME.card,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 9,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sortChipActive: {
    backgroundColor: THEME.blue,
    borderColor: THEME.blue,
  },
  sortText: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  sortTextActive: {
    color: THEME.white,
  },
  listContent: {
    paddingBottom: 34,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  restaurantCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    marginBottom: 18,
    marginHorizontal: 20,
    overflow: "hidden",
    ...shadow,
  },
  closedCard: {
    opacity: 0.72,
  },
  imageBox: {
    position: "relative",
  },
  restaurantImage: {
    width: "100%",
    height: 184,
    backgroundColor: THEME.card2,
  },
  imageFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  imageBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  closedBadge: {
    backgroundColor: "#FFF1F1",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  closedDot: {
    backgroundColor: THEME.danger,
  },
  statusText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },
  closedText: {
    color: THEME.danger,
  },
  topBadge: {
    backgroundColor: THEME.orange,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  freeBadge: {
    backgroundColor: THEME.green,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  fastBadge: {
    backgroundColor: THEME.blue,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  topBadgeText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  deliveryOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryOverlayText: {
    color: THEME.white,
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "900",
  },
  restaurantInfo: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantName: {
    fontSize: 19,
    fontWeight: "900",
    color: THEME.blue,
  },
  restaurantSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  arrowBox: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: THEME.orange,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    flexWrap: "wrap",
    gap: 8,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.green,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
  },
  ratingText: {
    marginLeft: 4,
    color: THEME.white,
    fontSize: 12,
    fontWeight: "900",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAFBF1",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
  },
  metaText: {
    marginLeft: 4,
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
  },
  deliveryFee: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.muted,
    marginHorizontal: 8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
    fontSize: 20,
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
  retryBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    ...shadow,
  },
  retryText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
