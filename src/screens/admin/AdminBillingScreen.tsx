import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
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
  input: "#0E100E",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  orange: "#FFB020",
};

const FILTERS = ["THIS_MONTH", "LAST_MONTH", "THIS_WEEK", "TODAY", "ALL"];

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
};

export default function AdminBillingScreen({ navigation }: any) {
  const [billing, setBilling] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const [filter, setFilter] = useState("THIS_MONTH");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMessage = (
    type: KartoMessageType,
    title: string,
    msg: string,
    primaryText = "Done"
  ) => {
    setMessage({
      visible: true,
      type,
      title,
      message: msg,
      primaryText,
    });
  };

  const closeMessage = () => {
    setMessage((prev) => ({ ...prev, visible: false }));
  };

  const loadBilling = useCallback(async () => {
    const [billingRes, ordersRes, ridersRes, vendorsRes] = await Promise.all([
      adminService.monthlyBilling(),
      adminService.getOrders({}),
      adminService.riders(),
      adminService.vendors?.() || Promise.resolve({ data: [], error: null }),
    ]);

    if (billingRes.error) {
      showMessage(
        "warning",
        "Billing API Notice",
        billingRes.error.message ||
          "Monthly billing API did not return data. Showing calculated billing from orders."
      );
    } else {
      setBilling(billingRes.data || null);
    }

    if (ordersRes.error) {
      showMessage(
        "error",
        "Unable to Load Orders",
        ordersRes.error.message || "Failed to load order billing."
      );
    } else {
      setOrders(ordersRes.data || []);
    }

    if (!ridersRes.error) {
      setRiders(ridersRes.data || []);
    }

    if (!vendorsRes.error) {
      setVendors(vendorsRes.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];

    list = filterOrdersByPeriod(list, filter);

    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((order) => {
        return (
          order.orderNumber?.toLowerCase().includes(q) ||
          order.id?.toLowerCase().includes(q) ||
          order.user?.fullName?.toLowerCase().includes(q) ||
          order.restaurant?.name?.toLowerCase().includes(q) ||
          order.rider?.fullName?.toLowerCase().includes(q) ||
          order.status?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [orders, filter, search]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let kartoIncome = 0;
    let vendorPayout = 0;
    let riderPayout = 0;
    let delivered = 0;
    let cancelled = 0;

    filteredOrders.forEach((order) => {
      const total = Number(order.totalAmount || 0);
      const commission = Number(order.restaurant?.commission || 0);
      const karto = (total * commission) / 100;

      totalRevenue += total;
      kartoIncome += karto;
      vendorPayout += total - karto;

      if (order.status === "DELIVERED") delivered += 1;
      if (order.status === "CANCELLED") cancelled += 1;
    });

    riders.forEach((rider) => {
      riderPayout += Number(rider.totalDeliveryFee || 0);
    });

    const netKartoIncome = kartoIncome - riderPayout;

    return {
      totalOrders: filteredOrders.length,
      delivered,
      cancelled,
      totalRevenue: billing?.totalRevenue ?? totalRevenue,
      kartoIncome: billing?.kartoIncome ?? kartoIncome,
      vendorPayout: billing?.vendorIncome ?? vendorPayout,
      riderPayout: billing?.riderPayout ?? riderPayout,
      netKartoIncome,
    };
  }, [filteredOrders, riders, billing]);

  const vendorBilling = useMemo(() => {
    const map: Record<string, any> = {};

    filteredOrders.forEach((order) => {
      const vendorId = order.restaurant?.id || "unknown";
      const vendorName = order.restaurant?.name || "Unknown Vendor";
      const total = Number(order.totalAmount || 0);
      const commission = Number(order.restaurant?.commission || 0);
      const karto = (total * commission) / 100;

      if (!map[vendorId]) {
        map[vendorId] = {
          id: vendorId,
          name: vendorName,
          city: order.restaurant?.city?.name || "-",
          orders: 0,
          totalRevenue: 0,
          kartoIncome: 0,
          vendorPayout: 0,
          commission,
        };
      }

      map[vendorId].orders += 1;
      map[vendorId].totalRevenue += total;
      map[vendorId].kartoIncome += karto;
      map[vendorId].vendorPayout += total - karto;
    });

    return Object.values(map);
  }, [filteredOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBilling();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading billing center...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={vendorBilling}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
            colors={[THEME.yellow, THEME.green]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>FINANCE CENTER</Text>
                <Text style={styles.title}>Billing</Text>
                <Text style={styles.subtitle}>
                  Vendor payouts, rider earnings and Karto income
                </Text>
              </View>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Total Revenue</Text>
                  <Text style={styles.heroAmount}>{money(stats.totalRevenue)}</Text>
                </View>

                <View style={styles.heroIcon}>
                  <Icon name="wallet-outline" size={35} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.heroStats}>
                <MiniStat label="Orders" value={stats.totalOrders} />
                <MiniStat label="Delivered" value={stats.delivered} />
                <MiniStat label="Cancelled" value={stats.cancelled} />
              </View>
            </View>

            <View style={styles.financeGrid}>
              <FinanceBox
                title="Karto Income"
                value={money(stats.kartoIncome)}
                icon="trending-up-outline"
                green
              />
              <FinanceBox
                title="Vendor Payout"
                value={money(stats.vendorPayout)}
                icon="storefront-outline"
              />
              <FinanceBox
                title="Rider Payout"
                value={money(stats.riderPayout)}
                icon="bicycle-outline"
              />
              <FinanceBox
                title="Net Karto"
                value={money(stats.netKartoIncome)}
                icon="cash-outline"
                green
              />
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search order, vendor, rider..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />

              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icon name="close-circle" size={21} color={THEME.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={styles.filterList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, filter === item && styles.chipActive]}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>
                    {formatFilter(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vendor Billing</Text>
              <Text style={styles.sectionCount}>{vendorBilling.length} vendors</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No billing data found</Text>
            <Text style={styles.emptyText}>
              Vendor billing will appear here after orders are created.
            </Text>
          </View>
        }
        renderItem={({ item }) => <VendorBillingCard item={item} />}
        ListFooterComponent={
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rider Billing</Text>
              <Text style={styles.sectionCount}>{riders.length} riders</Text>
            </View>

            {riders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="bicycle-outline" size={40} color={THEME.green} />
                <Text style={styles.emptyTitle}>No rider billing found</Text>
                <Text style={styles.emptyText}>
                  Rider earnings will appear after deliveries.
                </Text>
              </View>
            ) : (
              riders.map((rider) => <RiderBillingCard key={rider.id} rider={rider} />)
            )}

            <View style={{ height: 36 }} />
          </>
        }
      />

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        primaryText={message.primaryText}
        onClose={closeMessage}
      />
    </View>
  );
}

function filterOrdersByPeriod(orders: any[], filter: string) {
  if (filter === "ALL") return orders;

  const now = new Date();

  return orders.filter((order) => {
    const rawDate = order.createdAt || order.updatedAt;
    if (!rawDate) return true;

    const d = new Date(rawDate);

    if (filter === "TODAY") {
      return d.toDateString() === now.toDateString();
    }

    if (filter === "THIS_WEEK") {
      const diff = now.getTime() - d.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }

    if (filter === "THIS_MONTH") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    if (filter === "LAST_MONTH") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }

    return true;
  });
}

function MiniStat({ label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function FinanceBox({ title, value, icon, green }: any) {
  return (
    <View style={styles.financeBox}>
      <View style={[styles.financeIcon, green && styles.financeIconGreen]}>
        <Icon name={icon} size={22} color={green ? THEME.green : THEME.yellow} />
      </View>

      <Text style={styles.financeTitle}>{title}</Text>
      <Text style={[styles.financeValue, green && { color: THEME.green }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function VendorBillingCard({ item }: any) {
  return (
    <View style={styles.billingCard}>
      <View style={styles.cardTop}>
        <View style={styles.vendorIcon}>
          <Icon name="storefront-outline" size={26} color={THEME.yellow} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.city} • Commission {item.commission}%
          </Text>
        </View>

        <View style={styles.ordersPill}>
          <Text style={styles.ordersPillText}>{item.orders} orders</Text>
        </View>
      </View>

      <View style={styles.moneyRow}>
        <MoneyBox label="Revenue" value={money(item.totalRevenue)} />
        <MoneyBox label="Karto" value={money(item.kartoIncome)} green />
        <MoneyBox label="Payout" value={money(item.vendorPayout)} />
      </View>
    </View>
  );
}

function RiderBillingCard({ rider }: any) {
  return (
    <View style={styles.billingCard}>
      <View style={styles.cardTop}>
        <View style={styles.riderIcon}>
          <Icon name="bicycle-outline" size={26} color={THEME.green} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{rider.fullName || "Rider"}</Text>
          <Text style={styles.cardMeta}>
            {rider.phone || rider.email || "-"} • {rider.vehicleNo || "No Vehicle"}
          </Text>
        </View>

        <View style={styles.activePill}>
          <Text style={styles.activePillText}>
            {rider.isActive === false ? "Blocked" : "Active"}
          </Text>
        </View>
      </View>

      <View style={styles.moneyRow}>
        <MoneyBox label="Delivered" value={rider.deliveredOrders || 0} />
        <MoneyBox label="Earning" value={money(rider.totalDeliveryFee)} green />
      </View>
    </View>
  );
}

function MoneyBox({ label, value, green }: any) {
  return (
    <View style={styles.moneyBox}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={[styles.moneyValue, green && { color: THEME.green }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function formatFilter(filter: string) {
  switch (filter) {
    case "THIS_MONTH":
      return "This Month";
    case "LAST_MONTH":
      return "Last Month";
    case "THIS_WEEK":
      return "This Week";
    case "TODAY":
      return "Today";
    default:
      return "All";
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
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
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  miniStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  miniLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 3,
  },

  financeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  financeBox: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  financeIconGreen: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },
  financeTitle: {
    color: THEME.muted,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
  },
  financeValue: {
    color: THEME.yellow,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },

  searchBox: {
    marginTop: 17,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
    fontSize: 14,
  },

  filterList: {
    maxHeight: 48,
    marginTop: 15,
  },
  chip: {
    height: 38,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  chipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  chipText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 11,
  },
  chipTextActive: {
    color: "#000",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  sectionCount: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },

  billingCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vendorIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  riderIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#102517",
    borderWidth: 1,
    borderColor: "#1F6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  cardMeta: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  ordersPill: {
    backgroundColor: "#1C190D",
    borderColor: "#5D4D0B",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ordersPillText: {
    color: THEME.yellow,
    fontSize: 10,
    fontWeight: "900",
  },
  activePill: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activePillText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },

  moneyRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  moneyBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 17,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  moneyLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  moneyValue: {
    color: THEME.yellow,
    marginTop: 5,
    fontSize: 12.5,
    fontWeight: "900",
  },
});