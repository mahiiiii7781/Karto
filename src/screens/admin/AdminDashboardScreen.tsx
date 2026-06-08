import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService, AdminDashboardData } from "@/services/api/adminService";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  yellow: "#FFD21F",
  green: "#20D65A",
  greenDark: "#0E8F3A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;
const pct = (v: any) => `${Number(v || 0).toFixed(1)}%`;

export default function AdminDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    const res = await adminService.getDashboard();

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to load dashboard");
    } else {
      setData(res.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const derived = useMemo(() => {
    const totalOrders = data?.totalOrders || 0;
    const delivered = data?.deliveredOrders || 0;
    const active = data?.activeOrders || 0;
    const revenue = Number(data?.totalRevenue || 0);
    const kartoIncome = Number(data?.kartoIncome || 0);
    const vendorIncome = Number(data?.vendorIncome || 0);

    const deliveryRate = totalOrders ? (delivered / totalOrders) * 100 : 0;
    const activeRate = totalOrders ? (active / totalOrders) * 100 : 0;
    const kartoShare = revenue ? (kartoIncome / revenue) * 100 : 0;
    const vendorShare = revenue ? (vendorIncome / revenue) * 100 : 0;
    const avgOrderValue = totalOrders ? revenue / totalOrders : 0;
    const gst = kartoIncome * 0.18;
    const netKartoIncome = kartoIncome - gst;

    return {
      deliveryRate,
      activeRate,
      kartoShare,
      vendorShare,
      avgOrderValue,
      gst,
      netKartoIncome,
    };
  }, [data]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("RoleSelection");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Admin account se logout karna hai?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Loading Karto command center...</Text>
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
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBox}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("AdminProfile")}
          >
            <View style={styles.profileAvatar}>
              <Icon name="person" size={18} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.fullName || "Admin"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "Karto Control"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
  style={styles.notificationBtn}
  onPress={() => navigation.navigate("AdminNotifications")}
>
  <Icon
    name="notifications-outline"
    size={22}
    color="#000"
  />

  <View style={styles.notificationDot} />
</TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="log-out-outline" size={23} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>KARTO ADMIN</Text>
            <Text style={styles.title}>Control Center</Text>
            <Text style={styles.subtitle}>{user?.fullName || user?.email}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Total Platform Revenue</Text>
              <Text style={styles.heroAmount}>{money(data?.totalRevenue)}</Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.splitRow}>
            <IncomeMini title="Karto Income" value={money(data?.kartoIncome)} />
            <IncomeMini title="Vendor Income" value={money(data?.vendorIncome)} />
            <IncomeMini title="Net After GST" value={money(derived.netKartoIncome)} />
          </View>

          <View style={styles.shareBox}>
            <Text style={styles.shareTitle}>Revenue Split</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressKarto, { flex: derived.kartoShare || 0.1 }]} />
              <View style={[styles.progressVendor, { flex: derived.vendorShare || 0.1 }]} />
            </View>

            <View style={styles.shareLabels}>
              <Text style={styles.shareText}>Karto {pct(derived.kartoShare)}</Text>
              <Text style={styles.shareText}>Vendor {pct(derived.vendorShare)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickRail}>
          <RailItem icon="storefront-outline" label="Vendors" onPress={() => navigation.navigate("AdminVendors")} />
          <RailItem icon="add-circle-outline" label="Add Vendor" onPress={() => navigation.navigate("AdminVendorCreate")} />
          <RailItem icon="receipt-outline" label="Orders" onPress={() => navigation.navigate("AdminOrders")} />
          <RailItem icon="bicycle-outline" label="Riders" onPress={() => navigation.navigate("AdminRiders")} />
        </View>

        <View style={styles.quickRail}>
          <RailItem icon="person-add-outline" label="Add Rider" onPress={() => navigation.navigate("AdminRiderCreate")} />
          <RailItem icon="ticket-outline" label="Coupons" onPress={() => navigation.navigate("AdminCoupons")} />
          <RailItem icon="fast-food-outline" label="Menu" onPress={() => navigation.navigate("AdminMenuItems")} />
          <RailItem icon="person-circle-outline" label="Profile" onPress={() => navigation.navigate("AdminProfile")} />
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard icon="people-outline" label="Users" value={data?.totalUsers || 0} />
          <KpiCard icon="storefront-outline" label="Vendors" value={data?.totalVendors || 0} />
          <KpiCard icon="bicycle-outline" label="Riders" value={data?.totalRiders || 0} />
          <KpiCard icon="receipt-outline" label="Orders" value={data?.totalOrders || 0} />
          <KpiCard icon="time-outline" label="Active" value={data?.activeOrders || 0} warning />
          <KpiCard icon="checkmark-done-outline" label="Delivered" value={data?.deliveredOrders || 0} success />
        </View>

        <SectionTitle title="Business Health" action="Analytics" onPress={() => navigation.navigate("AdminAnalytics")} />

        <View style={styles.healthCard}>
          <HealthRow title="Delivery Completion" value={derived.deliveryRate} />
          <HealthRow title="Active Order Load" value={derived.activeRate} />
          <HealthRow title="Karto Margin Share" value={derived.kartoShare} />
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

        <SectionTitle title="Financial Reports" action="View Reports" onPress={() => navigation.navigate("AdminAnalytics")} />

        <View style={styles.reportGrid}>
          <ReportCard title="Avg Order Value" value={money(derived.avgOrderValue)} />
          <ReportCard title="GST 18%" value={money(derived.gst)} />
          <ReportCard title="Karto Net" value={money(derived.netKartoIncome)} />
          <ReportCard title="Payout Due" value={money(data?.vendorIncome)} />
        </View>
		        <SectionTitle title="Management Suite" />

        <View style={styles.menuGrid}>
          <MenuCard title="Dashboard" icon="speedometer-outline" onPress={() => navigation.navigate("AdminDashboard")} />
          <MenuCard title="Users" icon="people-outline" onPress={() => navigation.navigate("AdminUsers")} />
          <MenuCard title="Cities" icon="business-outline" onPress={() => navigation.navigate("AdminCities")} />

          <MenuCard title="Categories" icon="grid-outline" onPress={() => navigation.navigate("AdminCategories")} />
          <MenuCard title="Subcategories" icon="list-outline" onPress={() => navigation.navigate("AdminSubCategories")} />
          <MenuCard title="Vendors" icon="storefront-outline" onPress={() => navigation.navigate("AdminVendors")} />

          <MenuCard title="Add Vendor" icon="add-circle-outline" onPress={() => navigation.navigate("AdminVendorCreate")} />
          <MenuCard title="Vendor Categories" icon="albums-outline" onPress={() => navigation.navigate("AdminVendorCategories")} />
          <MenuCard title="Vendor Subcategories" icon="layers-outline" onPress={() => navigation.navigate("AdminVendorSubCategories")} />

          <MenuCard title="Riders" icon="bicycle-outline" onPress={() => navigation.navigate("AdminRiders")} />
          <MenuCard title="Add Rider" icon="person-add-outline" onPress={() => navigation.navigate("AdminRiderCreate")} />
          <MenuCard title="Menu Items" icon="fast-food-outline" onPress={() => navigation.navigate("AdminMenuItems")} />

          <MenuCard title="Addons" icon="add-outline" onPress={() => navigation.navigate("AdminMenuAddons")} />
          <MenuCard title="Customizations" icon="options-outline" onPress={() => navigation.navigate("AdminMenuCustomizations")} />
          <MenuCard title="Orders" icon="receipt-outline" onPress={() => navigation.navigate("AdminOrders")} />

          <MenuCard title="Assign Rider" icon="navigate-outline" onPress={() => navigation.navigate("AdminOrders")} />
          <MenuCard title="Billing" icon="card-outline" onPress={() => navigation.navigate("AdminAnalytics")} />
          <MenuCard title="Coupons" icon="ticket-outline" onPress={() => navigation.navigate("AdminCoupons")} />
