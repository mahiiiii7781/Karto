import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { riderService } from "@/services/api/riderApi";

const T = {
  bg: "#070A08",
  card: "#101713",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

export default function RiderOrderDetailScreen({ route, navigation }: any) {
  const orderId = route?.params?.orderId;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadOrder = useCallback(async () => {
    try {
      const res = await riderService.getOrderDetail(orderId);
      setOrder(res?.order || null);
    } catch (e: any) {
      showToast(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const callCustomer = () => {
    const phone = order?.user?.phone;
    if (!phone) return showToast("Customer phone not available");
    Linking.openURL(`tel:${phone}`);
  };

  const openMap = (type: "pickup" | "drop") => {
    const address =
      type === "pickup"
        ? order?.restaurant?.address
        : order?.address?.address;

    if (!address) return showToast("Address not available");

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;

    Linking.openURL(url);
  };

  const nextAction = async () => {
    if (!order?.id) return;

    setBusy(true);
    try {
      if (order.status === "ASSIGNED_TO_RIDER") {
        await riderService.markPicked(order.id);
        showToast("Order marked as picked");
      } else if (order.status === "PICKED_UP") {
        await riderService.startDelivery(order.id);
        showToast("Delivery started");
      } else if (order.status === "OUT_FOR_DELIVERY") {
        await riderService.completeOrder(order.id);
        showToast("Order completed");
      }

      loadOrder();
    } catch (e: any) {
      showToast(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = () => {
    if (order?.status === "ASSIGNED_TO_RIDER") return "Mark Picked";
    if (order?.status === "PICKED_UP") return "Start Delivery";
    if (order?.status === "OUT_FOR_DELIVERY") return "Complete Order";
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
          <Text style={styles.sub}>#{order.orderNumber || order.id?.slice(0, 8)}</Text>
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
          </View>

          <View style={styles.paymentBox}>
            <Icon name="card-outline" size={18} color={T.yellow} />
            <Text style={styles.paymentText}>{order.paymentMethod || "COD"}</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <RouteBlock
            icon="storefront-outline"
            title="Pickup Location"
            name={order.restaurant?.name || "Karto Store"}
            address={order.restaurant?.address || "Store address"}
            onMap={() => openMap("pickup")}
          />

          <View style={styles.routeDivider} />

          <RouteBlock
            icon="location-outline"
            title="Drop Location"
            name={order.user?.fullName || "Customer"}
            address={order.address?.address || "Customer address"}
            onMap={() => openMap("drop")}
          />
        </View>

        <View style={styles.quickActions}>
          <Action icon="call-outline" title="Call" onPress={callCustomer} />
          <Action icon="navigate-outline" title="Pickup Map" onPress={() => openMap("pickup")} />
          <Action icon="map-outline" title="Drop Map" onPress={() => openMap("drop")} />
        </View>

        <Text style={styles.section}>Items</Text>

        <View style={styles.card}>
          {(order.items || []).map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName || "Item"}</Text>
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
            style={styles.bottomBtn}
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
  statusText: { color: T.green, fontSize: 10, fontWeight: "900", textAlign: "center" },

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
  heroAmount: { color: T.yellow, fontSize: 34, fontWeight: "900", marginTop: 4 },
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
  routeName: { color: T.text, fontSize: 15, fontWeight: "900", marginTop: 3 },
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
  actionText: { color: T.text, fontSize: 12, fontWeight: "900", marginTop: 7 },

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
  billDivider: { height: 1, backgroundColor: T.border, marginVertical: 8 },
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

  mainBtn: {
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 26,
    marginTop: 18,
  },
  mainBtnText: { color: T.black, fontWeight: "900" },
  emptyTitle: { color: T.text, fontSize: 19, fontWeight: "900", marginTop: 12 },
});