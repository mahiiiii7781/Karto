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
import { favoriteService } from "@/services/api/favouriteService";

const THEME = {
  bg: "#F8FAF5",

  card: "#FFFFFF",
  card2: "#F1F5EC",
  surface: "#F7FAF2",

  orange: "#FACC15",
  orangeSoft: "#FEF9C3",

  blue: "#111827",

  green: "#22C55E",
  greenDark: "#15803D",

  yellow: "#FACC15",
  yellowSoft: "#FEF9C3",

  purple: "#8B5CF6",

  text: "#111827",
  muted: "#6B7280",
  border: "#DDE5D7",

  danger: "#EF4444",

  white: "#FFFFFF",
  black: "#111827",
  blackSoft: "#1F2937",
};

type FavoriteTab = "STORES" | "ITEMS";

type FavoriteRow = {
  id: string;
  type: FavoriteTab;
  raw: any;
  restaurant?: any;
  menuItem?: any;
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
    visibilityTime: 1900,
  });
};

const normalizeFavoritePayload = (payload: any) => {
  const data = payload?.data?.data || payload?.data || payload || {};

  const restaurants =
    data.restaurants ||
    data.favoriteRestaurants ||
    data.restaurantFavorites ||
    data.stores ||
    [];

  const items =
    data.items ||
    data.favoriteItems ||
    data.itemFavorites ||
    data.menuItems ||
    [];

  if (Array.isArray(data)) {
    return {
      restaurants: data,
      items: [],
    };
  }

  return {
    restaurants: Array.isArray(restaurants) ? restaurants : [],
    items: Array.isArray(items) ? items : [],
  };
};

const getRestaurant = (item: any) => item?.restaurant || item?.store || item || {};
const getMenuItem = (item: any) => item?.menuItem || item?.menu_item || item?.item || item || {};

const getRestaurantId = (row: FavoriteRow) => {
  const rest = row.restaurant || getRestaurant(row.raw);
  return rest?.id || row.raw?.restaurantId || row.raw?.restaurant_id || "";
};

const getMenuItemId = (row: FavoriteRow) => {
  const menu = row.menuItem || getMenuItem(row.raw);
  return menu?.id || row.raw?.menuItemId || row.raw?.menu_item_id || "";
};

const getName = (value: any) =>
  value?.name ||
  value?.restaurantName ||
  value?.restaurant_name ||
  value?.title ||
  "Karto Favorite";

const getImage = (value: any) =>
  value?.imageUrl ||
  value?.image_url ||
  value?.image ||
  value?.logoUrl ||
  value?.logo_url ||
  "";

const money = (value: any) => `₹${Number(value || 0).toFixed(0)}`;

const getRating = (value: any) => Number(value?.rating || 0).toFixed(1);
const getReviews = (value: any) => value?.totalReviews || value?.total_reviews || 0;
const getDeliveryTime = (value: any) => value?.deliveryTime || value?.delivery_time || "25-35 min";

const getDeliveryFee = (value: any) => {
  const fee = Number(value?.deliveryFee ?? value?.delivery_fee ?? 0);
  return fee === 0 ? "Free" : `₹${fee}`;
};

