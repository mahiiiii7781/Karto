import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#070A07",
  card: "#111827",
  yellow: "#FACC15",
  green: "#22C55E",
  text: "#F9FAFB",
  muted: "#9CA3AF",
  border: "#1F2937",
  danger: "#EF4444",
};

export default function AdminRestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRestaurants = async () => {
    try {
      const res = await apiClient.get("/admin/restaurants");
      setRestaurants(res.data?.data || []);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const toggleRestaurant = async (id: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/admin/restaurants/${id}/status`, { isActive });
      setRestaurants(prev =>
        prev.map(x => (x.id === id ? { ...x, isActive } : x))
      );
    } catch {
      loadRestaurants();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurants</Text>
        <Text style={styles.subtitle}>Manage vendor restaurants and menus</Text>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={item => item.id}
        contentContainerStyle={restaurants.length ? styles.list : styles.emptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRestaurants();
            }}
            tintColor={THEME.yellow}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="storefront-outline" size={55} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>Vendor restaurants will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.iconBox}>
                <Icon name="storefront-outline" size={24} color={THEME.yellow} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || "Restaurant"}</Text>
                <Text style={styles.subText} numberOfLines={1}>
                  {item.address || item.city || "No address"}
                </Text>
                <Text style={styles.vendorText} numberOfLines={1}>
                  Vendor: {item.vendor?.fullName || "Not available"}
                </Text>
              </View>

              <Switch
                value={!!item.isActive}
                onValueChange={value => toggleRestaurant(item.id, value)}
                thumbColor={item.isActive ? THEME.green : THEME.muted}
                trackColor={{ false: "#1F2937", true: "#173923" }}
              />
            </View>

            <View style={styles.statsRow}>
              <MiniStat label="Menu Items" value={(item.menuItems || []).length} />
              <MiniStat label="Status" value={item.isActive ? "Active" : "Inactive"} green={item.isActive} />
              <MiniStat label="Rating" value={item.rating || "0.0"} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const MiniStat = ({ label, value, green }: any) => (
  <View style={styles.miniStat}>
    <Text style={[styles.miniValue, green && { color: THEME.green }]}>{value}</Text>
    <Text style={styles.miniLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 10 },
  header: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 14 },
  title: { color: THEME.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyBox: { alignItems: "center" },
  emptyTitle: { color: THEME.text, fontSize: 19, fontWeight: "900", marginTop: 12 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 6 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#151407",
    borderWidth: 1,
    borderColor: "#3A3311",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  name: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  subText: { color: THEME.muted, marginTop: 3, fontSize: 12 },
  vendorText: { color: THEME.green, marginTop: 3, fontSize: 12, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 13,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "#0A0F0D",
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: { color: THEME.yellow, fontWeight: "900", fontSize: 15 },
  miniLabel: { color: THEME.muted, marginTop: 4, fontSize: 11 },
});