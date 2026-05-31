import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
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

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const NEXT_ACTIONS: Record<string, string[]> = {
  PLACED: ["ACCEPTED_BY_VENDOR", "CANCELLED"],
  ACCEPTED_BY_VENDOR: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["ASSIGNED_TO_RIDER"],
  ASSIGNED_TO_RIDER: ["PICKED_UP"],
  PICKED_UP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

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

export default function AdminOrderDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadData = useCallback(async () => {
    const [orderRes, riderRes] = await Promise.all([
      adminService.getOrderById(orderId),
      adminService.riders(),
    ]);

    if (orderRes.error) {
      setLoading(false);
      showMessage(
        "error",
        "Unable to Load Order",
        orderRes.error.message || "Failed to load order details.",
        "Go Back",
        () => {
          closeMessage();
          navigation.goBack();
        }
      );
      return;
    }

    setOrder(orderRes.data);
    setRiders((riderRes.data || []).filter((r: any) => r.isActive !== false));
    setLoading(false);
  }, [orderId, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => {
    if (!order) {
      return {
        total: 0,
        commission: 0,
        kartoIncome: 0,
        vendorIncome: 0,
      };
    }

    const total = Number(order.totalAmount || 0);
    const commission = Number(order.restaurant?.commission || 0);
    const kartoIncome = (total * commission) / 100;
    const vendorIncome = total - kartoIncome;

    return {
      total,
      commission,
      kartoIncome,
      vendorIncome,
    };
  }, [order]);

  const nextActions = useMemo(() => {
    if (!order) return [];
    return NEXT_ACTIONS[order.status] || [];
  }, [order]);

  const askUpdateStatus = (status: string) => {
    if (!order) return;

    showMessage(
      status === "CANCELLED" ? "warning" : "info",
      "Update Order Status?",
      `Order #${order.orderNumber || order.id.slice(0, 8)} will be moved to ${formatStatus(status)}.`,
      "Update",
      () => updateStatus(status),
      "Cancel",
      closeMessage
    );
  };

  const updateStatus = async (status: string) => {
    if (!order) return;

    setMessage((prev) => ({ ...prev, loading: true }));

    const { data, error } = await adminService.updateOrderStatus(
      order.id,
      status,
      `Admin marked order as ${formatStatus(status)}`
    );

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

    setOrder(data);

    setMessage({
      visible: true,
      type: "success",
      title: "Order Updated",
      message: `Order status changed to ${formatStatus(status)} successfully.`,
      primaryText: "Done",
    });
  };

  const askAssignRider = (rider: any) => {
    if (!order) return;

    showMessage(
      "info",
      "Assign Rider?",
      `${rider.fullName || "This rider"} will be assigned to order #${
        order.orderNumber || order.id.slice(0, 8)
      }.`,
      "Assign",
      () => assignRider(rider.id),
      "Cancel",
      closeMessage
    );
  };

  const assignRider = async (riderId: string) => {
    if (!order) return;

    setMessage((prev) => ({ ...prev, loading: true }));

    const { data, error } = await adminService.assignRider(order.id, riderId);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Rider Assignment Failed",
        message: error.message || "Failed to assign rider.",
        primaryText: "Okay",
      });
      return;
    }

    setOrder(data);

    setMessage({
      visible: true,
      type: "success",
      title: "Rider Assigned",
      message: "Rider has been assigned successfully.",
      primaryText: "Done",
    });
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Loading order details...</Text>

        <KartoMessageModal
          visible={message.visible}
          type={message.type}
          title={message.title}
          message={message.message}
          primaryText={message.primaryText}
          onPrimary={message.onPrimary}
          onClose={closeMessage}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 38 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>ORDER DETAIL</Text>
            <Text style={styles.title}>Order Management</Text>
            <Text style={styles.subTitle}>
              #{order.orderNumber || order.id.slice(0, 8)}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
            <Text style={styles.statusSmall}>
              Payment: {order.paymentStatus || "PENDING"} • {order.paymentMethod || "N/A"}
            </Text>
          </View>

          <View style={styles.statusIcon}>
            <Icon name={getStatusIcon(order.status)} size={34} color={THEME.yellow} />
          </View>
        </View>

        <View style={styles.incomeGrid}>
          <IncomeBox label="Total" value={money(totals.total)} />
          <IncomeBox label="Karto Income" value={money(totals.kartoIncome)} green />
          <IncomeBox label="Vendor Income" value={money(totals.vendorIncome)} />
        </View>

        <InfoCard title="Customer" icon="person-outline">
          <Text style={styles.mainText}>{order.user?.fullName || "Customer"}</Text>
          <Text style={styles.meta}>{order.user?.phone || "No phone"}</Text>
          <Text style={styles.meta}>{order.user?.email || "No email"}</Text>
        </InfoCard>

        <InfoCard title="Vendor" icon="storefront-outline">
          <Text style={styles.mainText}>{order.restaurant?.name || "Vendor"}</Text>
          <Text style={styles.meta}>City: {order.restaurant?.city?.name || "-"}</Text>
          <Text style={styles.meta}>Commission: {totals.commission}%</Text>
          <Text style={styles.meta}>Address: {order.restaurant?.address || "-"}</Text>
        </InfoCard>

        <InfoCard title="Delivery Partner" icon="bicycle-outline">
          {order.rider ? (
            <>
              <Text style={styles.mainText}>{order.rider.fullName || "Rider"}</Text>
              <Text style={styles.meta}>{order.rider.phone || order.rider.email || "-"}</Text>
              <Text style={styles.meta}>
                Vehicle: {order.rider.vehicleNo || "-"} • {order.rider.vehicleType || "-"}
              </Text>
            </>
          ) : (
            <View style={styles.emptyInline}>
              <Icon name="alert-circle-outline" size={20} color={THEME.orange} />
              <Text style={styles.emptyInlineText}>No rider assigned yet</Text>
            </View>
          )}
        </InfoCard>

        <InfoCard title="Order Items" icon="fast-food-outline">
          {(order.items || []).length === 0 ? (
            <Text style={styles.meta}>No items found</Text>
          ) : (
            (order.items || []).map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainText}>
                    {item.menuItem?.name || item.itemName || "Item"}
                  </Text>
                  <Text style={styles.meta}>
                    Qty: {item.quantity} • Price: {money(item.price)}
                  </Text>
                </View>

                <Text style={styles.amount}>
                  {money(item.totalPrice || Number(item.price || 0) * item.quantity)}
                </Text>
              </View>
            ))
          )}
        </InfoCard>

        <InfoCard title="Update Status" icon="swap-horizontal-outline">
          {nextActions.length === 0 ? (
            <View style={styles.emptyInline}>
              <Icon name="checkmark-done-outline" size={20} color={THEME.green} />
              <Text style={styles.emptyInlineText}>No further action available</Text>
            </View>
          ) : (
            <View style={styles.actionRow}>
              {nextActions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.actionBtn,
                    status === "CANCELLED" && styles.dangerBtn,
                  ]}
                  onPress={() => askUpdateStatus(status)}
                  activeOpacity={0.86}
                >
                  <Icon
                    name={status === "CANCELLED" ? "close-circle-outline" : "checkmark-circle-outline"}
                    size={17}
                    color={status === "CANCELLED" ? THEME.danger : "#000"}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      status === "CANCELLED" && styles.dangerText,
                    ]}
                  >
                    {formatStatus(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </InfoCard>

        <InfoCard title="Assign Rider" icon="navigate-outline">
          {riders.length === 0 ? (
            <Text style={styles.meta}>No active riders found</Text>
          ) : (
            <FlatList
              data={riders}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.riderRow,
                    order.rider?.id === item.id && styles.riderRowActive,
                  ]}
                  onPress={() => askAssignRider(item)}
                  activeOpacity={0.86}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mainText}>{item.fullName || "Rider"}</Text>
                    <Text style={styles.meta}>{item.phone || item.email}</Text>
                    <Text style={styles.meta}>
                      {item.vehicleType || "Vehicle"} • {item.vehicleNo || "-"}
                    </Text>
                  </View>

                  <View style={styles.assignPill}>
                    <Text style={styles.assignText}>
                      {order.rider?.id === item.id ? "Assigned" : "Assign"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </InfoCard>

        <InfoCard title="Timeline" icon="time-outline">
          {(order.history || []).length === 0 ? (
            <Text style={styles.meta}>No timeline found</Text>
          ) : (
            (order.history || []).map((history: any) => (
              <View key={history.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainText}>{formatStatus(history.status)}</Text>
                  <Text style={styles.meta}>
                    {history.note || "-"} •{" "}
                    {history.createdAt
                      ? new Date(history.createdAt).toLocaleString()
                      : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </InfoCard>
      </ScrollView>

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

function InfoCard({ title, icon, children }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name={icon} size={20} color={THEME.yellow} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      {children}
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

function formatStatus(status: string) {
  if (!status) return "-";

  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusIcon(status: string) {
  switch (status) {
    case "DELIVERED":
      return "checkmark-done-outline";
    case "CANCELLED":
      return "close-circle-outline";
    case "OUT_FOR_DELIVERY":
      return "navigate-outline";
    case "PICKED_UP":
      return "bag-check-outline";
    case "ASSIGNED_TO_RIDER":
      return "bicycle-outline";
    case "READY_FOR_PICKUP":
      return "cube-outline";
    case "PREPARING":
      return "flame-outline";
    default:
      return "receipt-outline";
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },

  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
  },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 22,
    paddingBottom: 16,
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

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 2,
  },

  subTitle: {
    color: THEME.yellow,
    marginTop: 3,
    fontWeight: "900",
  },

  statusCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },

  statusLabel: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  statusText: {
    color: THEME.yellow,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },

  statusSmall: {
    color: THEME.muted,
    marginTop: 6,
    fontWeight: "800",
  },

  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  incomeGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  incomeBox: {
    flex: 1,
    backgroundColor: THEME.card,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  incomeLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },

  incomeValue: {
    color: THEME.yellow,
    marginTop: 6,
    fontWeight: "900",
    fontSize: 12.5,
  },

  card: {
    backgroundColor: THEME.card,
    padding: 15,
    borderRadius: 24,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  cardIcon: {
    width: 35,
    height: 35,
    borderRadius: 13,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },

  mainText: {
    color: THEME.text,
    fontWeight: "900",
  },

  meta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  amount: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  actionBtn: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    borderWidth: 1,
    borderColor: THEME.yellow,
  },

  dangerBtn: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  actionText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
  },

  dangerText: {
    color: THEME.danger,
  },

  emptyInline: {
    backgroundColor: THEME.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emptyInlineText: {
    color: THEME.muted,
    fontWeight: "800",
  },

  riderRow: {
    backgroundColor: THEME.card2,
    padding: 13,
    borderRadius: 17,
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  riderRowActive: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  assignPill: {
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  assignText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 11,
  },

  timelineRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 13,
  },

  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: THEME.yellow,
    marginTop: 5,
  },
});