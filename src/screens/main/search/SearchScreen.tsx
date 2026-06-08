import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  Keyboard,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { restaurantService } from "@/services/api/restaurantService";

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
  pink: "#EC4899",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#050807",
};

const SUGGESTIONS = [
  "Pizza",
  "Burger",
  "Biryani",
  "Momos",
  "Grocery",
  "Medicine",
  "Cake",
  "Rolls",
];

const QUICK_FILTERS = [
  { id: "all", label: "All", icon: "sparkles-outline" },
  { id: "stores", label: "Stores", icon: "storefront-outline" },
  { id: "items", label: "Items", icon: "fast-food-outline" },
  { id: "open", label: "Open", icon: "radio-button-on-outline" },
];

type FilterType = "all" | "stores" | "items" | "open";

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

const getImage = (item: any) =>
  item?.imageUrl ||
  item?.image_url ||
  item?.image ||
  item?.coverImage ||
  item?.cover_image ||
  item?.restaurant?.imageUrl ||
  item?.restaurant?.image_url ||
  "";

const getRestaurantName = (item: any) =>
  item?.restaurant_name ||
  item?.restaurantName ||
  item?.name ||
  item?.title ||
  "Karto Store";

const getItemName = (item: any) => item?.name || item?.title || "Menu Item";

const getCuisine = (item: any) =>
  item?.type ||
  item?.cuisine ||
  item?.category?.name ||
  item?.category?.category_name ||
  item?.categoryName ||
  item?.category_name ||
  "Store";

const getDeliveryTime = (item: any) =>
  item?.deliveryTime || item?.delivery_time || "25-35 min";

const getDeliveryFee = (item: any) =>
  Number(item?.deliveryFee ?? item?.delivery_fee ?? 0);

const isOpen = (item: any) => item?.isOpen !== false && item?.is_open !== false;

const isPopular = (item: any) =>
  item?.isPopular || item?.is_popular || item?.isBestSeller || item?.is_best_seller;

