import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  vendorService,
  VendorOrder,
  VendorOrderStatus,
  RiderItem,
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
  warning: "#F59E0B",
};

const PREP_TIMES = [15, 20, 25, 30, 40, 45, 60];

const ACTIVE_VENDOR_STATUSES = [
  "PLACED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
  "READY_FOR_PICKUP",
] as VendorOrderStatus[];

const RIDER_ASSIGN_STATUSES = [
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_RIDER",
] as VendorOrderStatus[];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const normalizeOrder = (value: any): VendorOrder => ({
  ...(value || {}),
  status: value?.status || "PLACED",
  items: Array.isArray(value?.items) ? value.items : [],
});

const getOrderNumber = (order?: Partial<VendorOrder> | null) => {
  return order?.orderNumber || order?.order_number || order?.id?.slice(0, 8) || "ORDER";
};

const statusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PLACED: "New Order",
    ACCEPTED: "Accepted",
    ACCEPTED_BY_VENDOR: "Accepted",
    REJECTED: "Rejected",
    PREPARING: "Preparing",
    READY: "Ready",
    READY_FOR_PICKUP: "Ready For Pickup",
    ASSIGNED_TO_RIDER: "Rider Assigned",
    PICKED_UP: "Picked Up",
    OUT_FOR_DELIVERY: "Out For Delivery",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  return map[status || ""] || status || "-";
};

