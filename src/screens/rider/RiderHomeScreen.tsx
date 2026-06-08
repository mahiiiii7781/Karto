import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Sound from "react-native-sound";
import { riderService } from "@/services/api/riderApi";

Sound.setCategory("Playback");

const THEME = {
  black: "#050807",
  black2: "#0B0F0A",
  card: "#101510",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#FFFFFF",
  muted: "#A7B0AA",
  border: "#2C382E",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;
const shortId = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "ORDER");

const getVendor = (order: any) => order?.vendor || order?.restaurant || {};
const getCustomer = (order: any) => order?.customer || order?.user || {};

const getAddress = (address: any) =>
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
  getAddress(order?.deliveryAddress || order?.address);

const openMap = (address: string) => {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  );
};

const callPhone = (phone?: string) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
};

export default function RiderHomeScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({});
  const [wallet, setWallet] = useState<any>({});
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const pulse = useRef(new Animated.Value(1)).current;
  const alarmRef = useRef<Sound | null>(null);
  const previousOrderCount = useRef(0);

  const activeOrder = activeOrders?.[0] || null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const stopAlarm = () => {
    Vibration.cancel();
    alarmRef.current?.stop();
  };

  const playAlarm = () => {
    Vibration.vibrate([500, 700], true);
    alarmRef.current?.stop(() => {
      alarmRef.current?.setNumberOfLoops(-1);
      alarmRef.current?.play();
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [profileRes, analyticsRes, walletRes, newRes, activeRes] =
        await Promise.all([
          riderService.getProfile(),
          riderService.getAnalytics(),
          riderService.getWallet(),
          riderService.getNewOrders(),
          riderService.getActiveOrders(),
        ]);

      const profileData = profileRes?.data || null;
      const newOrders = newRes?.data || [];
      const activeList = activeRes?.data || [];

      setProfile(profileData);
      setOnline(Boolean(profileData?.isOnline));
      setAnalytics(analyticsRes?.data || {});
      setWallet(walletRes?.data?.wallet || walletRes?.data || {});
      setOrders(newOrders);
      setActiveOrders(activeList);

      if (newOrders.length > previousOrderCount.current && activeList.length === 0) {
        playAlarm();
      }

      previousOrderCount.current = newOrders.length;
    } catch (e: any) {
      showToast(e?.message || "Failed to load rider home");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    alarmRef.current = new Sound("new_order.mp3", Sound.MAIN_BUNDLE, () => {});

    loadData();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.035,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const interval = setInterval(loadData, 9000);

    return () => {
      clearInterval(interval);
      stopAlarm();
      alarmRef.current?.release();
      alarmRef.current = null;
    };
  }, [loadData, pulse]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleOnline = async (value: boolean) => {
    const old = online;
    setOnline(value);
    setBusy(true);

    try {
      const res = await riderService.updateOnlineStatus(value);

      if (res?.error) {
        setOnline(old);
        showToast(res?.error?.message || "Could not update status");
        return;
      }

      setOnline(Boolean(res?.data?.isOnline));
      showToast(value ? "You are online now" : "You are offline now");
      loadData();
    } catch (e: any) {
      setOnline(old);
      showToast(e?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  };

  const acceptOrder = async (order: any) => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.acceptOrder(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Could not accept order");
        return;
      }

      stopAlarm();
      showToast("Order accepted successfully");
      await loadData();

      navigation?.navigate?.("RiderOrderDetail", {
        orderId: order.id,
        order: res?.data || order,
      });
    } catch (e: any) {
      showToast(e?.message || "Could not accept order");
    } finally {
      setBusy(false);
    }
  };

  const markPicked = async (order: any) => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.markPicked(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Could not mark picked");
        return;
      }

      showToast("Order marked as picked");
      loadData();
    } catch (e: any) {
      showToast(e?.message || "Could not mark picked");
    } finally {
      setBusy(false);
    }
  };

  const startDelivery = async (order: any) => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.startDelivery(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Could not start delivery");
        return;
      }

      showToast("Delivery started");
      loadData();
    } catch (e: any) {
      showToast(e?.message || "Could not start delivery");
    } finally {
      setBusy(false);
    }
  };

  const nextActiveAction = (order: any) => {
    if (order?.status === "ASSIGNED_TO_RIDER") return markPicked(order);
    if (order?.status === "PICKED_UP") return startDelivery(order);

    if (order?.status === "OUT_FOR_DELIVERY") {
      navigation?.navigate?.("RiderOrderDetail", {
        orderId: order.id,
        order,
        openOtp: true,
      });
      return;
    }

    navigation?.navigate?.("RiderOrderDetail", {
      orderId: order.id,
      order,
    });
  };

  const actionLabel = (status?: string) => {
    if (status === "ASSIGNED_TO_RIDER") return "Mark Picked Up";
    if (status === "PICKED_UP") return "Start Delivery";
    if (status === "OUT_FOR_DELIVERY") return "Verify OTP";
    return "View Details";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.black} />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Preparing rider home...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.black} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={THEME.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.yellow} />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>Karto Rider</Text>
            <Text style={styles.sub}>
              {profile?.fullName || "Professional delivery partner panel"}
            </Text>
          </View>

          <View style={styles.onlineBadge}>
            <View style={[styles.dot, !online && styles.offDot]} />
            <Text style={[styles.onlineText, !online && styles.offText]}>
              {online ? "ONLINE" : "OFFLINE"}
            </Text>
            <Switch
              value={online}
              disabled={busy}
              onValueChange={toggleOnline}
              thumbColor={online ? THEME.yellow : THEME.muted}
              trackColor={{ false: "#1F2937", true: "#0F3D24" }}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox icon="cash-outline" label="Today" value={money(analytics?.todayEarnings)} />
          <StatBox icon="wallet-outline" label="Wallet" value={money(wallet?.balance)} />
          <StatBox icon="cube-outline" label="Active" value={activeOrders.length} />
        </View>

        {activeOrder ? (
          <View style={styles.activeCard}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.sectionTitle}>Active Delivery</Text>
                <Text style={styles.orderNo}>
                  #{activeOrder.orderNumber || shortId(activeOrder.id)}
                </Text>
                <Text style={styles.customer}>
                  {getCustomer(activeOrder)?.name ||
                    getCustomer(activeOrder)?.fullName ||
                    "Customer"}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {String(activeOrder.status || "ASSIGNED").replaceAll("_", " ")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.locationBox}
              onPress={() => openMap(getPickupAddress(activeOrder))}
            >
              <Icon name="storefront" size={20} color={THEME.green} />
              <Text style={styles.address}>{getPickupAddress(activeOrder)}</Text>
              <Icon name="navigate" size={18} color={THEME.green} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationBox}
              onPress={() => openMap(getDropAddress(activeOrder))}
            >
              <Icon name="location" size={20} color={THEME.yellow} />
              <Text style={styles.address}>{getDropAddress(activeOrder)}</Text>
              <Icon name="navigate" size={18} color={THEME.yellow} />
            </TouchableOpacity>

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() =>
                  callPhone(getVendor(activeOrder)?.phone || getVendor(activeOrder)?.ownerMobileNo)
                }
              >
                <Icon name="call" size={17} color={THEME.green} />
                <Text style={styles.quickText}>Vendor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => callPhone(getCustomer(activeOrder)?.phone)}
              >
                <Icon name="call" size={17} color={THEME.green} />
                <Text style={styles.quickText}>Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() =>
                  navigation?.navigate?.("RiderLiveTracking", {
                    orderId: activeOrder.id,
                    order: activeOrder,
                  })
                }
              >
                <Icon name="radio-outline" size={17} color={THEME.green} />
                <Text style={styles.quickText}>Track</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.paymentBox}>
              <Text style={styles.paymentLabel}>Order Amount</Text>
              <Text style={styles.paymentAmount}>{money(activeOrder.totalAmount)}</Text>
              <Text style={styles.paymentMethod}>
                {activeOrder.paymentMethod || "COD"} • Delivery fee{" "}
                {money(activeOrder.deliveryFee)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => nextActiveAction(activeOrder)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={THEME.black} />
              ) : (
                <>
                  <Text style={styles.acceptText}>
                    {actionLabel(activeOrder.status)}
                  </Text>
                  <Icon name="arrow-forward" size={20} color={THEME.black} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>New Orders</Text>

            {!online ? (
              <View style={styles.emptyBox}>
                <Icon name="power-outline" size={56} color={THEME.yellow} />
                <Text style={styles.emptyTitle}>You are offline</Text>
                <Text style={styles.emptySub}>
                  Go online to receive new delivery requests.
                </Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="bicycle" size={56} color={THEME.yellow} />
                <Text style={styles.emptyTitle}>Waiting for orders</Text>
                <Text style={styles.emptySub}>
                  Alarm will ring when a new order arrives.
                </Text>
              </View>
            ) : (
              orders.map((item) => (
                <Animated.View
                  key={item.id}
                  style={[styles.orderCard, { transform: [{ scale: pulse }] }]}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderNo}>
                        #{item.orderNumber || shortId(item.id)}
                      </Text>
                      <Text style={styles.customer}>
                        {getCustomer(item)?.name ||
                          getCustomer(item)?.fullName ||
                          "Customer"}
                      </Text>
                    </View>

                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>NEW</Text>
                    </View>
                  </View>

                  <View style={styles.locationBox}>
                    <Icon name="storefront" size={20} color={THEME.green} />
                    <Text style={styles.address}>{getPickupAddress(item)}</Text>
                  </View>

                  <View style={styles.locationBox}>
                    <Icon name="location" size={20} color={THEME.yellow} />
                    <Text style={styles.address}>{getDropAddress(item)}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      {item.distanceKm ? `${Number(item.distanceKm).toFixed(1)} km` : "-"}
                    </Text>
                    <Text style={styles.meta}>Earning {money(item.deliveryFee)}</Text>
                    <Text style={styles.meta}>{item.paymentMethod || "COD"}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => acceptOrder(item)}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.acceptText}>Accept Order</Text>
                        <Icon name="checkmark-circle" size={20} color={THEME.black} />
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ icon, label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Icon name={icon} size={18} color={THEME.yellow} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.black,
    padding: 18,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.black,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    top: 44,
    left: 18,
    right: 18,
    zIndex: 99,
    backgroundColor: THEME.yellow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: {
    color: THEME.black,
    fontWeight: "900",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  appName: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
  },
  sub: {
    color: THEME.muted,
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102417",
    borderColor: THEME.green,
    borderWidth: 1,
    paddingLeft: 10,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  offDot: {
    backgroundColor: THEME.muted,
  },
  onlineText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
  },
  offText: {
    color: THEME.muted,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
  },
  statValue: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 6,
  },
  statLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 3,
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  orderCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  activeCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  orderNo: {
    color: THEME.yellow,
    fontSize: 18,
    fontWeight: "900",
  },
  customer: {
    color: THEME.text,
    fontSize: 16,
    marginTop: 4,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 11,
  },
  statusBadge: {
    backgroundColor: "#102417",
    borderColor: THEME.green,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 10,
    maxWidth: 120,
    textAlign: "center",
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.black2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 13,
    marginTop: 12,
    gap: 10,
  },
  address: {
    color: THEME.text,
    flex: 1,
    lineHeight: 20,
  },
  quickRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: THEME.black2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F6B3B",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  quickText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  meta: {
    color: THEME.muted,
    fontWeight: "700",
  },
  acceptBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
  paymentBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#2A2308",
    borderWidth: 1,
    borderColor: THEME.yellow,
  },
  paymentLabel: {
    color: THEME.muted,
    fontSize: 12,
  },
  paymentAmount: {
    color: THEME.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  paymentMethod: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 4,
  },
  emptyBox: {
    marginTop: 70,
    alignItems: "center",
    backgroundColor: THEME.card,
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
  },
  emptySub: {
    color: THEME.muted,
    marginTop: 6,
    textAlign: "center",
  },
});