import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { orderService, Order } from "@/services/api/orderService";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

type TabType = "ACTIVE" | "HISTORY";

const ACTIVE_STATUSES = [
  "PLACED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_RIDER",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
];

const HISTORY_STATUSES = ["DELIVERED", "CANCELLED", "REJECTED", "FAILED"];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const normalizeStatus = (statusRaw: any) => {
  const status = String(statusRaw || "PLACED").toUpperCase();

  switch (status) {
    case "ACCEPTED":
    case "VENDOR_ACCEPTED":
      return "ACCEPTED_BY_VENDOR";
    case "READY":
      return "READY_FOR_PICKUP";
    case "ASSIGNED":
    case "RIDER_ASSIGNED":
      return "ASSIGNED_TO_RIDER";
    case "PICKUP_DONE":
      return "PICKED_UP";
    case "ON_THE_WAY":
      return "OUT_FOR_DELIVERY";
    default:
      return status;
  }
};

const normalizeOrders = (res: any) => {
  const list =
    res?.data?.data?.orders ||
    res?.data?.orders ||
    res?.data?.data ||
    res?.data ||
    res ||
    [];

  return Array.isArray(list) ? list : [];
};

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  const isGuest = !user?.id;

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

  const requireAuth = (message = "Please sign in to continue.") => {
    if (!isGuest) return true;

    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (isGuest) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const res = await orderService.getMyOrders();
        const { error } = res || {};

        if (error) {
          setOrders([]);
          showToast(
            "error",
            "Unable to load orders",
            error?.message || "Please try again."
          );
          return;
        }

        setOrders(normalizeOrders(res));
      } catch {
        setOrders([]);
        showToast("error", "Unable to load orders", "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders(false);
    }, [loadOrders])
  );

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const status = normalizeStatus(order.status);

      if (activeTab === "ACTIVE") return ACTIVE_STATUSES.includes(status);
      return HISTORY_STATUSES.includes(status);
    });
  }, [orders, activeTab]);

  const activeCount = useMemo(() => {
    return orders.filter(order => ACTIVE_STATUSES.includes(normalizeStatus(order.status))).length;
  }, [orders]);

  const historyCount = useMemo(() => {
    return orders.filter(order => HISTORY_STATUSES.includes(normalizeStatus(order.status))).length;
  }, [orders]);

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

  const getAmount = (order: Order) => order.totalAmount ?? order.total_amount ?? 0;

  const getRestaurantName = (order: any) =>
    order.restaurant?.name ||
    order.restaurant?.restaurantName ||
    order.restaurant?.restaurant_name ||
    order.vendor?.fullName ||
    order.vendor?.name ||
    "Karto Store";

  const getItemsCount = (order: any) => {
    const items = order.items || order.orderItems || order.order_items || [];
    return Array.isArray(items)
      ? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;
  };

  const getStatusMeta = (statusRaw: string) => {
    const status = normalizeStatus(statusRaw);

    switch (status) {
      case "PLACED":
        return {
          label: "Order Placed",
          short: "Placed",
          icon: "receipt-outline",
          color: THEME.yellow,
          message: "Your order has been placed successfully.",
        };
      case "ACCEPTED_BY_VENDOR":
        return {
          label: "Accepted by Store",
          short: "Accepted",
          icon: "checkmark-done-outline",
          color: THEME.green,
          message: "The store has accepted your order.",
        };
      case "PREPARING":
        return {
          label: "Preparing",
          short: "Preparing",
          icon: "restaurant-outline",
          color: THEME.yellow,
          message: "Your order is being prepared.",
        };
      case "READY_FOR_PICKUP":
        return {
          label: "Ready for Pickup",
          short: "Ready",
          icon: "bag-check-outline",
          color: THEME.green,
          message: "Your order is ready for rider pickup.",
        };
      case "ASSIGNED_TO_RIDER":
        return {
          label: "Rider Assigned",
          short: "Assigned",
          icon: "person-add-outline",
          color: THEME.green,
          message: "A delivery partner has been assigned.",
        };
      case "PICKED_UP":
        return {
          label: "Picked Up",
          short: "Picked",
          icon: "cube-outline",
          color: THEME.green,
          message: "Your order has been picked up.",
        };
      case "OUT_FOR_DELIVERY":
        return {
          label: "Out for Delivery",
          short: "On the way",
          icon: "bicycle-outline",
          color: THEME.green,
          message: "Your order is on the way.",
        };
      case "DELIVERED":
        return {
          label: "Delivered",
          short: "Delivered",
          icon: "checkmark-circle-outline",
          color: THEME.green,
          message: "Order completed successfully.",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          short: "Cancelled",
          icon: "close-circle-outline",
          color: THEME.danger,
          message: "This order has been cancelled.",
        };
      default:
        return {
          label: status.replaceAll("_", " "),
          short: status.replaceAll("_", " "),
          icon: "time-outline",
          color: THEME.muted,
          message: "Order status updated.",
        };
    }
  };

  const canCancel = (order: Order) => {
    const status = normalizeStatus(order.status);
    return ["PLACED", "ACCEPTED_BY_VENDOR"].includes(status);
  };

  const confirmCancelOrder = (order: Order) => {
    if (!requireAuth("Please sign in to cancel your order.")) return;
    setCancelTarget(order);
  };

  const cancelOrder = async () => {
    if (!cancelTarget?.id || cancellingId) return;

    try {
      setCancellingId(cancelTarget.id);

      const { error } = await orderService.cancelOrder(
        cancelTarget.id,
        "Cancelled by customer"
      );

      if (error) {
        showToast(
          "error",
          "Unable to cancel order",
          error?.message || "Please try again."
        );
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === cancelTarget.id ? { ...order, status: "CANCELLED" } : order
        )
      );

      setCancelTarget(null);
      showToast("success", "Order cancelled", "Your order has been cancelled.");
    } catch {
      showToast("error", "Unable to cancel order", "Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const goToDetails = (order: Order) => {
    if (!requireAuth("Please sign in to view order details.")) return;

    navigation.navigate("OrderDetail", {
      orderId: order.id,
      order,
    });
  };

  const goExplore = () => {
    navigation.navigate("UserApp", { screen: "Home" });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const meta = getStatusMeta(item.status);
    const itemCount = getItemsCount(item);
    const isCancelling = cancellingId === item.id;
    const paymentStatus = String(
      item.paymentStatus || item.payment_status || "PENDING"
    ).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => goToDetails(item)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNo}>Order #{getOrderNumber(item)}</Text>
            <Text style={styles.date}>{getDate(item)}</Text>
          </View>

          <View style={[styles.statusPill, { borderColor: meta.color }]}> 
            <Icon name={meta.icon as any} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}> {meta.short} </Text>
          </View>
        </View>

        <View style={styles.storeRow}>
          <View style={styles.storeIcon}>
            <Icon name="storefront-outline" size={21} color={THEME.green} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.storeName} numberOfLines={1}>
              {getRestaurantName(item)}
            </Text>
            <Text style={styles.itemCount}>
              {itemCount > 0
                ? `${itemCount} item${itemCount > 1 ? "s" : ""}`
                : "Order items"}
            </Text>
          </View>
        </View>

        <View style={styles.timelineBox}>
          <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
          <View style={styles.timelineLine} />
          <Text style={styles.timelineText}>{meta.message}</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text
              style={[
                styles.metaValue,
                paymentStatus === "PAID" && { color: THEME.green },
                paymentStatus === "FAILED" && { color: THEME.danger },
              ]}
            >
              {paymentStatus}
            </Text>
          </View>

          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={[styles.metaValue, { color: meta.color }]}>{meta.short}</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amount}>{money(getAmount(item))}</Text>
          </View>

          <View style={styles.actionRow}>
            {canCancel(item) && (
              <TouchableOpacity
                disabled={isCancelling}
                style={styles.cancelBtn}
                onPress={() => confirmCancelOrder(item)}
                activeOpacity={0.85}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color={THEME.danger} />
                ) : (
                  <Text style={styles.cancelText}>Cancel</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => goToDetails(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.trackText}>{activeTab === "ACTIVE" ? "Track" : "Details"}</Text>
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
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.muted}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>
            {isGuest ? "Login to track orders" : "Track active orders and order history"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            if (!requireAuth("Please sign in to view your orders.")) return;
            loadOrders(true);
          }}
          activeOpacity={0.85}
        >
          <Icon name="refresh" size={21} color={THEME.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>KARTO ORDER TRACKING</Text>
          <Text style={styles.heroTitle}>
            {isGuest
              ? "Login to view orders"
              : activeCount > 0
              ? `${activeCount} active order${activeCount > 1 ? "s" : ""}`
              : "No active orders"}
          </Text>
          <Text style={styles.heroSub}>Live updates from store acceptance to delivery.</Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="bicycle-outline" size={34} color={THEME.black} />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ACTIVE" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ACTIVE")}
          activeOpacity={0.85}
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
          activeOpacity={0.85}
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
        keyExtractor={(item, index) => item?.id || String(index)}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (!requireAuth("Please sign in to view your orders.")) return;
              loadOrders(true);
            }}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={isGuest ? "person-circle-outline" : activeTab === "ACTIVE" ? "receipt-outline" : "archive-outline"}
                size={54}
                color={THEME.yellow}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {isGuest
                ? "Login to view orders"
                : activeTab === "ACTIVE"
                ? "No active orders"
                : "No order history"}
            </Text>

            <Text style={styles.emptyText}>
              {isGuest
                ? "Your active and past orders will appear here after login."
                : activeTab === "ACTIVE"
                ? "Your live orders will appear here once you place an order."
                : "Delivered and cancelled orders will appear here."}
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={isGuest ? () => navigation.navigate("Auth") : goExplore}
              activeOpacity={0.9}
            >
              <Text style={styles.exploreText}>{isGuest ? "Login / Signup" : "Explore Stores"}</Text>
              <Icon name="arrow-forward" size={17} color={THEME.black} />
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="close-circle-outline" size={31} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Cancel order?</Text>
            <Text style={styles.confirmText}>
              This action will request cancellation for Order #{cancelTarget ? getOrderNumber(cancelTarget) : ""}.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setCancelTarget(null)}
                disabled={!!cancellingId}
              >
                <Text style={styles.keepText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelConfirmBtn}
                onPress={cancelOrder}
                disabled={!!cancellingId}
              >
                {cancellingId ? (
                  <ActivityIndicator color={THEME.black} />
                ) : (
                  <Text style={styles.cancelConfirmText}>Cancel Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
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
    paddingTop: Platform.OS === "ios" ? 54 : 28,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "700",
    lineHeight: 19,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
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
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
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
  tabBtnActive: { backgroundColor: THEME.green },
  tabText: { color: THEME.muted, fontWeight: "900" },
  tabTextActive: { color: THEME.black },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { color: THEME.green, fontWeight: "900", fontSize: 11 },
  list: { padding: 20, paddingTop: 8, paddingBottom: 35 },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  emptyBox: { alignItems: "center", paddingHorizontal: 25 },
  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 36,
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
    fontWeight: "700",
  },
  exploreBtn: {
    marginTop: 20,
    backgroundColor: THEME.green,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  exploreText: { color: THEME.black, fontWeight: "900" },
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
  orderNo: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  date: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "700" },
  statusPill: {
    backgroundColor: THEME.black,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusText: { fontSize: 11, fontWeight: "900" },
  storeRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  storeName: { color: THEME.text, fontSize: 15, fontWeight: "900" },
  itemCount: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
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
  timelineDot: { width: 9, height: 9, borderRadius: 5 },
  timelineLine: {
    width: 28,
    height: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 8,
  },
  timelineText: { flex: 1, color: THEME.muted, fontSize: 12, fontWeight: "800" },
  metaGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  metaBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  metaValue: { color: THEME.text, fontSize: 13, fontWeight: "900", marginTop: 3 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },
  amountLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  amount: { color: THEME.green, fontSize: 21, fontWeight: "900", marginTop: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  cancelText: { color: THEME.danger, fontWeight: "900", fontSize: 12 },
  trackBtn: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  trackText: { color: THEME.black, fontWeight: "900", marginRight: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: { color: THEME.text, fontWeight: "900" },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelConfirmText: { color: THEME.black, fontWeight: "900" },
});
