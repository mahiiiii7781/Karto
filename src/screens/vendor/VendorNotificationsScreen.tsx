import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { vendorService } from "@/services/api/vendorService";

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
};

const formatTime = (value?: string) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function VendorNotificationsScreen({ navigation }: any) {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data, error } = await vendorService.getNotifications();

    if (error) {
      showToast(error.message || "Failed to load notifications");
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [showToast]);

  useEffect(() => {
    loadNotifications();

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loadNotifications]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
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

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.85}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={21} color={THEME.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Vendor Panel</Text>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Orders, alerts and live updates.</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          activeOpacity={0.85}
          onPress={() => {
            setRefreshing(true);
            loadNotifications();
          }}
        >
          <Icon name="refresh" size={20} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => String(item.id || index)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>Notification Center</Text>
              <Text style={styles.heroTitle}>{notifications.length} Alerts</Text>
              <Text style={styles.heroSub}>Realtime vendor activity feed</Text>
            </View>

            <View style={styles.heroIcon}>
              <Icon name="notifications-outline" size={28} color={THEME.bg} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="notifications-off-outline" size={34} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              New orders and vendor alerts will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => {
              if (item.order) {
                navigation?.navigate?.("VendorOrderDetail", {
                  order: item.order,
                  orderId: item.orderId,
                });
              }
            }}
          >
            <View style={styles.iconBox}>
              <Icon
                name={item.type === "ORDER" ? "receipt-outline" : "notifications-outline"}
                size={22}
                color={THEME.yellow}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {item.title || "Vendor Alert"}
              </Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.message || "You have a new vendor update."}
              </Text>
              <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
            </View>

            <Icon name="chevron-forward" size={20} color={THEME.muted} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: THEME.text, fontSize: 30, fontWeight: "900" },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.75 },
  heroTitle: { color: THEME.bg, fontSize: 28, fontWeight: "900", marginTop: 4 },
  heroSub: { color: THEME.bg, fontWeight: "800", opacity: 0.78, marginTop: 4 },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  cardText: { color: THEME.muted, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  cardTime: { color: THEME.green, fontWeight: "800", marginTop: 6, fontSize: 12 },
  emptyBox: {
    marginTop: 70,
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 5,
    fontWeight: "700",
  },
});