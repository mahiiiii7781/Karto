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
import { riderService } from "@/services/api/riderService";

const T = {
  bg: "#070A08",
  card: "#101713",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#030504",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;
const shortId = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "ORDER");

export default function RiderActiveOrdersScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadOrders = useCallback(async () => {
    try {
      const res = await riderService.getActiveOrders();
      setOrders(res?.orders || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load active orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const nextAction = async (order: any) => {
    setBusyId(order.id);
    try {
      if (order.status === "ASSIGNED_TO_RIDER") {
        await riderService.markPicked(order.id);
        showToast("Order marked as picked");
      } else if (order.status === "PICKED_UP") {
        await riderService.startDelivery(order.id);
        showToast("Delivery started");
      } else if (order.status === "OUT_FOR_DELIVERY") {
        await riderService.completeOrder(order.id);
        showToast("Order completed");
      }
      loadOrders();
    } catch (e: any) {
      showToast(e?.message || "Action failed");
    } finally {
      setBusyId("");
    }
  };

  const actionLabel = (status: string) => {
    if (status === "ASSIGNED_TO_RIDER") return "Mark Picked";
    if (status === "PICKED_UP") return "Start Delivery";
    if (status === "OUT_FOR_DELIVERY") return "Complete Order";
    return "View";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading active deliveries...</Text>
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
          <Text style={styles.title}>Active Orders</Text>
          <Text style={styles.sub}>{orders.length} running deliveries</Text>
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
            <Icon name="bicycle-outline" size={52} color={T.yellow} />
            <Text style={styles.emptyTitle}>No active delivery</Text>
            <Text style={styles.emptyText}>Accepted orders will appear here.</Text>
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
                <View>
                  <Text style={styles.orderNo}>#{order.orderNumber || shortId(order.id)}</Text>
                  <Text style={styles.store}>{order.restaurant?.name || "Karto Store"}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(order.status || "").replaceAll("_", " ")}</Text>
                </View>
              </View>

              <View style={styles.routeBox}>
                <RouteLine icon="storefront-outline" title="Pickup" value={order.restaurant?.address || order.restaurant?.name || "Store address"} />
                <View style={styles.dash} />
                <RouteLine icon="location-outline" title="Drop" value={order.address?.address || "Customer address"} />
              </View>

              <View style={styles.metaRow}>
                <Meta icon="cash-outline" label="Fee" value={money(order.deliveryFee)} />
                <Meta icon="card-outline" label="Payment" value={order.paymentMethod || "COD"} />
                <Meta icon="bag-handle-outline" label="Items" value={order.items?.length || 0} />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => navigation?.navigate?.("RiderOrderDetail", { orderId: order.id })}
                >
                  <Text style={styles.detailText}>Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={busyId === order.id}
                  style={styles.mainBtn}
                  onPress={() => nextAction(order)}
                >
                  {busyId === order.id ? (
                    <ActivityIndicator size="small" color={T.black} />
                  ) : (
                    <>
                      <Text style={styles.mainBtnText}>{actionLabel(order.status)}</Text>
                      <Icon name="arrow-forward" size={18} color={T.black} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteLine({ icon, title, value }: any) {
  return (
    <View style={styles.routeLine}>
      <View style={styles.routeIcon}>
        <Icon name={icon} size={18} color={T.yellow} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.routeTitle}>{title}</Text>
        <Text style={styles.routeValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function Meta({ icon, label, value }: any) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={17} color={T.green} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: T.muted, marginTop: 12, fontWeight: "700" },
  container: { flex: 1, padding: 18 },

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
  sub: { color: T.muted, marginTop: 3, fontSize: 13 },

  empty: {
    marginTop: 60,
    backgroundColor: T.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: T.border,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: { color: T.text, fontSize: 19, fontWeight: "900", marginTop: 14 },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
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
    maxWidth: 135,
  },
  badgeText: { color: T.green, fontSize: 10, fontWeight: "900", textAlign: "center" },

  routeBox: {
    backgroundColor: T.black,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    marginTop: 14,
  },
  routeLine: { flexDirection: "row", alignItems: "center", gap: 11 },
  routeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2B2207",
    alignItems: "center",
    justifyContent: "center",
  },
  routeTitle: { color: T.text, fontWeight: "900", fontSize: 13 },
  routeValue: { color: T.muted, marginTop: 2, fontSize: 12 },
  dash: {
    width: 1,
    height: 16,
    backgroundColor: T.border,
    marginLeft: 17,
    marginVertical: 5,
  },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  meta: {
    flex: 1,
    backgroundColor: "#0B100D",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  metaLabel: { color: T.muted, fontSize: 11, marginTop: 5 },
  metaValue: { color: T.text, fontSize: 13, fontWeight: "900", marginTop: 2 },

  actions: { flexDirection: "row", gap: 10, marginTop: 15 },
  detailBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: T.yellow,
    alignItems: "center",
  },
  detailText: { color: T.yellow, fontWeight: "900" },
  mainBtn: {
    flex: 1.5,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mainBtnText: { color: T.black, fontWeight: "900" },
});