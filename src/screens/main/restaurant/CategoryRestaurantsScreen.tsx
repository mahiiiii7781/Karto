import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";

import { restaurantService, Restaurant } from "@/services/api/restaurantService";

type RootStackParamList = {
  RestaurantDetail: { restaurantId: string };
};

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
};

const fallbackImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836";

const img = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || fallbackImage;

const storeName = (item: any) =>
  item?.restaurant_name || item?.name || item?.title || "Karto Store";

export default function CategoryRestaurantsScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const categoryId = route.params?.categoryId;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const openStores = useMemo(() => {
    return restaurants.filter((item: any) => item.is_open !== false && item.isOpen !== false);
  }, [restaurants]);

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

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      showToast("error", "Category unavailable", "Please go back and try again.");
      return;
    }

    loadRestaurants();
  }, [categoryId]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);

      const res = await restaurantService.getRestaurantsByCategory(categoryId);

      if (res.error) {
        setRestaurants([]);
        showToast("error", "Unable to load stores", "Please try again.");
        return;
      }

      setRestaurants(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRestaurants([]);
      showToast("error", "Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openRestaurant = (restaurantId?: string) => {
    if (!restaurantId) {
      showToast("error", "Store unavailable", "This store cannot be opened right now.");
      return;
    }

    navigation.navigate("RestaurantDetail", { restaurantId });
  };

  const renderRestaurant = ({ item }: { item: any }) => {
    const isOpen = item.is_open !== false && item.isOpen !== false;
    const rating = Number(item.rating || 4.2);
    const deliveryFee = Number(item.delivery_fee ?? item.deliveryFee ?? 0);
    const deliveryTime = item.delivery_time || item.deliveryTime || "25-35 min";
    const minOrder = Number(item.minimum_order ?? item.minimumOrder ?? 0);
    const totalReviews = item.total_reviews || item.totalReviews || 0;

    return (
      <TouchableOpacity
        style={styles.restaurantCard}
        activeOpacity={0.9}
        onPress={() => openRestaurant(item.id)}
      >
        <View>
          <Image source={{ uri: img(item) }} style={styles.restaurantImage} />

          <View style={styles.imageOverlay} />

          <View style={styles.imageBadges}>
            <View style={[styles.statusBadge, !isOpen && styles.closedBadge]}>
              <View style={[styles.statusDot, !isOpen && { backgroundColor: THEME.danger }]} />
              <Text style={[styles.statusText, !isOpen && { color: THEME.danger }]}>
                {isOpen ? "OPEN NOW" : "CLOSED"}
              </Text>
            </View>

            {rating >= 4.5 ? (
              <View style={styles.topBadge}>
                <Icon name="star" size={12} color={THEME.black} />
                <Text style={styles.topBadgeText}>TOP RATED</Text>
              </View>
            ) : deliveryFee === 0 ? (
              <View style={styles.topBadge}>
                <Icon name="bicycle" size={12} color={THEME.black} />
                <Text style={styles.topBadgeText}>FREE DELIVERY</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {storeName(item)}
              </Text>

              <Text style={styles.restaurantSub} numberOfLines={1}>
                Fresh picks from your nearby trusted store
              </Text>
            </View>

            <View style={styles.arrowBox}>
              <Icon name="chevron-forward" size={18} color={THEME.black} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.ratingPill}>
              <Icon name="star" size={13} color={THEME.black} />
              <Text style={styles.ratingText}>
                {rating.toFixed(1)} ({totalReviews})
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Icon name="time-outline" size={14} color={THEME.green} />
              <Text style={styles.metaText}>{deliveryTime}</Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.deliveryFee}>
              Delivery {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
            </Text>

            <View style={styles.dot} />

            <Text style={styles.deliveryFee}>Min ₹{minOrder}</Text>
          </View>
        </View>
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
        <Text style={styles.loadingText}>Finding nearby stores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Stores Near You</Text>
          <Text style={styles.subtitle}>
            {restaurants.length} stores • {openStores.length} open now
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadRestaurants}>
          <Icon name="refresh" size={21} color={THEME.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>CURATED FOR YOU</Text>
          <Text style={styles.heroTitle}>Premium local stores</Text>
          <Text style={styles.heroSub}>
            Explore trusted stores with quick delivery, fresh products and safe packing.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="storefront-outline" size={34} color={THEME.black} />
        </View>
      </View>

      {restaurants.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Icon name="storefront-outline" size={44} color={THEME.yellow} />
          </View>
          <Text style={styles.emptyTitle}>No stores available</Text>
          <Text style={styles.emptyText}>
            We couldn't find any stores in this category. Please try another category.
          </Text>

          <TouchableOpacity style={styles.retryBtn} onPress={loadRestaurants}>
            <Text style={styles.retryText}>Try Again</Text>
            <Icon name="refresh" size={17} color={THEME.black} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item: any, index) => item?.id || String(index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderRestaurant}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 24,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: THEME.text,
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "700",
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 14,
  },
  listContent: {
    paddingBottom: 34,
  },
  restaurantCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    marginBottom: 18,
    marginHorizontal: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 5,
  },
  restaurantImage: {
    width: "100%",
    height: 170,
    backgroundColor: THEME.card2,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
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
    backgroundColor: THEME.bg,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  closedBadge: {
    borderColor: "#5C2020",
    backgroundColor: "#1A0E0E",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  statusText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },
  topBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  topBadgeText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 4,
  },
  restaurantInfo: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "900",
    color: THEME.text,
  },
  restaurantSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  arrowBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.yellow,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    marginRight: 8,
  },
  ratingText: {
    marginLeft: 4,
    color: THEME.black,
    fontSize: 12,
    fontWeight: "900",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  metaText: {
    marginLeft: 4,
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
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
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.muted,
    marginHorizontal: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 19,
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
    backgroundColor: THEME.green,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  retryText: {
    color: THEME.black,
    fontWeight: "900",
    marginRight: 7,
  },
});