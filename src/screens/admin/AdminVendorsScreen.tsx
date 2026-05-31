import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminVendorService } from "@/services/api/adminVendorService";

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

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

export default function AdminVendorsScreen({ navigation }: any) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await adminVendorService.getVendors();
    setVendors(res.data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return vendors;

    return vendors.filter((vendor) => {
      return (
        vendor.name?.toLowerCase().includes(q) ||
        vendor.ownerName?.toLowerCase().includes(q) ||
        vendor.city?.name?.toLowerCase().includes(q) ||
        vendor.type?.toLowerCase().includes(q) ||
        vendor.email?.toLowerCase().includes(q) ||
        vendor.phone?.toLowerCase().includes(q)
      );
    });
  }, [vendors, search]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let kartoIncome = 0;
    let vendorIncome = 0;

    vendors.forEach((vendor) => {
      const income = calcVendorIncome(vendor);
      totalRevenue += income.total;
      kartoIncome += income.karto;
      vendorIncome += income.vendor;
    });

    return {
      totalVendors: vendors.length,
      activeVendors: vendors.filter((v) => v.isActive !== false).length,
      inactiveVendors: vendors.filter((v) => v.isActive === false).length,
      totalRevenue,
      kartoIncome,
      vendorIncome,
    };
  }, [vendors]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredVendors}
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
                <Text style={styles.smallLabel}>VENDOR OPERATIONS</Text>
                <Text style={styles.title}>Vendors</Text>
                <Text style={styles.subtitle}>Manage restaurants, stores and commissions</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate("AdminVendorCreate")}
                activeOpacity={0.86}
              >
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>Total Vendor Revenue</Text>
                  <Text style={styles.summaryValue}>{money(stats.totalRevenue)}</Text>
                </View>

                <View style={styles.summaryIcon}>
                  <Icon name="storefront-outline" size={34} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Vendors" value={stats.totalVendors} />
                <MiniStat label="Active" value={stats.activeVendors} />
                <MiniStat label="Inactive" value={stats.inactiveVendors} />
              </View>

              <View style={styles.revenueSplit}>
                <IncomePill label="Karto Income" value={money(stats.kartoIncome)} color={THEME.green} />
                <IncomePill label="Vendor Payout" value={money(stats.vendorIncome)} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search vendor, city, owner, phone..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />

              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icon name="close-circle" size={21} color={THEME.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vendor List</Text>
              <Text style={styles.sectionCount}>{filteredVendors.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="storefront-outline" size={42} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No vendors found</Text>
            <Text style={styles.emptyText}>
              Add your first vendor to start accepting orders in this city.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate("AdminVendorCreate")}
            >
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Vendor</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const income = calcVendorIncome(item);

          return (
            <VendorCard
              vendor={item}
              income={income}
              onPress={() => navigation.navigate("AdminVendorCreate", { vendorId: item.id })}
            />
          );
        }}
      />
    </View>
  );
}

function calcVendorIncome(vendor: any) {
  let total = 0;
  let karto = 0;

  (vendor.orders || []).forEach((order: any) => {
    const amt = Number(order.totalAmount || 0);
    const commission = Number(vendor.commission || 0);
    const adminCut = (amt * commission) / 100;

    total += amt;
    karto += adminCut;
  });

  return {
    total,
    karto,
    vendor: total - karto,
  };
}

function MiniStat({ label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function IncomePill({ label, value, color }: any) {
  return (
    <View style={styles.incomePill}>
      <Text style={styles.incomeLabel}>{label}</Text>
      <Text style={[styles.incomeValue, { color }]}>{value}</Text>
    </View>
  );
}

function VendorCard({ vendor, income, onPress }: any) {
  const active = vendor.isActive !== false;
  const openStatus =
    vendor.isOpen === false ? "Closed" : vendor.isOpen === true ? "Open" : "Timing N/A";

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.cardTop}>
        {vendor.imageUrl || vendor.logoUrl ? (
          <Image source={{ uri: vendor.imageUrl || vendor.logoUrl }} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Icon name="storefront-outline" size={27} color={THEME.yellow} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {vendor.name || "Unnamed Vendor"}
            </Text>

            <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, active ? styles.activeText : styles.inactiveText]}>
                {active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {vendor.city?.name || "No city"} • {vendor.type || "Business"}
          </Text>

          <View style={styles.ownerRow}>
            <Icon name="person-outline" size={13} color={THEME.muted} />
            <Text style={styles.ownerText} numberOfLines={1}>
              {vendor.ownerName || "Owner not added"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <InfoChip icon="call-outline" text={vendor.phone || vendor.ownerMobileNo || "No phone"} />
        <InfoChip icon="time-outline" text={openStatus} highlight={vendor.isOpen === true} />
      </View>

      <View style={styles.moneyRow}>
        <MoneyBox title="Revenue" value={money(income.total)} />
        <MoneyBox title="Karto" value={money(income.karto)} green />
        <MoneyBox title="Vendor" value={money(income.vendor)} />
      </View>

      <View style={styles.footerRow}>
        <View style={styles.commissionPill}>
          <Icon name="pricetag-outline" size={14} color={THEME.yellow} />
          <Text style={styles.commissionText}>Commission {Number(vendor.commission || 0)}%</Text>
        </View>

        <View style={styles.orderPill}>
          <Icon name="receipt-outline" size={14} color={THEME.green} />
          <Text style={styles.orderText}>{vendor.orders?.length || 0} Orders</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoChip({ icon, text, highlight }: any) {
  return (
    <View style={[styles.infoChip, highlight && styles.infoChipActive]}>
      <Icon name={icon} size={14} color={highlight ? THEME.green : THEME.muted} />
      <Text style={[styles.infoChipText, highlight && { color: THEME.green }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MoneyBox({ title, value, green }: any) {
  return (
    <View style={styles.moneyBox}>
      <Text style={styles.moneyTitle}>{title}</Text>
      <Text style={[styles.moneyValue, green && { color: THEME.green }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
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

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 38,
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

  addBtn: {
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

  summaryCard: {
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

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  summaryValue: {
    color: THEME.yellow,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
  },

  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryStats: {
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

  revenueSplit: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  incomePill: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  incomeLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  incomeValue: {
    fontSize: 15,
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

  emptyAddBtn: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  emptyAddText: {
    color: "#000",
    fontWeight: "900",
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: THEME.card2,
  },

  logoFallback: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  name: {
    flex: 1,
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },

  meta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },

  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },

  ownerText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  activeBadge: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  inactiveBadge: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  activeText: {
    color: THEME.green,
  },

  inactiveText: {
    color: THEME.danger,
  },

  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  infoChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 13,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  infoChipActive: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  infoChipText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  moneyRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  moneyBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 17,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  moneyTitle: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },

  moneyValue: {
    color: THEME.yellow,
    fontSize: 12.5,
    fontWeight: "900",
    marginTop: 5,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },

  commissionPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 13,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  commissionText: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
  },

  orderPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 13,
    backgroundColor: "#102517",
    borderWidth: 1,
    borderColor: "#1F6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  orderText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
});