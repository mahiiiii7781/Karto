import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import { riderService } from "@/services/api/riderApi";
import { liveLocationService } from "@/services/api/liveLocationService";
import { riderSocketService } from "@/services/socket/riderSocketService";

const T = {
  bg: "#070A08",
  card: "#101713",
  card2: "#0D120F",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const shortId = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "ORDER");

const getVendor = (order: any) => order?.vendor || order?.restaurant || {};
const getCustomer = (order: any) => order?.customer || order?.user || {};

const getAddressText = (address: any) =>
  address?.address ||
  address?.addressLine ||
  address?.fullAddress ||
  address?.street ||
  address?.landmark ||
  address?.city ||
  "Address not available";

const getPickupAddress = (order: any) =>
  order?.pickupAddress || getVendor(order)?.address || "Pickup address not available";

const getDropAddress = (order: any) =>
  getAddressText(order?.deliveryAddress || order?.address);

const callPhone = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
};

const openMapAddress = (address: string) => {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  );
};

export default function RiderOrderDetailScreen({ route, navigation }: any) {
  const orderId = route?.params?.orderId;
  const initialOrder = route?.params?.order;
  const openOtp = route?.params?.openOtp === true;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState<any>(initialOrder || null);
  const [tracking, setTracking] = useState(false);
  const [otpModal, setOtpModal] = useState(openOtp);
  const [otp, setOtp] = useState("");

  const vendor = getVendor(order);
  const customer = getCustomer(order);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      showToast("Order id missing");
      return;
    }

    try {
      const res = await riderService.getOrderDetail(orderId);

      if (res?.error) {
        showToast(res?.error?.message || "Failed to load order");
        setOrder(initialOrder || null);
        return;
      }

      setOrder(res?.data || initialOrder || null);
    } catch (e: any) {
      showToast(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId, initialOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (openOtp) setOtpModal(true);
  }, [openOtp]);

  const shouldTrack = useMemo(() => {
    return ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order?.status);
  }, [order?.status]);

  const startTracking = useCallback(
    (id?: string) => {
      const activeOrderId = id || order?.id;
      if (!activeOrderId) return;

      liveLocationService.start({
        orderId: activeOrderId,
        onLocation: (location: any) => {
          setTracking(true);

          riderSocketService.sendLocation(
            activeOrderId,
            location.latitude,
            location.longitude
          );

          riderService.updateLocation(
            activeOrderId,
            location.latitude,
            location.longitude
          );
        },
        onError: (message: string) => showToast(message),
      });

      setTracking(true);
    },
    [order?.id]
  );

  const stopTracking = useCallback(() => {
    liveLocationService.stop();
    setTracking(false);
  }, []);

  useEffect(() => {
    if (order?.id) riderSocketService.joinOrder(order.id);

    return () => {
      if (order?.id) riderSocketService.leaveOrder(order.id);
    };
  }, [order?.id]);

  useEffect(() => {
    if (order?.id && shouldTrack) startTracking(order.id);

    if (["DELIVERED", "CANCELLED"].includes(order?.status)) {
      stopTracking();
    }
  }, [order?.id, order?.status, shouldTrack, startTracking, stopTracking]);

  const openLiveTracking = () => {
    if (!order?.id) {
      showToast("Order not available");
      return;
    }

    navigation?.navigate?.("RiderLiveTracking", {
      orderId: order.id,
      order,
    });
  };

  const markPicked = async () => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.markPicked(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Action failed");
        return;
      }

      setOrder(res?.data || { ...order, status: "PICKED_UP" });
      startTracking(order.id);
      showToast("Order marked as picked");
      loadOrder();
    } catch (e: any) {
      showToast(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const startDelivery = async () => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.startDelivery(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Action failed");
        return;
      }

      setOrder(res?.data || { ...order, status: "OUT_FOR_DELIVERY" });
      startTracking(order.id);
      showToast("Delivery started");
      loadOrder();
    } catch (e: any) {
      showToast(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyDeliveryOtp = async () => {
    if (!order?.id || busy) return;

    if (!otp || otp.trim().length < 4) {
      showToast("Enter valid customer OTP");
      return;
    }

    setBusy(true);

    try {
      const res = await riderService.verifyDeliveryOtp(order.id, otp.trim());

      if (res?.error) {
        showToast(res?.error?.message || "Invalid OTP");
        return;
      }

      stopTracking();
      setOtp("");
      setOtpModal(false);
      setOrder(res?.data || { ...order, status: "DELIVERED" });
      showToast("OTP verified. Order delivered");

      setTimeout(() => {
        navigation?.goBack?.();
      }, 600);
    } catch (e: any) {
      showToast(e?.message || "OTP verification failed");
    } finally {
      setBusy(false);
    }
  };

  const nextAction = () => {
    if (order?.status === "ASSIGNED_TO_RIDER") return markPicked();
    if (order?.status === "PICKED_UP") return startDelivery();
    if (order?.status === "OUT_FOR_DELIVERY") {
      setOtpModal(true);
      return;
    }
  };

  const actionLabel = () => {
    if (order?.status === "ASSIGNED_TO_RIDER") return "Mark Picked";
    if (order?.status === "PICKED_UP") return "Start Delivery";
    if (order?.status === "OUT_FOR_DELIVERY") return "Verify Customer OTP";
    return "No Action";
  };

  const canAction = ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(
    order?.status
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator color={T.yellow} size="large" />
        <Text style={styles.loadingText}>Loading order detail...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <Icon name="alert-circle-outline" size={52} color={T.yellow} />
        <Text style={styles.emptyTitle}>Order not found</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={() => navigation?.goBack?.()}>
          <Text style={styles.mainBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={T.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Order Detail</Text>
          <Text style={styles.sub}>#{order.orderNumber || shortId(order.id)}</Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {String(order.status || "").replaceAll("_", " ")}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Delivery Earning</Text>
            <Text style={styles.heroAmount}>{money(order.deliveryFee)}</Text>
            <Text style={styles.heroSub}>
              Distance{" "}
              {order.distanceKm ? `${Number(order.distanceKm).toFixed(1)} km` : "-"}
            </Text>
          </View>

          <View style={styles.paymentBox}>
            <Icon name="card-outline" size={18} color={T.yellow} />
            <Text style={styles.paymentText}>{order.paymentMethod || "COD"}</Text>
          </View>
        </View>

        {shouldTrack && (
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.trackingCard}
            onPress={openLiveTracking}
          >
            <View style={styles.trackingIcon}>
              <Icon name={tracking ? "radio" : "location-outline"} size={22} color={T.black} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.trackingTitle}>
                {tracking ? "Live tracking active" : "Live tracking ready"}
              </Text>
              <Text style={styles.trackingSub}>Tap to open map and delivery route</Text>
            </View>

            <Icon name="chevron-forward" size={22} color={T.yellow} />
          </TouchableOpacity>
        )}

        <View style={styles.routeCard}>
          <RouteBlock
            icon="storefront-outline"
            title="Pickup Location"
            name={vendor?.name || "Karto Store"}
            address={getPickupAddress(order)}
            onMap={() => openMapAddress(getPickupAddress(order))}
          />

          <View style={styles.routeDivider} />

          <RouteBlock
            icon="location-outline"
            title="Drop Location"
            name={customer?.name || customer?.fullName || "Customer"}
            address={getDropAddress(order)}
            onMap={() => openMapAddress(getDropAddress(order))}
          />
        </View>

        <View style={styles.quickActions}>
          <Action
            icon="call-outline"
            title="Customer"
            onPress={() => callPhone(customer?.phone)}
          />
          <Action
            icon="storefront-outline"
            title="Vendor"
            onPress={() => callPhone(vendor?.phone || vendor?.ownerMobileNo)}
          />
          <Action icon="map-outline" title="Live Map" onPress={openLiveTracking} />
        </View>

        {order?.status === "OUT_FOR_DELIVERY" && (
          <TouchableOpacity
            style={styles.otpInfoCard}
            activeOpacity={0.9}
            onPress={() => setOtpModal(true)}
          >
            <Icon name="keypad-outline" size={24} color={T.yellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.otpInfoTitle}>Customer OTP required</Text>
              <Text style={styles.otpInfoSub}>
                Ask customer for delivery OTP and verify to complete order.
              </Text>
            </View>
            <Icon name="chevron-forward" size={21} color={T.yellow} />
          </TouchableOpacity>
        )}

        <Text style={styles.section}>Customer</Text>

        <View style={styles.card}>
          <InfoLine icon="person-outline" label="Name" value={customer?.name || customer?.fullName || "Customer"} />
          <InfoLine icon="call-outline" label="Phone" value={customer?.phone || "Not available"} />
          <InfoLine icon="location-outline" label="Address" value={getDropAddress(order)} />
        </View>

        <Text style={styles.section}>Items</Text>

        <View style={styles.card}>
          {(order.items || []).map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {item.itemName || item.menuItem?.name || "Item"}
                </Text>
                <Text style={styles.itemSub}>Qty: {item.quantity || 1}</Text>
              </View>
              <Text style={styles.itemPrice}>{money(item.totalPrice || item.price)}</Text>
            </View>
          ))}

          {(!order.items || order.items.length === 0) && (
            <Text style={styles.mutedText}>No item details available</Text>
          )}
        </View>

        <Text style={styles.section}>Bill Summary</Text>

        <View style={styles.card}>
          <Bill label="Item Total" value={money(order.itemTotal)} />
          <Bill label="Delivery Fee" value={money(order.deliveryFee)} />
          <Bill label="Discount" value={`- ${money(order.discount)}`} />
          <Bill label="Tax" value={money(order.taxAmount)} />
          <View style={styles.billDivider} />
          <Bill label="Total Amount" value={money(order.totalAmount)} bold />
        </View>

        {canAction && (
          <TouchableOpacity
            disabled={busy}
            style={[styles.bottomBtn, busy && styles.disabledBtn]}
            onPress={nextAction}
          >
            {busy ? (
              <ActivityIndicator color={T.black} />
            ) : (
              <>
                <Text style={styles.bottomBtnText}>{actionLabel()}</Text>
                <Icon name="arrow-forward" size={19} color={T.black} />
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal transparent visible={otpModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.otpModal}>
            <View style={styles.otpIcon}>
              <Icon name="shield-checkmark" size={32} color={T.black} />
            </View>

            <Text style={styles.otpTitle}>Verify Delivery OTP</Text>
            <Text style={styles.otpSub}>
              Customer ke app me jo OTP hai, wahi enter karo. OTP verify hone ke
              baad hi order delivered hoga.
            </Text>

            <TextInput
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="Enter OTP"
              placeholderTextColor={T.muted}
              keyboardType="number-pad"
              style={styles.otpInput}
              maxLength={6}
            />

            <TouchableOpacity
              disabled={busy}
              style={[styles.verifyBtn, busy && styles.disabledBtn]}
              onPress={verifyDeliveryOtp}
            >
              {busy ? (
                <ActivityIndicator color={T.black} />
              ) : (
                <Text style={styles.verifyText}>Verify & Deliver</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy}
              style={styles.cancelOtpBtn}
              onPress={() => setOtpModal(false)}
            >
              <Text style={styles.cancelOtpText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RouteBlock({ icon, title, name, address, onMap }: any) {
  return (
    <View style={styles.routeBlock}>
      <View style={styles.routeIcon}>
        <Icon name={icon} size={20} color={T.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.routeTitle}>{title}</Text>
        <Text style={styles.routeName}>{name}</Text>
        <Text style={styles.routeAddress}>{address}</Text>
      </View>

      <TouchableOpacity style={styles.mapBtn} onPress={onMap}>
        <Icon name="navigate" size={18} color={T.black} />
      </TouchableOpacity>
    </View>
  );
}

function Action({ icon, title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Icon name={icon} size={22} color={T.yellow} />
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

function InfoLine({ icon, label, value }: any) {
  return (
    <View style={styles.infoLine}>
      <Icon name={icon} size={18} color={T.yellow} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Bill({ label, value, bold }: any) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.boldYellow]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: { color: T.muted, marginTop: 12, fontWeight: "700" },
  toast: {
    position: "absolute",
    top: 44,
    left: 18,
    right: 18,
    zIndex: 99,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: T.black, fontWeight: "900", flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 24, fontWeight: "900" },
  sub: { color: T.muted, fontSize: 13, marginTop: 2 },
  statusBadge: {
    backgroundColor: "#102A1B",
    borderColor: "#1F6B3B",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: 125,
  },
  statusText: {
    color: T.green,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: T.muted, fontWeight: "700" },
  heroAmount: {
    color: T.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSub: { color: T.green, fontSize: 12, fontWeight: "800", marginTop: 4 },
  paymentBox: {
    backgroundColor: T.black,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  paymentText: { color: T.text, fontWeight: "900" },
  trackingCard: {
    backgroundColor: "#0E1B12",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "#1F6B3B",
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackingIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingTitle: { color: T.text, fontSize: 15, fontWeight: "900" },
  trackingSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  routeCard: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 16,
  },
  routeBlock: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2B2207",
    alignItems: "center",
    justifyContent: "center",
  },
  routeTitle: { color: T.yellow, fontSize: 12, fontWeight: "900" },
  routeName: {
    color: T.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  routeAddress: { color: T.muted, fontSize: 12, marginTop: 3 },
  routeDivider: {
    width: 1,
    height: 22,
    backgroundColor: T.border,
    marginLeft: 22,
    marginVertical: 8,
  },
  mapBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  action: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 15,
    alignItems: "center",
  },
  actionText: {
    color: T.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 7,
  },
  otpInfoCard: {
    backgroundColor: "#2A2308",
    borderColor: T.yellow,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  otpInfoTitle: { color: T.yellow, fontWeight: "900" },
  otpInfoSub: { color: T.muted, fontSize: 12, marginTop: 3, lineHeight: 18 },
  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  infoLabel: { color: T.muted, width: 70, fontSize: 12 },
  infoValue: { color: T.text, flex: 1, fontWeight: "800" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  itemName: { color: T.text, fontWeight: "900" },
  itemSub: { color: T.muted, marginTop: 4, fontSize: 12 },
  itemPrice: { color: T.yellow, fontWeight: "900" },
  mutedText: { color: T.muted },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  billLabel: { color: T.muted },
  billValue: { color: T.text, fontWeight: "800" },
  billDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 8,
  },
  boldText: { color: T.text, fontWeight: "900" },
  boldYellow: { color: T.yellow, fontWeight: "900", fontSize: 17 },
  bottomBtn: {
    backgroundColor: T.yellow,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  bottomBtnText: { color: T.black, fontSize: 16, fontWeight: "900" },
  disabledBtn: { opacity: 0.55 },
  mainBtn: {
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 26,
    marginTop: 18,
  },
  mainBtnText: { color: T.black, fontWeight: "900" },
  emptyTitle: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    padding: 22,
  },
  otpModal: {
    backgroundColor: T.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: T.border,
    padding: 20,
  },
  otpIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  otpTitle: {
    color: T.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  otpSub: {
    color: T.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  otpInput: {
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    color: T.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 8,
    marginTop: 18,
    height: 58,
  },
  verifyBtn: {
    backgroundColor: T.yellow,
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  verifyText: { color: T.black, fontWeight: "900", fontSize: 15 },
  cancelOtpBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    height: 42,
  },
  cancelOtpText: { color: T.muted, fontWeight: "900" },
});