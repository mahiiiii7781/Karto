import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { restaurantService, Restaurant } from "@/services/api/restaurantService";

type RootStackParamList = {
  RestaurantDetail: { restaurantId: string };
};

const THEME = {
  bg: "#0B0F0D",
  card: "#111827",
  green: "#22C55E",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  border: "#1F2937",
};

export default function CategoryRestaurantsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { categoryId } = route.params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurants();
  }, [categoryId]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const res = await restaurantService.getRestaurantsByCategory(categoryId);

      if (res.error) {
        Alert.alert("Error", "Failed to load vendors");
        setRestaurants([]);
      } else {
        setRestaurants(res.data || []);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={THEME.green} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Stores Near You</Text>
          <Text style={styles.subtitle}>{restaurants.length} vendors available</Text>
        </View>
      </View>

      {restaurants.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="storefront-outline" size={46} color={THEME.green} />
          <Text style={styles.emptyTitle}>No vendors found</Text>
          <Text style={styles.emptyText}>Add vendors in backend or try another category.</Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.restaurantCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate("RestaurantDetail", { restaurantId: item.id })}
            >
              <Image source={{ uri: item.image_url }} style={styles.restaurantImage} />
              <View style={styles.restaurantInfo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {item.restaurant_name}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.is_open ? "OPEN" : "CLOSED"}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>
                    {item.rating} ({item.total_reviews})
                  </Text>
                  <Icon name="time-outline" size={14} color={THEME.muted} style={{ marginLeft: 10 }} />
                  <Text style={styles.deliveryTime}>{item.delivery_time}</Text>
                </View>

                <Text style={styles.deliveryFee}>
                  Delivery: {item.delivery_fee === 0 ? "Free" : `₹${item.delivery_fee}`} • Min: ₹{item.minimum_order}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, paddingTop: 24 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted },
  titleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 18 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: { fontSize: 22, fontWeight: "900", color: THEME.text },
  subtitle: { color: THEME.muted, marginTop: 2 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 6 },
  restaurantCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    marginBottom: 18,
    marginHorizontal: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  restaurantImage: { width: "100%", height: 165, backgroundColor: "#0A0F0D" },
  restaurantInfo: { padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  restaurantName: { flex: 1, fontSize: 17, fontWeight: "900", color: THEME.text, marginRight: 8 },
  badge: { backgroundColor: "#0A120E", borderWidth: 1, borderColor: "#173923", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  badgeText: { color: THEME.green, fontSize: 10, fontWeight: "900" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rating: { marginLeft: 4, fontSize: 13, color: THEME.muted },
  deliveryTime: { marginLeft: 4, fontSize: 13, color: THEME.muted },
  deliveryFee: { fontSize: 13, color: THEME.muted, marginTop: 8 },
});
