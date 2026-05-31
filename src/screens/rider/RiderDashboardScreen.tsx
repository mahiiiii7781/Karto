// src/screens/rider/RiderDashboardScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#0B0F0D",
  card: "#111827",
  green: "#22C55E",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  border: "#1F2937",
  black: "#050807",
  danger: "#EF4444",
  warning: "#F59E0B",
};

export default function RiderDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [data, setData] = useState<any>({
    todayEarnings: 0,
    completedDeliveries: 0,
    activeDelivery: null,
    availableOrders: [],
  });

  const loadDashboard = async () => {
    try {
      const res = await apiClient.get("/riders/dashboard");
      setData(res.data.data || data);
      setOnline(!!res.data.data?.isOnline);
    } catch (error) {
      console.log("Rider dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async (value: boolean) => {
    setOnline(value);

    try {
      await apiClient.patch("/riders/availability", {
        isOnline: value,
      });
    } catch {
      setOnline(!value);
      Alert.alert("Error", "Could not update availability.");
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await apiClient.post(`/riders/orders/${orderId}/accept`);
      Alert.alert("Accepted", "Order assigned to you.");
      loadDashboard();
    } catch {
      Alert.alert("Error", "Could not accept order.");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading rider dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rider Dashboard</Text>
          <Text style={styles.subtitle}>
            {online ? "You are online and ready" : "Go online to receive orders"}
          </Text>
        </View>

        <View style={styles.onlineBox}>
          <Text style={styles.onlineText}>{online ? "Online" : "Offline"}</Text>
          <Switch
            value={online}
            onValueChange={toggleOnline}
            thumbColor={online ? THEME.green : THEME.muted}
            trackColor={{ false: "#1F2937", true: "#173923" }}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="cash-outline"
          title="Today Earnings"
          value={`₹${data.todayEarnings || 0}`}
        />
        <StatCard
          icon="checkmark-done-outline"
          title="Completed"
          value={data.completedDeliveries || 0}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="bicycle-outline"
          title="Available Orders"
          value={data.availableOrders?.length || 0}
        />
        <StatCard
          icon="time-outline"
          title="Active"
          value={data.activeDelivery ? 1 : 0}
        />
      </View>

      {data.activeDelivery && (
        <>
          <Text style={styles.sectionTitle}>Current Delivery</Text>
          <View style={styles.activeCard}>
            <View style={styles.iconCircle}>
              <Icon name="navigate-outline" size={24} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>
                Order #{data.activeDelivery.id?.slice(0, 8)}
              </Text>
              <Text style={styles.activeSub}>
                Pickup: {data.activeDelivery.restaurant?.name || "Store"}
              </Text>
              <Text style={styles.activeSub}>
                Drop: {data.activeDelivery.address?.address || "Customer address"}
              </Text>
            </View>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Available Orders</Text>

      {!online ? (
        <View style={styles.emptyBox}>
          <Icon name="power-outline" size={46} color={THEME.warning} />
          <Text style={styles.emptyTitle}>You are offline</Text>
          <Text style={styles.emptyText}>Turn online to start receiving delivery requests.</Text>
        </View>
      ) : data.availableOrders?.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="file-tray-outline" size={46} color={THEME.green} />
          <Text style={styles.emptyTitle}>No orders nearby</Text>
          <Text style={styles.emptyText}>New delivery requests will appear here.</Text>
        </View>
      ) : (
        data.availableOrders.map((order: any) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View>
                <Text style={styles.orderTitle}>Order #{order.id?.slice(0, 8)}</Text>
                <Text style={styles.orderSub}>
                  {order.restaurant?.name || "Karto Store"}
                </Text>
              </View>

              <Text style={styles.amount}>₹{order.deliveryFee || 30}</Text>
            </View>

            <View style={styles.locationRow}>
              <Icon name="storefront-outline" size={17} color={THEME.green} />
              <Text style={styles.locationText} numberOfLines={1}>
                Pickup: {order.restaurant?.address || "Store location"}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Icon name="location-outline" size={17} color={THEME.green} />
              <Text style={styles.locationText} numberOfLines={1}>
                Drop: {order.address?.address || "Customer location"}
              </Text>
            </View>

            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(order.id)}>
              <Text style={styles.acceptText}>Accept Order</Text>
              <Icon name="arrow-forward" size={18} color={THEME.black} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const StatCard = ({ icon, title, value }: any) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={23} color={THEME.green} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, padding: 20 },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 10 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { color: THEME.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 4, maxWidth: 210 },
  onlineBox: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  onlineText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 4,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statValue: {
    color: THEME.green,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
  },
  statLabel: { color: THEME.muted, marginTop: 4, fontSize: 12 },

  sectionTitle: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 12,
  },

  activeCard: {
    flexDirection: "row",
    backgroundColor: "#0A120E",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 20,
    padding: 15,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activeTitle: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  activeSub: { color: THEME.muted, marginTop: 4, fontSize: 12 },

  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
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
    lineHeight: 19,
  },

  orderCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  orderTitle: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  orderSub: { color: THEME.muted, marginTop: 4 },
  amount: { color: THEME.green, fontSize: 18, fontWeight: "900" },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  locationText: {
    color: THEME.muted,
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
  },

  acceptBtn: {
    backgroundColor: THEME.green,
    borderRadius: 15,
    paddingVertical: 13,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  acceptText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 15,
    marginRight: 8,
  },
});