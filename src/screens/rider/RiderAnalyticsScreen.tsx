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
  greenDark: "#0F3D24",
  yellow: "#FACC15",
  yellowDark: "#5B4708",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const safeNum = (v: any) => Number(v || 0);

const getDateText = (value?: string) => {
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

export default function RiderAnalyticsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({});
  const [wallet, setWallet] = useState<any>({});
  const [settlements, setSettlements] = useState<any[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<any[]>([]);
  const [weeklyEarnings, setWeeklyEarnings] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [incentives, setIncentives] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

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
        dailyEarningsRes,
        weeklyEarningsRes,
        monthlyEarningsRes,
        leaderboardRes,
        incentivesRes,
        notificationsRes,
        activeOrdersRes,
      ] = await Promise.all([
        riderService.getProfile(),
        riderService.getAnalytics(),
        riderService.getWallet(),
        riderService.getTodayEarnings("daily"),
        riderService.getTodayEarnings("weekly"),
        riderService.getTodayEarnings("monthly"),
        riderService.getLeaderboard(),
        riderService.getIncentives(),
        riderService.getNotifications(),
        riderService.getActiveOrders(),
      ]);

      if (profileRes?.error) {
        showToast(profileRes?.error?.message || "Profile load failed");
      }

      setProfile(profileRes?.data || null);
      setAnalytics(analyticsRes?.data || {});
      setWallet(walletRes?.data?.wallet || walletRes?.data || {});
      setSettlements(walletRes?.data?.settlements || []);
      setDailyEarnings(dailyEarningsRes?.data?.earnings || []);
      setWeeklyEarnings(weeklyEarningsRes?.data?.earnings || []);
      setMonthlyEarnings(monthlyEarningsRes?.data?.earnings || []);
      setLeaderboard(leaderboardRes?.data || []);
      setIncentives(incentivesRes?.data || []);
      setNotifications(notificationsRes?.data || []);
      setActiveOrders(activeOrdersRes?.data || []);
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
    return leaderboard?.find((x) => x?.rider?.id === profile?.id)?.rank || "-";
  }, [leaderboard, profile]);

  const todayEarnings = safeNum(analytics?.todayEarnings || wallet?.todayEarn);
  const totalEarnings = safeNum(analytics?.totalEarnings || wallet?.totalEarn);
  const walletBalance = safeNum(analytics?.walletBalance || wallet?.balance);
  const deliveredOrders = safeNum(analytics?.deliveredOrders);
  const activeOrderCount = safeNum(analytics?.activeOrders || activeOrders.length);
  const todayOrders = safeNum(analytics?.todayOrders);
  const couponCount = safeNum(analytics?.coupons);
  const activeIncentives = incentives.filter((x) => !x?.isCompleted).length;
  const unreadNotifications = notifications.filter((x) => !x?.isRead).length;

  const weeklyTotal = weeklyEarnings.reduce(
    (sum, item) => sum + safeNum(item?.amount),
    0
  );

  const monthlyTotal = monthlyEarnings.reduce(
    (sum, item) => sum + safeNum(item?.amount),
    0
  );

  const completionRate = useMemo(() => {
    const total = deliveredOrders + activeOrderCount;
    if (!total) return 0;
    return Math.round((deliveredOrders / total) * 100);
  }, [deliveredOrders, activeOrderCount]);

  const todayTarget = 10;
  const targetPercent = Math.min(
    100,
    Math.round((todayOrders / todayTarget) * 100)
  );

  const earningLevel = useMemo(() => {
    if (todayEarnings >= 1000) return "Excellent";
    if (todayEarnings >= 500) return "Good";
    if (todayEarnings > 0) return "Started";
    return "Waiting";
  }, [todayEarnings]);

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rider Analytics</Text>
          <Text style={styles.sub}>Performance, earnings, wallet and delivery score</Text>
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
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Total Earnings</Text>
            <Text style={styles.heroAmount}>{money(totalEarnings)}</Text>
            <Text style={styles.heroSub}>
              Wallet {money(walletBalance)} • Today {money(todayEarnings)}
            </Text>

            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{earningLevel}</Text>
              </View>

              <View style={styles.heroPillDark}>
                <Text style={styles.heroPillDarkText}>
                  {profile?.isOnline ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>
            </View>
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
            value={money(todayEarnings)}
            accent="yellow"
          />
          <MetricCard
            icon="calendar-outline"
            title="Weekly"
            value={money(weeklyTotal)}
            accent="green"
          />
          <MetricCard
            icon="bar-chart-outline"
            title="Monthly"
            value={money(monthlyTotal)}
            accent="yellow"
          />
          <MetricCard
            icon="wallet-outline"
            title="Balance"
            value={money(walletBalance)}
            accent="green"
          />
          <MetricCard
            icon="cube-outline"
            title="Today Orders"
            value={todayOrders}
            accent="green"
          />
          <MetricCard
            icon="bicycle-outline"
            title="Active Trips"
            value={activeOrderCount}
            accent="green"
          />
          <MetricCard
            icon="checkmark-done-outline"
            title="Delivered"
            value={deliveredOrders}
            accent="yellow"
          />
          <MetricCard
            icon="ticket-outline"
            title="Coupons"
            value={couponCount}
            accent="yellow"
          />
        </View>

        <Text style={styles.section}>Performance Score</Text>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreTitle}>Delivery Completion</Text>
              <Text style={styles.scoreSub}>
                Based on delivered and active deliveries
              </Text>
            </View>

            <Text style={styles.scorePercent}>{completionRate}%</Text>
          </View>

          <ProgressBar percent={completionRate} />

          <View style={styles.scoreFooter}>
            <Text style={styles.scoreHint}>Delivered: {deliveredOrders}</Text>
            <Text style={styles.scoreHint}>Active: {activeOrderCount}</Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View style={{ flex: 1 }}>
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
            <Text style={styles.scoreHint}>Earned: {money(todayEarnings)}</Text>
          </View>
        </View>

        <Text style={styles.section}>Rider Activity</Text>

        <View style={styles.activityGrid}>
          <ActivityChip
            icon="notifications-outline"
            title="Notifications"
            value={`${unreadNotifications} unread`}
          />
          <ActivityChip
            icon="gift-outline"
            title="Incentives"
            value={`${activeIncentives} active`}
          />
          <ActivityChip
            icon="receipt-outline"
            title="Settlements"
            value={`${settlements.length} records`}
          />
          <ActivityChip
            icon="shield-checkmark-outline"
            title="KYC"
            value={profile?.kycStatus || "PENDING"}
          />
        </View>

        <Text style={styles.section}>Today Earnings</Text>

        <View style={styles.listCard}>
          {dailyEarnings.length > 0 ? (
            dailyEarnings.slice(0, 6).map((item: any) => (
              <View key={item.id} style={styles.earningRow}>
                <View style={styles.earningIcon}>
                  <Icon name="cash" size={18} color={T.black} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.earningTitle}>
                    {item.note || "Delivery earning"}
                  </Text>
                  <Text style={styles.earningSub}>
                    {item?.order?.orderNumber
                      ? `Order #${item.order.orderNumber}`
                      : getDateText(item.createdAt)}
                  </Text>
                </View>

                <Text style={styles.earningAmount}>{money(item.amount)}</Text>
              </View>
            ))
          ) : (
            <EmptyBox
              icon="analytics-outline"
              title="No earnings yet"
              text="Complete deliveries to see earning analytics."
            />
          )}
        </View>

        <Text style={styles.section}>Settlement History</Text>

        <View style={styles.listCard}>
          {settlements.length > 0 ? (
            settlements.slice(0, 5).map((item: any) => (
              <View key={item.id} style={styles.settlementRow}>
                <View style={styles.settlementIcon}>
                  <Icon name="receipt" size={18} color={T.yellow} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.earningTitle}>
                    {item.status || "PENDING"} Settlement
                  </Text>
                  <Text style={styles.earningSub}>{getDateText(item.createdAt)}</Text>
                </View>

                <Text style={styles.earningAmount}>{money(item.amount)}</Text>
              </View>
            ))
          ) : (
            <EmptyBox
              icon="receipt-outline"
              title="No settlements"
              text="Payout and settlement history will appear here."
            />
          )}
        </View>

        <Text style={styles.section}>Leaderboard Preview</Text>

        <View style={styles.listCard}>
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 5).map((item: any) => (
              <View key={item?.rider?.id || item.rank} style={styles.leaderRow}>
                <View
                  style={[
                    styles.leaderRank,
                    item?.rider?.id === profile?.id && styles.myRank,
                  ]}
                >
                  <Text
                    style={[
                      styles.leaderRankText,
                      item?.rider?.id === profile?.id && styles.myRankText,
                    ]}
                  >
                    {item.rank}
                  </Text>
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
            ))
          ) : (
            <EmptyBox
              icon="trophy-outline"
              title="No leaderboard data"
              text="Rankings will appear after deliveries."
            />
          )}
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation?.navigate?.("RiderLeaderboard")}
          >
            <Text style={styles.secondaryBtnText}>Leaderboard</Text>
            <Icon name="trophy" size={18} color={T.yellow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation?.navigate?.("RiderWallet")}
          >
            <Text style={styles.primaryBtnText}>Open Wallet</Text>
            <Icon name="wallet" size={20} color={T.black} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 44 }} />
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

