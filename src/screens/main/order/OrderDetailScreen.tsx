import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { orderService, Order } from "@/services/api/orderService";
import { useAuth } from "@/context/AuthContext";
import {
  connectSocket,
  joinOrderRoom,
  leaveOrderRoom,
  onOrderUpdated,
  onRiderLocationUpdated,
} from "@/api/socketClient";

const THEME = {
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  surface: "#F9FAFC",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  green: "#22C55E",
  yellow: "#F59E0B",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#050807",
};

const STEPS = [
  "PLACED",
  "ACCEPTED_BY_VENDOR",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_RIDER",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STATUS_ALIASES: Record<string, string> = {
  ACCEPTED: "ACCEPTED_BY_VENDOR",
  VENDOR_ACCEPTED: "ACCEPTED_BY_VENDOR",
  READY: "READY_FOR_PICKUP",
  READY_FOR_DELIVERY: "READY_FOR_PICKUP",
  RIDER_ASSIGNED: "ASSIGNED_TO_RIDER",
  ASSIGNED: "ASSIGNED_TO_RIDER",
  PICKED: "PICKED_UP",
  PICKUP_DONE: "PICKED_UP",
  ON_THE_WAY: "OUT_FOR_DELIVERY",
  COMPLETED: "DELIVERED",
};

