import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Vibration,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { io, Socket } from "socket.io-client";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  vendorService,
  VendorDashboard,
  VendorOrder,
  VendorOrderStatus,
} from "@/services/api/vendorService";

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  yellow: "#F6C343",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  orange: "#FB923C",
};

const PREP_TIMES = [15, 20, 25, 30, 40, 45];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const getSocketUrl = () => {
  const baseUrl = String(apiClient.defaults.baseURL || "").trim();
  return baseUrl.replace(/\/api\/?$/, "");
};

const getOrderNumber = (order?: VendorOrder | null) => {
  return order?.orderNumber || order?.order_number || order?.id?.slice(0, 8) || "-";
};

const getOrderTotal = (order?: VendorOrder | null) => {
  return Number(order?.totalAmount ?? order?.total_amount ?? 0);
};

const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PLACED: "New",
    ACCEPTED: "Accepted",
    ACCEPTED_BY_VENDOR: "Accepted",
    REJECTED: "Rejected",
    PREPARING: "Preparing",
    READY: "Ready",
    READY_FOR_PICKUP: "Ready",
    ASSIGNED_TO_RIDER: "Rider Assigned",
    PICKED_UP: "Picked",
    OUT_FOR_DELIVERY: "On Way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  return map[status || ""] || status || "-";
};

const isNewOrder = (status?: string) => status === "PLACED";

const mergeRecentOrders = (
  currentOrders: VendorOrder[],
  nextOrder: VendorOrder
): VendorOrder[] => {
  const exists = currentOrders.some((order) => order.id === nextOrder.id);

  if (exists) {
    return currentOrders.map((order) =>
      order.id === nextOrder.id ? { ...order, ...nextOrder } : order
    );
  }

  return [nextOrder, ...currentOrders];
};

