import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
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

const safeDate = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const isExpired = (value?: string) => {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
};

export default function RiderWalletScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [wallet, setWallet] = useState<any>({});
  const [settlements, setSettlements] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const [walletRes, couponsRes, analyticsRes] = await Promise.all([
        riderService.getWallet(),
        riderService.getCoupons(),
        riderService.getAnalytics(),
      ]);

      if (walletRes?.error) {
        showToast(walletRes?.error?.message || "Failed to load wallet");
        setWallet({});
        setSettlements([]);
      } else {
        setWallet(walletRes?.data?.wallet || walletRes?.data || {});
        setSettlements(walletRes?.data?.settlements || []);
      }

      if (couponsRes?.error) {
        setCoupons([]);
      } else {
        setCoupons(couponsRes?.data || []);
      }

      setAnalytics(analyticsRes?.data || {});
    } catch (e: any) {
      showToast(e?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const activeCoupons = useMemo(
    () => coupons.filter((x) => !x?.isUsed && !isExpired(x?.expiresAt)),
    [coupons]
  );

  const usedCoupons = useMemo(
    () => coupons.filter((x) => x?.isUsed || isExpired(x?.expiresAt)),
    [coupons]
  );

  const paidSettlements = useMemo(
    () => settlements.filter((x) => x?.status === "PAID"),
    [settlements]
  );

  const pendingSettlements = useMemo(
    () => settlements.filter((x) => x?.status !== "PAID"),
    [settlements]
  );

  const totalPaid = paidSettlements.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  const totalPending = pendingSettlements.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Opening rider wallet...</Text>
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
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.sub}>Earnings, balance, settlements and rewards</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <Text style={styles.balance}>{money(wallet?.balance)}</Text>
              <Text style={styles.walletHint}>
                Today {money(wallet?.todayEarn || analytics?.todayEarnings)} •
                Total {money(wallet?.totalEarn || analytics?.totalEarnings)}
              </Text>
            </View>

            <View style={styles.walletIcon}>
              <Icon name="wallet" size={30} color={T.black} />
            </View>
          </View>

          <View style={styles.walletStats}>
            <WalletStat label="Today Earn" value={money(wallet?.todayEarn || analytics?.todayEarnings)} />
            <WalletStat label="Total Earn" value={money(wallet?.totalEarn || analytics?.totalEarnings)} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat icon="receipt-outline" title="Paid" value={money(totalPaid)} />
          <MiniStat icon="time-outline" title="Pending" value={money(totalPending)} />
          <MiniStat icon="gift-outline" title="Coupons" value={activeCoupons.length} />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.quickBtn}
            onPress={() => navigation?.navigate?.("RiderEarnings")}
          >
            <Icon name="cash-outline" size={20} color={T.yellow} />
            <Text style={styles.quickText}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.quickBtn}
            onPress={() => navigation?.navigate?.("RiderIncentives")}
          >
            <Icon name="ribbon-outline" size={20} color={T.yellow} />
            <Text style={styles.quickText}>Incentives</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.quickBtn}
            onPress={() => navigation?.navigate?.("RiderAnalytics")}
          >
            <Icon name="analytics-outline" size={20} color={T.yellow} />
            <Text style={styles.quickText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Settlement History</Text>

        {settlements.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="receipt-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No settlements yet</Text>
            <Text style={styles.emptyText}>Payout and settlement records will appear here.</Text>
          </View>
        ) : (
          settlements.map((item) => (
            <View key={item.id} style={styles.settlementCard}>
              <View style={styles.settlementIcon}>
                <Icon
                  name={item.status === "PAID" ? "checkmark-done" : "time-outline"}
                  size={20}
                  color={item.status === "PAID" ? T.green : T.yellow}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settlementTitle}>
                  {item.status || "PENDING"} Settlement
                </Text>
                <Text style={styles.settlementSub}>{safeDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.settlementAmount}>{money(item.amount)}</Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Active Reward Coupons</Text>

        {activeCoupons.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="gift-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No active coupons</Text>
            <Text style={styles.emptyText}>Complete deliveries to unlock rider coupons.</Text>
          </View>
        ) : (
          activeCoupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <Icon name="ticket-outline" size={28} color={T.yellow} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.couponTitle}>{coupon.title || "Rider Reward"}</Text>
                <Text style={styles.couponMsg}>
                  {coupon.message || coupon.description || "Delivery reward unlocked"}
                </Text>

                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{coupon.code || "REWARD"}</Text>
                </View>

                {!!coupon.expiresAt && (
                  <Text style={styles.expiryText}>Expires {safeDate(coupon.expiresAt)}</Text>
                )}
              </View>

              <Text style={styles.couponAmount}>{money(coupon.amount)}</Text>
            </View>
          ))
        )}

        {usedCoupons.length > 0 && (
          <>
            <Text style={styles.section}>Used / Expired Coupons</Text>

            {usedCoupons.map((coupon) => (
              <View key={coupon.id} style={styles.usedCoupon}>
                <View>
                  <Text style={styles.usedTitle}>{coupon.title || "Rider Reward"}</Text>
                  <Text style={styles.usedSub}>
                    {coupon.isUsed ? "Used" : "Expired"} • {coupon.code || "REWARD"}
                  </Text>
                </View>

                <Text style={styles.usedAmount}>{money(coupon.amount)}</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletStat({ label, value }: any) {
  return (
    <View style={styles.walletStat}>
      <Text style={styles.walletStatLabel}>{label}</Text>
      <Text style={styles.walletStatValue}>{value}</Text>
    </View>
  );
}

function MiniStat({ icon, title, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={19} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
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
    gap: 14,
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
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 25, fontWeight: "900" },
  sub: { color: T.muted, marginTop: 3, fontSize: 12 },

  walletCard: {
    backgroundColor: T.yellow,
    borderRadius: 32,
    padding: 20,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: { color: T.black, fontWeight: "900", opacity: 0.72 },
  balance: { color: T.black, fontSize: 44, fontWeight: "900", marginTop: 8 },
  walletHint: {
    color: T.black,
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.75,
    marginTop: 4,
  },
  walletIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletStats: { flexDirection: "row", gap: 12, marginTop: 22 },
  walletStat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 18,
    padding: 13,
  },
  walletStatLabel: { color: T.black, fontSize: 12, fontWeight: "800", opacity: 0.72 },
  walletStatValue: { color: T.black, fontSize: 18, fontWeight: "900", marginTop: 5 },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  miniValue: { color: T.text, fontWeight: "900", fontSize: 16, marginTop: 8 },
  miniTitle: { color: T.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },

  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
  },
  quickText: {
    color: T.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 7,
  },

  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  empty: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: { color: T.text, fontWeight: "900", fontSize: 18, marginTop: 12 },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },

  settlementCard: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  settlementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  settlementTitle: { color: T.text, fontWeight: "900" },
  settlementSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  settlementAmount: { color: T.yellow, fontWeight: "900", fontSize: 16 },

  couponCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  couponLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  couponTitle: { color: T.text, fontWeight: "900", fontSize: 15 },
  couponMsg: { color: T.muted, fontSize: 12, marginTop: 4 },
  codeBox: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: T.black,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.border,
  },
  codeText: { color: T.yellow, fontSize: 11, fontWeight: "900" },
  expiryText: { color: T.muted, fontSize: 11, marginTop: 6 },
  couponAmount: { color: T.green, fontWeight: "900", fontSize: 16 },

  usedCoupon: {
    backgroundColor: T.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usedTitle: { color: T.text, fontWeight: "900" },
  usedSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  usedAmount: { color: T.muted, fontWeight: "900" },
});