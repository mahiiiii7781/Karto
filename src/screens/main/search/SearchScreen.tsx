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
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
  danger: "#EF4444",
  blue: "#38BDF8",
  purple: "#A78BFA",
};

const SUGGESTIONS = ["Pizza", "Burger", "Biryani", "Momos", "Grocery", "Medicine"];

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
  item?.restaurant?.imageUrl ||
  item?.restaurant?.image_url ||
  "";

const getRestaurantName = (item: any) =>
  item?.restaurant_name || item?.restaurantName || item?.name || item?.title || "Karto Store";

const normalizeSearchResponse = (res: any) => {
  const root = res?.data || {};
  const data = root?.data || root;

  const restaurants =
    data?.restaurants ||
    data?.stores ||
    data?.restaurantResults ||
    root?.restaurants ||
    [];

  const items =
    data?.items ||
    data?.menuItems ||
    data?.menu_items ||
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
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const latestRequest = useRef(0);

  const cleanQuery = query.trim();
  const hasResults = restaurants.length > 0 || items.length > 0;

  useEffect(() => {
    if (!cleanQuery) {
      setRestaurants([]);
      setItems([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      search(cleanQuery, true);
    }, 450);

    return () => clearTimeout(timer);
  }, [cleanQuery]);

  const heroText = useMemo(() => {
    if (!cleanQuery) return "Search restaurants, dishes and daily essentials nearby.";
    if (loading) return `Finding best matches for “${cleanQuery}”`;
    if (hasResults) return `${restaurants.length} stores • ${items.length} items found`;
    return `No results for “${cleanQuery}”`;
  }, [cleanQuery, loading, hasResults, restaurants.length, items.length]);

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
      setLoading(true);
      setSearched(true);

      const res = await apiClient.get("/search", {
        params: { q: finalQuery },
      });

      if (latestRequest.current !== requestId) return;

      const next = normalizeSearchResponse(res);
      setRestaurants(next.restaurants);
      setItems(next.items);
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
      }
    }
  };

  const clearSearch = () => {
    setQuery("");
    setRestaurants([]);
    setItems([]);
    setSearched(false);
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
      restaurantId,
    });
  };

  const renderImage = (item: any, icon: string) => {
    const uri = getImage(item);

    if (uri) {
      return <Image source={{ uri }} style={styles.resultImage} />;
    }

    return (
      <View style={[styles.resultImage, styles.imageFallback]}>
        <Icon name={icon as any} size={27} color={THEME.yellow} />
      </View>
    );
  };

  const rows = useMemo(() => {
    const list: any[] = [];

    if (restaurants.length) {
      list.push({ type: "header", id: "stores-header", title: "Stores" });
      restaurants.forEach((x, index) =>
        list.push({ type: "restaurant", id: x?.id || `restaurant-${index}`, data: x })
      );
    }

    if (items.length) {
      list.push({ type: "header", id: "items-header", title: "Items" });
      items.forEach((x, index) =>
        list.push({ type: "item", id: x?.id || `item-${index}`, data: x })
      );
    }

    return list;
  }, [restaurants, items]);

  const renderRow = ({ item }: any) => {
    if (item.type === "header") {
      return <Text style={styles.listTitle}>{item.title}</Text>;
    }

    if (item.type === "restaurant") {
      const rest = item.data;
      const rating = Number(rest?.rating || 0);
      const isOpen = rest?.isOpen !== false && rest?.is_open !== false;

      return (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => openRestaurant(rest)}
          activeOpacity={0.9}
        >
          {renderImage(rest, "storefront-outline")}

          <View style={styles.resultContent}>
            <Text style={styles.resultName} numberOfLines={1}>
              {getRestaurantName(rest)}
            </Text>

            <Text style={styles.resultSub} numberOfLines={1}>
              {rest?.type || rest?.category?.name || "Store"} • {rest?.deliveryTime || rest?.delivery_time || "25-35 min"}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Icon name="star" size={12} color={THEME.black} />
                <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : "New"}</Text>
              </View>

              <View style={[styles.statusPill, !isOpen && styles.closedPill]}>
                <Text style={[styles.statusText, !isOpen && styles.closedText]}>
                  {isOpen ? "Open" : "Closed"}
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
            {menuItem?.name || menuItem?.title || "Item"}
          </Text>

          <Text style={styles.resultSub} numberOfLines={1}>
            {getRestaurantName(restaurant)}
          </Text>

          <View style={styles.itemMetaRow}>
            <Text style={styles.price}>₹{Number(menuItem?.price || 0).toFixed(0)}</Text>
            {(menuItem?.isPopular || menuItem?.is_popular || menuItem?.isBestSeller) && (
              <View style={styles.bestBadge}>
                <Icon name="flame" size={11} color={THEME.yellow} />
                <Text style={styles.bestBadgeText}>Best Seller</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.addCircle}>
          <Icon name="arrow-forward" size={17} color={THEME.black} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={THEME.green} />

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
          <Icon name="sparkles-outline" size={29} color={THEME.black} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>KARTO SEARCH</Text>
          <Text style={styles.heroTitle}>{heroText}</Text>
        </View>
      </View>

      {!cleanQuery && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular searches</Text>

          <View style={styles.chipWrap}>
            {SUGGESTIONS.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.chip}
                activeOpacity={0.85}
                onPress={() => {
                  setQuery(item);
                  search(item);
                }}
              >
                <Icon name="trending-up-outline" size={15} color={THEME.green} />
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loader}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>K</Text>
          </View>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={styles.loaderText}>Finding best matches...</Text>
        </View>
      )}

      {!loading && !hasResults && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon
              name={searched ? "search-outline" : "compass-outline"}
              size={42}
              color={THEME.yellow}
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
              <Icon name="close" size={17} color={THEME.black} />
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
        />
      )}
    </View>
  );
}

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
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: THEME.text,
    fontWeight: "800",
    fontSize: 15,
    paddingVertical: 10,
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTag: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 3,
  },
  section: { paddingHorizontal: 18, paddingTop: 4 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 14,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 99,
    marginRight: 10,
    marginBottom: 10,
  },
  chipText: {
    marginLeft: 6,
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingLogoText: {
    color: THEME.yellow,
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
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    textAlign: "center",
    color: THEME.text,
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
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  clearText: {
    color: THEME.black,
    fontWeight: "900",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  listTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 12,
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
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
  resultContent: { flex: 1 },
  resultName: {
    color: THEME.text,
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
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.yellow,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
  },
  ratingText: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "900",
    color: THEME.black,
  },
  statusPill: {
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closedPill: {
    backgroundColor: "#1B0E0E",
    borderColor: "#3F1717",
  },
  statusText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  closedText: { color: THEME.danger },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 8,
  },
  price: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 14,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  bestBadgeText: {
    color: THEME.yellow,
    fontSize: 10,
    fontWeight: "900",
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
