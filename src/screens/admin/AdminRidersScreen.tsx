import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  RefreshControl,
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
};

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  secondaryText?: string;
  loading?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

export default function AdminRidersScreen({ navigation }: any) {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

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
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMessage({
      visible: true,
      type,
      title,
      message: msg,
      primaryText,
      onPrimary,
      secondaryText,
      onSecondary,
    });
  };

  const closeMessage = () => {
    setMessage((prev) => ({
      ...prev,
      visible: false,
      loading: false,
    }));
  };

  const loadRiders = async () => {
    const { data, error } = await adminService.riders();

    if (error) {
      showMessage(
        "error",
        "Unable to Load Riders",
        error.message || "Please check your connection and try again."
      );
    } else {
      setRiders(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadRiders();
  }, []);

  const filteredRiders = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return riders;

    return riders.filter((item) => {
      return (
        item.fullName?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.vehicleNo?.toLowerCase().includes(q) ||
        item.vehicleType?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q)
      );
    });
  }, [riders, search]);

  const stats = useMemo(() => {
    const totalDelivered = riders.reduce(
      (sum, item) => sum + Number(item.deliveredOrders || 0),
      0
    );

    const totalEarning = riders.reduce(
      (sum, item) => sum + Number(item.totalDeliveryFee || 0),
      0
    );

    return {
      total: riders.length,
      active: riders.filter((r) => r.isActive !== false).length,
      blocked: riders.filter((r) => r.isActive === false).length,
      totalDelivered,
      totalEarning,
    };
  }, [riders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRiders();
  };

  const askToggleStatus = (rider: any) => {
    setSelectedRider(rider);

    const willActivate = !rider.isActive;

    showMessage(
      willActivate ? "success" : "warning",
      willActivate ? "Activate Rider?" : "Block Rider?",
      willActivate
        ? `${rider.fullName || "This rider"} will be allowed to receive delivery assignments.`
        : `${rider.fullName || "This rider"} will stop receiving delivery assignments.`,
      willActivate ? "Activate" : "Block",
      () => toggleStatus(rider),
      "Cancel",
      closeMessage
    );
  };

  const toggleStatus = async (rider: any) => {
    setStatusLoading(true);

    setMessage((prev) => ({
      ...prev,
      loading: true,
    }));

    const { error } = await adminService.updateUserStatus(rider.id, !rider.isActive);

    setStatusLoading(false);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Status Update Failed",
        message: error.message || "Unable to update rider status. Please try again.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Rider Status Updated",
      message: rider.isActive
        ? "Rider has been blocked from delivery operations."
        : "Rider is active and ready for delivery assignments.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadRiders();
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading riders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredRiders}
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
                <Text style={styles.smallLabel}>RIDER OPERATIONS</Text>
                <Text style={styles.title}>Riders</Text>
                <Text style={styles.subtitle}>Manage delivery partners, earnings and status</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate("AdminRiderCreate")}
                activeOpacity={0.86}
              >
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>Rider Network</Text>
                  <Text style={styles.summaryValue}>{stats.total}</Text>
                </View>

                <View style={styles.summaryIcon}>
                  <Icon name="bicycle-outline" size={35} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Active" value={stats.active} />
                <MiniStat label="Blocked" value={stats.blocked} />
                <MiniStat label="Delivered" value={stats.totalDelivered} />
              </View>

              <View style={styles.earningCard}>
                <View>
                  <Text style={styles.earningLabel}>Total Rider Earnings</Text>
                  <Text style={styles.earningValue}>{money(stats.totalEarning)}</Text>
                </View>

                <Icon name="wallet-outline" size={28} color={THEME.green} />
              </View>
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search rider, phone, vehicle..."
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
              <Text style={styles.sectionTitle}>Rider List</Text>
              <Text style={styles.sectionCount}>{filteredRiders.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="bicycle-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No riders found</Text>
            <Text style={styles.emptyText}>
              Add your first rider to start delivery operations.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate("AdminRiderCreate")}
              activeOpacity={0.86}
            >
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Rider</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <RiderCard item={item} onToggleStatus={() => askToggleStatus(item)} />
        )}
      />

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        primaryText={message.primaryText}
        secondaryText={message.secondaryText}
        loading={message.loading || statusLoading}
        onPrimary={message.onPrimary}
        onSecondary={message.onSecondary}
        onClose={closeMessage}
      />
    </View>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function RiderCard({ item, onToggleStatus }: any) {
  const active = item.isActive !== false;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarBox}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <Icon name="person-outline" size={27} color={THEME.yellow} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.fullName || "Rider"}
            </Text>

            <View style={[styles.statusBadge, active ? styles.activeBadge : styles.blockedBadge]}>
              <Text style={[styles.statusText, active ? styles.activeText : styles.blockedText]}>
                {active ? "Active" : "Blocked"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {item.phone || "No phone"} • {item.email || "No email"}
          </Text>

          <View style={styles.vehicleRow}>
            <Icon name="bicycle-outline" size={14} color={THEME.green} />
            <Text style={styles.vehicleText} numberOfLines={1}>
              {item.vehicleType || "Vehicle"} • {item.vehicleNo || "No vehicle no"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <InfoChip icon="location-outline" text={item.address || "Address not added"} />
      </View>

      <View style={styles.statsRow}>
        <StatBox title="Delivered" value={item.deliveredOrders || 0} />
        <StatBox title="Earning" value={money(item.totalDeliveryFee)} green />
      </View>

      <TouchableOpacity
        style={[styles.statusAction, active ? styles.blockBtn : styles.activateBtn]}
        onPress={onToggleStatus}
        activeOpacity={0.86}
      >
        <Icon
          name={active ? "ban-outline" : "checkmark-circle-outline"}
          size={18}
          color={active ? THEME.danger : "#000"}
        />
        <Text style={[styles.statusActionText, active ? styles.blockActionText : styles.activateActionText]}>
          {active ? "Block Rider" : "Activate Rider"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoChip({ icon, text }: any) {
  return (
    <View style={styles.infoChip}>
      <Icon name={icon} size={14} color={THEME.muted} />
      <Text style={styles.infoChipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function StatBox({ title, value, green }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, green && { color: THEME.green }]} numberOfLines={1}>
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
    fontSize: 40,
    fontWeight: "900",
    marginTop: 5,
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

  earningCard: {
    marginTop: 12,
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  earningLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  earningValue: {
    color: THEME.green,
    fontSize: 18,
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

  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: THEME.text,
  },

  meta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },

  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },

  vehicleText: {
    flex: 1,
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
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

  blockedBadge: {
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

  blockedText: {
    color: THEME.danger,
  },

  infoRow: {
    marginTop: 14,
  },

  infoChip: {
    minHeight: 36,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  infoChipText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  statBox: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 17,
    padding: 11,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  statLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
  },

  statValue: {
    color: THEME.yellow,
    fontWeight: "900",
    marginTop: 5,
  },

  statusAction: {
    height: 45,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    borderWidth: 1,
  },

  blockBtn: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  activateBtn: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },

  statusActionText: {
    fontWeight: "900",
    fontSize: 13,
  },

  blockActionText: {
    color: THEME.danger,
  },

  activateActionText: {
    color: "#000",
  },
});