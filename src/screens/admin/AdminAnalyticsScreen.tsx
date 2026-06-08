import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";
import KartoMessageModal, {
  KartoMessageType,
} from "@/components/common/KartoMessageModal";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  orange: "#FFB020",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;
const pct = (v: any) => `${Number(v || 0).toFixed(1)}%`;

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
};

export default function AdminAnalyticsScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMessage = (type: KartoMessageType, title: string, msg: string) => {
    setMessage({ visible: true, type, title, message: msg });
  };

  const closeMessage = () => {
    setMessage((prev) => ({ ...prev, visible: false }));
  };

  const load = useCallback(async () => {
    const [dashboardRes, monthlyRes] = await Promise.all([
      adminService.getDashboard(),
      adminService.monthlyBilling?.(),
    ]);

    if (dashboardRes.error) {
      showMessage(
        "error",
        "Analytics Load Failed",
        dashboardRes.error.message || "Unable to load analytics report."
      );
    } else {
      setData(dashboardRes.data);
    }

    if (!monthlyRes?.error && monthlyRes?.data) {
      setMonthly(monthlyRes.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const analytics = useMemo(() => {
    const totalRevenue = Number(data?.totalRevenue || 0);
    const kartoIncome = Number(data?.kartoIncome || 0);
    const vendorIncome = Number(data?.vendorIncome || 0);
    const totalOrders = Number(data?.totalOrders || 0);
    const deliveredOrders = Number(data?.deliveredOrders || 0);
    const activeOrders = Number(data?.activeOrders || 0);

    const gst = kartoIncome * 0.18;
    const netProfit = kartoIncome - gst;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const deliveryRate = totalOrders ? (deliveredOrders / totalOrders) * 100 : 0;
    const activeRate = totalOrders ? (activeOrders / totalOrders) * 100 : 0;
    const vendorShare = totalRevenue ? (vendorIncome / totalRevenue) * 100 : 0;
    const kartoShare = totalRevenue ? (kartoIncome / totalRevenue) * 100 : 0;

    return {
      gst,
      netProfit,
      avgOrderValue,
      deliveryRate,
      activeRate,
      vendorShare,
      kartoShare,
    };
  }, [data]);

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Loading analytics...</Text>

        <KartoMessageModal
          visible={message.visible}
          type={message.type}
          title={message.title}
          message={message.message}
          onClose={closeMessage}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
            colors={[THEME.yellow, THEME.green]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>BUSINESS REPORTS</Text>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Revenue, orders, tax and platform health</Text>
          </View>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate("AdminDashboard")}
          >
            <Icon name="home-outline" size={21} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Total Platform Revenue</Text>
            <Text style={styles.heroAmount}>{money(data.totalRevenue)}</Text>
            <Text style={styles.heroSub}>Live admin business snapshot</Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="analytics-outline" size={35} color={THEME.yellow} />
          </View>
        </View>

        <View style={styles.quickRail}>
          <QuickAction icon="receipt-outline" label="Orders" onPress={() => navigation.navigate("AdminOrders")} />
          <QuickAction icon="storefront-outline" label="Vendors" onPress={() => navigation.navigate("AdminVendors")} />
          <QuickAction icon="bicycle-outline" label="Riders" onPress={() => navigation.navigate("AdminRiders")} />
          <QuickAction icon="ticket-outline" label="Coupons" onPress={() => navigation.navigate("AdminCoupons")} />
        </View>

        <View style={styles.kpiGrid}>
          <KpiBox title="Users" value={data.totalUsers || 0} icon="people-outline" />
          <KpiBox title="Vendors" value={data.totalVendors || 0} icon="storefront-outline" />
          <KpiBox title="Riders" value={data.totalRiders || 0} icon="bicycle-outline" />
          <KpiBox title="Orders" value={data.totalOrders || 0} icon="receipt-outline" />
        </View>

        <SectionTitle title="Revenue Analytics" />

        <View style={styles.card}>
          <MetricRow label="Total Revenue" value={money(data.totalRevenue)} icon="cash-outline" />
          <MetricRow label="Karto Income" value={money(data.kartoIncome)} icon="trending-up-outline" green />
          <MetricRow label="Vendor Income" value={money(data.vendorIncome)} icon="storefront-outline" />
          <MetricRow label="Average Order Value" value={money(analytics.avgOrderValue)} icon="calculator-outline" green />
        </View>

        <SectionTitle title="Tax & Net Profit" />

        <View style={styles.card}>
          <MetricRow label="GST 18%" value={money(analytics.gst)} icon="document-text-outline" />
          <MetricRow label="Net Karto Profit" value={money(analytics.netProfit)} icon="wallet-outline" green />
          <MetricRow label="Karto Share" value={pct(analytics.kartoShare)} icon="pie-chart-outline" />
          <MetricRow label="Vendor Share" value={pct(analytics.vendorShare)} icon="stats-chart-outline" green />
        </View>

        <SectionTitle title="Monthly Billing Snapshot" />

        <View style={styles.reportGrid}>
          <ReportBox title="Delivered" value={monthly?.totalDeliveredOrders || data.deliveredOrders || 0} icon="checkmark-done-outline" />
          <ReportBox title="Commission" value={money(monthly?.platformCommission || data.kartoIncome)} icon="cash-outline" />
          <ReportBox title="Vendor Payable" value={money(monthly?.vendorPayable || data.vendorIncome)} icon="storefront-outline" />
          <ReportBox title="Rider Payable" value={money(monthly?.riderPayable || 0)} icon="bicycle-outline" />
        </View>

        <SectionTitle title="Order Performance" />

        <View style={styles.performanceCard}>
          <PerformanceItem title="Delivered Orders" value={data.deliveredOrders || 0} percent={analytics.deliveryRate} />
          <PerformanceItem title="Active Orders" value={data.activeOrders || 0} percent={analytics.activeRate} yellow />
        </View>

        <SectionTitle title="Revenue Split" />

        <View style={styles.splitCard}>
          <View style={styles.splitTrack}>
            <View style={[styles.splitKarto, { flex: analytics.kartoShare || 0.1 }]} />
            <View style={[styles.splitVendor, { flex: analytics.vendorShare || 0.1 }]} />
          </View>

          <View style={styles.splitLabels}>
            <Text style={styles.splitText}>Karto {pct(analytics.kartoShare)}</Text>
            <Text style={styles.splitText}>Vendor {pct(analytics.vendorShare)}</Text>
          </View>
        </View>

        <SectionTitle title="Weekly Growth Snapshot" />

        <View style={styles.weekCard}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
            const value = [42, 58, 36, 74, 66, 91, 79][index];

            return (
              <View key={day} style={styles.weekItem}>
                <View style={[styles.weekBar, { height: 28 + value * 0.7 }]} />
                <Text style={styles.weekDay}>{day}</Text>
              </View>
            );
          })}
        </View>

        <SectionTitle title="Peak Timing Heatmap" />

        <View style={styles.heatCard}>
          {["8-10", "10-12", "12-2", "2-4", "4-6", "6-8", "8-10", "10-12"].map((slot, index) => {
            const level = [1, 2, 4, 2, 3, 5, 5, 2][index];

            return (
              <View key={slot} style={styles.heatItem}>
                <View
                  style={[
                    styles.heatBox,
                    {
                      opacity: 0.25 + level * 0.15,
                      height: 34 + level * 6,
                    },
                  ]}
                />
                <Text style={styles.heatText}>{slot}</Text>
              </View>
            );
          })}
        </View>

        <SectionTitle title="Admin Management Reports" />

        <View style={styles.menuGrid}>
          <MenuCard title="Orders Report" icon="receipt-outline" onPress={() => navigation.navigate("AdminOrders")} />
          <MenuCard title="Vendor Report" icon="storefront-outline" onPress={() => navigation.navigate("AdminVendors")} />
          <MenuCard title="Rider Billing" icon="bicycle-outline" onPress={() => navigation.navigate("AdminRiders")} />
          <MenuCard title="Coupons" icon="ticket-outline" onPress={() => navigation.navigate("AdminCoupons")} />
          <MenuCard title="Categories" icon="grid-outline" onPress={() => navigation.navigate("AdminCategories")} />
          <MenuCard title="Menu Items" icon="fast-food-outline" onPress={() => navigation.navigate("AdminMenuItems")} />
        </View>

        <SectionTitle title="Insights" />

        <View style={styles.insightCard}>
          <Insight icon="flame-outline" text={`Average order value is ${money(analytics.avgOrderValue)}.`} />
          <Insight icon="checkmark-done-outline" text={`Delivery completion rate is ${pct(analytics.deliveryRate)}.`} />
          <Insight icon="wallet-outline" text={`Net Karto profit after GST is ${money(analytics.netProfit)}.`} />
          <Insight icon="pie-chart-outline" text={`Karto platform share is ${pct(analytics.kartoShare)} of total revenue.`} />
        </View>

        <SectionTitle title="Recent Orders" />

        <View style={styles.card}>
          {(data.recentOrders || []).length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="receipt-outline" size={38} color={THEME.yellow} />
              <Text style={styles.emptyTitle}>No recent orders</Text>
              <Text style={styles.emptyText}>Recent orders will appear here.</Text>
            </View>
          ) : (
            (data.recentOrders || []).slice(0, 8).map((order: any) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderRow}
                activeOpacity={0.86}
                onPress={() =>
                  navigation.navigate("AdminOrderDetail", {
                    orderId: order.id,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderTitle}>
                    #{order.orderNumber || order.id?.slice?.(0, 8) || "ORDER"}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {order.user?.fullName || "Customer"} • {order.restaurant?.name || "Vendor"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.orderAmount}>{money(order.totalAmount)}</Text>
                  <Text style={styles.orderStatus}>{formatStatus(order.status)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        onClose={closeMessage}
      />
    </View>
  );
}

function SectionTitle({ title }: any) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function QuickAction({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.86}>
      <Icon name={icon} size={22} color={THEME.yellow} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

function KpiBox({ title, value, icon }: any) {
  return (
    <View style={styles.kpiBox}>
      <View style={styles.kpiIcon}>
        <Icon name={icon} size={22} color={THEME.yellow} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );
}

function MetricRow({ label, value, icon, green }: any) {
  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricIcon, green && styles.metricIconGreen]}>
        <Icon name={icon} size={20} color={green ? THEME.green : THEME.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>

      <Text style={[styles.metricValue, green && { color: THEME.green }]}>
        {value}
      </Text>
    </View>
  );
}

function ReportBox({ title, value, icon }: any) {
  return (
    <View style={styles.reportBox}>
      <View style={styles.reportIcon}>
        <Icon name={icon} size={22} color={THEME.yellow} />
      </View>
      <Text style={styles.reportValue}>{value}</Text>
      <Text style={styles.reportTitle}>{title}</Text>
    </View>
  );
}

function PerformanceItem({ title, value, percent, yellow }: any) {
  return (
    <View style={styles.performanceItem}>
      <View style={styles.performanceTop}>
        <Text style={styles.performanceTitle}>{title}</Text>
        <Text style={[styles.performancePercent, yellow && { color: THEME.yellow }]}>
          {pct(percent)}
        </Text>
      </View>

      <Text style={styles.performanceValue}>{value}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            yellow && { backgroundColor: THEME.yellow },
            { width: `${Math.min(Number(percent || 0), 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function MenuCard({ icon, title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.menuIcon}>
        <Icon name={icon} size={24} color={THEME.yellow} />
      </View>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );
}

function Insight({ icon, text }: any) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightIcon}>
        <Icon name={icon} size={20} color={THEME.yellow} />
      </View>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function formatStatus(status: string) {
  if (!status) return "-";

  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
  },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },

  header: {
    paddingTop: 22,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  homeBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  smallLabel: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.1,
  },

  title: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  subtitle: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
    fontSize: 12,
  },

  heroCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },

  heroLabel: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  heroAmount: {
    color: THEME.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },

  heroSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 5,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  quickRail: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  quickItem: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  quickText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  kpiBox: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  kpiValue: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10,
  },

  kpiTitle: {
    color: THEME.muted,
    fontWeight: "800",
    marginTop: 3,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 10,
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  metricIconGreen: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  metricLabel: {
    color: THEME.muted,
    fontWeight: "800",
  },

  metricValue: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  reportBox: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  reportValue: {
    color: THEME.yellow,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },

  reportTitle: {
    color: THEME.muted,
    fontWeight: "800",
    marginTop: 4,
    fontSize: 12,
  },

  performanceCard: {
    flexDirection: "row",
    gap: 10,
  },

  performanceItem: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  performanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  performanceTitle: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
  },

  performancePercent: {
    color: THEME.green,
    fontWeight: "900",
  },

  performanceValue: {
    color: THEME.text,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 8,
  },

  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: THEME.card2,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: THEME.green,
    borderRadius: 999,
  },

  splitCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  splitTrack: {
    height: 14,
    borderRadius: 999,
    flexDirection: "row",
    backgroundColor: THEME.card2,
    overflow: "hidden",
  },

  splitKarto: {
    backgroundColor: THEME.yellow,
  },

  splitVendor: {
    backgroundColor: THEME.green,
  },

  splitLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },

  splitText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },

  weekCard: {
    height: 152,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  weekItem: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },

  weekBar: {
    width: 20,
    backgroundColor: THEME.yellow,
    borderRadius: 999,
  },

  weekDay: {
    marginTop: 8,
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "900",
  },

  heatCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  heatItem: {
    alignItems: "center",
    flex: 1,
  },

  heatBox: {
    width: 25,
    borderRadius: 8,
    backgroundColor: THEME.green,
  },

  heatText: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 7,
    fontWeight: "900",
  },

  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  menuCard: {
    width: "31.5%",
    minHeight: 98,
    backgroundColor: THEME.card,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#5D4D0B",
  },

  menuText: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 8,
    fontSize: 11,
    textAlign: "center",
  },

  insightCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },

  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  insightText: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
    lineHeight: 20,
  },

  orderRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  orderTitle: {
    color: THEME.text,
    fontWeight: "900",
  },

  orderMeta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  orderAmount: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  orderStatus: {
    color: THEME.green,
    marginTop: 5,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 22,
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyText: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
  },
});