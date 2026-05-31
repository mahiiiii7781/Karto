import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { orderService, Order } from "@/services/api/orderService";
import { useAuth } from "@/context/AuthContext";
import { requireLogin } from "@/utils/authGuard";
const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  greenDark: "#12351F",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  yellow: "#FACC15",
  black: "#041008",
};

type TabType = "ACTIVE" | "HISTORY";

const ACTIVE_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
];

const HISTORY_STATUSES = ["DELIVERED", "CANCELLED", "FAILED"];

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

 useFocusEffect(
  useCallback(() => {
    if (
      !requireLogin(
        user,
        navigation,
        "Please login to view your orders."
      )
    ) {
      navigation.goBack();
      return;
    }

    loadOrders(false);
  }, [user])
);
  const loadOrders = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    const { data, error } = await orderService.getMyOrders();

    if (error) {
      setOrders([]);
      Alert.alert("Error", error?.message || "Failed to load orders.");
    } else {
      setOrders(Array.isArray(data) ? data : []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(order.status || "PLACED").toUpperCase();

      if (activeTab === "ACTIVE") {
        return ACTIVE_STATUSES.includes(status);
      }

      return HISTORY_STATUSES.includes(status);
    });
  }, [orders, activeTab]);

  const activeCount = useMemo(() => {
    return orders.filter((x) =>
      ACTIVE_STATUSES.includes(String(x.status || "PLACED").toUpperCase())
    ).length;
  }, [orders]);

  const historyCount = Math.max(orders.length - activeCount, 0);

  const getOrderNumber = (order: Order) =>
    order.orderNumber || order.order_number || order.id?.slice(0, 8) || "ORDER";

  const getDate = (order: Order) => {
    const date = order.createdAt || order.created_at;
    if (!date) return "Recently";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAmount = (order: Order) =>
    Number(order.totalAmount ?? order.total_amount ?? 0).toFixed(2);

  const getRestaurantName = (order: any) =>
    order.restaurant?.name ||
    order.restaurant?.restaurantName ||
    order.restaurant?.restaurant_name ||
    order.vendor?.name ||
    "Karto Store";

  const getItemsCount = (order: Order) => {
    const items = order.items || order.orderItems || [];
    return Array.isArray(items)
      ? items.reduce((sum, x) => sum + Number(x.quantity || 0), 0)
      : 0;
  };

  const getStatusMeta = (statusRaw: string) => {
    const status = String(statusRaw || "PLACED").toUpperCase();

    switch (status) {
      case "PLACED":
        return { label: "Placed", icon: "receipt-outline", color: THEME.yellow };
      case "ACCEPTED":
        return { label: "Accepted", icon: "checkmark-done-outline", color: THEME.green };
      case "PREPARING":
        return { label: "Preparing", icon: "restaurant-outline", color: THEME.yellow };
      case "READY":
        return { label: "Ready", icon: "bag-check-outline", color: THEME.green };
      case "PICKED_UP":
      case "OUT_FOR_DELIVERY":
        return { label: "On the way", icon: "bicycle-outline", color: THEME.green };
      case "DELIVERED":
        return { label: "Delivered", icon: "checkmark-circle-outline", color: THEME.green };
      case "CANCELLED":
        return { label: "Cancelled", icon: "close-circle-outline", color: THEME.danger };
      default:
        return { label: status.replaceAll("_", " "), icon: "time-outline", color: THEME.muted };
    }
  };

  const canCancel = (order: Order) => {
    const status = String(order.status || "").toUpperCase();
    return ["PLACED", "ACCEPTED"].includes(status);
  };

  const cancelOrder = (order: Order) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancellingId(order.id);

          const { error } = await orderService.cancelOrder(order.id);

          setCancellingId(null);

          if (error) {
            Alert.alert("Error", error?.message || "Failed to cancel order.");
            return;
          }

          setOrders((prev) =>
            prev.map((x) =>
              x.id === order.id
                ? {
                    ...x,
                    status: "CANCELLED",
                  }
                : x
            )
          );
        },
      },
    ]);
  };

  const goToDetails = (order: Order) => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to view order details."
    )
  ) {
    return;
  }

  navigation.navigate("OrderDetail", {
    orderId: order.id,
    order,
  });
};

  const renderOrder = ({ item }: { item: Order }) => {
    const meta = getStatusMeta(item.status);
    const itemCount = getItemsCount(item);
    const isCancelling = cancellingId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => goToDetails(item)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNo}>Order #{getOrderNumber(item)}</Text>
            <Text style={styles.date}>{getDate(item)}</Text>
          </View>

          <View style={[styles.statusPill, { borderColor: meta.color }]}>
            <Icon name={meta.icon as any} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={styles.storeRow}>
          <View style={styles.storeIcon}>
            <Icon name="storefront-outline" size={20} color={THEME.green} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.storeName} numberOfLines={1}>
              {getRestaurantName(item)}
            </Text>
            <Text style={styles.itemCount}>
              {itemCount > 0 ? `${itemCount} items` : "Order items"}
            </Text>
          </View>
        </View>

        <View style={styles.timelineBox}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
          <Text style={styles.timelineText}>
            {activeTab === "ACTIVE"
              ? "We are working on your order"
              : meta.label === "Delivered"
              ? "Order completed successfully"
              : "Order is no longer active"}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount}>₹{getAmount(item)}</Text>
          </View>

          <View style={styles.actionRow}>
            {canCancel(item) && (
              <TouchableOpacity
                disabled={isCancelling}
                style={styles.cancelBtn}
                onPress={() => cancelOrder(item)}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color={THEME.danger} />
                ) : (
                  <Text style={styles.cancelText}>Cancel</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.trackBtn} onPress={() => goToDetails(item)}>
              <Text style={styles.trackText}>
                {activeTab === "ACTIVE" ? "Track" : "Details"}
              </Text>
              <Icon name="arrow-forward" size={16} color={THEME.black} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.muted}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>Track active and past orders</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to view your orders."
    )
  ) {
    return;
  }

  loadOrders(true);
}}>
          <Icon name="refresh" size={21} color={THEME.green} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ACTIVE" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ACTIVE")}
        >
          <Text style={[styles.tabText, activeTab === "ACTIVE" && styles.tabTextActive]}>
            Active
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{activeCount}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "HISTORY" && styles.tabBtnActive]}
          onPress={() => setActiveTab("HISTORY")}
        >
          <Text style={[styles.tabText, activeTab === "HISTORY" && styles.tabTextActive]}>
            History
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{historyCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to view your orders."
    )
  ) {
    return;
  }

  loadOrders(true);
}}
            tintColor={THEME.green}
          />
        }
        contentContainerStyle={
          filteredOrders.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt-outline" size={54} color={THEME.green} />
            </View>

            <Text style={styles.emptyTitle}>
              {activeTab === "ACTIVE" ? "No active orders" : "No order history"}
            </Text>

            <Text style={styles.emptyText}>
              {activeTab === "ACTIVE"
                ? "Your live orders will appear here."
                : "Delivered and cancelled orders will appear here."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bg,
  },

  muted: {
    color: THEME.muted,
    marginTop: 10,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 4,
  },

  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  tabs: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 5,
    flexDirection: "row",
    marginBottom: 10,
  },

  tabBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  tabBtnActive: {
    backgroundColor: THEME.green,
  },

  tabText: {
    color: THEME.muted,
    fontWeight: "900",
  },

  tabTextActive: {
    color: THEME.black,
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#07110B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  countText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
  },

  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 35,
  },

  emptyList: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 25,
  },

  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
  },

  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  orderNo: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },

  date: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  statusPill: {
    backgroundColor: "#07110B",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  storeName: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
  },

  itemCount: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },

  timelineBox: {
    marginTop: 16,
    backgroundColor: THEME.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: THEME.green,
  },

  timelineLine: {
    width: 28,
    height: 1,
    backgroundColor: "#173923",
    marginHorizontal: 8,
  },

  timelineText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },

  amountLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  amount: {
    color: THEME.green,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cancelBtn: {
    borderWidth: 1,
    borderColor: "#3F1717",
    backgroundColor: "#1B0E0E",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: "center",
  },

  cancelText: {
    color: THEME.danger,
    fontWeight: "900",
    fontSize: 12,
  },

  trackBtn: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  trackText: {
    color: THEME.black,
    fontWeight: "900",
    marginRight: 6,
  },
});