const statusColor = (status?: string) => {
  if (status === "CANCELLED") return THEME.danger;
  if (["DELIVERED", "COMPLETED"].includes(status || "")) return THEME.green;
  if (status === "PLACED") return THEME.yellow;
  return THEME.green;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAddressText = (address: any) => {
  if (!address) return "-";

  const parts = [
    address?.address,
    address?.fullAddress,
    address?.line1,
    address?.line2,
    address?.landmark,
    address?.city,
    address?.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : address?.label || "-";
};

export default function VendorOrderDetailScreen({ route, navigation }: any) {
  const initialOrder = normalizeOrder(route?.params?.order);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [order, setOrder] = useState<VendorOrder>(initialOrder);
  const [prepTime, setPrepTime] = useState(
    String(initialOrder.estimatedPreparationMinutes || 30)
  );

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const [prepModal, setPrepModal] = useState(false);
  const [riderModal, setRiderModal] = useState(false);
  const [riders, setRiders] = useState<RiderItem[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);

  const orderNumber = getOrderNumber(order);
  const total = Number(order.totalAmount ?? order.total_amount ?? 0);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 2200);
  };

  const itemTotal = useMemo(() => {
    return (order.items || []).reduce((sum: number, item: any) => {
      const quantity = Number(item?.quantity || 0);
      const price = Number(item?.price ?? item?.menuItem?.price ?? 0);
      const totalPrice = Number(item?.totalPrice ?? item?.total_price ?? 0);

      return sum + (totalPrice || price * quantity);
    }, 0);
  }, [order.items]);

  const canEditPrepTime = ACTIVE_VENDOR_STATUSES.includes(order.status);
  const canAssignRider = RIDER_ASSIGN_STATUSES.includes(order.status);
  const isClosedOrder = ["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.status);

  const refreshOrder = async () => {
    setRefreshing(true);

    const { data, error } = await vendorService.getOrders();

    if (error) {
      showToast(error?.message || "Failed to refresh order");
      setRefreshing(false);
      return;
    }

    const freshOrder = (data || []).find((item) => item.id === order.id);

    if (freshOrder) {
      const nextOrder = normalizeOrder(freshOrder);
      setOrder(nextOrder);
      setPrepTime(String(nextOrder.estimatedPreparationMinutes || 30));
    }

    setRefreshing(false);
  };

  const updateStatus = async (
    status: VendorOrderStatus,
    minutes?: number,
    note?: string
  ) => {
    if (loading || !order?.id) return;

    setLoading(true);

    const { data, error } = await vendorService.updateOrderStatus(
      order.id,
      status,
      minutes,
      note
    );

    if (error || !data) {
      showToast(error?.message || "Failed to update order");
      setLoading(false);
      return;
    }

    const updatedOrder = normalizeOrder(data);

    setOrder(updatedOrder);

    if (minutes) {
      setPrepTime(String(minutes));
    }

    setPrepModal(false);
    setLoading(false);
    showToast("Order updated successfully");
  };

  const updatePrepTime = async (minutes?: number) => {
    if (loading || !order?.id) return;

    const finalMinutes = Number(minutes || prepTime);

    if (!Number.isFinite(finalMinutes) || finalMinutes < 5 || finalMinutes > 120) {
      showToast("Prep time must be between 5 and 120 minutes");
      return;
    }

    setLoading(true);

    const { data, error } = await vendorService.updatePreparationTime(
      order.id,
      finalMinutes
    );

    if (error) {
      showToast(error?.message || "Failed to update preparation time");
      setLoading(false);
      return;
    }

    setOrder((prev) =>
      normalizeOrder({
        ...prev,
        ...(data || {}),
        estimatedPreparationMinutes: finalMinutes,
      })
    );

    setPrepTime(String(finalMinutes));
    setPrepModal(false);
    setLoading(false);
    showToast("Preparation time updated");
  };

  const openRiderModal = async () => {
    if (!canAssignRider) {
      showToast("Rider can be assigned after order is ready");
      return;
    }

    setRiderModal(true);
    setRidersLoading(true);
    setSelectedRiderId(order.rider?.id || null);

    const { data, error } = await vendorService.getAvailableRiders();

    if (error) {
      showToast(error?.message || "Failed to load riders");
      setRiders([]);
    } else {
      setRiders(data || []);
    }

    setRidersLoading(false);
  };

  const assignRider = async () => {
    if (!selectedRiderId || !order?.id || loading) {
      showToast("Please select a rider");
      return;
    }

    setLoading(true);

    const apiCall = order.rider?.id
      ? vendorService.reassignRider
      : vendorService.assignRider;

    const { data, error } = await apiCall(order.id, selectedRiderId);

    if (error || !data) {
      showToast(error?.message || "Failed to assign rider");
      setLoading(false);
      return;
    }

    setOrder(normalizeOrder(data));
    setRiderModal(false);
    setLoading(false);
    showToast(order.rider?.id ? "Rider reassigned" : "Rider assigned");
  };

  if (!order?.id) {
    return (
      <View style={styles.center}>
        <Icon name="receipt-outline" size={44} color={THEME.yellow} />
        <Text style={styles.emptyTitle}>Order not found</Text>
        <Text style={styles.emptyText}>Please go back and open the order again.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon name="checkmark-circle" size={18} color={THEME.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={refreshOrder}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Order Details</Text>
            <Text style={styles.title}>#{orderNumber}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { borderColor: statusColor(order.status), backgroundColor: `${statusColor(order.status)}22` },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor(order.status) }]}>
              {statusLabel(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Total Amount</Text>
            <Text style={styles.heroAmount}>{money(total)}</Text>
            <Text style={styles.heroSub}>
              {order.paymentMethod || order.payment_method || "COD"} •{" "}
              {order.paymentStatus || order.payment_status || "PENDING"}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="receipt-outline" size={28} color={THEME.bg} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>

          <InfoRow icon="person-outline" label="Name" value={order.user?.fullName || order.user?.full_name || "Customer"} />
          <InfoRow icon="call-outline" label="Phone" value={order.user?.phone || "No phone"} />
          <InfoRow icon="mail-outline" label="Email" value={order.user?.email || "-"} />
          <InfoRow icon="location-outline" label="Address" value={getAddressText(order.address)} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Preparation Time</Text>

            {canEditPrepTime && (
              <TouchableOpacity
                style={styles.editPill}
                activeOpacity={0.85}
                disabled={loading}
                onPress={() => setPrepModal(true)}
              >
                <Icon name="timer-outline" size={15} color={THEME.bg} />
                <Text style={styles.editPillText}>Quick Set</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.prepBox}>
            <TextInput
              value={prepTime}
              editable={canEditPrepTime && !loading}
              onChangeText={(value) => setPrepTime(value.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor={THEME.muted}
              style={[styles.input, !canEditPrepTime && styles.inputDisabled]}
            />

            <TouchableOpacity
              style={[styles.updateBtn, !canEditPrepTime && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={loading || !canEditPrepTime}
              onPress={() => updatePrepTime()}
            >
              {loading ? (
                <ActivityIndicator color={THEME.bg} />
              ) : (
                <Text style={styles.updateBtnText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            {canEditPrepTime
              ? "Vendor can update prep time before pickup."
              : "Prep time is locked for this order status."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>

          {(order.items || []).map((item: any) => {
            const name = item?.menuItem?.name || item?.itemName || "Item";
            const price = Number(item?.price ?? item?.menuItem?.price ?? 0);
            const quantity = Number(item?.quantity || 0);
            const lineTotal = Number(item?.totalPrice ?? item?.total_price ?? 0) || price * quantity;

            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{quantity}x</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{name}</Text>
                  <Text style={styles.itemSub}>Price: {money(price)}</Text>
                </View>

                <Text style={styles.itemAmount}>{money(lineTotal)}</Text>
              </View>
            );
          })}

          {!(order.items || []).length && (
            <Text style={styles.emptyText}>No item details available.</Text>
          )}

          <View style={styles.billBox}>
            <BillRow label="Item Total" value={money(itemTotal || total)} />
            <BillRow label="Grand Total" value={money(total)} bold />
          </View>
        </View>

        {!!(order.customerNote || order.customer_note) && (
          <View style={styles.noteCard}>
            <Icon name="chatbubble-ellipses-outline" size={20} color={THEME.yellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>Customer Note</Text>
              <Text style={styles.noteText}>{order.customerNote || order.customer_note}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rider Assignment</Text>

            {canAssignRider && (
              <TouchableOpacity
                style={styles.editPill}
                activeOpacity={0.85}
                disabled={loading}
                onPress={openRiderModal}
              >
                <Icon name="bicycle-outline" size={15} color={THEME.bg} />
                <Text style={styles.editPillText}>{order.rider?.id ? "Reassign" : "Assign"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <InfoRow
            icon="bicycle-outline"
            label="Rider"
            value={order.rider?.fullName || order.rider?.full_name || order.rider?.name || "Not assigned"}
          />
          <InfoRow
            icon="call-outline"
            label="Rider Phone"
            value={order.rider?.phone || "-"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>

          <TimelineRow title="Placed" value={formatDateTime(order.createdAt || order.created_at)} active />
          <TimelineRow title="Accepted" value={formatDateTime(order.acceptedAt || order.accepted_at)} active={!!(order.acceptedAt || order.accepted_at)} />
          <TimelineRow title="Preparing" value={formatDateTime(order.preparingAt || order.preparing_at)} active={!!(order.preparingAt || order.preparing_at)} />
          <TimelineRow title="Ready" value={formatDateTime(order.readyAt || order.ready_at)} active={!!(order.readyAt || order.ready_at)} />
          <TimelineRow title="Picked" value={formatDateTime(order.pickedAt || order.picked_at)} active={!!(order.pickedAt || order.picked_at)} />
          <TimelineRow title="Delivered" value={formatDateTime(order.deliveredAt || order.delivered_at)} active={!!(order.deliveredAt || order.delivered_at)} />
          <TimelineRow title="Cancelled" value={formatDateTime(order.cancelledAt || order.cancelled_at)} active={!!(order.cancelledAt || order.cancelled_at)} danger />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>Vendor Actions</Text>

          {order.status === "PLACED" && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                disabled={loading}
                onPress={() => setPrepModal(true)}
              >
                <Icon name="checkmark-circle" size={18} color={THEME.bg} />
                <Text style={styles.primaryText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerBtn}
                activeOpacity={0.85}
                disabled={loading}
                onPress={() => updateStatus("CANCELLED", undefined, "Cancelled by vendor")}
              >
                <Icon name="close-circle" size={18} color={THEME.text} />
                <Text style={styles.dangerText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {order.status === "ACCEPTED_BY_VENDOR" && (
            <TouchableOpacity
              style={styles.primaryBtnFull}
              activeOpacity={0.85}
              disabled={loading}
              onPress={() => updateStatus("PREPARING")}
            >
              <Icon name="flame-outline" size={18} color={THEME.bg} />
              <Text style={styles.primaryText}>Start Preparing</Text>
            </TouchableOpacity>
          )}

          {order.status === "PREPARING" && (
            <TouchableOpacity
              style={styles.primaryBtnFull}
              activeOpacity={0.85}
              disabled={loading}
              onPress={() => updateStatus("READY_FOR_PICKUP")}
            >
              <Icon name="bag-check-outline" size={18} color={THEME.bg} />
              <Text style={styles.primaryText}>Mark Ready For Pickup</Text>
            </TouchableOpacity>
          )}

          {canAssignRider && (
            <TouchableOpacity
              style={styles.secondaryBtnFull}
              activeOpacity={0.85}
              disabled={loading}
              onPress={openRiderModal}
            >
              <Icon name="bicycle-outline" size={18} color={THEME.green} />
              <Text style={styles.secondaryText}>
                {order.rider?.id ? "Reassign Rider" : "Assign Rider"}
              </Text>
            </TouchableOpacity>
          )}

          {isClosedOrder && (
            <View style={styles.lockedBox}>
              <Icon name="shield-checkmark-outline" size={20} color={THEME.green} />
              <Text style={styles.lockedText}>No vendor action available for this order.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={prepModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPrepModal(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Choose preparation time</Text>
            <Text style={styles.modalSub}>This time will be visible to the customer.</Text>

            <View style={styles.prepGrid}>
              {PREP_TIMES.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={styles.prepChip}
                  activeOpacity={0.85}
                  disabled={loading}
                  onPress={() => {
                    if (order.status === "PLACED") {
                      updateStatus("ACCEPTED_BY_VENDOR", min);
                    } else {
                      updatePrepTime(min);
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
              activeOpacity={0.85}
              onPress={() => setPrepModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={riderModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRiderModal(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Assign rider</Text>
            <Text style={styles.modalSub}>Select an available rider for this order.</Text>

            {ridersLoading ? (
              <View style={styles.riderLoader}>
                <ActivityIndicator color={THEME.green} />
                <Text style={styles.helperText}>Loading riders...</Text>
              </View>
            ) : riders.length === 0 ? (
              <View style={styles.riderEmpty}>
                <Icon name="bicycle-outline" size={34} color={THEME.yellow} />
                <Text style={styles.emptyTitle}>No riders available</Text>
                <Text style={styles.emptyText}>Try again after some time or assign from admin panel.</Text>
              </View>
            ) : (
              <FlatList
                data={riders}
                keyExtractor={(item) => item.id}
                style={styles.riderList}
                renderItem={({ item }) => {
                  const selected = selectedRiderId === item.id;

                  return (
                    <TouchableOpacity
                      style={[styles.riderRow, selected && styles.riderRowActive]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedRiderId(item.id)}
                    >
                      <View style={styles.riderAvatar}>
                        <Icon name="person-outline" size={19} color={selected ? THEME.bg : THEME.green} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.riderName}>{item.fullName || item.full_name || item.email || "Rider"}</Text>
                        <Text style={styles.riderMeta}>{item.distanceText || item.phone || item.currentStatus || "Available"}</Text>
                      </View>

                      <Icon
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={21}
                        color={selected ? THEME.yellow : THEME.muted}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.saveRiderBtn, (!selectedRiderId || ridersLoading) && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={!selectedRiderId || ridersLoading || loading}
              onPress={assignRider}
            >
              {loading ? (
                <ActivityIndicator color={THEME.bg} />
              ) : (
                <Text style={styles.updateBtnText}>{order.rider?.id ? "Reassign Rider" : "Assign Rider"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              activeOpacity={0.85}
              onPress={() => setRiderModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={17} color={THEME.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function BillRow({ label, value, bold }: any) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.billBold]}>{value}</Text>
    </View>
  );
}

function TimelineRow({ title, value, active, danger }: any) {
  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineDot,
          active && { backgroundColor: danger ? THEME.danger : THEME.green },
        ]}
      />

      <View style={{ flex: 1 }}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
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
    fontWeight: "900",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontWeight: "900",
    fontSize: 11,
  },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: THEME.bg,
    fontWeight: "900",
    opacity: 0.8,
  },
  heroAmount: {
    color: THEME.bg,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSub: {
    color: THEME.bg,
    fontWeight: "800",
    marginTop: 4,
    opacity: 0.8,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.green,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  editPill: {
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  editPillText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 11,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  infoValue: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 3,
  },
  prepBox: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0B100B",
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    fontWeight: "900",
  },
  inputDisabled: {
    opacity: 0.55,
  },
  updateBtn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  updateBtnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  disabledBtn: {
    opacity: 0.55,
  },
  helperText: {
    color: THEME.muted,
    marginTop: 10,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  qtyBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: THEME.green,
    fontWeight: "900",
  },
  itemName: {
    color: THEME.text,
    fontWeight: "900",
  },
  itemSub: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "600",
  },
  itemAmount: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: THEME.muted,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  backHomeBtn: {
    marginTop: 18,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backHomeText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  billBox: {
    marginTop: 14,
    backgroundColor: "#0B100B",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  billLabel: {
    color: THEME.muted,
    fontWeight: "700",
  },
  billValue: {
    color: THEME.text,
    fontWeight: "800",
  },
  billBold: {
    color: THEME.green,
    fontSize: 16,
    fontWeight: "900",
  },
  noteCard: {
    backgroundColor: "rgba(246,195,67,0.08)",
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.35)",
    flexDirection: "row",
    gap: 12,
  },
  noteTitle: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  noteText: {
    color: THEME.text,
    marginTop: 4,
    fontWeight: "700",
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 9,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: THEME.border,
    marginTop: 4,
  },
  timelineTitle: {
    color: THEME.text,
    fontWeight: "900",
  },
  timelineValue: {
    color: THEME.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryBtnFull: {
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  secondaryBtnFull: {
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  secondaryText: {
    color: THEME.green,
    fontWeight: "900",
  },
  dangerBtn: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  dangerText: {
    color: THEME.text,
    fontWeight: "900",
  },
  lockedBox: {
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockedText: {
    color: THEME.green,
    fontWeight: "900",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "86%",
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
    marginTop: 12,
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
  riderLoader: {
    paddingVertical: 22,
    alignItems: "center",
  },
  riderEmpty: {
    marginTop: 18,
    padding: 22,
    borderRadius: 20,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  riderList: {
    marginTop: 16,
    maxHeight: 330,
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0B100B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    marginBottom: 10,
  },
  riderRowActive: {
    borderColor: THEME.green,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  riderName: {
    color: THEME.text,
    fontWeight: "900",
  },
  riderMeta: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
  },
  saveRiderBtn: {
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
