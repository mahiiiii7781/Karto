import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
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

const STEPS = ["PLACED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "DELIVERED"];

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
const { user } = useAuth();
  const orderId = route.params?.orderId;
  const initialOrder = route.params?.order;

  const [order, setOrder] = useState<Order | any>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [cancelling, setCancelling] = useState(false);

  useFocusEffect(
  useCallback(() => {
    if (
      !requireLogin(
        user,
        navigation,
        "Please login to view order details."
      )
    ) {
      navigation.goBack();
      return;
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId, user])
);

  const loadOrder = async () => {
    setLoading(true);

    const { data, error } = await orderService.getOrderById(orderId);

    if (error) {
      Alert.alert("Error", error?.message || "Failed to load order details.");
    } else {
      setOrder(data);
    }

    setLoading(false);
  };

  const status = String(order?.status || "PLACED").toUpperCase();

  const items = useMemo(() => {
    const list = order?.items || order?.orderItems || order?.order_items || [];
    return Array.isArray(list) ? list : [];
  }, [order]);

  const orderNumber = order?.orderNumber || order?.order_number || order?.id?.slice(0, 8);

  const total = Number(order?.totalAmount ?? order?.total_amount ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? order?.delivery_fee ?? 0);
  const platformFee = Number(order?.platformFee ?? order?.platform_fee ?? 0);
  const paymentMethod = order?.paymentMethod || order?.payment_method || "COD";
  const paymentStatus = order?.paymentStatus || order?.payment_status || "PENDING";

  const getDate = () => {
    const date = order?.createdAt || order?.created_at;
    if (!date) return "Recently";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusMeta = () => {
    switch (status) {
      case "PLACED":
        return { label: "Order Placed", color: THEME.yellow, icon: "receipt-outline" };
      case "ACCEPTED":
        return { label: "Accepted", color: THEME.green, icon: "checkmark-done-outline" };
      case "PREPARING":
        return { label: "Preparing", color: THEME.yellow, icon: "restaurant-outline" };
      case "READY":
        return { label: "Ready", color: THEME.green, icon: "bag-check-outline" };
      case "PICKED_UP":
      case "OUT_FOR_DELIVERY":
        return { label: "On The Way", color: THEME.green, icon: "bicycle-outline" };
      case "DELIVERED":
        return { label: "Delivered", color: THEME.green, icon: "checkmark-circle-outline" };
      case "CANCELLED":
        return { label: "Cancelled", color: THEME.danger, icon: "close-circle-outline" };
      default:
        return { label: status.replaceAll("_", " "), color: THEME.muted, icon: "time-outline" };
    }
  };

  const canCancel = ["PLACED", "ACCEPTED"].includes(status);

const cancelOrder = () => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to manage your order."
    )
  ) {
    return;
  }
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);

          const { error } = await orderService.cancelOrder(order.id);

          setCancelling(false);

          if (error) {
            Alert.alert("Error", error?.message || "Failed to cancel order.");
            return;
          }

          setOrder((prev: any) => ({ ...prev, status: "CANCELLED" }));
        },
      },
    ]);
  };

  const callRider = () => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to contact the rider."
    )
  ) {
    return;
  }
    const phone =
      order?.rider?.phone ||
      order?.rider?.mobile ||
      order?.rider?.phoneNumber ||
      order?.rider?.phone_number;

    if (!phone) {
      Alert.alert("Rider Not Assigned", "Rider details will appear once assigned.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  };

  const meta = getStatusMeta();

  const getItemName = (item: any) =>
    item.menuItem?.name ||
    item.menu_item?.name ||
    item.itemName ||
    item.item_name ||
    "Item";

  const getItemTotal = (item: any) =>
    Number(item.totalPrice ?? item.total_price ?? 0) ||
    Number(item.price || 0) * Number(item.quantity || 0);

  const getRestaurantName = () =>
    order?.restaurant?.name ||
    order?.restaurant?.restaurantName ||
    order?.restaurant?.restaurant_name ||
    order?.vendor?.name ||
    "Karto Store";

  const getAddressText = () => {
    const addr = order?.address || order?.deliveryAddress || order?.delivery_address;

    if (!addr) return "Delivery address not available";

    return (
      addr.address ||
      addr.fullAddress ||
      addr.full_address ||
      `${addr.houseNo || ""} ${addr.street || ""} ${addr.city || ""}`.trim()
    );
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.green} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Order Details</Text>
            <Text style={styles.subtitle}>Order #{orderNumber}</Text>
          </View>
        </View>

        <View style={styles.statusHero}>
          <View style={[styles.heroIcon, { borderColor: meta.color }]}>
            <Icon name={meta.icon as any} size={34} color={meta.color} />
          </View>

          <Text style={[styles.heroTitle, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.heroSub}>{getDate()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>

          {STEPS.map((step, index) => {
            const currentIndex = STEPS.indexOf(status === "OUT_FOR_DELIVERY" ? "PICKED_UP" : status);
            const done = currentIndex >= index && status !== "CANCELLED";
            const active = currentIndex === index && status !== "CANCELLED";

            return (
              <View key={step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                    {done && <Icon name="checkmark" size={13} color={THEME.black} />}
                  </View>
                  {index !== STEPS.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, active && { color: THEME.green }]}>
                    {step.replaceAll("_", " ")}
                  </Text>
                  <Text style={styles.timelineSub}>
                    {active ? "Current order status" : done ? "Completed" : "Pending"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Restaurant</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="storefront-outline" size={22} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{getRestaurantName()}</Text>
              <Text style={styles.infoSub}>Preparing your order with care</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>

          {items.length === 0 ? (
            <Text style={styles.muted}>No items found.</Text>
          ) : (
            items.map((item: any, index: number) => (
              <View
                key={item.id || index}
                style={[
                  styles.itemRow,
                  index === items.length - 1 && { borderBottomWidth: 0, marginBottom: 0 },
                ]}
              >
                <View style={styles.foodIcon}>
                  <Icon name="fast-food-outline" size={22} color={THEME.green} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{getItemName(item)}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                </View>

                <Text style={styles.itemPrice}>₹{getItemTotal(item).toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="location-outline" size={22} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Deliver to</Text>
              <Text style={styles.infoSub}>{getAddressText()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rider Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="bicycle-outline" size={22} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {order?.rider?.fullName || order?.rider?.name || "Rider not assigned"}
              </Text>
              <Text style={styles.infoSub}>
                {order?.rider ? "Your delivery partner is assigned" : "Rider details will appear soon"}
              </Text>
            </View>

            <TouchableOpacity style={styles.callBtn} onPress={callRider}>
              <Icon name="call" size={18} color={THEME.black} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <BillRow label="Payment Method" value={paymentMethod} />
          <BillRow label="Payment Status" value={paymentStatus} green={paymentStatus === "PAID"} />
          <BillRow label="Delivery Fee" value={`₹${deliveryFee.toFixed(2)}`} />
          {platformFee > 0 && <BillRow label="Platform Fee" value={`₹${platformFee.toFixed(2)}`} />}
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={`₹${total.toFixed(2)}`} bold />
        </View>

        <View style={styles.actionWrapper}>
          <TouchableOpacity
            style={styles.trackFullBtn}
            onPress={() => {
  if (
    !requireLogin(
      user,
      navigation,
      "Please login to track your order."
    )
  ) {
    return;
  }

  Alert.alert(
    "Coming Soon",
    "Live tracking will be added next."
  );
}}
          >
            <Icon name="navigate-circle-outline" size={21} color={THEME.black} />
            <Text style={styles.trackFullText}>Track Live Order</Text>
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelFullBtn, cancelling && { opacity: 0.6 }]}
              disabled={cancelling}
              onPress={cancelOrder}
            >
              {cancelling ? (
                <ActivityIndicator color={THEME.danger} />
              ) : (
                <>
                  <Icon name="close-circle-outline" size={20} color={THEME.danger} />
                  <Text style={styles.cancelFullText}>Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const BillRow = ({ label, value, bold, green }: any) => (
  <View style={styles.billRow}>
    <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
    <Text style={[styles.billValue, bold && styles.billTotal, green && styles.greenText]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: "900",
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 2,
  },

  statusHero: {
    marginHorizontal: 20,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },

  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },

  heroSub: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 15,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 58,
  },

  timelineLeft: {
    width: 30,
    alignItems: "center",
  },

  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  timelineDotDone: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: THEME.border,
    marginTop: 4,
  },

  timelineLineDone: {
    backgroundColor: "#173923",
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 18,
  },

  timelineTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 14,
  },

  timelineSub: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  infoTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },

  infoSub: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 19,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  foodIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  itemName: {
    color: THEME.text,
    fontWeight: "900",
  },

  itemQty: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
  },

  itemPrice: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 15,
  },

  muted: {
    color: THEME.muted,
  },

  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },

  billLabel: {
    color: THEME.muted,
    flex: 1,
  },

  billValue: {
    color: THEME.text,
    fontWeight: "800",
    textAlign: "right",
  },

  billBold: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 16,
  },

  billTotal: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 18,
  },

  greenText: {
    color: THEME.green,
  },

  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 8,
  },

  actionWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },

  trackFullBtn: {
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  trackFullText: {
    color: THEME.black,
    fontSize: 16,
    fontWeight: "900",
  },

  cancelFullBtn: {
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  cancelFullText: {
    color: THEME.danger,
    fontSize: 16,
    fontWeight: "900",
  },
});