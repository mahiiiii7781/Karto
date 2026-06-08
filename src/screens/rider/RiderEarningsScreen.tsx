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
  if (!value) return "Today";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Today";
  }
};

type PeriodType = "daily" | "weekly" | "monthly";

export default function RiderEarningsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [period, setPeriod] = useState<PeriodType>("daily");

  const [total, setTotal] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({});
  const [settlements, setSettlements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const [earningRes, walletRes, analyticsRes] = await Promise.all([
        riderService.getTodayEarnings(period),
        riderService.getWallet(),
        riderService.getAnalytics(),
      ]);

      if (earningRes?.error) {
        showToast(earningRes?.error?.message || "Failed to load earnings");
        return;
      }

      setTotal(Number(earningRes?.data?.total || 0));
      setTotalOrders(Number(earningRes?.data?.totalOrders || 0));
      setEarnings(earningRes?.data?.earnings || []);
      setWallet(walletRes?.data?.wallet || walletRes?.data || {});
      setSettlements(walletRes?.data?.settlements || []);
      setAnalytics(analyticsRes?.data || {});
    } catch (e: any) {
      showToast(e?.message || "Failed to load earnings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const avgPerOrder = totalOrders ? total / totalOrders : 0;

  const periodTitle = useMemo(() => {
    if (period === "weekly") return "Weekly Earnings";
    if (period === "monthly") return "Monthly Earnings";
    return "Today’s Earnings";
  }, [period]);

  const statusLevel = useMemo(() => {
    if (total >= 1000) return "Excellent";
    if (total >= 500) return "Good";
    if (total > 0) return "Started";
    return "Waiting";
  }, [total]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
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
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.sub}>Daily, weekly, monthly income & settlements</Text>
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
        <View style={styles.periodRow}>
          <PeriodChip title="Daily" active={period === "daily"} onPress={() => setPeriod("daily")} />
          <PeriodChip title="Weekly" active={period === "weekly"} onPress={() => setPeriod("weekly")} />
          <PeriodChip title="Monthly" active={period === "monthly"} onPress={() => setPeriod("monthly")} />
        </View>

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>{periodTitle}</Text>
            <Text style={styles.heroAmount}>{money(total)}</Text>
            <Text style={styles.heroSub}>
              {totalOrders} orders • Avg {money(avgPerOrder)}/order
            </Text>

            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{statusLevel}</Text>
            </View>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="cash" size={30} color={T.black} />
          </View>
        </View>

        <View style={styles.heroBottom}>
          <MiniStat icon="cube-outline" label="Orders" value={totalOrders} />
          <MiniStat icon="trending-up-outline" label="Avg/order" value={money(avgPerOrder)} />
          <MiniStat icon="wallet-outline" label="Balance" value={money(wallet?.balance)} />
        </View>

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletTitle}>Wallet Summary</Text>
            <Text style={styles.walletSub}>
              Today {money(wallet?.todayEarn || analytics?.todayEarnings)} • Total{" "}
              {money(wallet?.totalEarn || analytics?.totalEarnings)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.walletBtn}
            onPress={() => navigation?.navigate?.("RiderWallet")}
          >
            <Text style={styles.walletBtnText}>Open</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Earning Timeline</Text>

        {earnings.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="cash-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>Complete deliveries to see earnings here.</Text>
          </View>
        ) : (
          earnings.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon name="checkmark-done-outline" size={21} color={T.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.note || "Delivery earning"}</Text>
                <Text style={styles.rowSub}>
                  {item?.order?.orderNumber
                    ? `Order #${item.order.orderNumber} • ${safeDate(item.createdAt)}`
                    : safeDate(item.createdAt)}
                </Text>
              </View>

              <Text style={styles.amount}>{money(item.amount)}</Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Settlement History</Text>

        {settlements.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="receipt-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No settlements yet</Text>
            <Text style={styles.emptyText}>Payout records will appear here.</Text>
          </View>
        ) : (
          settlements.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.settlementRow}>
              <View style={styles.settlementIcon}>
                <Icon name="receipt" size={20} color={T.yellow} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.status || "PENDING"} Settlement</Text>
                <Text style={styles.rowSub}>{safeDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.amount}>{money(item.amount)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PeriodChip({ title, active, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.periodChip, active && styles.periodChipActive]}
    >
      <Text style={[styles.periodText, active && styles.periodTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function MiniStat({ icon, label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={18} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
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

  periodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  periodChip: {
    flex: 1,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  periodText: {
    color: T.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  periodTextActive: {
    color: T.black,
  },

  hero: {
    backgroundColor: T.card,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
  },
  heroLabel: { color: T.yellow, fontWeight: "900", fontSize: 13 },
  heroAmount: { color: T.text, fontSize: 44, fontWeight: "900", marginTop: 8 },
  heroSub: { color: T.green, fontSize: 12, fontWeight: "800", marginTop: 4 },
  statusPill: {
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  statusPillText: {
    color: T.yellow,
    fontSize: 11,
    fontWeight: "900",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 25,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: { flexDirection: "row", gap: 12, marginTop: 14 },

  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
  },
  miniValue: { color: T.text, fontWeight: "900", fontSize: 16, marginTop: 6 },
  miniLabel: { color: T.muted, fontSize: 12, marginTop: 3 },

  walletCard: {
    backgroundColor: "#0E1B12",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1F6B3B",
    padding: 15,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  walletTitle: {
    color: T.text,
    fontWeight: "900",
    fontSize: 15,
  },
  walletSub: {
    color: T.muted,
    fontSize: 12,
    marginTop: 4,
  },
  walletBtn: {
    backgroundColor: T.yellow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  walletBtnText: {
    color: T.black,
    fontWeight: "900",
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

  row: {
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
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0D2C1A",
    alignItems: "center",
    justifyContent: "center",
  },
  settlementRow: {
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
  rowTitle: { color: T.text, fontWeight: "900" },
  rowSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  amount: { color: T.yellow, fontWeight: "900", fontSize: 16 },
});