<MenuCard title="Notifications" icon="notifications-outline" onPress={() => navigation.navigate("AdminNotifications")} />
          <MenuCard title="Monthly Report" icon="bar-chart-outline" onPress={() => navigation.navigate("AdminAnalytics")} />
          <MenuCard title="Profile" icon="person-circle-outline" onPress={() => navigation.navigate("AdminProfile")} />
          <MenuCard title="Logout" icon="log-out-outline" danger onPress={handleLogout} />
        </View>

        <SectionTitle title="Recent Orders" action="All Orders" onPress={() => navigation.navigate("AdminOrders")} />

        {(data?.recentOrders || []).length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={34} color={THEME.yellow} />
            <Text style={styles.emptyText}>No recent orders found</Text>
          </View>
        ) : (
          data?.recentOrders.map((order: any) => {
            const total = Number(order.totalAmount || 0);
            const commission = Number(order.restaurant?.commission || 0);
            const karto = (total * commission) / 100;

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("AdminOrderDetail", { orderId: order.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderTitle}>
                    #{order.orderNumber || order.id?.slice?.(0, 8) || "ORDER"}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {order.user?.fullName || "Customer"} • {order.restaurant?.name || "Vendor"}
                  </Text>
                  <Text style={styles.orderMeta}>Karto Cut: {money(karto)}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.orderAmount}>{money(total)}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 42 }} />
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, action, onPress }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function IncomeMini({ title, value }: any) {
  return (
    <View style={styles.incomeMini}>
      <Text style={styles.incomeMiniTitle}>{title}</Text>
      <Text style={styles.incomeMiniValue}>{value}</Text>
    </View>
  );
}

