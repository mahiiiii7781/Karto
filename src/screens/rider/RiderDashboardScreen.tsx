import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { riderService } from "@/services/api/riderApi";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#0D120F",
  green: "#22C55E",
  greenDark: "#0F3D24",
  yellow: "#FACC15",
  yellowDark: "#5B4708",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#030504",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const shortId = (id?: string) =>
  id ? id.slice(0, 8).toUpperCase() : "ORDER";

const getAddressText = (address: any) => {
  if (!address) return "Address not available";

  return (
    address.address ||
    address.addressLine ||
    address.fullAddress ||
    address.street ||
    address.landmark ||
    address.city ||
    "Address not available"
  );
};

const getPickupName = (order: any) =>
  order?.vendor?.name ||
  order?.restaurant?.name ||
  "Karto Store";

const getPickupAddress = (order: any) =>
  order?.pickupAddress ||
  order?.vendor?.address ||
  order?.restaurant?.address ||
  getPickupName(order);

const getDropAddress = (order: any) =>
  getAddressText(order?.deliveryAddress || order?.address);

export default function RiderDashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [profile, setProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({});
  const [wallet, setWallet] = useState<any>({});
  const [settlements, setSettlements] = useState<any[]>([]);
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [incentives, setIncentives] = useState<any[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadDashboard = useCallback(async () => {
    try {
      const [
        dashboardRes,
        profileRes,
        analyticsRes,
        walletRes,
        currentAssignmentRes,
        newOrdersRes,
        activeOrdersRes,
        leaderboardRes,
        notificationsRes,
        incentivesRes,
      ] = await Promise.all([
        riderService.dashboard(),
        riderService.getProfile(),
        riderService.getAnalytics(),
        riderService.getWallet(),
        riderService.getCurrentAssignment(),
        riderService.getNewOrders(),
        riderService.getActiveOrders(),
        riderService.getLeaderboard(),
        riderService.getNotifications(),
        riderService.getIncentives(),
      ]);

      const dashboardData = dashboardRes?.data || {};
      const profileData = profileRes?.data || dashboardData?.rider || null;
      const analyticsData = analyticsRes?.data || {};
      const walletData = walletRes?.data?.wallet || walletRes?.data || {};

      setProfile(profileData);
      setOnline(Boolean(profileData?.isOnline || dashboardData?.rider?.isOnline));
      setDashboardStats(dashboardData?.stats || {});
      setAnalytics(analyticsData || {});
      setWallet(walletData || {});
      setSettlements(walletRes?.data?.settlements || []);
      setCurrentAssignment(currentAssignmentRes?.data || null);
      setNewOrders(newOrdersRes?.data || []);
      setActiveOrders(activeOrdersRes?.data || []);
      setLeaderboard(leaderboardRes?.data || []);
      setNotifications(notificationsRes?.data || []);
      setIncentives(incentivesRes?.data || []);
    } catch (e: any) {
      showToast(e?.message || "Dashboard load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
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
      loadDashboard();
    } catch (e: any) {
      setOnline(old);
      showToast(e?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!orderId || busy) return;

    setBusy(true);

    try {
      const res = await riderService.acceptOrder(orderId);

      if (res?.error) {
        showToast(res?.error?.message || "Could not accept order");
        return;
      }

      showToast("Order accepted successfully");
      await loadDashboard();

      navigation?.navigate?.("RiderOrderDetail", {
        orderId,
        order: res?.data,
      });
    } catch (e: any) {
      showToast(e?.message || "Could not accept order");
    } finally {
      setBusy(false);
    }
  };

  const rejectOrder = async (orderId: string) => {
    if (!orderId || busy) return;

    setBusy(true);

    try {
      const res = await riderService.rejectOrder(orderId);

      if (res?.error) {
        showToast(res?.error?.message || "Could not reject order");
        return;
      }

      setNewOrders((prev) => prev.filter((x) => x.id !== orderId));
      showToast("Delivery request rejected");
    } catch (e: any) {
      showToast(e?.message || "Could not reject order");
    } finally {
      setBusy(false);
    }
  };

  const rank = useMemo(() => {
    const id = profile?.id;
    return leaderboard?.find((x) => x?.rider?.id === id)?.rank || "-";
  }, [leaderboard, profile]);

  const todayEarnings =
    analytics?.todayEarnings ??
    dashboardStats?.todayEarnings ??
    wallet?.todayEarn ??
    0;

  const totalEarnings =
    dashboardStats?.totalEarnings ??
    analytics?.totalEarnings ??
    wallet?.totalEarn ??
    0;

  const walletBalance =
    dashboardStats?.walletBalance ??
    analytics?.walletBalance ??
    wallet?.balance ??
    0;

  const activeOrderCount =
    analytics?.activeOrders ??
    dashboardStats?.activeOrders ??
    activeOrders.length ??
    0;

  const deliveredOrders =
    analytics?.deliveredOrders ??
    dashboardStats?.deliveredOrders ??
    0;

  const todayOrders =
    analytics?.todayOrders ??
    dashboardStats?.todayOrders ??
    0;

  const unreadNotifications = notifications.filter((n) => !n?.isRead).length;
  const activeIncentives = incentives.filter((x) => !x?.isCompleted).length;

  const topActiveOrder =
    activeOrders?.[0] ||
    dashboardStats?.activeOrder ||
    currentAssignment?.activeOrder ||
    null;

  const completionRate = useMemo(() => {
    const delivered = Number(deliveredOrders || 0);
    const active = Number(activeOrderCount || 0);
    const total = delivered + active;

    if (!total) return 0;

    return Math.round((delivered / total) * 100);
  }, [deliveredOrders, activeOrderCount]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Preparing rider cockpit...</Text>
      </SafeAreaView>
    );
  }
    return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={THEME.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
          />
        }
      >
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Welcome back</Text>
            <Text style={styles.name}>
              {profile?.fullName || "Karto Rider"}
            </Text>
            <Text style={styles.sub}>
              {online
                ? "You are live. New delivery requests can arrive anytime."
                : "Go online to receive new orders"}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                KYC: {profile?.kycStatus || "PENDING"}
              </Text>

              {!!profile?.vehicleNo && (
                <Text style={styles.metaText}>• {profile.vehicleNo}</Text>
              )}
            </View>
          </View>

          <View style={styles.statusPill}>
            <Text
              style={[
                styles.statusText,
                {
                  color: online ? THEME.green : THEME.muted,
                },
              ]}
            >
              {online ? "ONLINE" : "OFFLINE"}
            </Text>

            <Switch
              value={online}
              disabled={busy}
              onValueChange={toggleOnline}
              thumbColor={online ? THEME.yellow : THEME.muted}
              trackColor={{
                false: "#1F2937",
                true: THEME.greenDark,
              }}
            />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.analyticsBanner}
          onPress={() => navigation?.navigate?.("RiderAnalytics")}
        >
          <View style={styles.analyticsIcon}>
            <Icon name="analytics" size={24} color={THEME.black} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.analyticsTitle}>Performance Analytics</Text>
            <Text style={styles.analyticsSub}>
              {completionRate}% completion • Today {money(todayEarnings)} •{" "}
              {todayOrders} orders
            </Text>

            <View style={styles.progressOuter}>
              <View
                style={[
                  styles.progressInner,
                  { width: `${Math.min(completionRate, 100)}%` },
                ]}
              />
            </View>
          </View>

          <Icon name="chevron-forward" size={22} color={THEME.yellow} />
        </TouchableOpacity>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="wallet-outline"
            title="Wallet"
            sub={money(walletBalance)}
            onPress={() => navigation?.navigate?.("RiderWallet")}
          />
          <QuickAction
            icon="document-text-outline"
            title="History"
            sub={`${deliveredOrders} done`}
            onPress={() => navigation?.navigate?.("RiderDeliveryHistory")}
          />
          <QuickAction
            icon="gift-outline"
            title="Incentives"
            sub={`${activeIncentives} active`}
            onPress={() => navigation?.navigate?.("RiderIncentives")}
          />
          {/* <QuickAction
            icon="notifications-outline"
            title="Alerts"
            sub={`${unreadNotifications} new`}
            onPress={() => navigation?.navigate?.("RiderNotifications")}
          /> */}
        </View>

        <View style={styles.kycCard}>
          <Icon
            name={
              profile?.kycStatus === "APPROVED"
                ? "shield-checkmark"
                : "shield-outline"
            }
            size={22}
            color={
              profile?.kycStatus === "APPROVED" ? THEME.green : THEME.yellow
            }
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.kycTitle}>
              KYC Status: {profile?.kycStatus || "PENDING"}
            </Text>
            <Text style={styles.kycSub}>
              {profile?.kycStatus === "APPROVED"
                ? "You can accept delivery requests."
                : "Complete KYC to unlock deliveries."}
            </Text>
          </View>

          {profile?.kycStatus !== "APPROVED" && (
            <TouchableOpacity
              style={styles.smallYellowBtn}
              onPress={() => navigation?.navigate?.("RiderKyc")}
            >
              <Text style={styles.smallYellowText}>Update</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="wallet-outline"
            title="Wallet Balance"
            value={money(walletBalance)}
          />
          <StatCard
            icon="cash-outline"
            title="Today"
            value={money(todayEarnings)}
          />
          <StatCard
            icon="trending-up-outline"
            title="Total"
            value={money(totalEarnings)}
          />
          <StatCard
            icon="cube-outline"
            title="Active"
            value={activeOrderCount}
          />
          <StatCard
            icon="checkmark-done-outline"
            title="Delivered"
            value={deliveredOrders}
          />
          <StatCard
            icon="trophy-outline"
            title="Rank"
            value={`#${rank}`}
          />
        </View>

        <SectionHeader
          title="Current Delivery"
          action="View all"
          onPress={() => navigation?.navigate?.("RiderActiveOrders")}
        />

        {topActiveOrder ? (
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.activeCard}
            onPress={() =>
              navigation?.navigate?.("RiderOrderDetail", {
                orderId: topActiveOrder.id,
                order: topActiveOrder,
              })
            }
          >
            <View style={styles.activeIcon}>
              <Icon name="navigate" size={23} color={THEME.yellow} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.orderTitle}>
                #{topActiveOrder.orderNumber || shortId(topActiveOrder.id)}
              </Text>
              <Text style={styles.orderSub} numberOfLines={1}>
                Pickup: {getPickupName(topActiveOrder)}
              </Text>
              <Text style={styles.orderSub} numberOfLines={1}>
                Drop: {getDropAddress(topActiveOrder)}
              </Text>
              <Text style={styles.orderStatusText}>
                {topActiveOrder.status || "ASSIGNED"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.trackMiniBtn}
              onPress={() =>
                navigation?.navigate?.("RiderLiveTracking", {
                  orderId: topActiveOrder.id,
                  order: topActiveOrder,
                })
              }
            >
              <Icon name="map" size={18} color={THEME.black} />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <EmptyCard
            icon="bicycle-outline"
            title="No active delivery"
            text="Accept an order to start your trip."
          />
        )}

        <SectionHeader
          title="New Requests"
          action={`${newOrders.length} orders`}
        />

        {!online ? (
          <EmptyCard
            icon="power-outline"
            title="You are offline"
            text="Turn online to start receiving delivery requests."
          />
        ) : newOrders.length === 0 ? (
          <EmptyCard
            icon="radio-outline"
            title="Waiting for orders"
            text="Realtime delivery requests will appear here."
          />
        ) : (
          newOrders.slice(0, 5).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderTitle}>
                    #{order.orderNumber || shortId(order.id)}
                  </Text>
                  <Text style={styles.orderSub}>{getPickupName(order)}</Text>
                </View>

                <View style={styles.feeBadge}>
                  <Text style={styles.feeText}>{money(order.deliveryFee)}</Text>
                </View>
              </View>

              <InfoLine
                icon="storefront-outline"
                text={`Pickup: ${getPickupAddress(order)}`}
              />
              <InfoLine
                icon="location-outline"
                text={`Drop: ${getDropAddress(order)}`}
              />
              <InfoLine
                icon="bicycle-outline"
                text={`Distance: ${
                  order.distanceKm
                    ? `${Number(order.distanceKm).toFixed(1)} km`
                    : "-"
                }`}
              />
              <InfoLine
                icon="card-outline"
                text={`Payment: ${order.paymentMethod || "COD"} • ${money(
                  order.totalAmount
                )}`}
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  disabled={busy}
                  style={[styles.rejectBtn, busy && styles.disabledBtn]}
                  onPress={() => rejectOrder(order.id)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={busy}
                  style={[styles.acceptBtn, busy && styles.disabledBtn]}
                  onPress={() => acceptOrder(order.id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                  <Icon name="arrow-forward" size={18} color={THEME.black} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <SectionHeader
          title="Settlements"
          action={`${settlements.length} records`}
          onPress={() => navigation?.navigate?.("RiderWallet")}
        />

        {settlements.length > 0 ? (
          settlements.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.settlementCard}>
              <View>
                <Text style={styles.settlementTitle}>
                  {item.status || "PENDING"} Settlement
                </Text>
                <Text style={styles.settlementSub}>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "-"}
                </Text>
              </View>
              <Text style={styles.settlementAmount}>{money(item.amount)}</Text>
            </View>
          ))
        ) : (
          <EmptyCard
            icon="receipt-outline"
            title="No settlements yet"
            text="Your payout history will appear here."
          />
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action, onPress }: any) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {!!action && (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.75}
          disabled={!onPress}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({ icon, title, value }: any) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={22} color={THEME.yellow} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function QuickAction({ icon, title, sub, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.quickAction}
      onPress={onPress}
    >
      <View style={styles.quickIcon}>
        <Icon name={icon} size={20} color={THEME.yellow} />
      </View>
      <Text style={styles.quickText}>{title}</Text>
      {!!sub && <Text style={styles.quickSub}>{sub}</Text>}
    </TouchableOpacity>
  );
}

function InfoLine({ icon, text }: any) {
  return (
    <View style={styles.infoLine}>
      <Icon name={icon} size={16} color={THEME.green} />
      <Text style={styles.infoText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function EmptyCard({ icon, title, text }: any) {
  return (
    <View style={styles.emptyCard}>
      <Icon name={icon} size={42} color={THEME.yellow} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 18,
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
  hero: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  hello: {
    color: THEME.yellow,
    fontSize: 13,
    fontWeight: "900",
  },
  name: {
    color: THEME.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  sub: {
    color: THEME.muted,
    fontSize: 13,
    marginTop: 6,
    maxWidth: 230,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  metaText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "800",
  },
  statusPill: {
    backgroundColor: THEME.black,
    borderRadius: 18,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  analyticsBanner: {
    backgroundColor: "#0E1B12",
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: "#1F6B3B",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  analyticsTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  analyticsSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
  },
  progressOuter: {
    height: 7,
    borderRadius: 10,
    backgroundColor: THEME.black,
    overflow: "hidden",
    marginTop: 9,
  },
  progressInner: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: THEME.yellow,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  quickAction: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: THEME.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  quickText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: "900",
  },
  quickSub: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
  },
  kycCard: {
    backgroundColor: THEME.card2,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  kycTitle: {
    color: THEME.text,
    fontWeight: "900",
  },
  kycSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
  },
  smallYellowBtn: {
    backgroundColor: THEME.yellow,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallYellowText: {
    color: THEME.black,
    fontSize: 12,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statValue: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 10,
  },
  statTitle: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
  },
  sectionHead: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: "900",
  },
  sectionAction: {
    color: THEME.yellow,
    fontSize: 13,
    fontWeight: "900",
  },
  activeCard: {
    backgroundColor: "#0C1510",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#20452E",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.yellowDark,
  },
  trackMiniBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  orderStatusText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },
  orderCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  orderTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  orderSub: {
    color: THEME.muted,
    fontSize: 13,
    marginTop: 4,
  },
  feeBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  feeText: {
    color: THEME.black,
    fontWeight: "900",
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    color: THEME.muted,
    flex: 1,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.danger,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  rejectText: {
    color: THEME.danger,
    fontWeight: "900",
  },
  acceptBtn: {
    flex: 1.4,
    backgroundColor: THEME.yellow,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptText: {
    color: THEME.black,
    fontWeight: "900",
  },
  disabledBtn: {
    opacity: 0.55,
  },
  settlementCard: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settlementTitle: {
    color: THEME.text,
    fontWeight: "900",
  },
  settlementSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
  },
  settlementAmount: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});