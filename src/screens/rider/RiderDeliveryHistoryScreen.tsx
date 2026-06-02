import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { riderService } from "@/services/api/riderApi";

const T = {
  bg: "#070A08",
  card: "#101713",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

export default function RiderDeliveryHistoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getOrderHistory();
      setOrders(res?.orders || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load delivery history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={T.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Delivery History</Text>
          <Text style={styles.sub}>{orders.length} completed/cancelled orders</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="time-outline" size={52} color={T.yellow} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Delivered orders will appear here.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => navigation?.navigate?.("RiderOrderDetail", { orderId: order.id })}
            >
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNo}>#{order.orderNumber || order.id?.slice(0, 8)}</Text>
                  <Text style={styles.store}>{order.restaurant?.name || "Karto Store"}</Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    order.status === "CANCELLED" && styles.cancelBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      order.status === "CANCELLED" && styles.cancelText,
                    ]}
                  >
                    {String(order.status || "").replaceAll("_", " ")}
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Info icon="cash-outline" label="Earning" value={money(order.deliveryFee)} />
                <Info icon="card-outline" label="Payment" value={order.paymentMethod || "COD"} />
                <Info icon="calendar-outline" label="Date" value={new Date(order.deliveredAt || order.updatedAt).toLocaleDateString()} />
              </View>

              <View style={styles.addressBox}>
                <Icon name="location-outline" size={17} color={T.green} />
                <Text style={styles.address} numberOfLines={1}>
                  {order.address?.address || "Customer address"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ icon, label, value }: any) {
  return (
    <View style={styles.infoItem}>
      <Icon name={icon} size={17} color={T.yellow} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: T.muted, marginTop: 12, fontWeight: "700" },

  toast: {
    position: "absolute",
    top: 44,
    left: 18,
    right: 18,
    zIndex: 99,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: T.black, fontWeight: "900", flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 25, fontWeight: "900" },
  sub: { color: T.muted, marginTop: 3 },

  empty: {
    marginTop: 60,
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: { color: T.text, fontWeight: "900", fontSize: 18, marginTop: 12 },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
  },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  orderNo: { color: T.text, fontSize: 17, fontWeight: "900" },
  store: { color: T.muted, marginTop: 4 },
  badge: {
    backgroundColor: "#102A1B",
    borderColor: "#1F6B3B",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  badgeText: { color: T.green, fontSize: 10, fontWeight: "900" },
  cancelBadge: {
    backgroundColor: "#2B1111",
    borderColor: "#7F1D1D",
  },
  cancelText: { color: T.danger },

  info: { flexDirection: "row", gap: 8, marginTop: 14 },
  infoItem: {
    flex: 1,
    backgroundColor: T.black,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoLabel: { color: T.muted, fontSize: 11, marginTop: 5 },
  infoValue: { color: T.text, fontSize: 12, fontWeight: "900", marginTop: 2 },

  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.black,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
  },
  address: { color: T.muted, flex: 1, fontSize: 13 },
});