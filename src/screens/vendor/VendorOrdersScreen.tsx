import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  VendorOrder,
  VendorOrderStatus,
} from "@/services/api/vendorService";

type FilterStatus = "ALL" | VendorOrderStatus;
type RiderItem = {
  id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  isAvailable?: boolean;
  currentStatus?: string;
};

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  yellow: "#F6C343",
  green: "#22C55E",
  greenDark: "#15803D",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  warning: "#F59E0B",
};

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PLACED", label: "New" },
  { key: "ACCEPTED_BY_VENDOR", label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY_FOR_PICKUP", label: "Ready" },
  { key: "ASSIGNED_TO_RIDER", label: "Rider" },
  { key: "OUT_FOR_DELIVERY", label: "On Way" },
  { key: "DELIVERED", label: "Done" },
  { key: "CANCELLED", label: "Cancel" },
];

const PREP_TIMES = [15, 20, 25, 30, 40, 45];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const formatTime = (date?: string) => {
  if (!date) return "-";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSocketUrl = () => {
  const base = String(apiClient.defaults.baseURL || "");
  return base.replace(/\/api\/?$/, "");
};

const statusLabel = (status: VendorOrderStatus) => {
  const map: Record<string, string> = {
    PLACED: "New Order",
    ACCEPTED: "Accepted",
    ACCEPTED_BY_VENDOR: "Accepted",
    REJECTED: "Rejected",
    PREPARING: "Preparing",
    READY: "Ready",
    READY_FOR_PICKUP: "Ready",
    ASSIGNED_TO_RIDER: "Rider Assigned",
    PICKED_UP: "Picked Up",
    OUT_FOR_DELIVERY: "On The Way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
};

const isActiveStatus = (status: string) =>
  [
    "PLACED",
    "ACCEPTED_BY_VENDOR",
    "ACCEPTED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "READY",
    "ASSIGNED_TO_RIDER",
  ].includes(status);

const canAssignRider = (status: string) =>
  ["READY_FOR_PICKUP", "READY", "ASSIGNED_TO_RIDER"].includes(status);

export default function VendorOrdersScreen({ navigation }: any) {
  const { user } = useAuth();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [prepModal, setPrepModal] = useState(false);
  const [riderModal, setRiderModal] = useState(false);
  const [riders, setRiders] = useState<RiderItem[]>([]);
  const [riderLoading, setRiderLoading] = useState(false);

  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const upsertOrder = useCallback((order: VendorOrder) => {
    if (!order?.id) return;
    setOrders((prev) => {
      const exists = prev.some((item) => item.id === order.id);
      if (exists) {
        return prev.map((item) => (item.id === order.id ? { ...item, ...order } : item));
      }
      return [order, ...prev];
    });
  }, []);

  const loadOrders = useCallback(async () => {
    const { data, error } = await vendorService.getOrders();

    if (error) {
      showToast(error?.message || "Failed to load orders");
    } else {
      const nextOrders = data || [];
      seenOrderIdsRef.current = new Set(nextOrders.map((order) => order.id));
      setOrders(nextOrders);
    }

    setLoading(false);
    setRefreshing(false);
  }, [showToast]);

  useEffect(() => {
    loadOrders();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      Vibration.cancel();
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!user?.id) return;

    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 1200,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("joinVendorRoom", user.id);
    });

    socket.on("disconnect", () => setSocketConnected(false));

    const handleNewOrder = (order: VendorOrder) => {
      if (!order?.id) {
        loadOrders();
        return;
      }

      const alreadySeen = seenOrderIdsRef.current.has(order.id);
      seenOrderIdsRef.current.add(order.id);
      upsertOrder(order);

      if (!alreadySeen) {
        Vibration.vibrate([550, 250, 550]);
        showToast("New order received");
      }
    };

    const handleOrderUpdate = (order: VendorOrder) => {
      if (order?.id) upsertOrder(order);
      else loadOrders();
    };

    socket.on("NEW_ORDER", handleNewOrder);
    socket.on("newOrder", handleNewOrder);
    socket.on("ORDER_UPDATED", handleOrderUpdate);
    socket.on("orderUpdated", handleOrderUpdate);
    socket.on("VENDOR_DASHBOARD_REFRESH", loadOrders);
    socket.on("VENDOR_ORDERS_REFRESH", loadOrders);

    return () => {
      socket.emit("leaveVendorRoom", user.id);
      socket.off("NEW_ORDER", handleNewOrder);
      socket.off("newOrder", handleNewOrder);
      socket.off("ORDER_UPDATED", handleOrderUpdate);
      socket.off("orderUpdated", handleOrderUpdate);
      socket.off("VENDOR_DASHBOARD_REFRESH", loadOrders);
      socket.off("VENDOR_ORDERS_REFRESH", loadOrders);
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [loadOrders, showToast, upsertOrder, user?.id]);

  const visibleOrders = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    return {
      new: orders.filter((order) => order.status === "PLACED").length,
      active: orders.filter((order) => isActiveStatus(order.status)).length,
      ready: orders.filter((order) => ["READY_FOR_PICKUP", "READY"].includes(order.status)).length,
    };
  }, [orders]);

  const updateStatus = async (
    order: VendorOrder,
    status: VendorOrderStatus,
    estimatedPreparationMinutes?: number,
    note?: string
  ) => {
    if (actionOrderId) return;

    setActionOrderId(order.id);

    const { data, error } = await vendorService.updateOrderStatus(
      order.id,
      status,
      estimatedPreparationMinutes,
      note
    );

    if (error || !data) {
      showToast(error?.message || "Failed to update order");
      setActionOrderId(null);
      return;
    }

    upsertOrder(data);
    setPrepModal(false);
    setSelectedOrder(null);
    setActionOrderId(null);
    showToast(status === "CANCELLED" ? "Order rejected" : "Order updated successfully");
  };

  const openPrepModal = (order: VendorOrder) => {
    setSelectedOrder(order);
    setPrepModal(true);
  };

  const openRiderModal = async (order: VendorOrder) => {
    setSelectedOrder(order);
    setRiderModal(true);
    setRiderLoading(true);

    const service: any = vendorService as any;

    if (typeof service.getAvailableRiders !== "function") {
      setRiders([]);
      setRiderLoading(false);
      showToast("Rider API not connected in vendorService");
      return;
    }

    const { data, error } = await service.getAvailableRiders();
    if (error) {
      showToast(error?.message || "Failed to load riders");
      setRiders([]);
    } else {
      setRiders(data || []);
    }
    setRiderLoading(false);
  };

  const assignRider = async (rider: RiderItem) => {
    if (!selectedOrder || actionOrderId) return;

    const service: any = vendorService as any;

    if (typeof service.assignRider !== "function") {
      showToast("Assign rider API not connected in vendorService");
      return;
    }

    setActionOrderId(selectedOrder.id);
    const { data, error } = await service.assignRider(selectedOrder.id, rider.id);

    if (error || !data) {
      showToast(error?.message || "Rider assignment failed");
      setActionOrderId(null);
      return;
    }

    upsertOrder(data);
    setRiderModal(false);
    setSelectedOrder(null);
    setActionOrderId(null);
    showToast("Rider assigned successfully");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading vendor orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon name="checkmark-circle" size={18} color={THEME.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Karto Vendor</Text>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Manage live orders, prep time and riders.</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          activeOpacity={0.85}
          onPress={() => {
            setRefreshing(true);
            loadOrders();
          }}
        >
          <Icon name="refresh" size={19} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.liveStrip}>
        <View style={[styles.liveDot, !socketConnected && styles.offlineDot]} />
        <Text style={styles.liveText}>
          {socketConnected ? "Realtime order sync active" : "Realtime reconnecting..."}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard label="New" value={counts.new} icon="notifications" />
        <SummaryCard label="Active" value={counts.active} icon="flame" />
        <SummaryCard label="Ready" value={counts.ready} icon="bag-check" />
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => {
          const active = filter === item.key;
          const count = item.key === "ALL" ? orders.length : orders.filter((o) => o.status === item.key).length;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}{count ? ` ${count}` : ""}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOrders();
            }}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt-outline" size={34} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>New customer orders will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            actionLoading={actionOrderId === item.id}
            onPress={() => navigation?.navigate?.("VendorOrderDetail", { order: item })}
            onAccept={() => openPrepModal(item)}
            onReject={() => updateStatus(item, "CANCELLED", undefined, "Cancelled by vendor")}
            onPreparing={() => updateStatus(item, "PREPARING")}
            onReady={() => updateStatus(item, "READY_FOR_PICKUP")}
            onAssignRider={() => openRiderModal(item)}
          />
        )}
        contentContainerStyle={styles.orderList}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />

      <Modal visible={prepModal} transparent animationType="fade" onRequestClose={() => setPrepModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPrepModal(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Set preparation time</Text>
            <Text style={styles.modalSub}>Choose how much time this order will take.</Text>

            <View style={styles.prepGrid}>
              {PREP_TIMES.map((min) => (
                <TouchableOpacity
                  key={min}
                  activeOpacity={0.85}
                  style={styles.prepChip}
                  disabled={!!actionOrderId}
                  onPress={() => {
                    if (selectedOrder) updateStatus(selectedOrder, "ACCEPTED_BY_VENDOR", min);
                  }}
                >
                  <Text style={styles.prepValue}>{min}</Text>
                  <Text style={styles.prepLabel}>min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPrepModal(false)}
              activeOpacity={0.85}
              disabled={!!actionOrderId}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <RiderModal
        visible={riderModal}
        riders={riders}
        loading={riderLoading}
        assigning={!!actionOrderId}
        order={selectedOrder}
        onClose={() => {
          setRiderModal(false);
          setSelectedOrder(null);
        }}
        onAssign={assignRider}
      />
    </View>
  );
}

function SummaryCard({ label, value, icon }: any) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Icon name={icon} size={17} color={THEME.bg} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function OrderCard({
  order,
  onPress,
  onAccept,
  onReject,
  onPreparing,
  onReady,
  onAssignRider,
  actionLoading,
}: any) {
  const orderNumber = order.orderNumber || order.order_number || order.id?.slice(0, 8);
  const total = Number(order.totalAmount ?? order.total_amount ?? 0);
  const items = order.items || [];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.cardGlow} />

      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNumber}>#{orderNumber}</Text>
          <Text style={styles.customer}>
            {order.user?.fullName || "Customer"} • {order.user?.phone || "No phone"}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{statusLabel(order.status)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Icon name="time-outline" size={14} color={THEME.yellow} />
          <Text style={styles.metaText}>{formatTime(order.createdAt || order.created_at)}</Text>
        </View>

        <View style={styles.metaPill}>
          <Icon name="restaurant-outline" size={14} color={THEME.green} />
          <Text style={styles.metaText}>Prep {order.estimatedPreparationMinutes || "-"} min</Text>
        </View>

        {!!order.rider && (
          <View style={styles.metaPill}>
            <Icon name="bicycle-outline" size={14} color={THEME.green} />
            <Text style={styles.metaText}>{order.rider?.fullName || "Rider assigned"}</Text>
          </View>
        )}
      </View>

      <View style={styles.itemsBox}>
        {items.slice(0, 3).map((i: any) => (
          <Text key={i.id} style={styles.itemLine}>
            {i.quantity}x {i.menuItem?.name || i.itemName || "Item"}
          </Text>
        ))}

        {items.length > 3 && <Text style={styles.moreItems}>+{items.length - 3} more items</Text>}
        {!items.length && <Text style={styles.itemLine}>No item details</Text>}
      </View>

      {!!order.customerNote && (
        <View style={styles.noteBox}>
          <Icon name="chatbubble-ellipses-outline" size={15} color={THEME.yellow} />
          <Text style={styles.noteText}>{order.customerNote}</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <Text style={styles.amount}>{money(total)}</Text>
        <Text style={styles.payment}>{order.paymentMethod || order.payment_method || "COD"}</Text>
      </View>

      <View style={styles.actions}>
        {order.status === "PLACED" && (
          <>
            <ActionBtn title="Accept" icon="checkmark" onPress={onAccept} filled disabled={actionLoading} />
            <ActionBtn title="Reject" icon="close" onPress={onReject} danger disabled={actionLoading} />
          </>
        )}

        {["ACCEPTED_BY_VENDOR", "ACCEPTED"].includes(order.status) && (
          <ActionBtn title="Start Preparing" icon="flame-outline" onPress={onPreparing} filled disabled={actionLoading} />
        )}

        {order.status === "PREPARING" && (
          <ActionBtn title="Mark Ready" icon="bag-check-outline" onPress={onReady} filled disabled={actionLoading} />
        )}

        {canAssignRider(order.status) && (
          <ActionBtn
            title={order.rider ? "Reassign Rider" : "Assign Rider"}
            icon="bicycle-outline"
            onPress={onAssignRider}
            filled={!order.rider}
            disabled={actionLoading}
          />
        )}

        {["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.status) && (
          <View style={styles.lockedPill}>
            <Icon name="navigate-outline" size={15} color={THEME.green} />
            <Text style={styles.lockedText}>Rider delivery in progress</Text>
          </View>
        )}

        {["DELIVERED", "CANCELLED"].includes(order.status) && (
          <View style={styles.lockedPill}>
            <Icon name="checkmark-done-outline" size={15} color={THEME.green} />
            <Text style={styles.lockedText}>Final status</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ActionBtn({ title, icon, onPress, filled, danger, disabled }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        styles.actionBtn,
        filled && styles.actionBtnFilled,
        danger && styles.actionBtnDanger,
        disabled && { opacity: 0.6 },
      ]}
      onPress={onPress}
    >
      {disabled ? (
        <ActivityIndicator size="small" color={filled || danger ? THEME.bg : THEME.green} />
      ) : (
        <Icon name={icon} size={16} color={filled || danger ? THEME.bg : THEME.green} />
      )}
      <Text style={[styles.actionText, (filled || danger) && styles.actionTextFilled]}>{title}</Text>
    </TouchableOpacity>
  );
}

function RiderModal({
  visible,
  riders,
  loading,
  assigning,
  order,
  onClose,
  onAssign,
}: {
  visible: boolean;
  riders: RiderItem[];
  loading: boolean;
  assigning: boolean;
  order: VendorOrder | null;
  onClose: () => void;
  onAssign: (rider: RiderItem) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{order?.rider ? "Reassign rider" : "Assign rider"}</Text>
          <Text style={styles.modalSub}>Choose an available rider for this ready order.</Text>

          {loading ? (
            <View style={styles.riderLoader}>
              <ActivityIndicator color={THEME.green} />
              <Text style={styles.emptyText}>Loading available riders...</Text>
            </View>
          ) : riders.length === 0 ? (
            <View style={styles.emptyRiderBox}>
              <Icon name="bicycle-outline" size={30} color={THEME.yellow} />
              <Text style={styles.emptyTitle}>No riders available</Text>
              <Text style={styles.emptyText}>Try again after a few minutes or assign from admin panel.</Text>
            </View>
          ) : (
            <FlatList
              data={riders}
              keyExtractor={(item) => item.id}
              style={styles.riderList}
              renderItem={({ item }) => {
                const name = item.fullName || item.name || "Rider";
                const available = item.isAvailable !== false;
                return (
                  <TouchableOpacity
                    style={[styles.riderRow, !available && { opacity: 0.55 }]}
                    activeOpacity={0.85}
                    disabled={!available || assigning}
                    onPress={() => onAssign(item)}
                  >
                    <View style={styles.riderAvatar}>
                      <Icon name="bicycle" size={19} color={THEME.bg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderName}>{name}</Text>
                      <Text style={styles.riderMeta}>{item.phone || item.currentStatus || "Available"}</Text>
                    </View>
                    {assigning ? (
                      <ActivityIndicator color={THEME.green} />
                    ) : (
                      <Icon name="chevron-forward" size={20} color={THEME.muted} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity style={styles.modalCancel} onPress={onClose} activeOpacity={0.85} disabled={assigning}>
            <Text style={styles.modalCancelText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16, paddingTop: 18 },
  center: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "700" },
  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: "#101A10",
    borderWidth: 1,
    borderColor: THEME.green,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: THEME.text, fontWeight: "800", flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 },
  kicker: { color: THEME.green, fontWeight: "900", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  title: { color: THEME.text, fontSize: 32, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, marginTop: 4, fontWeight: "600" },
  refreshButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
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
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: THEME.card, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, padding: 14 },
  summaryIcon: { width: 30, height: 30, borderRadius: 12, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  summaryValue: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  summaryLabel: { color: THEME.muted, fontWeight: "700", marginTop: 2, fontSize: 12 },
  filterList: { maxHeight: 44, marginBottom: 8 },
  filterContent: { paddingRight: 12 },
  filterChip: { height: 38, paddingHorizontal: 15, borderRadius: 999, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, marginRight: 8, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  filterText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  filterTextActive: { color: THEME.bg },
  orderList: { paddingBottom: 32 },
  emptyBox: { marginTop: 80, alignItems: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 76, height: 76, borderRadius: 28, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 6, fontWeight: "600" },
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 16, marginTop: 12, borderWidth: 1, borderColor: THEME.border, overflow: "hidden" },
  cardGlow: { position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(34,197,94,0.13)" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderNumber: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  customer: { color: THEME.muted, marginTop: 5, fontWeight: "600" },
  statusBadge: { backgroundColor: "rgba(246,195,67,0.15)", borderWidth: 1, borderColor: "rgba(246,195,67,0.45)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, alignSelf: "flex-start" },
  statusBadgeText: { color: THEME.yellow, fontWeight: "900", fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: THEME.card2, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  metaText: { color: THEME.text, fontWeight: "800", fontSize: 12 },
  itemsBox: { marginTop: 14, backgroundColor: "#0B100B", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: THEME.border },
  itemLine: { color: THEME.text, fontWeight: "700", lineHeight: 22 },
  moreItems: { color: THEME.green, fontWeight: "900", marginTop: 4 },
  noteBox: { marginTop: 10, flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(246,195,67,0.08)", borderRadius: 14, padding: 10 },
  noteText: { flex: 1, color: THEME.yellow, fontWeight: "700" },
  bottomRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { color: THEME.green, fontSize: 20, fontWeight: "900" },
  payment: { color: THEME.muted, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 14 },
  actionBtn: { borderWidth: 1, borderColor: THEME.green, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtnFilled: { backgroundColor: THEME.green },
  actionBtnDanger: { backgroundColor: THEME.danger, borderColor: THEME.danger },
  actionText: { color: THEME.green, fontWeight: "900", fontSize: 12 },
  actionTextFilled: { color: THEME.bg },
  lockedPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: THEME.card2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  lockedText: { color: THEME.green, fontWeight: "900", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: THEME.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderWidth: 1, borderColor: THEME.border, maxHeight: "82%" },
  modalHandle: { width: 48, height: 5, borderRadius: 99, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 18 },
  modalTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  modalSub: { color: THEME.muted, marginTop: 6, fontWeight: "600" },
  prepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  prepChip: { width: "30.8%", backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.green, borderRadius: 18, paddingVertical: 16, alignItems: "center" },
  prepValue: { color: THEME.green, fontSize: 22, fontWeight: "900" },
  prepLabel: { color: THEME.muted, fontWeight: "800", marginTop: 2 },
  modalCancel: { marginTop: 18, height: 50, borderRadius: 16, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center" },
  modalCancelText: { color: THEME.text, fontWeight: "900" },
  riderLoader: { paddingVertical: 28, alignItems: "center", gap: 10 },
  emptyRiderBox: { marginTop: 18, backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, borderRadius: 18, padding: 18, alignItems: "center" },
  riderList: { marginTop: 14 },
  riderRow: { backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, borderRadius: 18, padding: 13, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  riderAvatar: { width: 40, height: 40, borderRadius: 15, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  riderName: { color: THEME.text, fontWeight: "900" },
  riderMeta: { color: THEME.muted, fontWeight: "700", marginTop: 3 },
});
