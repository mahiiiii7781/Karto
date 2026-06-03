import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";
import KartoMessageModal, {
  KartoMessageType,
} from "@/components/common/KartoMessageModal";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  input: "#0E100E",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  orange: "#FFB020",
};

const STATUSES = [
  "ALL",
  "PLACED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_RIDER",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  secondaryText?: string;
  loading?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

export default function AdminOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const closeMessage = () => {
    setMessage((prev) => ({ ...prev, visible: false, loading: false }));
  };

  const showMessage = (
    type: KartoMessageType,
    title: string,
    msg: string,
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMessage({
      visible: true,
      type,
      title,
      message: msg,
      primaryText,
      secondaryText,
      onPrimary,
      onSecondary,
    });
  };

  const loadOrders = useCallback(async () => {
    const { data, error } = await adminService.getOrders({ status });

    if (error) {
      showMessage("error", "Unable to Load Orders", error.message || "Failed to load orders.");
    } else {
      setOrders(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return orders;

    return orders.filter((order) => {
      return (
        order.orderNumber?.toLowerCase().includes(q) ||
        order.id?.toLowerCase().includes(q) ||
        order.user?.fullName?.toLowerCase().includes(q) ||
        order.user?.phone?.toLowerCase().includes(q) ||
        order.restaurant?.name?.toLowerCase().includes(q) ||
        order.restaurant?.city?.name?.toLowerCase().includes(q) ||
        order.rider?.fullName?.toLowerCase().includes(q) ||
        order.status?.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let kartoIncome = 0;
    let vendorIncome = 0;

    orders.forEach((order) => {
      const total = Number(order.totalAmount || 0);
      const commission = Number(order.restaurant?.commission || 0);
      const karto = (total * commission) / 100;

      totalRevenue += total;
      kartoIncome += karto;
      vendorIncome += total - karto;
    });

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(
        (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
      ).length,
      deliveredOrders: orders.filter((o) => o.status === "DELIVERED").length,
      cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
      totalRevenue,
      kartoIncome,
      vendorIncome,
    };
  }, [orders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const askQuickUpdate = (order: any, nextStatus: string) => {
    showMessage(
      "warning",
      "Update Order Status?",
      `Order #${order.orderNumber || order.id.slice(0, 8)} will be moved to ${formatStatus(
        nextStatus
      )}.`,
      "Update",
      () => quickUpdate(order.id, nextStatus),
      "Cancel",
      closeMessage
    );
  };

  const quickUpdate = async (orderId: string, nextStatus: string) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const { error } = await adminService.updateOrderStatus(orderId, nextStatus);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Order Update Failed",
        message: error.message || "Failed to update order status.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Order Updated",
      message: `Order status updated to ${formatStatus(nextStatus)}.`,
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadOrders();
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
            colors={[THEME.yellow, THEME.green]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>ORDER OPERATIONS</Text>
                <Text style={styles.title}>Orders</Text>
                <Text style={styles.subtitle}>Track orders, revenue and delivery status</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>Total Order Revenue</Text>
                  <Text style={styles.summaryValue}>{money(stats.totalRevenue)}</Text>
                </View>

                <View style={styles.summaryIcon}>
                  <Icon name="receipt-outline" size={35} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Orders" value={stats.totalOrders} />
                <MiniStat label="Active" value={stats.activeOrders} />
                <MiniStat label="Delivered" value={stats.deliveredOrders} />
              </View>

              <View style={styles.revenueRow}>
                <RevenuePill label="Karto Income" value={money(stats.kartoIncome)} color={THEME.green} />
                <RevenuePill label="Vendor Payout" value={money(stats.vendorIncome)} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search order, customer, vendor..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icon name="close-circle" size={21} color={THEME.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              horizontal
              data={STATUSES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={styles.statusList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, status === item && styles.chipActive]}
                  onPress={() => {
                    setLoading(true);
                    setStatus(item);
                  }}
                >
                  <Text style={[styles.chipText, status === item && styles.chipTextActive]}>
                    {formatStatus(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order List</Text>
              <Text style={styles.sectionCount}>{filteredOrders.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              Orders will appear here once customers start placing orders.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate("AdminOrderDetail", { orderId: item.id })}
            onStatus={(nextStatus: string) => askQuickUpdate(item, nextStatus)}
          />
        )}
      />

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        primaryText={message.primaryText}
        secondaryText={message.secondaryText}
        loading={message.loading}
        onPrimary={message.onPrimary}
        onSecondary={message.onSecondary}
        onClose={closeMessage}
      />
    </View>
  );
}

function OrderCard({ order, onPress, onStatus }: any) {
  const total = Number(order.totalAmount || 0);
  const commission = Number(order.restaurant?.commission || 0);
  const kartoIncome = (total * commission) / 100;
  const vendorIncome = total - kartoIncome;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderTitle}>
            #{order.orderNumber || order.id.slice(0, 8)}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>
            {order.user?.fullName || "Customer"} • {order.restaurant?.name || "Vendor"}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>
            City: {order.restaurant?.city?.name || "-"}
          </Text>
        </View>

        <StatusBadge status={order.status} />
      </View>

      <View style={styles.infoRow}>
        <InfoChip icon="person-outline" text={order.user?.phone || "No customer phone"} />
        <InfoChip icon="bicycle-outline" text={order.rider?.fullName || "Rider not assigned"} />
      </View>

      <View style={styles.incomeRow}>
        <IncomeBox label="Total" value={money(total)} />
        <IncomeBox label="Karto" value={money(kartoIncome)} green />
        <IncomeBox label="Vendor" value={money(vendorIncome)} />
      </View>

      <View style={styles.paymentRow}>
        <PaymentBadge status={order.paymentStatus || "PENDING"} />
        <Text style={styles.itemsText}>{order.items?.length || 0} items</Text>
      </View>

      <View style={styles.actions}>
        {getNextActions(order.status).map((action) => (
          <Action
            key={action.status}
            title={action.title}
            icon={action.icon}
            onPress={() => {
              if (action.status === "ASSIGN_RIDER") {
                onPress();
              } else {
                onStatus(action.status);
              }
            }}
          />
        ))}

        <Action title="Details" icon="open-outline" outline onPress={onPress} />
      </View>
    </TouchableOpacity>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function RevenuePill({ label, value, color }: any) {
  return (
    <View style={styles.revenuePill}>
      <Text style={styles.revenueLabel}>{label}</Text>
      <Text style={[styles.revenueValue, { color }]}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: any) {
  const config = getStatusConfig(status);

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.statusText, { color: config.color }]}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function PaymentBadge({ status }: any) {
  const paid = status === "PAID";
  const failed = status === "FAILED";

  return (
    <View
      style={[
        styles.paymentBadge,
        paid && styles.paymentPaid,
        failed && styles.paymentFailed,
      ]}
    >
      <Icon
        name={paid ? "checkmark-circle-outline" : failed ? "close-circle-outline" : "time-outline"}
        size={14}
        color={paid ? THEME.green : failed ? THEME.danger : THEME.orange}
      />
      <Text
        style={[
          styles.paymentText,
          paid && { color: THEME.green },
          failed && { color: THEME.danger },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function InfoChip({ icon, text }: any) {
  return (
    <View style={styles.infoChip}>
      <Icon name={icon} size={14} color={THEME.muted} />
      <Text style={styles.infoChipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function IncomeBox({ label, value, green }: any) {
  return (
    <View style={styles.incomeBox}>
      <Text style={styles.incomeLabel}>{label}</Text>
      <Text style={[styles.incomeValue, green && { color: THEME.green }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Action({ title, icon, onPress, outline }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, outline && styles.actionOutline]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Icon name={icon} size={16} color={outline ? THEME.yellow : "#000"} />
      <Text style={[styles.actionText, outline && styles.actionTextOutline]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function getNextActions(status: string) {
  switch (status) {
    case "PLACED":
      return [{ title: "Accept", status: "ACCEPTED_BY_VENDOR", icon: "checkmark-outline" }];
    case "ACCEPTED_BY_VENDOR":
      return [{ title: "Preparing", status: "PREPARING", icon: "flame-outline" }];
    case "PREPARING":
      return [{ title: "Ready", status: "READY_FOR_PICKUP", icon: "cube-outline" }];
    case "READY_FOR_PICKUP":
      return [{ title: "Assign Rider", status: "ASSIGN_RIDER", icon: "bicycle-outline" }];
    case "ASSIGNED_TO_RIDER":
      return [{ title: "Picked Up", status: "PICKED_UP", icon: "bag-check-outline" }];
    case "PICKED_UP":
      return [{ title: "Out Delivery", status: "OUT_FOR_DELIVERY", icon: "navigate-outline" }];
    case "OUT_FOR_DELIVERY":
      return [{ title: "Delivered", status: "DELIVERED", icon: "checkmark-done-outline" }];
    default:
      return [];
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "DELIVERED":
      return { color: THEME.green, bg: "#102517", border: "#1F6B35" };
    case "CANCELLED":
      return { color: THEME.danger, bg: "#251010", border: "#6B1F1F" };
    case "PLACED":
      return { color: THEME.yellow, bg: "#1C190D", border: "#5D4D0B" };
    case "OUT_FOR_DELIVERY":
    case "PICKED_UP":
    case "ASSIGNED_TO_RIDER":
      return { color: "#6EE7FF", bg: "#0A1D23", border: "#155E75" };
    default:
      return { color: THEME.orange, bg: "#271D0A", border: "#6B4A12" };
  }
}

function formatStatus(status: string) {
  if (!status) return "-";
  if (status === "ALL") return "All";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  listContent: { paddingHorizontal: 16, paddingBottom: 38 },

  header: {
    paddingTop: 22,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  smallLabel: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.1,
  },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },

  summaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: THEME.muted, fontSize: 13, fontWeight: "800" },
  summaryValue: { color: THEME.yellow, fontSize: 32, fontWeight: "900", marginTop: 6 },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStats: { flexDirection: "row", gap: 10, marginTop: 20 },
  miniStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  miniLabel: { color: THEME.muted, fontSize: 10.5, fontWeight: "800", marginTop: 3 },

  revenueRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  revenuePill: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  revenueLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  revenueValue: { fontSize: 15, fontWeight: "900", marginTop: 5 },

  searchBox: {
    marginTop: 17,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800", fontSize: 14 },

  statusList: { maxHeight: 48, marginTop: 15 },
  chip: {
    height: 38,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  chipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  chipText: { color: THEME.muted, fontWeight: "900", fontSize: 11 },
  chipTextActive: { color: "#000" },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  sectionCount: { color: THEME.yellow, fontWeight: "900" },

  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },

  card: {
    backgroundColor: THEME.card,
    padding: 15,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderTitle: { fontSize: 17, fontWeight: "900", color: THEME.text },
  meta: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "800" },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusText: { fontWeight: "900", fontSize: 10 },

  infoRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  infoChip: {
    flex: 1,
    minHeight: 35,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  infoChipText: { flex: 1, color: THEME.muted, fontSize: 11, fontWeight: "800" },

  incomeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  incomeBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    padding: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  incomeLabel: { color: THEME.muted, fontSize: 10.5, fontWeight: "800" },
  incomeValue: { color: THEME.yellow, marginTop: 5, fontWeight: "900", fontSize: 12.5 },

  paymentRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#271D0A",
    borderWidth: 1,
    borderColor: "#6B4A12",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paymentPaid: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  paymentFailed: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  paymentText: { color: THEME.orange, fontWeight: "900", fontSize: 10 },
  itemsText: { color: THEME.muted, fontWeight: "800", fontSize: 12 },

  actions: { flexDirection: "row", gap: 8, marginTop: 13, flexWrap: "wrap" },
  actionBtn: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.yellow,
  },
  actionOutline: { backgroundColor: THEME.card2, borderColor: THEME.border },
  actionText: { color: "#000", fontWeight: "900", fontSize: 12 },
  actionTextOutline: { color: THEME.yellow },
});