export default function VendorDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const [incomingOrder, setIncomingOrder] = useState<VendorOrder | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast(msg);

    toastTimerRef.current = setTimeout(() => {
      setToast("");
    }, 2400);
  }, []);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      const { data, error } = await vendorService.getDashboard();

      if (error) {
        showToast(error?.message || "Failed to load dashboard");
      } else if (data) {
        setDashboard(data);

        const orderIds = (data.recentOrders || [])
          .filter((order) => Boolean(order?.id))
          .map((order) => order.id);

        seenOrderIdsRef.current = new Set([
          ...Array.from(seenOrderIdsRef.current),
          ...orderIds,
        ]);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [showToast]
  );

  useEffect(() => {
    loadDashboard();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      Vibration.cancel();
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (!user?.id) return;

    const socketUrl = getSocketUrl();

    if (!socketUrl) {
      showToast("Realtime URL missing");
      return;
    }

    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 1200,
      timeout: 12000,
      auth: {
        userId: user.id,
        role: user.role,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("joinVendorRoom", user.id);
      socket.emit("join_vendor_room", user.id);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    const handleNewOrder = (order: VendorOrder) => {
      if (!order?.id) {
        loadDashboard(true);
        return;
      }

      if (seenOrderIdsRef.current.has(order.id)) {
        setDashboard((prev) =>
          prev
            ? {
                ...prev,
                recentOrders: mergeRecentOrders(prev.recentOrders || [], order),
              }
            : prev
        );
        return;
      }

      seenOrderIdsRef.current.add(order.id);

      setIncomingOrder(order);
      setAlertVisible(true);

      Vibration.cancel();
      Vibration.vibrate([700, 400, 700, 400], true);

      showToast("New order received");

      setDashboard((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          todayOrders: Number(prev.todayOrders || 0) + 1,
          activeOrders: Number(prev.activeOrders || 0) + 1,
          recentOrders: mergeRecentOrders(prev.recentOrders || [], order),
        };
      });

      loadDashboard(true);
    };

    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("new_order", handleNewOrder);
    socket.on("ORDER_CREATED", handleNewOrder);

    socket.on("VENDOR_DASHBOARD_REFRESH", () => loadDashboard(true));
    socket.on("ORDER_STATUS_UPDATED", () => loadDashboard(true));
    socket.on("RIDER_ASSIGNED", () => loadDashboard(true));

    return () => {
      Vibration.cancel();
      socket.emit("leaveVendorRoom", user.id);
      socket.emit("leave_vendor_room", user.id);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("new_order", handleNewOrder);
      socket.off("ORDER_CREATED", handleNewOrder);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, user?.role, loadDashboard, showToast]);

  const recentOrders = dashboard?.recentOrders || [];
  const restaurant = dashboard?.restaurants?.[0];

  const newOrderCount = useMemo(() => {
    return recentOrders.filter((order) => isNewOrder(order.status)).length;
  }, [recentOrders]);

  const quickStats = useMemo(
    () => [
      {
        icon: "receipt-outline",
        label: "Today Orders",
        value: dashboard?.todayOrders || 0,
      },
      {
        icon: "cash-outline",
        label: "Today Revenue",
        value: money(dashboard?.todayRevenue),
      },
      {
        icon: "flame-outline",
        label: "Active Orders",
        value: dashboard?.activeOrders || 0,
      },
      {
        icon: "fast-food-outline",
        label: "Menu Items",
        value: dashboard?.totalMenuItems || 0,
      },
    ],
    [dashboard]
  );

  const closeAlert = () => {
    Vibration.cancel();
    setAlertVisible(false);
    setIncomingOrder(null);
  };

  const updateIncomingOrder = async (
    status: VendorOrderStatus,
    estimatedPreparationMinutes?: number,
    note?: string
  ) => {
    if (!incomingOrder || actionLoading) return;

    setActionLoading(true);

    const { data, error } = await vendorService.updateOrderStatus(
      incomingOrder.id,
      status,
      estimatedPreparationMinutes,
      note
    );

    if (error || !data) {
      showToast(error?.message || "Failed to update order");
      setActionLoading(false);
      return;
    }

    Vibration.cancel();
    setAlertVisible(false);
    setIncomingOrder(null);
    setActionLoading(false);

    showToast(status === "CANCELLED" ? "Order rejected" : "Order accepted");

    setDashboard((prev) => {
      if (!prev) return prev;

      const updatedOrders = (prev.recentOrders || []).map((order) =>
        order.id === data.id ? { ...order, ...data } : order
      );

      return {
        ...prev,
        recentOrders: updatedOrders,
      };
    });

    loadDashboard(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(true);
  };

  if (loading && !dashboard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading vendor dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon name="alert-circle" size={18} color={THEME.yellow} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.kicker}>Karto Vendor</Text>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.vendorName} numberOfLines={1}>
              {restaurant?.name || user?.fullName || user?.email || "Vendor"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.85}
            onPress={signOut}
          >
            <Icon name="log-out-outline" size={22} color={THEME.bg} />
          </TouchableOpacity>
        </View>

        <View style={styles.liveStrip}>
          <View style={[styles.liveDot, !socketConnected && styles.offlineDot]} />
          <Text style={styles.liveText}>
            {socketConnected
              ? "Realtime alerts active"
              : "Connecting realtime alerts..."}
          </Text>

          {newOrderCount > 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{newOrderCount} New</Text>
            </View>
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Today Revenue</Text>
            <Text style={styles.heroAmount}>{money(dashboard?.todayRevenue)}</Text>
            <Text style={styles.heroSub}>
              {dashboard?.todayOrders || 0} orders today •{" "}
              {dashboard?.activeOrders || 0} active
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="trending-up-outline" size={30} color={THEME.bg} />
          </View>
        </View>

        <View style={styles.storeCard}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeLabel}>Store Status</Text>
            <Text style={styles.storeName} numberOfLines={1}>
              {restaurant?.name || "Your Store"}
            </Text>
            <Text style={styles.storeMeta} numberOfLines={1}>
              {restaurant?.deliveryTime || "30-45 mins"} • Rating{" "}
              {restaurant?.rating || "0"}
            </Text>
          </View>

          <View style={[styles.openBadge, !restaurant?.isOpen && styles.closedBadge]}>
            <View style={[styles.dot, !restaurant?.isOpen && styles.dotClosed]} />
            <Text style={[styles.openText, !restaurant?.isOpen && styles.closedText]}>
              {restaurant?.isOpen ? "Open" : "Closed"}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {quickStats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="bag-check-outline"
            title="Orders"
            highlight
            badge={newOrderCount}
            onPress={() => navigation.navigate("VendorOrders")}
          />
          <QuickAction
            icon="fast-food-outline"
            title="Menu"
            onPress={() => navigation.navigate("VendorMenu")}
          />
          <QuickAction
            icon="pricetags-outline"
            title="Categories"
            onPress={() => navigation.navigate("VendorCategories")}
          />
          <QuickAction
            icon="card-outline"
            title="Payments"
            onPress={() => navigation.navigate("VendorPayments")}
          />
          <QuickAction
            icon="bar-chart-outline"
            title="Analytics"
            onPress={() => navigation.navigate("VendorAnalytics")}
          />
          <QuickAction
            icon="settings-outline"
            title="Settings"
            onPress={() => navigation.navigate("VendorSettings")}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("VendorOrders")}
          >
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt-outline" size={32} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No recent orders</Text>
            <Text style={styles.emptyText}>
              New customer orders will appear here instantly.
            </Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <OrderMiniCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate("VendorOrderDetail", { order })}
            />
          ))
        )}
      </ScrollView>

      <NewOrderModal
        visible={alertVisible}
        order={incomingOrder}
        loading={actionLoading}
        onClose={closeAlert}
        onAccept={(min) => updateIncomingOrder("ACCEPTED_BY_VENDOR", min)}
        onReject={() =>
          updateIncomingOrder("CANCELLED", undefined, "Rejected by vendor")
        }
      />
    </View>
  );
}