const normalizeStatus = (value: any) => {
  const raw = String(value || "PLACED").toUpperCase();
  return STATUS_ALIASES[raw] || raw;
};

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const labelFromStatus = (status: string) =>
  String(status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

const getOrderFromResponse = (value: any) =>
  value?.order || value?.data?.order || value?.data?.data?.order || value?.data || value;

const formatAddressText = (addr: any) => {
  if (!addr) return "Delivery address not available";

  const address = String(
    addr.address || addr.addressLine || addr.fullAddress || addr.full_address || ""
  ).trim();

  const landmark = String(addr.landmark || "").trim();
  const city = String(addr.city || addr.district || "").trim();
  const state = String(addr.state || addr.stateName || addr.state_name || "").trim();
  const pincode = String(addr.pincode || addr.pinCode || addr.pin_code || "").trim();

  const first = [address, landmark].filter(Boolean).join(", ");
  const tail = [city, state].filter(Boolean).join(", ");

  if (first && tail && pincode) return `${first}, ${tail} - ${pincode}`;
  if (first && tail) return `${first}, ${tail}`;
  if (first && pincode) return `${first} - ${pincode}`;
  if (first) return first;
  if (tail && pincode) return `${tail} - ${pincode}`;

  return "Delivery address not available";
};

const getOrderIdFromSocketPayload = (payload: any) =>
  payload?.orderId ||
  payload?.id ||
  payload?.order?.id ||
  payload?.data?.orderId ||
  payload?.data?.order?.id;

const getStatusFromSocketPayload = (payload: any) =>
  payload?.status ||
  payload?.order?.status ||
  payload?.data?.status ||
  payload?.data?.order?.status;

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const orderId = route.params?.orderId || route.params?.order?.id;
  const initialOrder = route.params?.order;

  const [order, setOrder] = useState<Order | any>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [lastRiderLocation, setLastRiderLocation] = useState<any>(null);

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
    if (user?.id) return true;
    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  const loadOrder = async (isRefresh = false) => {
    if (!orderId) return;

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const { data, error } = await orderService.getOrderById(orderId);

      if (error) {
        showToast("error", "Unable to load order", error?.message || "Please try again.");
        return;
      }

      const nextOrder = getOrderFromResponse(data);
      setOrder(nextOrder || null);
    } catch {
      showToast("error", "Unable to load order", "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (orderId) {
        loadOrder(false);
      } else {
        setLoading(false);
        showToast("error", "Order unavailable", "Order details are missing.");
      }
    }, [orderId, user?.id])
  );

  useEffect(() => {
    if (!user?.id || !orderId) return;

    connectSocket().catch(() => {});
    joinOrderRoom(orderId);

    const cleanupOrder = onOrderUpdated((payload: any) => {
      const payloadOrderId = getOrderIdFromSocketPayload(payload);
      const nextStatus = getStatusFromSocketPayload(payload);

      if (payloadOrderId !== orderId) return;

      setOrder((prev: any) => ({
        ...(prev || {}),
        ...(payload?.order || {}),
        status: nextStatus ? normalizeStatus(nextStatus) : prev?.status,
        updatedAt: payload?.updatedAt || prev?.updatedAt,
      }));
    });

    const cleanupLocation = onRiderLocationUpdated((payload: any) => {
      const payloadOrderId = getOrderIdFromSocketPayload(payload);

      if (payloadOrderId !== orderId) return;

      setLastRiderLocation(payload?.location || payload);
    });

    return () => {
      cleanupOrder?.();
      cleanupLocation?.();
      leaveOrderRoom(orderId);
    };
  }, [user?.id, orderId]);

  const status = normalizeStatus(order?.status);

  const items = useMemo(() => {
    const list = order?.items || order?.orderItems || order?.order_items || [];
    return Array.isArray(list) ? list : [];
  }, [order]);

  const bill = useMemo(() => {
    const itemTotal = Number(order?.itemTotal ?? order?.item_total ?? order?.cartValue ?? 0);
    const deliveryFee = Number(order?.deliveryFee ?? order?.delivery_fee ?? 0);
    const platformFee = Number(order?.platformFee ?? order?.platform_fee ?? 0);
    const discount = Number(order?.discount ?? 0);

    const cgstRate = Number(order?.cgstRate ?? order?.cgst_rate ?? 2.5);
    const sgstRate = Number(order?.sgstRate ?? order?.sgst_rate ?? 2.5);

    const cgstAmount = Number(
      order?.cgstAmount ?? order?.cgst_amount ?? (itemTotal * cgstRate) / 100
    );

    const sgstAmount = Number(
      order?.sgstAmount ?? order?.sgst_amount ?? (itemTotal * sgstRate) / 100
    );

    const taxAmount = Number(order?.taxAmount ?? order?.tax_amount ?? cgstAmount + sgstAmount);

    const totalAmount = Number(
      order?.totalAmount ??
        order?.total_amount ??
        itemTotal + deliveryFee + platformFee + taxAmount - discount
    );

    return {
      itemTotal,
      deliveryFee,
      platformFee,
      discount,
      cgstRate,
      sgstRate,
      cgstAmount,
      sgstAmount,
      taxAmount,
      totalAmount,
    };
  }, [order]);

  const orderNumber =
    order?.orderNumber || order?.order_number || order?.id?.slice(0, 8) || "ORDER";

  const paymentMethod = String(order?.paymentMethod || order?.payment_method || "COD").toUpperCase();
  const paymentStatus = String(order?.paymentStatus || order?.payment_status || "PENDING").toUpperCase();

  const itemCount = useMemo(() => {
    return items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  }, [items]);

  const createdDate = order?.createdAt || order?.created_at;

  const getDate = () => {
    if (!createdDate) return "Recently";

    return new Date(createdDate).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEtaMinutes = () => {
    if (["DELIVERED", "CANCELLED"].includes(status)) return 0;

    const base =
      Number(order?.estimatedPreparationMinutes || order?.estimated_preparation_minutes || 30) +
      15;

    if (!createdDate) return base;

    const elapsed = Math.floor((Date.now() - new Date(createdDate).getTime()) / 60000);
    return Math.max(base - elapsed, 5);
  };

  const getStatusMeta = () => {
    switch (status) {
      case "PLACED":
        return {
          label: "Order Placed",
          short: "Placed",
          color: THEME.yellow,
          bg: "#FFF7E8",
          icon: "receipt-outline",
          banner: "Waiting for store confirmation",
          location: "Order received by Karto",
          message: "Your order has been placed successfully.",
        };
      case "ACCEPTED_BY_VENDOR":
        return {
          label: "Accepted by Store",
          short: "Accepted",
          color: THEME.green,
          bg: "#EAFBF1",
          icon: "checkmark-done-outline",
          banner: "Store accepted your order",
          location: "At the store",
          message: "The store has accepted your order.",
        };
      case "PREPARING":
        return {
          label: "Preparing",
          short: "Preparing",
          color: THEME.yellow,
          bg: "#FFF7E8",
          icon: "restaurant-outline",
          banner: "Food is being prepared",
          location: "Inside store kitchen",
          message: "Your order is being prepared.",
        };
      case "READY_FOR_PICKUP":
        return {
          label: "Ready for Pickup",
          short: "Ready",
          color: THEME.green,
          bg: "#EAFBF1",
          icon: "bag-check-outline",
          banner: "Order is packed and ready",
          location: "Packed at store counter",
          message: "Your order is ready for rider pickup.",
        };
      case "ASSIGNED_TO_RIDER":
        return {
          label: "Rider Assigned",
          short: "Assigned",
          color: THEME.green,
          bg: "#EAFBF1",
          icon: "person-add-outline",
          banner: "Delivery partner assigned",
          location: "Rider is heading to the store",
          message: "A delivery partner has been assigned.",
        };
      case "PICKED_UP":
        return {
          label: "Picked Up",
          short: "Picked",
          color: THEME.green,
          bg: "#EAFBF1",
          icon: "cube-outline",
          banner: "Order picked up",
          location: "With delivery partner",
          message: "Your order has been picked up.",
        };
      case "OUT_FOR_DELIVERY":
        return {
          label: "Out for Delivery",
          short: "On the way",
          color: THEME.orange,
          bg: THEME.orangeSoft,
          icon: "bicycle-outline",
          banner: "Arriving soon",
          location: "On the way to your address",
          message: "Your order is on the way.",
        };
      case "DELIVERED":
        return {
          label: "Delivered",
          short: "Delivered",
          color: THEME.green,
          bg: "#EAFBF1",
          icon: "checkmark-circle-outline",
          banner: "Order delivered",
          location: "Delivered to your address",
          message: "Order completed successfully.",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          short: "Cancelled",
          color: THEME.danger,
          bg: "#FFF1F1",
          icon: "close-circle-outline",
          banner: "Order cancelled",
          location: "Order is no longer active",
          message: "This order has been cancelled.",
        };
      default:
        return {
          label: labelFromStatus(status),
          short: labelFromStatus(status),
          color: THEME.muted,
          bg: THEME.card2,
          icon: "time-outline",
          banner: "Order status updated",
          location: "Status updated",
          message: "Order status updated.",
        };
    }
  };

  const canCancel = ["PLACED", "ACCEPTED_BY_VENDOR"].includes(status);

  const cancelOrder = async () => {
    if (!requireAuth("Please sign in to manage your order.")) return;
    if (!order?.id || cancelling) return;

    try {
      setCancelling(true);

      const { error } = await orderService.cancelOrder(order.id, "Cancelled by customer");

      if (error) {
        showToast("error", "Unable to cancel order", error?.message || "Please try again.");
        return;
      }

      setOrder((prev: any) => ({ ...prev, status: "CANCELLED" }));
      setCancelModalVisible(false);
      showToast("success", "Order cancelled", "Your order has been cancelled.");
    } catch {
      showToast("error", "Unable to cancel order", "Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const getRiderPhone = () =>
    order?.rider?.phone ||
    order?.rider?.mobile ||
    order?.rider?.phoneNumber ||
    order?.rider?.phone_number ||
    "";

  const callRider = async () => {
    if (!requireAuth("Please sign in to contact the rider.")) return;

    const phone = getRiderPhone();

    if (!phone) {
      showToast("info", "Rider not assigned", "Rider details will appear once assigned.");
      return;
    }

    try {
      const url = `tel:${phone}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        showToast("error", "Unable to open dialer", "Please try again.");
        return;
      }

      await Linking.openURL(url);
    } catch {
      showToast("error", "Unable to call rider", "Please try again.");
    }
  };

  const trackLiveOrder = () => {
    if (!requireAuth("Please sign in to track your order.")) return;

    showToast(
      "info",
      lastRiderLocation ? "Rider location updated" : "Live tracking",
      lastRiderLocation
        ? "Latest rider location received. Map screen will be connected next."
        : "Rider movement will appear after pickup."
    );
  };

  const meta = getStatusMeta();
  const etaMinutes = getEtaMinutes();

  const getItemName = (item: any) =>
    item.menuItem?.name || item.menu_item?.name || item.itemName || item.item_name || "Item";

  const getItemTotal = (item: any) =>
    Number(item.totalPrice ?? item.total_price ?? 0) ||
    Number(item.price || 0) * Number(item.quantity || 0);

  const getRestaurantName = () =>
    order?.restaurant?.name ||
    order?.restaurant?.restaurantName ||
    order?.restaurant?.restaurant_name ||
    order?.vendor?.fullName ||
    order?.vendor?.name ||
    "Karto Store";

  const getAddressText = () => {
    const addr = order?.address || order?.deliveryAddress || order?.delivery_address;
    return formatAddressText(addr);
  };

  const getStepState = (step: string, index: number) => {
    if (status === "CANCELLED") return { done: false, active: false };

    const currentIndex = STEPS.indexOf(status);

    return {
      done: currentIndex >= index,
      active: currentIndex === index,
    };
  };

  if (!user?.id) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <Text style={styles.emptyTitle}>Login required</Text>
        <Text style={styles.emptySub}>Please sign in to view your order details.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Auth")}>
          <Text style={styles.primaryBtnText}>Login / Signup</Text>
          <Icon name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>
      </View>
    );
  }

  if (!orderId && !order) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <Text style={styles.emptyTitle}>Order unavailable</Text>
        <Text style={styles.emptySub}>We could not find details for this order.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.blue} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Order Details</Text>
            <Text style={styles.subtitle}>Order #{orderNumber}</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadOrder(true)} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Icon name="refresh" size={19} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.liveBanner}>
          <View style={styles.liveBannerTop}>
            <View style={[styles.liveIconBox, { backgroundColor: meta.color }]}>
              <Icon name={meta.icon as any} size={25} color={THEME.white} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.liveBannerLabel}>LIVE ORDER STATUS</Text>
              <Text style={styles.liveBannerTitle}>{meta.banner}</Text>
            </View>
          </View>

          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text style={styles.timerValue}>
                {["DELIVERED", "CANCELLED"].includes(status) ? "--" : etaMinutes}
              </Text>
              <Text style={styles.timerLabel}>
                {["DELIVERED", "CANCELLED"].includes(status) ? "Done" : "min ETA"}
              </Text>
            </View>

            <View style={styles.timerTextBox}>
              <Text style={styles.timerTitle}>
                {status === "DELIVERED"
                  ? "Your order has been delivered."
                  : status === "CANCELLED"
                  ? "This order is cancelled."
                  : `Estimated arrival in ${etaMinutes} minutes`}
              </Text>
              <Text style={styles.timerSub}>
                ETA may change based on store preparation and rider pickup.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.whereCard} activeOpacity={0.88} onPress={trackLiveOrder}>
          <View style={styles.mapPreview}>
            <Icon name="navigate" size={30} color={THEME.orange} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.whereTitle}>Where is my order?</Text>
            <Text style={styles.whereSub}>{meta.location}</Text>
          </View>

          <Icon name="chevron-forward" size={20} color={THEME.orange} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.riderCard}
          activeOpacity={0.88}
          onPress={() => setRiderModalVisible(true)}
        >
          <View style={styles.riderAvatar}>
            <Icon name="person" size={24} color={THEME.white} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>
              {order?.rider?.fullName || order?.rider?.name || "Delivery partner not assigned"}
            </Text>
            <Text style={styles.riderSub}>
              {order?.rider
                ? "Tap to view delivery partner details"
                : "Partner details will appear once assigned"}
            </Text>
          </View>

          <TouchableOpacity style={styles.callSmallBtn} onPress={callRider}>
            <Icon name="call" size={17} color={THEME.white} />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.statusHero}>
          <View style={[styles.heroIcon, { backgroundColor: meta.bg }]}>
            <Icon name={meta.icon as any} size={34} color={meta.color} />
          </View>

          <Text style={[styles.heroTitle, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.heroSub}>{meta.message}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Icon name="time-outline" size={15} color={THEME.orange} />
              <Text style={styles.heroMetaText}>{getDate()}</Text>
            </View>

            <View style={styles.heroMetaChip}>
              <Icon name="bag-handle-outline" size={15} color={THEME.green} />
              <Text style={styles.heroMetaText}>
                {itemCount} item{itemCount > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>

          {status === "CANCELLED" && (
            <View style={styles.cancelledBanner}>
              <Icon name="close-circle-outline" size={18} color={THEME.danger} />
              <Text style={styles.cancelledBannerText}>This order has been cancelled.</Text>
            </View>
          )}

          {STEPS.map((step, index) => {
            const { done, active } = getStepState(step, index);

            return (
              <View key={step} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      done && styles.timelineDotDone,
                      active && { borderColor: THEME.orange },
                    ]}
                  >
                    {done && <Icon name="checkmark" size={13} color={THEME.white} />}
                  </View>

                  {index !== STEPS.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, active && { color: THEME.orange }]}>
                    {labelFromStatus(step)}
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
          <Text style={styles.sectionTitle}>Store Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="storefront-outline" size={22} color={THEME.orange} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{getRestaurantName()}</Text>
              <Text style={styles.infoSub}>Preparing and packing your order with care.</Text>
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
                key={item.id || String(index)}
                style={[
                  styles.itemRow,
                  index === items.length - 1 && { borderBottomWidth: 0, marginBottom: 0 },
                ]}
              >
                <View style={styles.foodIcon}>
                  <Icon name="fast-food-outline" size={22} color={THEME.orange} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{getItemName(item)}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                </View>

                <Text style={styles.itemPrice}>{money(getItemTotal(item))}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="location-outline" size={22} color={THEME.orange} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Deliver to</Text>
              <Text style={styles.infoSub}>{getAddressText()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.paymentHeader}>
            <Text style={styles.sectionTitleNoMargin}>Payment Details</Text>

            <TouchableOpacity onPress={() => setBillModalVisible(true)}>
              <Text style={styles.linkText}>View Bill</Text>
            </TouchableOpacity>
          </View>

          <BillRow label="Payment Method" value={paymentMethod} />
          <BillRow
            label="Payment Status"
            value={paymentStatus}
            green={paymentStatus === "PAID"}
            danger={paymentStatus === "FAILED"}
          />

          <View style={styles.divider} />

          <BillRow label="Cart Value" value={money(bill.itemTotal)} />
          <BillRow label="Delivery Fee" value={money(bill.deliveryFee)} />

          {bill.platformFee > 0 && (
            <BillRow label="Platform Fee" value={money(bill.platformFee)} />
          )}

          <View style={styles.taxRow}>
            <View style={styles.taxLeft}>
              <Text style={styles.billLabel}>Tax</Text>
              <TouchableOpacity onPress={() => setTaxModalVisible(true)}>
                <Icon name="information-circle-outline" size={17} color={THEME.orange} />
              </TouchableOpacity>
            </View>

            <Text style={styles.billValue}>{money(bill.taxAmount)}</Text>
          </View>

          {bill.discount > 0 && (
            <BillRow label="Discount" value={`- ${money(bill.discount)}`} green />
          )}

          <View style={styles.divider} />
          <BillRow label="Grand Total" value={money(bill.totalAmount)} bold />
        </View>

        <View style={styles.actionWrapper}>
          <TouchableOpacity style={styles.trackFullBtn} onPress={trackLiveOrder}>
            <Icon name="navigate-circle-outline" size={21} color={THEME.white} />
            <Text style={styles.trackFullText}>Track Live Order</Text>
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelFullBtn, cancelling && { opacity: 0.6 }]}
              disabled={cancelling}
              onPress={() => setCancelModalVisible(true)}
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

      <CancelModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={cancelOrder}
        loading={cancelling}
        orderNumber={orderNumber}
      />

      <TaxModal visible={taxModalVisible} onClose={() => setTaxModalVisible(false)} bill={bill} />

      <BillModal visible={billModalVisible} onClose={() => setBillModalVisible(false)} bill={bill} />

      <RiderModal
        visible={riderModalVisible}
        onClose={() => setRiderModalVisible(false)}
        order={order}
        onCall={callRider}
        status={status}
        lastRiderLocation={lastRiderLocation}
      />
    </View>
  );
}

const BillRow = ({ label, value, bold, green, danger }: any) => (
  <View style={styles.billRow}>
    <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
    <Text
      style={[
        styles.billValue,
        bold && styles.billTotal,
        green && styles.greenText,
        danger && styles.dangerText,
      ]}
    >
      {value}
    </Text>
  </View>
);

const CancelModal = ({ visible, onClose, onConfirm, loading, orderNumber }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.confirmBox}>
        <View style={styles.confirmIcon}>
          <Icon name="close-circle-outline" size={31} color={THEME.danger} />
        </View>

        <Text style={styles.confirmTitle}>Cancel order?</Text>
        <Text style={styles.confirmText}>
          This action will request cancellation for Order #{orderNumber}.
        </Text>

        <View style={styles.confirmActions}>
          <TouchableOpacity style={styles.keepBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.keepText}>Keep Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelConfirmBtn} onPress={onConfirm} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={THEME.white} />
            ) : (
              <Text style={styles.cancelConfirmText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const TaxModal = ({ visible, onClose, bill }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.taxModal}>
        <View style={styles.taxIconBox}>
          <Icon name="receipt-outline" size={30} color={THEME.orange} />
        </View>

        <Text style={styles.taxTitle}>Tax Details</Text>
        <Text style={styles.taxSub}>Tax includes CGST and SGST applied on your cart value.</Text>

        <View style={styles.taxBreakBox}>
          <BillRow
            label={`CGST (${Number(bill.cgstRate || 0).toFixed(2)}%)`}
            value={money(bill.cgstAmount)}
          />
          <BillRow
            label={`SGST (${Number(bill.sgstRate || 0).toFixed(2)}%)`}
            value={money(bill.sgstAmount)}
          />
          <View style={styles.divider} />
          <BillRow label="Total Tax" value={money(bill.taxAmount)} bold />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const BillModal = ({ visible, onClose, bill }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.taxModal}>
        <View style={styles.taxIconBox}>
          <Icon name="document-text-outline" size={30} color={THEME.orange} />
        </View>

        <Text style={styles.taxTitle}>Complete Bill</Text>
        <Text style={styles.taxSub}>Final payable amount includes all charges.</Text>

        <View style={styles.taxBreakBox}>
          <BillRow label="Cart Value" value={money(bill.itemTotal)} />
          <BillRow label="Delivery Fee" value={money(bill.deliveryFee)} />
          <BillRow label="Platform Fee" value={money(bill.platformFee)} />
          <BillRow label="CGST" value={money(bill.cgstAmount)} />
          <BillRow label="SGST" value={money(bill.sgstAmount)} />
          <BillRow label="Total Tax" value={money(bill.taxAmount)} />
          {bill.discount > 0 && (
            <BillRow label="Discount" value={`- ${money(bill.discount)}`} green />
          )}
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={money(bill.totalAmount)} bold />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const RiderModal = ({ visible, onClose, order, onCall, status, lastRiderLocation }: any) => {
  const rider = order?.rider;
  const phone =
    rider?.phone || rider?.mobile || rider?.phoneNumber || rider?.phone_number || "Not available";

  const locationText = lastRiderLocation
    ? "Latest rider location received"
    : status === "OUT_FOR_DELIVERY"
    ? "On the way to your address"
    : status === "PICKED_UP"
    ? "Order picked up from store"
    : rider
    ? "Heading to store"
    : "Not available yet";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.riderModal}>
          <View style={styles.riderModalAvatar}>
            <Icon name="person" size={34} color={THEME.white} />
          </View>

          <Text style={styles.riderModalTitle}>
            {rider?.fullName || rider?.name || "Delivery partner not assigned"}
          </Text>

          <Text style={styles.riderModalSub}>
            {rider
              ? "Your delivery partner is handling this order."
              : "Delivery partner details will appear once the rider is assigned."}
          </Text>

          <View style={styles.riderInfoBox}>
            <InfoLine icon="call-outline" label="Phone Number" value={phone} />
            <InfoLine icon="bicycle-outline" label="Delivery Status" value={labelFromStatus(status)} />
            <InfoLine icon="cube-outline" label="Current Location" value={locationText} />
          </View>

          <View style={styles.riderModalActions}>
            <TouchableOpacity style={styles.keepBtn} onPress={onClose}>
              <Text style={styles.keepText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.callModalBtn} onPress={onCall}>
              <Icon name="call" size={18} color={THEME.white} />
              <Text style={styles.callModalText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const InfoLine = ({ icon, label, value }: any) => (
  <View style={styles.infoLine}>
    <View style={styles.infoLineIcon}>
      <Icon name={icon} size={18} color={THEME.orange} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={styles.infoLineValue}>{value}</Text>
    </View>
  </View>
);

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  emptyTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  emptySub: {
    color: THEME.muted,
    marginTop: 8,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 26,
  },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  primaryBtnText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 15,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: { color: THEME.blue, fontSize: 27, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 2, fontWeight: "700" },

  liveBanner: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  liveBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  liveIconBox: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBannerLabel: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  liveBannerTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 14,
    gap: 13,
  },
  timerBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  timerValue: {
    color: THEME.white,
    fontSize: 28,
    fontWeight: "900",
  },
  timerLabel: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: "900",
    marginTop: -2,
  },
  timerTextBox: { flex: 1 },
  timerTitle: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
  },
  timerSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 5,
    lineHeight: 18,
    fontSize: 12,
  },

  whereCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    ...shadow,
  },
  mapPreview: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  whereTitle: {
    color: THEME.blue,
    fontSize: 16,
    fontWeight: "900",
  },
  whereSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },

  riderCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    ...shadow,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  riderName: {
    color: THEME.blue,
    fontSize: 15,
    fontWeight: "900",
  },
  riderSub: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  callSmallBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  statusHero: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    ...shadow,
  },
  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: { fontSize: 22, fontWeight: "900", marginTop: 12, textAlign: "center" },
  heroSub: {
    color: THEME.muted,
    marginTop: 7,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    justifyContent: "center",
  },
  heroMetaChip: {
    backgroundColor: THEME.surface,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroMetaText: { color: THEME.blue, fontSize: 12, fontWeight: "800" },

  card: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    ...shadow,
  },
  sectionTitle: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
  },
  sectionTitleNoMargin: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
  },
  cancelledBanner: {
    backgroundColor: "#FFF1F1",
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cancelledBannerText: { flex: 1, color: THEME.danger, fontWeight: "800" },
  timelineRow: { flexDirection: "row", minHeight: 58 },
  timelineLeft: { width: 30, alignItems: "center" },
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
  timelineDotDone: { backgroundColor: THEME.orange, borderColor: THEME.orange },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: THEME.border,
    marginTop: 4,
  },
  timelineLineDone: { backgroundColor: "#FFD6C8" },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 18 },
  timelineTitle: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "capitalize",
  },
  timelineSub: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { color: THEME.blue, fontWeight: "900", fontSize: 15 },
  infoSub: { color: THEME.muted, marginTop: 4, lineHeight: 19, fontWeight: "700" },

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
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  itemName: { color: THEME.blue, fontWeight: "900" },
  itemQty: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
  itemPrice: { color: THEME.orange, fontWeight: "900", fontSize: 15 },
  muted: { color: THEME.muted, fontWeight: "700" },

  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  linkText: { color: THEME.orange, fontWeight: "900" },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  billLabel: { color: THEME.muted, flex: 1, fontWeight: "800" },
  billValue: { color: THEME.blue, fontWeight: "900", textAlign: "right" },
  billBold: { color: THEME.blue, fontWeight: "900", fontSize: 16 },
  billTotal: { color: THEME.orange, fontWeight: "900", fontSize: 18 },
  greenText: { color: THEME.green },
  dangerText: { color: THEME.danger },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  taxLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 8 },

  actionWrapper: { marginHorizontal: 20, marginBottom: 24, gap: 12 },
  trackFullBtn: {
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...shadow,
  },
  trackFullText: { color: THEME.white, fontSize: 16, fontWeight: "900" },
  cancelFullBtn: {
    backgroundColor: "#FFF1F1",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelFullText: { color: THEME.danger, fontSize: 16, fontWeight: "900" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: { color: THEME.blue, fontSize: 22, fontWeight: "900" },
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
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: { color: THEME.blue, fontWeight: "900" },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.danger,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelConfirmText: { color: THEME.white, fontWeight: "900" },

  taxModal: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  taxIconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  taxTitle: { color: THEME.blue, fontSize: 22, fontWeight: "900" },
  taxSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  taxBreakBox: {
    alignSelf: "stretch",
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
  },
  modalBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  modalBtnText: { color: THEME.white, fontWeight: "900" },

  riderModal: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  riderModalAvatar: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  riderModalTitle: {
    color: THEME.blue,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  riderModalSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  riderInfoBox: {
    alignSelf: "stretch",
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    gap: 12,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLineIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLineLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  infoLineValue: {
    color: THEME.blue,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  riderModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  callModalBtn: {
    flex: 1,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  callModalText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