function ActivityChip({ icon, title, value }: any) {
  return (
    <View style={styles.activityChip}>
      <Icon name={icon} size={19} color={T.yellow} />
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityValue}>{value}</Text>
      </View>
    </View>
  );
}

function ProgressBar({ percent }: any) {
  const safePercent = Math.max(0, Math.min(Number(percent || 0), 100));

  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${safePercent}%` }]} />
    </View>
  );
}

function EmptyBox({ icon, title, text }: any) {
  return (
    <View style={styles.emptyBox}>
      <Icon name={icon} size={42} color={T.yellow} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
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
  heroAmount: {
    color: T.yellow,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSub: { color: T.green, marginTop: 6, fontWeight: "800" },
  heroPills: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  heroPill: {
    backgroundColor: T.yellow,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroPillText: {
    color: T.black,
    fontSize: 11,
    fontWeight: "900",
  },
  heroPillDark: {
    backgroundColor: T.black,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  heroPillDarkText: {
    color: T.green,
    fontSize: 11,
    fontWeight: "900",
  },
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
  metricValue: {
    color: T.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
  },
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
    gap: 10,
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

  activityGrid: {
    gap: 10,
  },
  activityChip: {
    backgroundColor: T.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityTitle: {
    color: T.text,
    fontWeight: "900",
  },
  activityValue: {
    color: T.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },

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

  settlementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  settlementIcon: {
    width: 38,
    height: 38,
    borderRadius: 17,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },

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
  myRankText: { color: T.black },
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

  bottomActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: T.yellow,
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: T.black, fontSize: 15, fontWeight: "900" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: T.card,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 18,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: { color: T.yellow, fontSize: 15, fontWeight: "900" },
});