const normalizeSearchResponse = (res: any) => {
  const root = res?.data || {};
  const data = root?.data || root;

  const restaurants =
    data?.restaurants ||
    data?.stores ||
    data?.restaurantResults ||
    data?.restaurant_results ||
    root?.restaurants ||
    root?.stores ||
    [];

  const items =
    data?.items ||
    data?.menuItems ||
    data?.menu_items ||
    data?.itemResults ||
    data?.item_results ||
    root?.items ||
    [];

  return {
    restaurants: Array.isArray(restaurants) ? restaurants : [],
    items: Array.isArray(items) ? items : [],
  };
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const latestRequest = useRef(0);

  const cleanQuery = query.trim();

  useEffect(() => {
    if (!cleanQuery) {
      setRestaurants([]);
      setItems([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      search(cleanQuery, true);
    }, 420);

    return () => clearTimeout(timer);
  }, [cleanQuery]);

  const filteredRestaurants = useMemo(() => {
    if (activeFilter !== "open") return restaurants;
    return restaurants.filter((item: any) => isOpen(item));
  }, [restaurants, activeFilter]);

  const visibleRestaurants =
    activeFilter === "items" ? [] : filteredRestaurants;

  const visibleItems =
    activeFilter === "stores" || activeFilter === "open" ? [] : items;

  const hasResults = visibleRestaurants.length > 0 || visibleItems.length > 0;

  const heroText = useMemo(() => {
    if (!cleanQuery) return "Search restaurants, dishes and daily essentials nearby.";
    if (loading) return `Finding best matches for “${cleanQuery}”`;
    if (hasResults) return `${visibleRestaurants.length} stores • ${visibleItems.length} items found`;
    return `No results for “${cleanQuery}”`;
  }, [cleanQuery, loading, hasResults, visibleRestaurants.length, visibleItems.length]);

  const saveRecent = (value: string) => {
    const q = value.trim();
    if (!q) return;

    setRecentSearches(prev => {
      const next = [q, ...prev.filter(x => x.toLowerCase() !== q.toLowerCase())];
      return next.slice(0, 6);
    });
  };

  const fallbackSearch = async (finalQuery: string) => {
    const restaurantResult = await restaurantService.searchRestaurants(finalQuery);
    return {
      restaurants: restaurantResult.data || [],
      items: [],
    };
  };

  const search = async (value?: string, silent = false) => {
    const finalQuery = String(value ?? query).trim();

    if (!finalQuery) {
      setRestaurants([]);
      setItems([]);
      setSearched(false);
      return;
    }

    const requestId = Date.now();
    latestRequest.current = requestId;

    try {
      setLoading(!silent);
      if (silent) setRefreshing(false);
      setSearched(true);

      let next = {
        restaurants: [] as any[],
        items: [] as any[],
      };

      try {
        const res = await apiClient.get("/search", {
          params: { q: finalQuery },
        });

        next = normalizeSearchResponse(res);
      } catch {
        next = await fallbackSearch(finalQuery);
      }

      if (latestRequest.current !== requestId) return;

      setRestaurants(next.restaurants);
      setItems(next.items);
      saveRecent(finalQuery);
    } catch (error: any) {
      if (latestRequest.current !== requestId) return;

      setRestaurants([]);
      setItems([]);

      if (!silent) {
        showToast(
          "error",
          "Search failed",
          error?.response?.data?.message || "Could not search right now."
        );
      }
    } finally {
      if (latestRequest.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const refreshSearch = () => {
    if (!cleanQuery) return;

    setRefreshing(true);
    search(cleanQuery, true);
  };

  const clearSearch = () => {
    setQuery("");
    setRestaurants([]);
    setItems([]);
    setSearched(false);
    setActiveFilter("all");
  };

  const openRestaurant = (restaurant: any) => {
    const restaurantId = restaurant?.id || restaurant?.restaurantId || restaurant?.restaurant_id;

    if (!restaurantId) {
      showToast("error", "Store unavailable", "This store cannot be opened right now.");
      return;
    }

    navigation.navigate("RestaurantDetail", { restaurantId, restaurant });
  };

  const openItem = (item: any) => {
    const itemId = item?.id || item?.menuItemId || item?.menu_item_id;
    const restaurantId = item?.restaurantId || item?.restaurant_id || item?.restaurant?.id;

    if (!itemId) {
      showToast("error", "Item unavailable", "This item cannot be opened right now.");
      return;
    }

    navigation.navigate("MenuItemDetail", {
      itemId,
      menuItemId: itemId,
      restaurantId,
      item,
    });
  };

  const renderImage = (item: any, icon: string) => {
    const uri = getImage(item);

    if (uri) {
      return <Image source={{ uri }} style={styles.resultImage} />;
    }

    return (
      <View style={[styles.resultImage, styles.imageFallback]}>
        <Icon name={icon as any} size={27} color={THEME.orange} />
      </View>
    );
  };

  const rows = useMemo(() => {
    const list: any[] = [];

    if (visibleRestaurants.length) {
      list.push({
        type: "header",
        id: "stores-header",
        title: "Stores",
        count: visibleRestaurants.length,
      });

      visibleRestaurants.forEach((x, index) =>
        list.push({ type: "restaurant", id: x?.id || `restaurant-${index}`, data: x })
      );
    }

    if (visibleItems.length) {
      list.push({
        type: "header",
        id: "items-header",
        title: "Items",
        count: visibleItems.length,
      });

      visibleItems.forEach((x, index) =>
        list.push({ type: "item", id: x?.id || `item-${index}`, data: x })
      );
    }

    return list;
  }, [visibleRestaurants, visibleItems]);

  const renderRow = ({ item }: any) => {
    if (item.type === "header") {
      return (
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <Text style={styles.listCount}>{item.count} found</Text>
        </View>
      );
    }

    if (item.type === "restaurant") {
      const rest = item.data;
      const rating = Number(rest?.rating || 0);
      const open = isOpen(rest);
      const deliveryFee = getDeliveryFee(rest);

      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => openRestaurant(rest)}
          activeOpacity={0.9}
        >
          <View style={styles.imageWrap}>
            {renderImage(rest, "storefront-outline")}

            {deliveryFee === 0 && (
              <View style={styles.freeMini}>
                <Text style={styles.freeMiniText}>FREE</Text>
              </View>
            )}
          </View>

          <View style={styles.resultContent}>
            <Text style={styles.resultName} numberOfLines={1}>
              {getRestaurantName(rest)}
            </Text>

            <Text style={styles.resultSub} numberOfLines={1}>
              {getCuisine(rest)} • {getDeliveryTime(rest)}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Icon name="star" size={12} color={THEME.white} />
                <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : "New"}</Text>
              </View>

              <View style={[styles.statusPill, !open && styles.closedPill]}>
                <Text style={[styles.statusText, !open && styles.closedText]}>
                  {open ? "Open" : "Closed"}
                </Text>
              </View>

              <View style={styles.deliveryPill}>
                <Icon name="bicycle-outline" size={12} color={THEME.green} />
                <Text style={styles.deliveryText}>
                  {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
                </Text>
              </View>
            </View>
          </View>

          <Icon name="chevron-forward" size={20} color={THEME.muted} />
        </TouchableOpacity>
      );
    }

    const menuItem = item.data;
    const restaurant = menuItem?.restaurant || {};

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => openItem(menuItem)}
        activeOpacity={0.9}
      >
        {renderImage(menuItem, "fast-food-outline")}

        <View style={styles.resultContent}>
          <Text style={styles.resultName} numberOfLines={1}>
            {getItemName(menuItem)}
          </Text>

          <Text style={styles.resultSub} numberOfLines={1}>
            {getRestaurantName(restaurant)}
          </Text>

          <View style={styles.itemMetaRow}>
            <Text style={styles.price}>₹{Number(menuItem?.price || 0).toFixed(0)}</Text>

            {isPopular(menuItem) && (
              <View style={styles.bestBadge}>
                <Icon name="flame" size={11} color={THEME.white} />
                <Text style={styles.bestBadgeText}>Best Seller</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.addCircle}>
          <Icon name="arrow-forward" size={17} color={THEME.white} />
        </View>
      </TouchableOpacity>
    );
  };

  const searchChip = (text: string, icon = "trending-up-outline") => (
    <TouchableOpacity
      key={text}
      style={styles.chip}
      activeOpacity={0.85}
      onPress={() => {
        setQuery(text);
        search(text);
      }}
    >
      <Icon name={icon as any} size={15} color={THEME.orange} />
      <Text style={styles.chipText}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={THEME.blue} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={THEME.orange} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              search(query);
            }}
            placeholder="Search stores, food, grocery..."
            placeholderTextColor={THEME.muted}
            style={styles.input}
            autoFocus
            returnKeyType="search"
          />

          {!!query.trim() && (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.85}>
              <Icon name="close-circle" size={20} color={THEME.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Icon name="sparkles-outline" size={29} color={THEME.white} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>KARTO SEARCH</Text>
          <Text style={styles.heroTitle}>{heroText}</Text>
        </View>
      </View>

      {!!cleanQuery && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_FILTERS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = activeFilter === item.id;

            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.85}
                onPress={() => setActiveFilter(item.id as FilterType)}
              >
                <Icon
                  name={item.icon as any}
                  size={15}
                  color={active ? THEME.white : THEME.blue}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {!cleanQuery && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular searches</Text>

          <View style={styles.chipWrap}>
            {SUGGESTIONS.map(item => searchChip(item))}
          </View>

          {recentSearches.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Recent searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={styles.clearRecent}>Clear</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipWrap}>
                {recentSearches.map(item => searchChip(item, "time-outline"))}
              </View>
            </>
          )}

          <View style={styles.tipCard}>
            <Icon name="bulb-outline" size={22} color={THEME.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Search smarter</Text>
              <Text style={styles.tipText}>
                Try names like “pizza”, “tea”, “burger”, “medicine”, or store names near you.
              </Text>
            </View>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loader}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>K</Text>
          </View>
          <ActivityIndicator size="large" color={THEME.orange} />
          <Text style={styles.loaderText}>Finding best matches...</Text>
        </View>
      )}

      {!loading && !hasResults && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon
              name={searched ? "search-outline" : "compass-outline"}
              size={42}
              color={THEME.orange}
            />
          </View>

          <Text style={styles.emptyTitle}>
            {searched ? "No results found" : "Start searching"}
          </Text>

          <Text style={styles.emptySub}>
            {searched
              ? "Try another keyword or clear search to explore popular choices."
              : "Find nearby stores, dishes and daily essentials in seconds."}
          </Text>

          {searched && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearSearch} activeOpacity={0.9}>
              <Text style={styles.clearText}>Clear Search</Text>
              <Icon name="close" size={17} color={THEME.white} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {!loading && hasResults && (
        <FlatList
          data={rows}
          keyExtractor={(row: any, index) => `${row.type}-${row.id || index}`}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshSearch}
              tintColor={THEME.orange}
              colors={[THEME.orange]}
            />
          }
        />
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  searchBox: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: THEME.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    ...shadow,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: THEME.blue,
    fontWeight: "800",
    fontSize: 15,
    paddingVertical: 10,
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.blue,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 3,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    backgroundColor: THEME.card,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.orange,
    borderColor: THEME.orange,
  },
  filterText: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: THEME.white,
  },
  section: { paddingHorizontal: 18, paddingTop: 4 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.blue,
    marginBottom: 14,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 99,
    marginRight: 10,
    marginBottom: 10,
    ...shadow,
  },
  chipText: {
    marginLeft: 6,
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 13,
  },
  recentHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearRecent: {
    color: THEME.orange,
    fontWeight: "900",
    marginBottom: 14,
  },
  tipCard: {
    marginTop: 12,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  tipTitle: {
    color: THEME.orange,
    fontWeight: "900",
  },
  tipText: {
    color: THEME.orange,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
    fontSize: 12,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 90,
  },
  loadingLogo: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
    fontSize: 35,
    fontWeight: "900",
  },
  loaderText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 70,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 34,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    ...shadow,
  },
  emptyTitle: {
    textAlign: "center",
    color: THEME.blue,
    fontSize: 21,
    fontWeight: "900",
  },
  emptySub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  clearBtn: {
    marginTop: 20,
    backgroundColor: THEME.orange,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    ...shadow,
  },
  clearText: {
    color: THEME.white,
    fontWeight: "900",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  listHeaderRow: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: THEME.blue,
  },
  listCount: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    ...shadow,
  },
  imageWrap: {
    position: "relative",
    marginRight: 12,
  },
  resultImage: {
    width: 74,
    height: 74,
    borderRadius: 19,
    backgroundColor: THEME.card2,
    marginRight: 12,
  },
  imageFallback: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  freeMini: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: THEME.green,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  freeMiniText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: "900",
  },
  resultContent: { flex: 1 },
  resultName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
  },
  resultSub: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 7,
    flexWrap: "wrap",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.green,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
  },
  ratingText: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "900",
    color: THEME.white,
  },
  statusPill: {
    backgroundColor: "#EAFBF1",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closedPill: {
    backgroundColor: "#FFF1F1",
  },
  statusText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  closedText: { color: THEME.danger },
  deliveryPill: {
    backgroundColor: "#EAFBF1",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  deliveryText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 8,
  },
  price: {
    color: THEME.orange,
    fontWeight: "900",
    fontSize: 14,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.orange,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  bestBadgeText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "900",
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
});
