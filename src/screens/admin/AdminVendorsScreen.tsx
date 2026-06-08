// Replace full AdminVendorsScreen.tsx with this:
// Note: uses adminVendorService.getVendors/updateVendor/toggleVendorStatus/deleteVendor

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Alert,
  Switch,
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

  const load = useCallback(async () => {
    const res = await adminVendorService.getVendors();

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to load vendors");
      setVendors([]);
    } else {
      setVendors(res.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;

    return vendors.filter((vendor) => {
      return (
        vendor.name?.toLowerCase().includes(q) ||
        vendor.ownerName?.toLowerCase().includes(q) ||
        vendor.ownerMobileNo?.toLowerCase().includes(q) ||
        vendor.city?.name?.toLowerCase().includes(q) ||
        vendor.category?.name?.toLowerCase().includes(q) ||
        vendor.type?.toLowerCase().includes(q) ||
        vendor.email?.toLowerCase().includes(q) ||
        vendor.phone?.toLowerCase().includes(q) ||
        vendor.vendor?.fullName?.toLowerCase().includes(q)
      );
    });
  }, [vendors, search]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let kartoIncome = 0;
    let vendorIncome = 0;
    let totalOrders = 0;
    let totalItems = 0;

    vendors.forEach((vendor) => {
      const income = calcVendorIncome(vendor);
      totalRevenue += income.total;
      kartoIncome += income.karto;
      vendorIncome += income.vendor;
      totalOrders += Number(vendor.totalOrders || vendor.orders?.length || 0);
      totalItems += Number(vendor.totalMenuItems || vendor.menuItems?.length || 0);
    });

    return {
      totalVendors: vendors.length,
      activeVendors: vendors.filter((v) => isVendorActive(v)).length,
      inactiveVendors: vendors.filter((v) => !isVendorActive(v)).length,
      totalRevenue,
      kartoIncome,
      vendorIncome,
      totalOrders,
      totalItems,
    };
  }, [vendors]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const toggleVendor = async (vendor: any, active: boolean) => {
    const res = await adminVendorService.toggleVendorStatus(vendor.id, active);

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to update vendor status");
      load();
      return;
    }

    setVendors((prev) =>
      prev.map((x) =>
        x.id === vendor.id
          ? {
              ...x,
              isActive: active,
              isOpen: active,
              vendor: x.vendor ? { ...x.vendor, isActive: active } : x.vendor,
            }
          : x
      )
    );
  };

  const confirmDelete = (vendor: any) => {
    Alert.alert(
      "Delete Vendor?",
      `${vendor.name || "This vendor"} ko delete/block karna hai? Linked orders hue to backend safe block karega.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteVendor(vendor.id),
        },
      ]
    );
  };

  const deleteVendor = async (id: string) => {
    const res = await adminVendorService.deleteVendor(id);

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to delete vendor");
      return;
    }

    Alert.alert("Success", res.data?.message || "Vendor deleted/blocked successfully");
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
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>VENDOR OPERATIONS</Text>
                <Text style={styles.title}>Vendors</Text>
                <Text style={styles.subtitle}>Manage vendors, dynamic categories and commissions</Text>
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
                <MiniStat label="Active" value={stats.activeVendors} green />
                <MiniStat label="Blocked" value={stats.inactiveVendors} danger />
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Orders" value={stats.totalOrders} />
                <MiniStat label="Menu Items" value={stats.totalItems} />
                <MiniStat label="Karto" value={money(stats.kartoIncome)} green />
              </View>

              <View style={styles.revenueSplit}>
                <IncomePill label="Karto Income" value={money(stats.kartoIncome)} color={THEME.green} />
                <IncomePill label="Vendor Payout" value={money(stats.vendorIncome)} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.quickRail}>
              <QuickAction icon="add-circle-outline" label="Add Vendor" onPress={() => navigation.navigate("AdminVendorCreate")} />
              <QuickAction icon="fast-food-outline" label="Menu" onPress={() => navigation.navigate("AdminMenuItems")} />
              <QuickAction icon="albums-outline" label="Vendor Cat" onPress={() => navigation.navigate("AdminVendorCategories")} />
              <QuickAction icon="receipt-outline" label="Orders" onPress={() => navigation.navigate("AdminOrders")} />
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search vendor, category, city, owner, phone..."
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
              Add your first vendor to start accepting orders.
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
              onToggle={(active: boolean) => toggleVendor(item, active)}
              onEdit={() =>
                navigation.navigate("AdminVendorCreate", {
                  vendor: item,
                  mode: "edit",
                })
              }
              onMenu={() =>
                navigation.navigate("AdminMenuItems", {
                  restaurantId: item.id,
                })
              }
              onVendorCategories={() =>
                navigation.navigate("AdminVendorCategories", {
                  restaurantId: item.id,
                })
              }
              onOrders={() =>
                navigation.navigate("AdminOrders", {
                  vendorId: item.id,
                })
              }
              onCommission={() =>
                navigation.navigate("AdminVendorCreate", {
                  vendor: item,
                  mode: "edit",
                })
              }
              onDelete={() => confirmDelete(item)}
            />
          );
        }}
      />
    </View>
  );
}

function isVendorActive(vendor: any) {
  return vendor.isActive !== false && vendor.isOpen !== false && vendor.vendor?.isActive !== false;
}

function calcVendorIncome(vendor: any) {
  let total = Number(vendor.totalRevenue || 0);
  let karto = Number(vendor.kartoIncome || 0);
  let vendorIncome = Number(vendor.vendorIncome || 0);

  if (!total && Array.isArray(vendor.orders)) {
    vendor.orders.forEach((order: any) => {
      const amt = Number(order.totalAmount || 0);
      const commission = Number(vendor.commission || 0);
      const adminCut = (amt * commission) / 100;

      total += amt;
      karto += adminCut;
    });

    vendorIncome = total - karto;
  }

  return {
    total,
    karto,
    vendor: vendorIncome || total - karto,
  };
}

function MiniStat({ label, value, green, danger }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, green && { color: THEME.green }, danger && { color: THEME.danger }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.86}>
      <Icon name={icon} size={21} color={THEME.yellow} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

function IncomePill({ label, value, color }: any) {
  return (
    <View style={styles.incomePill}>
      <Text style={styles.incomeLabel}>{label}</Text>
      <Text style={[styles.incomeValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function VendorCard({
  vendor,
  income,
  onToggle,
  onEdit,
  onMenu,
  onVendorCategories,
  onOrders,
  onCommission,
  onDelete,
}: any) {
  const active = isVendorActive(vendor);
  const imageUrl = vendor.imageUrl || vendor.image_url || vendor.logoUrl;
  const openStatus =
    vendor.isOpen === false ? "Closed" : vendor.isOpen === true ? "Open" : "Timing N/A";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Icon name={getCategoryIcon(vendor.category?.name || vendor.type)} size={27} color={THEME.yellow} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {vendor.name || "Unnamed Vendor"}
            </Text>

            <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, active ? styles.activeText : styles.inactiveText]}>
                {active ? "Active" : "Blocked"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {vendor.city?.name || "No city"} • {vendor.category?.name || vendor.type || "Business"}
          </Text>

          <View style={styles.ownerRow}>
            <Icon name="person-outline" size={13} color={THEME.muted} />
            <Text style={styles.ownerText} numberOfLines={1}>
              {vendor.ownerName || vendor.vendor?.fullName || "Owner not added"}
            </Text>
          </View>
        </View>

        <Switch
          value={active}
          onValueChange={onToggle}
          thumbColor={active ? THEME.green : THEME.muted}
          trackColor={{ false: "#1F2937", true: "#173923" }}
        />
      </View>

      <View style={styles.infoRow}>
        <InfoChip icon="call-outline" text={vendor.phone || vendor.ownerMobileNo || "No phone"} />
        <InfoChip icon="time-outline" text={openStatus} highlight={vendor.isOpen === true} />
      </View>

      <View style={styles.infoRow}>
        <InfoChip icon="mail-outline" text={vendor.email || vendor.vendor?.email || "No email"} />
        <InfoChip icon="location-outline" text={vendor.address || "No address"} />
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
          <Text style={styles.orderText}>{vendor.totalOrders || vendor.orders?.length || 0} Orders</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Action icon="create-outline" title="Edit" onPress={onEdit} />
        <Action icon="fast-food-outline" title="Menu" onPress={onMenu} />
        <Action icon="albums-outline" title="Categories" onPress={onVendorCategories} />
      </View>

      <View style={styles.actionRow}>
        <Action icon="receipt-outline" title="Orders" onPress={onOrders} outline />
        <Action icon="pricetag-outline" title="Commission" onPress={onCommission} outline />
        <Action icon="trash-outline" title="Delete" onPress={onDelete} danger />
      </View>
    </View>
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

function Action({ icon, title, onPress, outline, danger }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, outline && styles.actionOutline, danger && styles.actionDanger]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Icon name={icon} size={16} color={outline ? THEME.yellow : danger ? THEME.danger : "#000"} />
      <Text style={[styles.actionText, outline && styles.actionTextOutline, danger && styles.actionTextDanger]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function getCategoryIcon(name?: string) {
  const value = String(name || "").toLowerCase();

  if (value.includes("grocery") || value.includes("kirana")) return "basket-outline";
  if (value.includes("medicine") || value.includes("medical") || value.includes("pharmacy")) return "medkit-outline";
  if (value.includes("bakery") || value.includes("cafe")) return "cafe-outline";
  if (value.includes("sweet") || value.includes("mithai")) return "ice-cream-outline";
  if (value.includes("fruit")) return "nutrition-outline";
  if (value.includes("vegetable")) return "leaf-outline";
  if (value.includes("electronic")) return "phone-portrait-outline";
  if (value.includes("beauty")) return "sparkles-outline";
  if (value.includes("restaurant") || value.includes("food")) return "restaurant-outline";

  return "storefront-outline";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  listContent: { paddingHorizontal: 16, paddingBottom: 38 },
  header: { paddingTop: 22, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  smallLabel: { color: THEME.green, fontWeight: "900", fontSize: 11, letterSpacing: 1.1 },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },
  summaryCard: { backgroundColor: THEME.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: THEME.border, shadowColor: THEME.yellow, shadowOpacity: 0.14, shadowRadius: 12, elevation: 7 },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: THEME.muted, fontSize: 13, fontWeight: "800" },
  summaryValue: { color: THEME.yellow, fontSize: 32, fontWeight: "900", marginTop: 6 },
  summaryIcon: { width: 64, height: 64, borderRadius: 23, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  summaryStats: { flexDirection: "row", gap: 10, marginTop: 12 },
  miniStat: { flex: 1, backgroundColor: THEME.card2, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: THEME.border },
  miniValue: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  miniLabel: { color: THEME.muted, fontSize: 10.5, fontWeight: "800", marginTop: 3 },
  revenueSplit: { flexDirection: "row", gap: 10, marginTop: 12 },
  incomePill: { flex: 1, backgroundColor: THEME.card2, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: THEME.border },
  incomeLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  incomeValue: { fontSize: 15, fontWeight: "900", marginTop: 5 },
  quickRail: { flexDirection: "row", gap: 10, marginTop: 15 },
  quickItem: { flex: 1, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 18, paddingVertical: 13, alignItems: "center" },
  quickText: { color: THEME.text, fontSize: 10, fontWeight: "900", marginTop: 6, textAlign: "center" },
  searchBox: { marginTop: 17, height: 54, borderRadius: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800", fontSize: 14 },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  sectionCount: { color: THEME.yellow, fontWeight: "900" },
  emptyBox: { backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: THEME.border },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 7, lineHeight: 20, fontWeight: "700" },
  emptyAddBtn: { marginTop: 18, height: 48, paddingHorizontal: 18, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  emptyAddText: { color: "#000", fontWeight: "900" },
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  logo: { width: 58, height: 58, borderRadius: 19, backgroundColor: THEME.card2 },
  logoFallback: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, color: THEME.text, fontSize: 17, fontWeight: "900" },
  meta: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "800" },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  ownerText: { flex: 1, color: THEME.muted, fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  activeBadge: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  inactiveBadge: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  statusText: { fontSize: 10, fontWeight: "900" },
  activeText: { color: THEME.green },
  inactiveText: { color: THEME.danger },
  infoRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoChip: { flex: 1, minHeight: 34, borderRadius: 13, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  infoChipActive: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  infoChipText: { flex: 1, color: THEME.muted, fontSize: 11, fontWeight: "800" },
  moneyRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  moneyBox: { flex: 1, backgroundColor: THEME.card2, borderRadius: 17, padding: 10, borderWidth: 1, borderColor: THEME.border },
  moneyTitle: { color: THEME.muted, fontSize: 10.5, fontWeight: "800" },
  moneyValue: { color: THEME.yellow, fontSize: 12.5, fontWeight: "900", marginTop: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 12 },
  commissionPill: { flex: 1, minHeight: 34, borderRadius: 13, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  commissionText: { color: THEME.yellow, fontSize: 11, fontWeight: "900" },
  orderPill: { flex: 1, minHeight: 34, borderRadius: 13, backgroundColor: "#102517", borderWidth: 1, borderColor: "#1F6B35", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  orderText: { color: THEME.green, fontSize: 11, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, minHeight: 40, borderRadius: 15, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: THEME.yellow },
  actionOutline: { backgroundColor: THEME.card2, borderColor: THEME.border },
  actionDanger: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  actionText: { color: "#000", fontSize: 12, fontWeight: "900" },
  actionTextOutline: { color: THEME.yellow },
  actionTextDanger: { color: THEME.danger },
});