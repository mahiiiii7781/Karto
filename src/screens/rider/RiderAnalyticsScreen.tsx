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

export default function RiderAnalyticsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState("");
  const [analytics, setAnalytics] = useState<any>({});
  const [wallet, setWallet] = useState<any>({});
  const [earnings, setEarnings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadAnalytics = useCallback(async () => {
    try {
      const [
        profileRes,
        analyticsRes,
        walletRes,
        todayEarningsRes,
        leaderboardRes,
      ] = await Promise.all([
        riderService.getProfile(),
        riderService.getAnalytics(),
        riderService.getWallet(),
        riderService.getTodayEarnings(),
        riderService.getLeaderboard(),
      ]);

      setProfile(profileRes?.rider || null);
      setAnalytics(analyticsRes?.analytics || {});
      setWallet(walletRes?.wallet || {});
      setEarnings(todayEarningsRes?.earnings || []);
      setLeaderboard(leaderboardRes?.leaderboard || []);
    } catch (e: any) {
      showToast(e?.message || "Analytics load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const rank = useMemo(() => {
    return (
      leaderboard?.find((x) => x?.rider?.id === profile?.id)?.rank || "-"
    );
  }, [leaderboard, profile]);

  const completionRate = useMemo(() => {
    const delivered = Number(analytics?.deliveredOrders || 0);
    const active = Number(analytics?.activeOrders || 0);
    const total = delivered + active;

    if (!total) return 0;

    return Math.round((delivered / total) * 100);
  }, [analytics]);

  const todayTarget = 10;
  const todayOrders = Number(analytics?.todayOrders || 0);
  const targetPercent = Math.min(
    100,
    Math.round((todayOrders / todayTarget) * 100)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Building rider analytics...</Text>
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rider Analytics</Text>
          <Text style={styles.sub}>Performance, earnings and delivery score</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadAnalytics}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
          />
        }
      >
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Total Earnings</Text>
            <Text style={styles.heroAmount}>
              {money(analytics?.totalEarnings || wallet?.totalEarn)}
            </Text>
            <Text style={styles.heroSub}>
              Wallet balance: {money(wallet?.balance)}
            </Text>
          </View>

          <View style={styles.rankCircle}>
            <Text style={styles.rankValue}>#{rank}</Text>
            <Text style={styles.rankText}>Rank</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <MetricCard
            icon="cash-outline"
            title="Today Earn"
            value={money(analytics?.todayEarnings)}
            accent="yellow"
          />
          <MetricCard
            icon="cube-outline"
            title="Today Orders"
            value={analytics?.todayOrders || 0}
            accent="green"
          />
          <MetricCard
            icon="bicycle-outline"
            title="Active Trips"
            value={analytics?.activeOrders || 0}
            accent="green"
          />
          <MetricCard
            icon="checkmark-done-outline"
            title="Delivered"
            value={analytics?.deliveredOrders || 0}
            accent="yellow"
          />
        </View>

        <Text style={styles.section}>Performance Score</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={styles.scoreTitle}>Delivery Completion</Text>
              <Text style={styles.scoreSub}>
                Based on delivered and active orders
              </Text>
            </View>

            <Text style={styles.scorePercent}>{completionRate}%</Text>
          </View>

          <ProgressBar percent={completionRate} />

          <View style={styles.scoreFooter}>
            <Text style={styles.scoreHint}>
              Delivered: {analytics?.deliveredOrders || 0}
            </Text>
            <Text style={styles.scoreHint}>
              Active: {analytics?.activeOrders || 0}
            </Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View>
              <Text style={styles.scoreTitle}>Today Target</Text>
              <Text style={styles.scoreSub}>
                Complete {todayTarget} orders to hit daily goal
              </Text>
            </View>

            <Text style={styles.scorePercent}>{targetPercent}%</Text>
          </View>

          <ProgressBar percent={targetPercent} />

          <View style={styles.scoreFooter}>
            <Text style={styles.scoreHint}>
              Orders: {todayOrders}/{todayTarget}
            </Text>
            <Text style={styles.scoreHint}>
              Earned: {money(analytics?.todayEarnings)}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Today Earnings</Text>

        <View style={styles.listCard}>
          {earnings.length > 0 ? (
            earnings.slice(0, 6).map((item: any) => (
              <View key={item.id} style={styles.earningRow}>
                <View style={styles.earningIcon}>
                  <Icon name="cash" size={18} color={T.black} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.earningTitle}>
                    {item.note || "Delivery earning"}
                  </Text>
                  <Text style={styles.earningSub}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString()
                      : "Today"}
                  </Text>
                </View>

                <Text style={styles.earningAmount}>{money(item.amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="analytics-outline" size={42} color={T.yellow} />
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptyText}>
                Complete deliveries to see earning analytics.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.section}>Leaderboard Preview</Text>

        <View style={styles.listCard}>
          {leaderboard.slice(0, 5).map((item: any) => (
            <View key={item?.rider?.id || item.rank} style={styles.leaderRow}>
              <View
                style={[
                  styles.leaderRank,
                  item?.rider?.id === profile?.id && styles.myRank,
                ]}
              >
                <Text style={styles.leaderRankText}>{item.rank}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName}>
                  {item?.rider?.fullName || "Karto Rider"}
                </Text>
                <Text style={styles.leaderSub}>
                  Today {money(item?.todayEarn)} • Total {money(item?.totalEarn)}
                </Text>
              </View>

              {item?.rider?.id === profile?.id && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>YOU</Text>
                </View>
              )}
            </View>
          ))}

          {leaderboard.length === 0 && (
            <View style={styles.emptyBox}>
              <Icon name="trophy-outline" size={42} color={T.yellow} />
              <Text style={styles.emptyTitle}>No leaderboard data</Text>
              <Text style={styles.emptyText}>
                Rankings will appear after deliveries.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation?.navigate?.("RiderWallet")}
        >
          <Text style={styles.primaryBtnText}>Open Wallet</Text>
          <Icon name="wallet" size={20} color={T.black} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, title, value, accent }: any) {
  const isGreen = accent === "green";

  return (
    <View style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: isGreen ? T.green : T.yellow },
        ]}
      >
        <Icon name={icon} size={19} color={T.black} />
      </View>

      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