function NewOrderModal({
  visible,
  order,
  loading,
  onClose,
  onAccept,
  onReject,
}: {
  visible: boolean;
  order: VendorOrder | null;
  loading: boolean;
  onClose: () => void;
  onAccept: (min: number) => void;
  onReject: () => void;
}) {
  if (!order) return null;

  const orderNumber = getOrderNumber(order);
  const total = getOrderTotal(order);
  const items = order.items || [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <Pressable style={styles.alertBackdrop} onPress={onClose} />

        <View style={styles.alertCard}>
          <View style={styles.ringIcon}>
            <Icon name="notifications" size={36} color={THEME.bg} />
          </View>

          <Text style={styles.alertKicker}>New Order</Text>
          <Text style={styles.alertTitle}>#{orderNumber}</Text>
          <Text style={styles.alertAmount}>{money(total)}</Text>

          <View style={styles.alertInfoRow}>
            <View style={styles.alertInfoPill}>
              <Icon name="person-outline" size={14} color={THEME.yellow} />
              <Text style={styles.alertInfoText} numberOfLines={1}>
                {order.user?.fullName || "Customer"}
              </Text>
            </View>

            <View style={styles.alertInfoPill}>
              <Icon name="fast-food-outline" size={14} color={THEME.green} />
              <Text style={styles.alertInfoText}>{items.length} item(s)</Text>
            </View>
          </View>

          <View style={styles.alertItemsBox}>
            {items.slice(0, 4).map((item: any) => (
              <Text key={item.id} style={styles.alertItemLine} numberOfLines={1}>
                {item.quantity}x {item.menuItem?.name || item.itemName || "Item"}
              </Text>
            ))}

            {items.length > 4 && (
              <Text style={styles.alertMore}>+{items.length - 4} more items</Text>
            )}

            {!items.length && <Text style={styles.alertItemLine}>Items loading...</Text>}
          </View>

          <Text style={styles.prepTitle}>Choose preparation time</Text>

          <View style={styles.prepGrid}>
            {PREP_TIMES.map((min) => (
              <TouchableOpacity
                key={min}
                style={[styles.prepChip, loading && styles.disabledBtn]}
                activeOpacity={0.85}
                disabled={loading}
                onPress={() => onAccept(min)}
              >
                <Text style={styles.prepValue}>{min}</Text>
                <Text style={styles.prepLabel}>min</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.alertActions}>
            <TouchableOpacity
              style={[styles.rejectBtn, loading && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={loading}
              onPress={onReject}
            >
              <Icon name="close-circle" size={18} color={THEME.text} />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewBtn, loading && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={loading}
              onPress={onClose}
            >
              <Text style={styles.viewText}>Later</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.alertLoader}>
              <ActivityIndicator color={THEME.green} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={20} color={THEME.bg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, title, onPress, highlight, badge }: any) {
  return (
    <TouchableOpacity
      style={[styles.quickCard, highlight && styles.quickCardHighlight]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {!!badge && (
        <View style={styles.quickBadge}>
          <Text style={styles.quickBadgeText}>{badge}</Text>
        </View>
      )}

      <View style={[styles.quickIcon, highlight && styles.quickIconHighlight]}>
        <Icon name={icon} size={24} color={highlight ? THEME.bg : THEME.green} />
      </View>
      <Text style={[styles.quickText, highlight && styles.quickTextHighlight]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function OrderMiniCard({
  order,
  onPress,
}: {
  order: VendorOrder;
  onPress: () => void;
}) {
  const orderNumber = getOrderNumber(order);
  const total = getOrderTotal(order);

  return (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.orderIcon}>
        <Icon name="receipt-outline" size={20} color={THEME.yellow} />
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderTitle}>#{orderNumber}</Text>
        <Text style={styles.orderMeta} numberOfLines={1}>
          {order.user?.fullName || "Customer"} • {order.items?.length || 0} item(s)
        </Text>
      </View>

      <View style={styles.orderRight}>
        <Text style={styles.orderAmount}>{money(total)}</Text>
        <Text style={styles.statusText}>{statusLabel(order.status)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },

  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: "#101A10",
    borderWidth: 1,
    borderColor: THEME.yellow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerLeft: { flex: 1, paddingRight: 12 },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 2 },
  vendorName: { color: THEME.muted, marginTop: 5, fontWeight: "700" },
  logoutBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  liveStrip: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  liveDot: { width: 9, height: 9, borderRadius: 99, backgroundColor: THEME.green },
  offlineDot: { backgroundColor: THEME.danger },
  liveText: { color: THEME.text, fontWeight: "800", flex: 1, fontSize: 12 },
  newBadge: {
    backgroundColor: "rgba(246,195,67,0.14)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  newBadgeText: { color: THEME.yellow, fontWeight: "900", fontSize: 11 },

  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  heroContent: { flex: 1, paddingRight: 12 },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.8 },
  heroAmount: { color: THEME.bg, fontSize: 34, fontWeight: "900", marginTop: 5 },
  heroSub: { color: THEME.bg, marginTop: 5, fontWeight: "800", opacity: 0.8 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 23,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  storeCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  storeInfo: { flex: 1 },
  storeLabel: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
  },
  storeName: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 4 },
  storeMeta: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  openBadge: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  closedBadge: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: THEME.green },
  dotClosed: { backgroundColor: THEME.danger },
  openText: { color: THEME.green, fontWeight: "900", fontSize: 12 },
  closedText: { color: THEME.danger },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  statLabel: { color: THEME.muted, fontWeight: "700", marginTop: 4, fontSize: 12 },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  viewAll: { color: THEME.green, fontWeight: "900" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "31.8%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    position: "relative",
  },
  quickCardHighlight: { backgroundColor: THEME.green, borderColor: THEME.green },
  quickBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    zIndex: 2,
  },
  quickBadgeText: { color: THEME.text, fontSize: 11, fontWeight: "900" },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconHighlight: { backgroundColor: THEME.yellow },
  quickText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 9,
    textAlign: "center",
  },
  quickTextHighlight: { color: THEME.bg },

  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 5, fontWeight: "700" },

  orderCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: { flex: 1, minWidth: 0 },
  orderTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  orderMeta: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  orderRight: { alignItems: "flex-end" },
  orderAmount: { color: THEME.green, fontWeight: "900" },
  statusText: { color: THEME.yellow, marginTop: 4, fontSize: 12, fontWeight: "900" },

  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    padding: 18,
  },
  alertBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertCard: {
    backgroundColor: THEME.card,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: THEME.green,
    padding: 20,
    alignItems: "center",
  },
  ringIcon: {
    width: 86,
    height: 86,
    borderRadius: 32,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  alertKicker: {
    color: THEME.green,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  alertTitle: { color: THEME.text, fontSize: 28, fontWeight: "900", marginTop: 5 },
  alertAmount: { color: THEME.green, fontSize: 34, fontWeight: "900", marginTop: 5 },
  alertInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  alertInfoPill: {
    maxWidth: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.card2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  alertInfoText: { color: THEME.text, fontWeight: "800", fontSize: 12 },
  alertItemsBox: {
    width: "100%",
    backgroundColor: "#0B100B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 13,
    marginTop: 14,
  },
  alertItemLine: { color: THEME.text, fontWeight: "800", lineHeight: 22 },
  alertMore: { color: THEME.green, fontWeight: "900", marginTop: 4 },
  prepTitle: { color: THEME.text, fontWeight: "900", marginTop: 16, marginBottom: 10 },
  prepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, justifyContent: "center" },
  prepChip: {
    width: "30%",
    backgroundColor: "#0B100B",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: THEME.green,
    paddingVertical: 13,
    alignItems: "center",
  },
  prepValue: { color: THEME.green, fontSize: 20, fontWeight: "900" },
  prepLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  alertActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  rejectBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  rejectText: { color: THEME.text, fontWeight: "900" },
  viewBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  viewText: { color: THEME.text, fontWeight: "900" },
  alertLoader: { marginTop: 12 },
  disabledBtn: { opacity: 0.55 },
});
