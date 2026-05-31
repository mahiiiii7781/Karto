import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { vendorService, VendorOrder, VendorOrderStatus } from "@/services/api/vendorService";

type FilterStatus = "ALL" | VendorOrderStatus;

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
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status: VendorOrderStatus) => {
  const map: Record<string, string> = {
    PLACED: "New Order",
    ACCEPTED_BY_VENDOR: "Accepted",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready",
    ASSIGNED_TO_RIDER: "Rider Assigned",
    PICKED_UP: "Picked Up",
    OUT_FOR_DELIVERY: "On The Way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
};

export default function VendorOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [prepModal, setPrepModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const loadOrders = useCallback(async () => {
    const { data, error } = await vendorService.getOrders();

    if (error) {
      showToast(error?.message || "Failed to load orders");
    } else {
      setOrders(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    return {
      new: orders.filter((o) => o.status === "PLACED").length,
      active: orders.filter((o) =>
        ["PLACED", "ACCEPTED_BY_VENDOR", "PREPARING", "READY_FOR_PICKUP"].includes(o.status)
      ).length,
      ready: orders.filter((o) => o.status === "READY_FOR_PICKUP").length,
    };
  }, [orders]);

  const updateStatus = async (
    order: VendorOrder,
    status: VendorOrderStatus,
    estimatedPreparationMinutes?: number,
    note?: string
  ) => {
    if (actionLoading) return;

    setActionLoading(true);

    const { data, error } = await vendorService.updateOrderStatus(
      order.id,
      status,
      estimatedPreparationMinutes,
      note
    );

    if (error || !data) {
      showToast(error?.message || "Failed to update order");
      setActionLoading(false);
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === order.id ? data : o)));
    setPrepModal(false);
    setSelectedOrder(null);
    setActionLoading(false);
    showToast("Order updated successfully");
  };

  const openPrepModal = (order: VendorOrder) => {
    setSelectedOrder(order);
    setPrepModal(true);
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
        <View>
          <Text style={styles.kicker}>Karto Vendor</Text>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Manage live orders with prep time.</Text>
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
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
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
            actionLoading={actionLoading}
            onPress={() => navigation?.navigate?.("VendorOrderDetail", { order: item })}
            onAccept={() => openPrepModal(item)}
            onReject={() =>
              updateStatus(item, "CANCELLED", undefined, "Cancelled by vendor")
            }
            onPreparing={() => updateStatus(item, "PREPARING")}
            onReady={() => updateStatus(item, "READY_FOR_PICKUP")}
          />
        )}
        contentContainerStyle={styles.orderList}
      />

      <Modal visible={prepModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPrepModal(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Set preparation time</Text>
            <Text style={styles.modalSub}>
              Choose how much time this order will take.
            </Text>

            <View style={styles.prepGrid}>
              {PREP_TIMES.map((min) => (
                <TouchableOpacity
                  key={min}
                  activeOpacity={0.85}
                  style={styles.prepChip}
                  disabled={actionLoading}
                  onPress={() => {
                    if (selectedOrder) {
                      updateStatus(selectedOrder, "ACCEPTED_BY_VENDOR", min);
                    }
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
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
          <Text style={styles.metaText}>
            Prep {order.estimatedPreparationMinutes || "-"} min
          </Text>
        </View>
      </View>

      <View style={styles.itemsBox}>
        {items.slice(0, 3).map((i: any) => (
          <Text key={i.id} style={styles.itemLine}>
            {i.quantity}x {i.menuItem?.name || i.itemName || "Item"}
          </Text>
        ))}

        {items.length > 3 && (
          <Text style={styles.moreItems}>+{items.length - 3} more items</Text>
        )}

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
            <ActionBtn
              title="Accept"
              icon="checkmark"
              onPress={onAccept}
              filled
              disabled={actionLoading}
            />
            <ActionBtn
              title="Reject"
              icon="close"
              onPress={onReject}
              danger
              disabled={actionLoading}
            />
          </>
        )}

        {order.status === "ACCEPTED_BY_VENDOR" && (
          <ActionBtn
            title="Start Preparing"
            icon="flame-outline"
            onPress={onPreparing}
            filled
            disabled={actionLoading}
          />
        )}

        {order.status === "PREPARING" && (
          <ActionBtn
            title="Mark Ready"
            icon="bag-check-outline"
            onPress={onReady}
            filled
            disabled={actionLoading}
          />
        )}

        {["READY_FOR_PICKUP", "ASSIGNED_TO_RIDER", "OUT_FOR_DELIVERY"].includes(
          order.status
        ) && (
          <View style={styles.lockedPill}>
            <Icon name="bicycle-outline" size={15} color={THEME.green} />
            <Text style={styles.lockedText}>Waiting for rider flow</Text>
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
      <Icon name={icon} size={16} color={filled || danger ? THEME.bg : THEME.green} />
      <Text style={[styles.actionText, (filled || danger) && styles.actionTextFilled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },
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
  toastText: {
    color: THEME.text,
    fontWeight: "800",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  kicker: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: THEME.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "600",
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryValue: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
  },
  summaryLabel: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 2,
    fontSize: 12,
  },
  filterList: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterContent: {
    paddingRight: 12,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  filterText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: THEME.bg,
  },
  orderList: {
    paddingBottom: 32,
  },
  emptyBox: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "600",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34,197,94,0.13)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  orderNumber: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },
  customer: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "600",
  },
  statusBadge: {
    backgroundColor: "rgba(246,195,67,0.15)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.card2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  metaText: {
    color: THEME.text,
    fontWeight: "800",
    fontSize: 12,
  },
  itemsBox: {
    marginTop: 14,
    backgroundColor: "#0B100B",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemLine: {
    color: THEME.text,
    fontWeight: "700",
    lineHeight: 22,
  },
  moreItems: {
    color: THEME.green,
    fontWeight: "900",
    marginTop: 4,
  },
  noteBox: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(246,195,67,0.08)",
    borderRadius: 14,
    padding: 10,
  },
  noteText: {
    flex: 1,
    color: THEME.yellow,
    fontWeight: "700",
  },
  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    color: THEME.green,
    fontSize: 20,
    fontWeight: "900",
  },
  payment: {
    color: THEME.muted,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 14,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtnFilled: {
    backgroundColor: THEME.green,
  },
  actionBtnDanger: {
    backgroundColor: THEME.danger,
    borderColor: THEME.danger,
  },
  actionText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },
  actionTextFilled: {
    color: THEME.bg,
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: THEME.card2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lockedText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 99,
    backgroundColor: THEME.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
  },
  modalSub: {
    color: THEME.muted,
    marginTop: 6,
    fontWeight: "600",
  },
  prepGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  prepChip: {
    width: "30.8%",
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  prepValue: {
    color: THEME.green,
    fontSize: 22,
    fontWeight: "900",
  },
  prepLabel: {
    color: THEME.muted,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 18,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: THEME.text,
    fontWeight: "900",
  },
});