const isOpen = (value: any) => Boolean(value?.isOpen ?? value?.is_open ?? true);

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<FavoriteTab>("STORES");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FavoriteRow | null>(null);

  const isGuest = !user?.id;

  const storeRows: FavoriteRow[] = useMemo(
    () =>
      restaurants.map((fav, index) => ({
        id: fav?.id || fav?.restaurantId || fav?.restaurant_id || `store-${index}`,
        type: "STORES",
        raw: fav,
        restaurant: getRestaurant(fav),
      })),
    [restaurants]
  );

  const itemRows: FavoriteRow[] = useMemo(
    () =>
      items.map((fav, index) => ({
        id: fav?.id || fav?.menuItemId || fav?.menu_item_id || `item-${index}`,
        type: "ITEMS",
        raw: fav,
        menuItem: getMenuItem(fav),
        restaurant: getMenuItem(fav)?.restaurant || fav?.restaurant,
      })),
    [items]
  );

  const rows = activeTab === "STORES" ? storeRows : itemRows;

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter(row => {
      const restaurant = row.restaurant || {};
      const menuItem = row.menuItem || {};

      const searchable = [
        getName(restaurant),
        restaurant?.address,
        restaurant?.cuisine,
        getName(menuItem),
        menuItem?.description,
        menuItem?.category?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [rows, query]);

  const loadFavorites = useCallback(
    async (isRefresh = false) => {
      if (isGuest) {
        setRestaurants([]);
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const res =
          typeof favoriteService.getFavorites === "function"
            ? await favoriteService.getFavorites()
            : await favoriteService.getFavoriteRestaurants();

        if (res?.error) {
          setRestaurants([]);
          setItems([]);
          showToast(
            "error",
            "Unable to load favorites",
            res.error?.message || "Please try again."
          );
          return;
        }

        const normalized = normalizeFavoritePayload(res);
        setRestaurants(normalized.restaurants);
        setItems(normalized.items);

        if (isRefresh) {
          showToast("success", "Favorites updated", "Saved favorites refreshed.");
        }
      } catch {
        setRestaurants([]);
        setItems([]);
        showToast("error", "Unable to load favorites", "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useFocusEffect(
    useCallback(() => {
      loadFavorites(false);
    }, [loadFavorites])
  );

  const requireAuth = () => {
    if (!isGuest) return true;
    showToast("info", "Login required", "Please sign in to manage favorites.");
    navigation.navigate("Auth");
    return false;
  };

  const goExplore = () => {
    navigation.navigate("UserApp", { screen: "Home" });
  };

  const openRestaurant = (row: FavoriteRow) => {
    const restaurantId = getRestaurantId(row);

    if (!restaurantId) {
      showToast("error", "Store unavailable", "Restaurant details are missing.");
      return;
    }

    navigation.navigate("RestaurantDetail", {
      restaurantId,
      restaurant: row.restaurant,
    });
  };

  const openMenuItem = (row: FavoriteRow) => {
    const menuItemId = getMenuItemId(row);
    const restaurantId = getRestaurantId(row);

    if (!menuItemId) {
      showToast("error", "Item unavailable", "Menu item details are missing.");
      return;
    }

    navigation.navigate("MenuItemDetail", {
      itemId: menuItemId,
      menuItemId,
      restaurantId,
      item: row.menuItem,
    });
  };

  const confirmRemoveFavorite = (row: FavoriteRow) => {
    if (!requireAuth()) return;

    const id = row.type === "STORES" ? getRestaurantId(row) : getMenuItemId(row);

    if (!id) {
      showToast("error", "Unable to remove favorite", "Favorite id not found.");
      return;
    }

    setRemoveTarget(row);
  };

  const removeFavorite = async () => {
    if (!removeTarget) return;

    const id =
      removeTarget.type === "STORES"
        ? getRestaurantId(removeTarget)
        : getMenuItemId(removeTarget);

    if (!id) {
      setRemoveTarget(null);
      showToast("error", "Unable to remove favorite", "Favorite id not found.");
      return;
    }

    const key = `${removeTarget.type}-${id}`;

    try {
      setRemovingKey(key);

      const result =
        removeTarget.type === "STORES"
          ? typeof favoriteService.removeFavorite === "function"
            ? await favoriteService.removeFavorite(id)
            : await favoriteService.toggleRestaurantFavorite(id)
          : typeof favoriteService.removeFavoriteItem === "function"
          ? await favoriteService.removeFavoriteItem(id)
          : await favoriteService.toggleItemFavorite(id);

      if (result?.error) {
        showToast(
          "error",
          "Unable to remove favorite",
          result.error?.message || "Please try again."
        );
        return;
      }

      if (removeTarget.type === "STORES") {
        setRestaurants(prev =>
          prev.filter(fav => {
            const row: FavoriteRow = {
              id: fav?.id || fav?.restaurantId || fav?.restaurant_id,
              type: "STORES",
              raw: fav,
              restaurant: getRestaurant(fav),
            };
            return getRestaurantId(row) !== id;
          })
        );
      } else {
        setItems(prev =>
          prev.filter(fav => {
            const row: FavoriteRow = {
              id: fav?.id || fav?.menuItemId || fav?.menu_item_id,
              type: "ITEMS",
              raw: fav,
              menuItem: getMenuItem(fav),
              restaurant: getMenuItem(fav)?.restaurant || fav?.restaurant,
            };
            return getMenuItemId(row) !== id;
          })
        );
      }

      setRemoveTarget(null);
      showToast(
        "success",
        "Removed",
        removeTarget.type === "STORES"
          ? "Store removed from favorites."
          : "Item removed from favorites."
      );
    } catch {
      showToast("error", "Unable to remove favorite", "Please try again.");
    } finally {
      setRemovingKey(null);
    }
  };

  const renderImage = (value: any, height = 164) => {
    const imageUri = getImage(value);

    if (imageUri) {
      return <Image source={{ uri: imageUri }} style={[styles.image, { height }]} />;
    }

    return (
      <View style={[styles.imageFallback, { height }]}>
        <Icon name="heart-outline" size={34} color={THEME.orange} />
      </View>
    );
  };

  const renderStoreCard = (row: FavoriteRow) => {
    const restaurant = row.restaurant || {};
    const restaurantId = getRestaurantId(row);
    const open = isOpen(restaurant);
    const removing = removingKey === `STORES-${restaurantId}`;
    const deliveryFee = getDeliveryFee(restaurant);
    const minimumOrder = Number(restaurant?.minimumOrder ?? restaurant?.minimum_order ?? 0);

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openRestaurant(row)}>
        <View style={styles.imageWrap}>
          {renderImage(restaurant)}

          <View style={styles.imageOverlay} />

          <View style={[styles.openPill, !open && styles.closedPill]}>
            <Text style={[styles.openText, !open && styles.closedText]}>
              {open ? "OPEN" : "CLOSED"}
            </Text>
          </View>

          {deliveryFee === "Free" && (
            <View style={styles.freePill}>
              <Icon name="flash" size={12} color={THEME.white} />
              <Text style={styles.freePillText}>FREE DELIVERY</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => confirmRemoveFavorite(row)}
            disabled={removing}
            activeOpacity={0.85}
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

              {!!restaurant?.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {restaurant.address}
                </Text>
              )}
            </View>

            <View style={styles.savedBadge}>
              <Icon name="bookmark" size={13} color={THEME.orange} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <Meta icon="star" color={THEME.yellow} text={`${getRating(restaurant)} (${getReviews(restaurant)})`} />
            <Meta icon="time-outline" color={THEME.blue} text={getDeliveryTime(restaurant)} />
            <Meta icon="bag-handle-outline" color={THEME.green} text={`Min ₹${minimumOrder}`} />
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.deliveryText} numberOfLines={1}>
              Delivery {deliveryFee} • Tap to reorder
            </Text>

            <View style={styles.viewBtn}>
              <Text style={styles.viewText}>View</Text>
              <Icon name="arrow-forward" size={15} color={THEME.white} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItemCard = (row: FavoriteRow) => {
    const item = row.menuItem || {};
    const restaurant = row.restaurant || item?.restaurant || {};
    const menuItemId = getMenuItemId(row);
    const removing = removingKey === `ITEMS-${menuItemId}`;
    const available = Boolean(item?.isAvailable ?? item?.is_available ?? true);

    return (
      <TouchableOpacity style={styles.itemCard} activeOpacity={0.9} onPress={() => openMenuItem(row)}>
        <View style={styles.itemImageBox}>
          {renderImage(item, 104)}

          <View style={[styles.itemStatusPill, !available && styles.closedPill]}>
            <Text style={[styles.openText, !available && styles.closedText]}>
              {available ? "AVAILABLE" : "UNAVAILABLE"}
            </Text>
          </View>
        </View>

        <View style={styles.itemBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>
              {getName(item)}
            </Text>

            <Text style={styles.itemStore} numberOfLines={1}>
              {getName(restaurant)}
            </Text>

            {!!item?.description && (
              <Text style={styles.itemDesc} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.itemMetaRow}>
              <Text style={styles.itemPrice}>{money(item?.price)}</Text>

              {!!item?.rating && (
                <View style={styles.ratingMini}>
                  <Icon name="star" size={12} color={THEME.yellow} />
                  <Text style={styles.ratingMiniText}>{getRating(item)}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.itemHeartBtn}
            onPress={() => confirmRemoveFavorite(row)}
            disabled={removing}
            activeOpacity={0.85}
          >
            {removing ? (
              <ActivityIndicator size="small" color={THEME.danger} />
            ) : (
              <Icon name="heart" size={22} color={THEME.danger} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFavorite = ({ item }: { item: FavoriteRow }) => {
    return item.type === "STORES" ? renderStoreCard(item) : renderItemCard(item);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.muted}>Loading favorites...</Text>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.blue} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>Save stores for faster reordering</Text>
          </View>
        </View>

        <View style={styles.guestBox}>
          <View style={styles.emptyIcon}>
            <Icon name="heart-outline" size={58} color={THEME.orange} />
          </View>

          <Text style={styles.emptyTitle}>Login to view favorites</Text>
          <Text style={styles.emptyText}>
            Save nearby stores, restaurants and items to reorder faster.
          </Text>

          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Auth")}
            activeOpacity={0.9}
          >
            <Text style={styles.exploreText}>Login / Signup</Text>
            <Icon name="arrow-forward" size={17} color={THEME.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={goExplore} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={THEME.blue} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved stores and items</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadFavorites(true)}
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

      <View style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>KARTO SAVED PICKS</Text>
          <Text style={styles.heroTitle}>
            {restaurants.length + items.length} favorite{restaurants.length + items.length === 1 ? "" : "s"}
          </Text>
          <Text style={styles.heroSub}>
            Quick access to places and items you love. Reorder faster with one tap.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="heart" size={33} color={THEME.white} />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "STORES" && styles.tabBtnActive]}
          onPress={() => setActiveTab("STORES")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "STORES" && styles.tabTextActive]}>
            Stores
          </Text>
          <View style={[styles.countBadge, activeTab === "STORES" && styles.countBadgeActive]}>
            <Text style={[styles.countText, activeTab === "STORES" && styles.countTextActive]}>
              {restaurants.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ITEMS" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ITEMS")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "ITEMS" && styles.tabTextActive]}>
            Items
          </Text>
          <View style={[styles.countBadge, activeTab === "ITEMS" && styles.countBadgeActive]}>
            <Text style={[styles.countText, activeTab === "ITEMS" && styles.countTextActive]}>
              {items.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search-outline" size={20} color={THEME.orange} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search saved ${activeTab === "STORES" ? "stores" : "items"}...`}
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
        data={filteredRows}
        keyExtractor={(item, index) => `${item.type}-${item.id || index}`}
        renderItem={renderFavorite}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFavorites(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
        contentContainerStyle={filteredRows.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={query.trim() ? "search-outline" : "heart-outline"}
                size={58}
                color={THEME.orange}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {query.trim()
                ? "No matching favorites"
                : activeTab === "STORES"
                ? "No favorite stores"
                : "No favorite items"}
            </Text>

            <Text style={styles.emptyText}>
              {query.trim()
                ? "Try another name or clear the search."
                : activeTab === "STORES"
                ? "Tap heart on any store to save it here for quick ordering."
                : "Tap heart on menu items to save your favorite dishes."}
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => (query.trim() ? setQuery("") : goExplore())}
              activeOpacity={0.9}
            >
              <Text style={styles.exploreText}>
                {query.trim() ? "Clear Search" : "Explore Stores"}
              </Text>
              <Icon name="arrow-forward" size={17} color={THEME.white} />
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
              This {removeTarget?.type === "ITEMS" ? "item" : "store"} will be removed from your saved favorites.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setRemoveTarget(null)}
                disabled={!!removingKey}
              >
                <Text style={styles.keepText}>Keep</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeConfirmBtn}
                onPress={removeFavorite}
                disabled={!!removingKey}
              >
                {removingKey ? (
                  <ActivityIndicator color={THEME.white} />
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

const Meta = ({ icon, color, text }: { icon: string; color: string; text: string }) => (
  <View style={styles.metaPill}>
    <Icon name={icon as any} size={14} color={color} />
    <Text style={styles.metaText}>{text}</Text>
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: {
    color: THEME.blue,
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
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  tabs: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 5,
    flexDirection: "row",
    marginBottom: 12,
    ...shadow,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  tabBtnActive: { backgroundColor: THEME.orange },
  tabText: { color: THEME.muted, fontWeight: "900" },
  tabTextActive: { color: THEME.white },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeActive: { backgroundColor: THEME.white },
  countText: { color: THEME.blue, fontWeight: "900", fontSize: 11 },
  countTextActive: { color: THEME.orange },
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
  emptyBox: { alignItems: "center" },
  guestBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 108,
    height: 108,
    borderRadius: 36,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  exploreText: {
    color: THEME.white,
    fontWeight: "900",
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryText: {
    color: THEME.orange,
    fontWeight: "900",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
    ...shadow,
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    backgroundColor: THEME.card2,
  },
  imageFallback: {
    width: "100%",
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  openPill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "#EAFBF1",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closedPill: {
    backgroundColor: "#FFF1F1",
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
    backgroundColor: THEME.orange,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freePillText: {
    color: THEME.white,
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
    color: THEME.blue,
    fontSize: 18,
    fontWeight: "900",
  },
  savedBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: THEME.orangeSoft,
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
    backgroundColor: THEME.surface,
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
    backgroundColor: THEME.orange,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  viewText: {
    color: THEME.white,
    fontWeight: "900",
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 14,
    ...shadow,
  },
  itemImageBox: {
    width: 112,
    height: 104,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: THEME.card2,
  },
  itemStatusPill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "#EAFBF1",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemBody: {
    flex: 1,
    flexDirection: "row",
    marginLeft: 12,
    gap: 8,
  },
  itemName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 16,
  },
  itemStore: {
    color: THEME.orange,
    marginTop: 4,
    fontWeight: "900",
    fontSize: 12,
  },
  itemDesc: {
    color: THEME.muted,
    marginTop: 5,
    lineHeight: 17,
    fontSize: 12,
    fontWeight: "700",
  },
  itemMetaRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemPrice: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 16,
  },
  ratingMini: {
    backgroundColor: THEME.surface,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingMiniText: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 11,
  },
  itemHeartBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: THEME.blue,
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
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: {
    color: THEME.blue,
    fontWeight: "900",
  },
  removeConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.danger,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  removeConfirmText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