function KpiCard({ icon, label, value, success, warning }: any) {
  return (
    <View style={[styles.kpiCard, success && styles.kpiSuccess, warning && styles.kpiWarn]}>
      <View style={styles.kpiIconBox}>
        <Icon name={icon} size={22} color={warning ? THEME.yellow : THEME.green} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function RailItem({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.railItem} onPress={onPress} activeOpacity={0.86}>
      <Icon name={icon} size={23} color={THEME.yellow} />
      <Text style={styles.railText}>{label}</Text>
    </TouchableOpacity>
  );
}

function HealthRow({ title, value }: any) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthTop}>
        <Text style={styles.healthTitle}>{title}</Text>
        <Text style={styles.healthValue}>{pct(value)}</Text>
      </View>

      <View style={styles.healthTrack}>
        <View style={[styles.healthFill, { width: `${Math.min(Number(value || 0), 100)}%` }]} />
      </View>
    </View>
  );
}

function ReportCard({ title, value }: any) {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

function MenuCard({ icon, title, onPress, danger }: any) {
  return (
    <TouchableOpacity
      style={[styles.menuCard, danger && styles.menuDanger]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.menuIconBox, danger && styles.menuDangerIcon]}>
        <Icon name={icon} size={27} color={danger ? THEME.danger : THEME.yellow} />
      </View>
      <Text style={[styles.menuText, danger && { color: THEME.danger }]}>{title}</Text>
    </TouchableOpacity>
  );
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },

  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "700",
  },

  topBar: {
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  profileBox: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },

  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  profileName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
  },

  profileEmail: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 10,
    marginTop: 2,
  },

  header: {
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallLabel: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 31,
    fontWeight: "900",
    color: THEME.text,
    marginTop: 3,
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "700",
  },

  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  heroLabel: {
    color: THEME.muted,
    fontWeight: "800",
  },

  heroAmount: {
    color: THEME.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },

  liveBadge: {
    backgroundColor: "#142818",
    paddingHorizontal: 11,
    height: 31,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1F6B35",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.green,
  },

  liveText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },

  splitRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  incomeMini: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 17,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  incomeMiniTitle: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },

  incomeMiniValue: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 5,
    fontSize: 12.5,
  },

  shareBox: {
    marginTop: 18,
  },

  shareTitle: {
    color: THEME.text,
    fontWeight: "900",
    marginBottom: 8,
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "#263026",
  },

  progressKarto: {
    backgroundColor: THEME.yellow,
  },

  progressVendor: {
    backgroundColor: THEME.green,
  },

  shareLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },

  shareText: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "900",
  },

  quickRail: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },

  railItem: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 19,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  railText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 10.5,
    marginTop: 7,
    textAlign: "center",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  kpiCard: {
    width: "31.5%",
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  kpiSuccess: {
    borderColor: "#1F6B35",
    backgroundColor: "#101B13",
  },

  kpiWarn: {
    borderColor: "#5D4D0B",
    backgroundColor: "#1C190D",
  },

  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#0E100E",
    alignItems: "center",
    justifyContent: "center",
  },

  kpiValue: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },

  kpiLabel: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 11,
    marginTop: 2,
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
  },

  sectionAction: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  healthCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  healthRow: {
    marginBottom: 15,
  },

  healthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  healthTitle: {
    color: THEME.text,
    fontWeight: "800",
  },

  healthValue: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  healthTrack: {
    height: 10,
    backgroundColor: "#263026",
    borderRadius: 999,
    overflow: "hidden",
  },

  healthFill: {
    height: "100%",
    backgroundColor: THEME.green,
    borderRadius: 999,
  },

  weekCard: {
    height: 152,
    backgroundColor: THEME.card,
    borderRadius: 22,
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
    borderRadius: 22,
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

  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  reportCard: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  reportTitle: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
  },

  reportValue: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 18,
    marginTop: 8,
  },

  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  menuCard: {
    width: "31.5%",
    minHeight: 104,
    backgroundColor: THEME.card,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  menuDanger: {
    borderColor: "#4C1D1D",
    backgroundColor: "#160B0B",
  },

  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#1C190D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#5D4D0B",
  },

  menuDangerIcon: {
    backgroundColor: "#2A1111",
    borderColor: "#4C1D1D",
  },

  menuText: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 8,
    fontSize: 11.5,
    textAlign: "center",
  },

  emptyBox: {
    padding: 22,
    backgroundColor: THEME.card,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  emptyText: {
    color: THEME.muted,
    marginTop: 8,
    fontWeight: "800",
  },

  orderCard: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
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
  notificationBtn: {
  width: 42,
  height: 42,
  borderRadius: 16,
  backgroundColor: THEME.green,
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
},

notificationDot: {
  position: "absolute",
  top: 8,
  right: 8,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: THEME.yellow,
  borderWidth: 1,
  borderColor: "#000",
},
});