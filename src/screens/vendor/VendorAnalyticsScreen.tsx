import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  yellow: "#F6C343",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  warning: "#F59E0B",
};

type Summary = {
  todayOrders?: number;
  todayRevenue?: number;
  monthlyOrders?: number;
  monthlyRevenue?: number;
  activeOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  averageOrderValue?: number;
};

type GraphItem = {
  date: string;
  label: string;
  earnings: number;
};

const money = (value: any, fixed = 0) =>
  `₹${Number(value || 0).toFixed(fixed)}`;

export default function VendorAnalyticsScreen() {
  const [summary, setSummary] = useState<Summary>({});
  const [graph, setGraph] = useState<GraphItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const loadAnalytics = useCallback(async () => {
    try {
      const [summaryRes, graphRes] = await Promise.all([
        apiClient.get("/vendor-analytics/summary"),
        apiClient.get("/vendor-analytics/earnings-graph"),
      ]);

      setSummary(summaryRes.data.data || {});
      setGraph(graphRes.data.data || []);
    } catch (error: any) {
      setSummary({});
      setGraph([]);
      showToast(error?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const insight = useMemo(() => {
    const monthlyRevenue = Number(summary?.monthlyRevenue || 0);
    const monthlyOrders = Number(summary?.monthlyOrders || 0);
    const cancelled = Number(summary?.cancelledOrders || 0);
    const completed = Number(summary?.completedOrders || 0);
    const totalClosed = completed + cancelled;
    const cancelRate = totalClosed ? (cancelled / totalClosed) * 100 : 0;

    const bestDay = graph.reduce<GraphItem | null>((best, item) => {
      if (!best) return item;
      return Number(item.earnings || 0) > Number(best.earnings || 0) ? item : best;
    }, null);

    return {
      monthlyRevenue,
      monthlyOrders,
      cancelRate,
      bestDay,
      avgDailyRevenue: graph.length ? monthlyRevenue / 30 : 0,
    };
  }, [summary, graph]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon name="alert-circle" size={18} color={THEME.yellow} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={() => {
              setRefreshing(true);
              loadAnalytics();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Vendor Panel</Text>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Track earnings, orders and growth.</Text>
          </View>

          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
            <Icon name="calendar-outline" size={18} color={THEME.bg} />
            <Text style={styles.filterText}>7 Days</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Monthly Revenue</Text>
            <Text style={styles.heroValue}>{money(summary?.monthlyRevenue, 2)}</Text>
            <Text style={styles.heroSub}>
              {summary?.monthlyOrders || 0} monthly orders • Avg{" "}
              {money(summary?.averageOrderValue, 0)}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="trending-up-outline" size={30} color={THEME.bg} />
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard
            icon="receipt-outline"
            label="Today Orders"
            value={summary?.todayOrders || 0}
          />
          <StatCard
            icon="cash-outline"
            label="Today Revenue"
            value={money(summary?.todayRevenue)}
          />
          <StatCard
            icon="flame-outline"
            label="Active Orders"
            value={summary?.activeOrders || 0}
          />
          <StatCard
            icon="checkmark-done-outline"
            label="Completed"
            value={summary?.completedOrders || 0}
          />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>Earnings Graph</Text>
              <Text style={styles.sectionSub}>Tap a bar to see day revenue.</Text>
            </View>
            <Icon name="bar-chart-outline" size={24} color={THEME.green} />
          </View>

          {graph.length === 0 ? (
            <View style={styles.emptyChart}>
              <Icon name="bar-chart-outline" size={44} color={THEME.yellow} />
              <Text style={styles.emptyTitle}>No earnings yet</Text>
              <Text style={styles.emptyText}>Graph will update after orders arrive.</Text>
            </View>
          ) : (
            <BarGraph
              graph={graph}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          )}
        </View>

        <View style={styles.scoreCard}>
          <View>
            <Text style={styles.scoreLabel}>Business Health</Text>
            <Text style={styles.scoreTitle}>
              {Number(summary?.cancelledOrders || 0) > 5 ? "Needs Attention" : "Healthy"}
            </Text>
            <Text style={styles.scoreSub}>
              Cancel rate: {insight.cancelRate.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>
              {Math.max(0, 100 - Math.round(insight.cancelRate))}
            </Text>
            <Text style={styles.scoreText}>Score</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.sectionTitle}>Business Insights</Text>

          <InsightRow
            icon="flash-outline"
            title="Active Orders"
            value={`${summary?.activeOrders || 0} running now`}
          />

          <InsightRow
            icon="trophy-outline"
            title="Best Day"
            value={
              insight.bestDay
                ? `${insight.bestDay.label} • ${money(insight.bestDay.earnings)}`
                : "No data yet"
            }
          />

          <InsightRow
            icon="analytics-outline"
            title="Average Order Value"
            value={money(summary?.averageOrderValue, 2)}
          />

          <InsightRow
            icon="close-circle-outline"
            title="Cancelled Orders"
            value={`${summary?.cancelledOrders || 0} cancelled`}
            danger
          />
        </View>

        <View style={styles.tipCard}>
          <Icon name="bulb-outline" size={22} color={THEME.yellow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Smart Tip</Text>
            <Text style={styles.tipText}>
              Keep prep time accurate during rush hours. It improves customer trust
              and reduces cancellations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BarGraph({
  graph,
  selectedIndex,
  onSelect,
}: {
  graph: GraphItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const values = graph.map((x) => Number(x.earnings || 0));
  const max = values.length ? Math.max(...values, 1) : 1;

  return (
    <View style={styles.chartWrapper}>
      {graph.map((item, index) => {
        const value = Number(item.earnings || 0);
        const height = Math.max((value / max) * 132, value > 0 ? 16 : 8);
        const selected = selectedIndex === index;

        return (
          <TouchableOpacity
            key={item.date || index}
            style={styles.barItem}
            activeOpacity={0.85}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.barValue, selected && styles.barValueActive]}>
              {selected || value > 0 ? money(value) : ""}
            </Text>

            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: selected ? THEME.yellow : THEME.green,
                  },
                ]}
              />
            </View>

            <Text style={[styles.barLabel, selected && styles.barLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={20} color={THEME.bg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InsightRow({ icon, title, value, danger }: any) {
  return (
    <View style={styles.insightRow}>
      <View style={[styles.insightIcon, danger && styles.insightIconDanger]}>
        <Icon name={icon} size={19} color={danger ? THEME.danger : THEME.green} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightSub}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 10, fontWeight: "800" },
  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: "#101A10",
    borderWidth: 1,
    borderColor: THEME.yellow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  filterBtn: {
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterText: { color: THEME.bg, fontWeight: "900" },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.76 },
  heroValue: {
    color: THEME.bg,
    fontSize: 36,
    fontWeight: "900",
    marginTop: 7,
  },
  heroSub: {
    color: THEME.bg,
    fontWeight: "800",
    opacity: 0.78,
    marginTop: 4,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 23,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 12,
  },
  statLabel: { color: THEME.muted, fontSize: 12, marginTop: 4, fontWeight: "700" },
  chartCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: THEME.card,
    borderRadius: 24,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  sectionRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  sectionSub: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
  emptyChart: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 20,
  },
  emptyTitle: { color: THEME.text, fontWeight: "900", fontSize: 17, marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 5, fontWeight: "700" },
  chartWrapper: {
    height: 190,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 8,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  barContainer: {
    height: 136,
    justifyContent: "flex-end",
  },
  bar: {
    width: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  barValue: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
    minHeight: 14,
  },
  barValueActive: {
    color: THEME.yellow,
  },
  barLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 8,
    fontWeight: "800",
  },
  barLabelActive: {
    color: THEME.yellow,
  },
  scoreCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#0B100B",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: { color: THEME.green, fontWeight: "900", fontSize: 12 },
  scoreTitle: { color: THEME.text, fontSize: 22, fontWeight: "900", marginTop: 5 },
  scoreSub: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  scoreCircle: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { color: THEME.bg, fontSize: 22, fontWeight: "900" },
  scoreText: { color: THEME.bg, fontSize: 11, fontWeight: "900", opacity: 0.75 },
  insightCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 14,
    marginTop: 14,
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  insightIconDanger: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  insightTitle: { color: THEME.text, fontWeight: "900" },
  insightSub: { color: THEME.muted, marginTop: 3, fontWeight: "700" },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "rgba(246,195,67,0.08)",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.3)",
    flexDirection: "row",
    gap: 12,
  },
  tipTitle: { color: THEME.yellow, fontWeight: "900" },
  tipText: { color: THEME.text, marginTop: 4, fontWeight: "700", lineHeight: 20 },
});