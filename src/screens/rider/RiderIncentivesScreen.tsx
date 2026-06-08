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
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const getDaysLeft = (endDate?: string) => {
  if (!endDate) return null;

  const diff = new Date(endDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(days, 0);
};

export default function RiderIncentivesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [incentives, setIncentives] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({});
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const loadData = useCallback(async () => {
    try {
      const [incentiveRes, walletRes, analyticsRes] = await Promise.all([
        riderService.getIncentives(),
        riderService.getWallet(),
        riderService.getAnalytics(),
      ]);

      if (incentiveRes?.error) {
        setIncentives([]);
        showToast(incentiveRes?.error?.message || "Failed to load incentives");
        return;
      }

      setIncentives(incentiveRes?.data || []);
      setWallet(walletRes?.data?.wallet || walletRes?.data || {});
      setAnalytics(analyticsRes?.data || {});
    } catch (e: any) {
      showToast(e?.message || "Failed to load incentives");
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

  const activeIncentives = incentives.filter((x) => !x?.isCompleted);
  const completedIncentives = incentives.filter((x) => x?.isCompleted);

  const filteredIncentives = useMemo(() => {
    if (filter === "ACTIVE") return activeIncentives;
    if (filter === "COMPLETED") return completedIncentives;
    return incentives;
  }, [filter, incentives]);

  const totalReward = incentives.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  const completedReward = completedIncentives.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  const nearestTarget = activeIncentives
    .map((item) => {
      const completed = Number(item.completedOrders || 0);
      const target = Number(item.targetOrders || 1);
      return {
        ...item,
        percent: Math.min(100, Math.round((completed / target) * 100)),
      };
    })
    .sort((a, b) => b.percent - a.percent)?.[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading incentives...</Text>
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
          <Text style={styles.title}>Incentives</Text>
          <Text style={styles.sub}>Targets, bonuses and rider rewards</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={T.yellow}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Reward Progress</Text>
            <Text style={styles.heroAmount}>{money(completedReward)}</Text>
            <Text style={styles.heroSub}>
              Earned from incentives • {activeIncentives.length} active targets
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="ribbon" size={30} color={T.black} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat
            icon="rocket-outline"
            title="Active"
            value={activeIncentives.length}
          />
          <MiniStat
            icon="trophy-outline"
            title="Completed"
            value={completedIncentives.length}
          />
          <MiniStat
            icon="gift-outline"
            title="Total Reward"
            value={money(totalReward)}
          />
        </View>

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletTitle}>Today Performance</Text>
            <Text style={styles.walletSub}>
              Orders {analytics?.todayOrders || 0} • Today{" "}
              {money(analytics?.todayEarnings || wallet?.todayEarn)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.walletBtn}
            onPress={() => navigation?.navigate?.("RiderEarnings")}
          >
            <Text style={styles.walletBtnText}>Earnings</Text>
          </TouchableOpacity>
        </View>

        {!!nearestTarget && (
          <View style={styles.focusCard}>
            <Text style={styles.focusLabel}>Closest Target</Text>
            <Text style={styles.focusTitle}>
              {nearestTarget.title || "Rider Bonus"}
            </Text>
            <Text style={styles.focusSub}>
              {nearestTarget.completedOrders || 0}/{nearestTarget.targetOrders || 0} orders •{" "}
              {nearestTarget.percent}% complete
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${nearestTarget.percent}%` },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.filterRow}>
          <FilterChip
            title="All"
            active={filter === "ALL"}
            onPress={() => setFilter("ALL")}
          />
          <FilterChip
            title="Active"
            active={filter === "ACTIVE"}
            onPress={() => setFilter("ACTIVE")}
          />
          <FilterChip
            title="Completed"
            active={filter === "COMPLETED"}
            onPress={() => setFilter("COMPLETED")}
          />
        </View>

        {filteredIncentives.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="ribbon-outline" size={54} color={T.yellow} />
            <Text style={styles.emptyTitle}>No incentives yet</Text>
            <Text style={styles.emptyText}>
              Admin assigned targets and bonuses will appear here.
            </Text>
          </View>
        ) : (
          filteredIncentives.map((item) => {
            const completed = Number(item.completedOrders || 0);
            const target = Number(item.targetOrders || 1);
            const percent = Math.min(100, Math.round((completed / target) * 100));
            const daysLeft = getDaysLeft(item.endDate);

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.iconCircle}>
                    <Icon
                      name={item.isCompleted ? "trophy" : "rocket-outline"}
                      size={24}
                      color={T.yellow}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.title || "Rider Bonus"}</Text>
                    <Text style={styles.date}>
                      {safeDate(item.startDate)} - {safeDate(item.endDate)}
                    </Text>
                  </View>

                  <Text style={styles.amount}>{money(item.amount)}</Text>
                </View>

                {!!item.description && (
                  <Text style={styles.description}>{item.description}</Text>
                )}

                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {completed}/{target} orders completed
                  </Text>
                  <Text style={styles.progressText}>{percent}%</Text>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>

                <View style={styles.metaRow}>
                  <View style={item.isCompleted ? styles.doneBadge : styles.liveBadge}>
                    <Text style={item.isCompleted ? styles.doneText : styles.liveText}>
                      {item.isCompleted ? "COMPLETED" : "ACTIVE TARGET"}
                    </Text>
                  </View>

                  {!item.isCompleted && daysLeft !== null && (
                    <Text style={styles.daysLeft}>
                      {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
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

function FilterChip({ title, active, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
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
    padding: 12,
    flexDirection: "row",
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
  sub: { color: T.muted, marginTop: 3 },

  heroCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroLabel: {
    color: T.muted,
    fontWeight: "800",
    fontSize: 13,
  },
  heroAmount: {
    color: T.yellow,
    fontWeight: "900",
    fontSize: 34,
    marginTop: 5,
  },
  heroSub: {
    color: T.green,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  miniValue: {
    color: T.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 8,
  },
  miniTitle: {
    color: T.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },

  walletCard: {
    backgroundColor: "#0E1B12",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1F6B3B",
    padding: 15,
    marginBottom: 14,
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

  focusCard: {
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    padding: 15,
    marginBottom: 14,
  },
  focusLabel: {
    color: T.yellow,
    fontWeight: "900",
    fontSize: 12,
  },
  focusTitle: {
    color: T.text,
    fontWeight: "900",
    fontSize: 17,
    marginTop: 5,
  },
  focusSub: {
    color: T.muted,
    fontSize: 12,
    marginTop: 4,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  filterText: {
    color: T.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: T.black,
  },

  empty: {
    marginTop: 60,
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: T.text,
    fontWeight: "900",
    fontSize: 18,
    marginTop: 12,
  },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: T.text, fontWeight: "900", fontSize: 16 },
  date: { color: T.muted, marginTop: 4, fontSize: 12 },
  amount: { color: T.yellow, fontWeight: "900", fontSize: 18 },
  description: {
    color: T.muted,
    marginTop: 12,
    lineHeight: 19,
    fontSize: 13,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  progressText: { color: T.muted, fontSize: 12, fontWeight: "800" },
  progressBar: {
    height: 10,
    backgroundColor: T.black,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 9,
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.green,
    borderRadius: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  liveBadge: {
    backgroundColor: "#2B2207",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveText: { color: T.yellow, fontSize: 10, fontWeight: "900" },
  doneBadge: {
    backgroundColor: "#0D2C1A",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneText: { color: T.green, fontSize: 10, fontWeight: "900" },
  daysLeft: {
    color: T.muted,
    fontSize: 12,
    fontWeight: "800",
  },
});