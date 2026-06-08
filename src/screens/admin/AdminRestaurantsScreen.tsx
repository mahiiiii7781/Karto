import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  RefreshControl,
  StatusBar,
  TextInput,
  Alert,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";

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
  input: "#0E100E",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

export default function AdminRestaurantsScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadRestaurants = useCallback(async () => {
    const res = await adminService.vendors();

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to load restaurants");
      setRestaurants([]);
    } else {
      setRestaurants(res.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return restaurants;

    return restaurants.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.ownerName?.toLowerCase().includes(q) ||
        item.ownerMobileNo?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q) ||
        item.city?.name?.toLowerCase().includes(q) ||
        item.vendor?.fullName?.toLowerCase().includes(q) ||
        item.category?.name?.toLowerCase().includes(q)
      );
    });
  }, [restaurants, search]);

  const stats = useMemo(() => {
    let revenue = 0;
    let kartoIncome = 0;
    let vendorIncome = 0;

    restaurants.forEach((item) => {
      revenue += Number(item.totalRevenue || 0);
      kartoIncome += Number(item.kartoIncome || 0);
      vendorIncome += Number(item.vendorIncome || 0);
    });

    return {
      total: restaurants.length,
      open: restaurants.filter((item) => item.isOpen !== false).length,
      blocked: restaurants.filter(
        (item) => item.isOpen === false || item.vendor?.isActive === false
      ).length,
      items: restaurants.reduce(
        (sum, item) => sum + Number(item.totalMenuItems || item.menuItems?.length || 0),
        0
      ),
      revenue,
      kartoIncome,
      vendorIncome,
    };
  }, [restaurants]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurants();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const toggleRestaurant = async (id: string, isActive: boolean) => {
    const res = await adminService.toggleRestaurant(id, isActive);

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to update restaurant status");
      loadRestaurants();
      return;
    }

    setRestaurants((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isOpen: isActive,
              vendor: item.vendor ? { ...item.vendor, isActive } : item.vendor,
            }
          : item
      )
    );
  };

  const confirmDelete = (item: any) => {
    Alert.alert(
      "Delete Restaurant?",
      `${item.name || "This restaurant"} ko delete/block karna hai? Orders hue to backend safe block karega.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRestaurant(item.id),
        },
      ]
    );
  };

  const deleteRestaurant = async (id: string) => {
    const res = await adminService.deleteVendor(id);

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to delete restaurant");
      return;
    }

    Alert.alert("Success", res.data?.message || "Restaurant deleted/blocked successfully");
    loadRestaurants();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredRestaurants}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredRestaurants.length ? styles.list : styles.emptyList}
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
                <Text style={styles.smallLabel}>RESTAURANT OPERATIONS</Text>
                <Text style={styles.title}>Restaurants</Text>
                <Text style={styles.subtitle}>Manage vendor restaurants, menu and status</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate("AdminVendorCreate")}
              >
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Total Restaurants</Text>
                  <Text style={styles.heroValue}>{stats.total}</Text>
                </View>

                <View style={styles.heroIcon}>
                  <Icon name="storefront-outline" size={35} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.statGrid}>
                <MiniStat label="Open" value={stats.open} green />
                <MiniStat label="Blocked" value={stats.blocked} danger />
                <MiniStat label="Menu Items" value={stats.items} />
              </View>
            </View>

            <View style={styles.financeGrid}>
              <FinanceBox title="Revenue" value={money(stats.revenue)} />
              <FinanceBox title="Karto Income" value={money(stats.kartoIncome)} green />
              <FinanceBox title="Vendor Income" value={money(stats.vendorIncome)} />
            </View>

            <View style={styles.quickRail}>
              <QuickAction
                icon="add-circle-outline"
                label="Add Vendor"
                onPress={() => navigation.navigate("AdminVendorCreate")}
              />
              <QuickAction
                icon="fast-food-outline"
                label="Menu"
                onPress={() => navigation.navigate("AdminMenuItems")}
              />
              <QuickAction
                icon="albums-outline"
                label="Vendor Cat"
                onPress={() => navigation.navigate("AdminVendorCategories")}
              />
              <QuickAction
                icon="receipt-outline"
                label="Orders"
                onPress={() => navigation.navigate("AdminOrders")}
              />
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search restaurant, owner, city..."
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
              <Text style={styles.sectionTitle}>Restaurant List</Text>
              <Text style={styles.sectionCount}>{filteredRestaurants.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="storefront-outline" size={55} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>Vendor restaurants will appear here.</Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate("AdminVendorCreate")}
            >
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Restaurant</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <RestaurantCard
            item={item}
            onToggle={(value: boolean) => toggleRestaurant(item.id, value)}
            onEdit={() => navigation.navigate("AdminVendorCreate", { vendor: item, mode: "edit" })}
            onMenu={() => navigation.navigate("AdminMenuItems", { restaurantId: item.id })}
            onCategories={() => navigation.navigate("AdminVendorCategories", { restaurantId: item.id })}
            onOrders={() => navigation.navigate("AdminOrders", { vendorId: item.id })}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />
    </View>
  );
}

function RestaurantCard({
  item,
  onToggle,
  onEdit,
  onMenu,
  onCategories,
  onOrders,
  onDelete,
}: any) {
  const imageUrl = item.imageUrl || item.image_url;
  const active = item.isOpen !== false && item.vendor?.isActive !== false;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.iconBox}>
            <Icon name="storefront-outline" size={24} color={THEME.yellow} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || "Restaurant"}</Text>
          <Text style={styles.subText} numberOfLines={1}>
            {item.address || item.city?.name || "No address"}
          </Text>
          <Text style={styles.vendorText} numberOfLines={1}>
            Owner: {item.ownerName || item.vendor?.fullName || "Not available"}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {item.phone || "-"} • {item.email || "-"}
          </Text>
        </View>

        <Switch
          value={active}
          onValueChange={onToggle}
          thumbColor={active ? THEME.green : THEME.muted}
          trackColor={{ false: "#1F2937", true: "#173923" }}
        />
      </View>

      <View style={styles.badgeRow}>
        <Badge text={active ? "Active" : "Blocked"} green={active} danger={!active} />
        <Badge text={item.type || "RESTAURANT"} />
        <Badge text={item.city?.name || "No City"} green />
        {item.category?.name ? <Badge text={item.category.name} /> : null}
      </View>

      <View style={styles.statsRow}>
        <MiniStat label="Menu Items" value={item.totalMenuItems || item.menuItems?.length || 0} />
        <MiniStat label="Orders" value={item.totalOrders || item.orders?.length || 0} />
        <MiniStat label="Commission" value={`${Number(item.commission || 0)}%`} green />
      </View>

      <View style={styles.statsRow}>
        <MiniStat label="Revenue" value={money(item.totalRevenue)} />
        <MiniStat label="Karto" value={money(item.kartoIncome)} green />
        <MiniStat label="Vendor" value={money(item.vendorIncome)} />
      </View>

      <View style={styles.actions}>
        <Action icon="create-outline" title="Edit" onPress={onEdit} />
        <Action icon="fast-food-outline" title="Menu" onPress={onMenu} />
        <Action icon="albums-outline" title="Categories" onPress={onCategories} />
        <Action icon="receipt-outline" title="Orders" onPress={onOrders} outline />
        <Action icon="trash-outline" title="Delete" onPress={onDelete} danger />
      </View>
    </View>
  );
}

const MiniStat = ({ label, value, green, danger }: any) => (
  <View style={styles.miniStat}>
    <Text
      style={[
        styles.miniValue,
        green && { color: THEME.green },
        danger && { color: THEME.danger },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text style={styles.miniLabel}>{label}</Text>
  </View>
);

function FinanceBox({ title, value, green }: any) {
  return (
    <View style={styles.financeBox}>
      <Text style={styles.financeTitle}>{title}</Text>
      <Text style={[styles.financeValue, green && { color: THEME.green }]} numberOfLines={1}>
        {value}
      </Text>
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

function Badge({ text, green, danger }: any) {
  return (
    <View
      style={[
        styles.badge,
        green && styles.badgeGreen,
        danger && styles.badgeDanger,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          green && { color: THEME.green },
          danger && { color: THEME.danger },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function Action({ icon, title, onPress, outline, danger }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        outline && styles.actionOutline,
        danger && styles.actionDanger,
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Icon
        name={icon}
        size={16}
        color={outline ? THEME.yellow : danger ? THEME.danger : "#000"}
      />
      <Text
        style={[
          styles.actionText,
          outline && styles.actionTextOutline,
          danger && styles.actionTextDanger,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 10,
    fontWeight: "800",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 38,
  },

  emptyList: {
    flexGrow: 1,
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

  heroValue: {
    color: THEME.yellow,
    fontSize: 40,
    fontWeight: "900",
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

  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  financeGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  financeBox: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  financeTitle: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 11,
  },

  financeValue: {
    color: THEME.yellow,
    fontWeight: "900",
    marginTop: 6,
    fontSize: 13,
  },

  quickRail: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  quickItem: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
  },

  quickText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
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
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 28,
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },

  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },

  emptyAddBtn: {
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: THEME.yellow,
    borderRadius: 18,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  emptyAddText: {
    color: "#000",
    fontWeight: "900",
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  image: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: THEME.card2,
  },

  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    justifyContent: "center",
    alignItems: "center",
  },

  name: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },

  subText: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },

  vendorText: {
    color: THEME.green,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
  },

  metaText: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },

  badge: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeGreen: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  badgeDanger: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  badgeText: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },

  miniStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  miniValue: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 13,
  },

  miniLabel: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "800",
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 13,
  },

  actionBtn: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.yellow,
  },

  actionOutline: {
    backgroundColor: THEME.card2,
    borderColor: THEME.border,
  },

  actionDanger: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  actionText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
  },

  actionTextOutline: {
    color: THEME.yellow,
  },

  actionTextDanger: {
    color: THEME.danger,
  },
});