function ProgressBar({ percent }: any) {
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, paddingHorizontal: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
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
    paddingBottom: 12,
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
  title: { color: T.text, fontSize: 23, fontWeight: "900" },
  sub: { color: T.muted, fontSize: 12, marginTop: 3 },

  heroCard: {
    backgroundColor: T.card,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: T.muted, fontWeight: "800" },
  heroAmount: { color: T.yellow, fontSize: 38, fontWeight: "900", marginTop: 4 },
  heroSub: { color: T.green, marginTop: 6, fontWeight: "800" },
  rankCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: T.black,
    borderWidth: 2,
    borderColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  rankValue: { color: T.text, fontSize: 22, fontWeight: "900" },
  rankText: { color: T.muted, fontSize: 11, marginTop: 2 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  metricCard: {
    width: "48%",
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { color: T.text, fontSize: 22, fontWeight: "900", marginTop: 12 },
  metricTitle: { color: T.muted, fontSize: 12, marginTop: 4 },

  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },
  scoreCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 12,
  },
  scoreTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreTitle: { color: T.text, fontSize: 15, fontWeight: "900" },
  scoreSub: { color: T.muted, fontSize: 12, marginTop: 3 },
  scorePercent: { color: T.yellow, fontSize: 24, fontWeight: "900" },
  progressOuter: {
    height: 10,
    backgroundColor: T.black,
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    backgroundColor: T.yellow,
    borderRadius: 10,
  },
  scoreFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
  },
  scoreHint: { color: T.muted, fontSize: 12, fontWeight: "700" },

  listCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  earningIcon: {
    width: 38,
    height: 38,
    borderRadius: 17,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  earningTitle: { color: T.text, fontWeight: "900" },
  earningSub: { color: T.muted, fontSize: 12, marginTop: 3 },
  earningAmount: { color: T.yellow, fontWeight: "900" },

  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  leaderRank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  myRank: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  leaderRankText: { color: T.text, fontWeight: "900" },
  leaderName: { color: T.text, fontWeight: "900" },
  leaderSub: { color: T.muted, fontSize: 12, marginTop: 3 },
  youBadge: {
    backgroundColor: T.green,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  youText: { color: T.black, fontSize: 10, fontWeight: "900" },

  emptyBox: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: { color: T.text, fontSize: 16, fontWeight: "900", marginTop: 10 },
  emptyText: {
    color: T.muted,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 19,
  },

  primaryBtn: {
    backgroundColor: T.yellow,
    borderRadius: 18,
    height: 54,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: T.black, fontSize: 15, fontWeight: "900" },
});