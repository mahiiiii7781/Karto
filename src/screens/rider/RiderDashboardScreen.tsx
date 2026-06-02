import React, { useCallback, useEffect, useMemo, useState } from "react";
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
const shortId = (id?: string) => (id ? id.slice(0, 8).toUpperCase() : "ORDER");

export default function RiderDashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadDashboard = useCallback(async () => {
    try {
      const [
        profileRes,
        analyticsRes,
        walletRes,
        newOrdersRes,
        activeOrdersRes,
        leaderboardRes,
      ] = await Promise.all([
        riderService.getProfile(),
        riderService.getAnalytics(),
        riderService.getWallet(),
        riderService.getNewOrders(),
        riderService.getActiveOrders(),
        riderService.getLeaderboard(),
      ]);

      setProfile(profileRes?.rider || null);
      setOnline(!!profileRes?.rider?.isOnline);
      setAnalytics(analyticsRes?.analytics || {});
      setWallet(walletRes?.wallet || {});
      setNewOrders(newOrdersRes?.orders || []);
      setActiveOrders(activeOrdersRes?.orders || []);
      setLeaderboard(leaderboardRes?.leaderboard || []);
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
      setOnline(!!res?.rider?.isOnline);
      showToast(value ? "You are online now" : "You are offline now");
    } catch (e: any) {
      setOnline(old);
      showToast(e?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    setBusy(true);
    try {
      await riderService.acceptOrder(orderId);
      showToast("Order accepted successfully");
      loadDashboard();
    } catch (e: any) {
      showToast(e?.message || "Could not accept order");
    } finally {
      setBusy(false);
    }
  };

  const rejectOrder = async (orderId: string) => {
    setBusy(true);
    try {
      await riderService.rejectOrder(orderId);
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
            <Text style={styles.name}>{profile?.fullName || "Karto Rider"}</Text>
            <Text style={styles.sub}>
              {online
                ? "Live deliveries are ready for you"
                : "Go online to receive new orders"}
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={[styles.statusText, { color: online ? THEME.green : THEME.muted }]}>
              {online ? "ONLINE" : "OFFLINE"}
            </Text>
            <Switch
              value={online}
              disabled={busy}
              onValueChange={toggleOnline}
              thumbColor={online ? THEME.yellow : THEME.muted}
              trackColor={{ false: "#1F2937", true: THEME.greenDark }}
            />
          </View>
        </View>

        <View style={styles.kycCard}>
          <Icon
            name={profile?.kycStatus === "APPROVED" ? "shield-checkmark" : "shield-outline"}
            size={22}
            color={profile?.kycStatus === "APPROVED" ? THEME.green : THEME.yellow}
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
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="wallet-outline" title="Wallet" value={money(wallet?.balance)} />
          <StatCard icon="cash-outline" title="Today" value={money(analytics?.todayEarnings)} />
          <StatCard icon="cube-outline" title="Active" value={analytics?.activeOrders || 0} />
          <StatCard icon="trophy-outline" title="Rank" value={`#${rank}`} />
        </View>

        <SectionHeader title="Current Delivery" action="View all" onPress={() => navigation?.navigate?.("RiderActiveOrders")} />

        {activeOrders.length > 0 ? (
          activeOrders.slice(0, 1).map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.88}
              style={styles.activeCard}
              onPress={() => navigation?.navigate?.("RiderOrderDetail", { orderId: order.id })}
            >
              <View style={styles.activeIcon}>
                <Icon name="navigate" size={23} color={THEME.yellow} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>#{order.orderNumber || shortId(order.id)}</Text>
                <Text style={styles.orderSub} numberOfLines={1}>
                  Pickup: {order.restaurant?.name || "Store"}
                </Text>
                <Text style={styles.orderSub} numberOfLines={1}>
                  Drop: {order.address?.address || "Customer address"}
                </Text>
              </View>

              <Icon name="chevron-forward" size={22} color={THEME.muted} />
            </TouchableOpacity>
          ))
        ) : (
          <EmptyCard icon="bicycle-outline" title="No active delivery" text="Accept an order to start your trip." />
        )}

        <SectionHeader title="New Requests" action={`${newOrders.length} orders`} />

        {!online ? (
          <EmptyCard icon="power-outline" title="You are offline" text="Turn online to start receiving delivery requests." />
        ) : newOrders.length === 0 ? (
          <EmptyCard icon="radio-outline" title="Waiting for orders" text="Realtime delivery requests will appear here." />
        ) : (
          newOrders.slice(0, 5).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderTitle}>#{order.orderNumber || shortId(order.id)}</Text>
                  <Text style={styles.orderSub}>{order.restaurant?.name || "Karto Store"}</Text>
                </View>
                <View style={styles.feeBadge}>
                  <Text style={styles.feeText}>{money(order.deliveryFee)}</Text>
                </View>
              </View>

              <InfoLine icon="storefront-outline" text={`Pickup: ${order.restaurant?.address || order.restaurant?.name || "Store location"}`} />
              <InfoLine icon="location-outline" text={`Drop: ${order.address?.address || "Customer location"}`} />
              <InfoLine icon="card-outline" text={`Payment: ${order.paymentMethod || "COD"} • ${money(order.totalAmount)}`} />

              <View style={styles.actions}>
                <TouchableOpacity
                  disabled={busy}
                  style={styles.rejectBtn}
                  onPress={() => rejectOrder(order.id)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={busy}
                  style={styles.acceptBtn}
                  onPress={() => acceptOrder(order.id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                  <Icon name="arrow-forward" size={18} color={THEME.black} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action, onPress }: any) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
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

function InfoLine({ icon, text }: any) {
  return (
    <View style={styles.infoLine}>
      <Icon name={icon} size={16} color={THEME.green} />
      <Text style={styles.infoText} numberOfLines={1}>{text}</Text>
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
  safe: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "700" },

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
  toastText: { color: THEME.black, fontWeight: "900", flex: 1 },

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
  hello: { color: THEME.yellow, fontSize: 13, fontWeight: "900" },
  name: { color: THEME.text, fontSize: 26, fontWeight: "900", marginTop: 4 },
  sub: { color: THEME.muted, fontSize: 13, marginTop: 6, maxWidth: 210 },
  statusPill: {
    backgroundColor: THEME.black,
    borderRadius: 18,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusText: { fontSize: 11, fontWeight: "900", marginBottom: 4 },

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
  kycTitle: { color: THEME.text, fontWeight: "900" },
  kycSub: { color: THEME.muted, fontSize: 12, marginTop: 3 },

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
  statValue: { color: THEME.text, fontSize: 21, fontWeight: "900", marginTop: 10 },
  statTitle: { color: THEME.muted, fontSize: 12, marginTop: 4 },

  sectionHead: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 19, fontWeight: "900" },
  sectionAction: { color: THEME.yellow, fontSize: 13, fontWeight: "900" },

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
  },
  orderTitle: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  orderSub: { color: THEME.muted, fontSize: 13, marginTop: 4 },
  feeBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  feeText: { color: THEME.black, fontWeight: "900" },

  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  infoText: { color: THEME.muted, flex: 1, fontSize: 13 },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.danger,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  rejectText: { color: THEME.danger, fontWeight: "900" },
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
  acceptText: { color: THEME.black, fontWeight: "900" },

  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  emptyTitle: { color: THEME.text, fontSize: 17, fontWeight: "900", marginTop: 12 },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});