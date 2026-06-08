import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  card2: "#0D120F",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const shortId = (id?: string) =>
  id ? id.slice(0, 8).toUpperCase() : "ORDER";

const safeDate = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const safeTime = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const statusText = (status?: string) =>
  String(status || "UNKNOWN").replaceAll("_", " ");

const getVendor = (order: any) => order?.vendor || order?.restaurant || {};

const getCustomer = (order: any) => order?.customer || order?.user || {};

const getAddress = (address: any) =>
  address?.address ||
  address?.addressLine ||
  address?.fullAddress ||
  address?.street ||
  address?.landmark ||
  address?.city ||
  "Customer address";

const getDropAddress = (order: any) =>
  getAddress(order?.deliveryAddress || order?.address);

export default function RiderDeliveryHistoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "DELIVERED" | "CANCELLED">("ALL");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getOrderHistory();

      if (res?.error) {
        setOrders([]);
        showToast(res?.error?.message || "Failed to load delivery history");
        return;
      }

      setOrders(res?.data || []);
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

  const deliveredOrders = orders.filter((x) => x?.status === "DELIVERED");
  const cancelledOrders = orders.filter((x) => x?.status === "CANCELLED");

  const filteredOrders = useMemo(() => {
    if (filter === "DELIVERED") return deliveredOrders;
    if (filter === "CANCELLED") return cancelledOrders;
    return orders;
  }, [filter, orders]);

  const totalEarned = deliveredOrders.reduce(
    (sum, order) => sum + Number(order?.deliveryFee || 0),
    0
  );

  const totalDistance = deliveredOrders.reduce(
    (sum, order) => sum + Number(order?.distanceKm || 0),
    0
  );

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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Delivery History</Text>
          <Text style={styles.sub}>
            {orders.length} completed/cancelled orders
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Total Delivered Earnings</Text>
            <Text style={styles.summaryAmount}>{money(totalEarned)}</Text>
            <Text style={styles.summarySub}>
              {deliveredOrders.length} delivered • {totalDistance.toFixed(1)} km
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Icon name="checkmark-done" size={28} color={T.black} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat
            icon="checkmark-circle-outline"
            title="Delivered"
            value={deliveredOrders.length}
          />
          <MiniStat
            icon="close-circle-outline"
            title="Cancelled"
            value={cancelledOrders.length}
          />
          <MiniStat
            icon="cash-outline"
            title="Avg Earn"
            value={
              deliveredOrders.length
                ? money(totalEarned / deliveredOrders.length)
                : money(0)
            }
          />
        </View>

        <View style={styles.filterRow}>
          <FilterChip
            title="All"
            active={filter === "ALL"}
            onPress={() => setFilter("ALL")}
          />
          <FilterChip
            title="Delivered"
            active={filter === "DELIVERED"}
            onPress={() => setFilter("DELIVERED")}
          />
          <FilterChip
            title="Cancelled"
            active={filter === "CANCELLED"}
            onPress={() => setFilter("CANCELLED")}
          />
        </View>

        {filteredOrders.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="time-outline" size={52} color={T.yellow} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>
              Delivered or cancelled orders will appear here.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const vendor = getVendor(order);
            const customer = getCustomer(order);
            const isCancelled = order.status === "CANCELLED";
            const dateValue =
              order.deliveredAt ||
              order.cancelledAt ||
              order.updatedAt ||
              order.createdAt;

            return (
              <TouchableOpacity
                key={order.id}
                activeOpacity={0.9}
                style={styles.card}
                onPress={() =>
                  navigation?.navigate?.("RiderOrderDetail", {
                    orderId: order.id,
                    order,
                  })
                }
              >
                <View style={styles.top}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNo}>
                      #{order.orderNumber || shortId(order.id)}
                    </Text>
                    <Text style={styles.store}>
                      {vendor?.name || "Karto Store"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      isCancelled && styles.cancelBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isCancelled && styles.cancelText,
                      ]}
                    >
                      {statusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.info}>
                  <Info
                    icon="cash-outline"
                    label="Earning"
                    value={isCancelled ? money(0) : money(order.deliveryFee)}
                  />
                  <Info
                    icon="card-outline"
                    label="Payment"
                    value={order.paymentMethod || "COD"}
                  />
                  <Info
                    icon="bicycle-outline"
                    label="Distance"
                    value={
                      order.distanceKm
                        ? `${Number(order.distanceKm).toFixed(1)} km`
                        : "-"
                    }
                  />
                </View>

                <View style={styles.info}>
                  <Info
                    icon="calendar-outline"
                    label="Date"
                    value={safeDate(dateValue)}
                  />
                  <Info
                    icon="time-outline"
                    label="Time"
                    value={safeTime(dateValue)}
                  />
                  <Info
                    icon="bag-handle-outline"
                    label="Items"
                    value={order.items?.length || 0}
                  />
                </View>

                <View style={styles.addressBox}>
                  <Icon name="location-outline" size={17} color={T.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressTitle}>
                      {customer?.name || customer?.fullName || "Customer"}
                    </Text>
                    <Text style={styles.address} numberOfLines={1}>
                      {getDropAddress(order)}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomRow}>
                  <Text style={styles.orderAmount}>
                    Order {money(order.totalAmount)}
                  </Text>
                  <Text style={styles.viewText}>View Details</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ icon, title, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={19} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

function FilterChip({ title, active, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
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
  refreshBtn: {
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

  summaryCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryLabel: {
    color: T.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  summaryAmount: {
    color: T.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 5,
  },
  summarySub: {
    color: T.green,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  summaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  miniValue: {
    color: T.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  miniTitle: {
    color: T.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  filterText: {
    color: T.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: T.black,
  },

  empty: {
    marginTop: 60,
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: T.text,
    fontWeight: "900",
    fontSize: 18,
    marginTop: 12,
  },
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
    gap: 10,
    backgroundColor: T.black,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
  },
  addressTitle: {
    color: T.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
  },
  address: { color: T.muted, flex: 1, fontSize: 13 },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    alignItems: "center",
  },
  orderAmount: {
    color: T.green,
    fontWeight: "900",
    fontSize: 13,
  },
  viewText: {
    color: T.yellow,
    fontWeight: "900",
    fontSize: 13,
  },
});