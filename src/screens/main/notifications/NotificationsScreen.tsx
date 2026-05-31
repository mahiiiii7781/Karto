import React, { useEffect, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#F7FFF9",
  card: "#FFFFFF",
  green: "#16A34A",
  greenDark: "#0B7A34",
  yellow: "#FACC15",
  text: "#101510",
  muted: "#6B7280",
  border: "#E5E7EB",
  soft: "#F1F5F9",
  danger: "#EF4444",
};

const getIcon = (type?: string) => {
  switch (type) {
    case "ORDER":
      return "receipt-outline";
    case "PAYMENT":
      return "card-outline";
    case "OFFER":
      return "gift-outline";
    case "SUPPORT":
      return "chatbubble-ellipses-outline";
    case "REFERRAL":
      return "people-outline";
    case "WALLET":
      return "wallet-outline";
    default:
      return "notifications-outline";
  }
};

const getTitle = (item: any) => item.title || "Karto Notification";
const getBody = (item: any) => item.body || item.message || "You have a new update.";

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await apiClient.get("/push/notifications");
      setNotifications(res.data?.data || res.data?.notifications || []);
    } catch (error: any) {
      console.log("NOTIFICATION ERROR:", error?.response?.data || error?.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/push/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch("/push/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const openNotification = async (item: any) => {
    if (!item.isRead) await markRead(item.id);

    const data = item.data || {};
    if (data.orderId) {
      navigation.navigate("OrderDetail", { orderId: data.orderId });
    }
  };

  const renderItem = ({ item }: any) => {
    const unread = !item.isRead;

    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.unreadCard]}
        activeOpacity={0.9}
        onPress={() => openNotification(item)}
      >
        <View style={[styles.iconBox, unread && styles.iconBoxUnread]}>
          <Icon
            name={getIcon(item.type) as any}
            size={23}
            color={unread ? THEME.green : THEME.muted}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>
              {getTitle(item)}
            </Text>

            {unread && <View style={styles.dot} />}
          </View>

          <Text style={styles.body} numberOfLines={2}>
            {getBody(item)}
          </Text>

          <Text style={styles.time}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "Just now"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>Orders, offers and updates</Text>
        </View>

        <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
          <Icon name="checkmark-done-outline" size={21} color={THEME.green} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={styles.loaderText}>Loading updates...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="notifications-outline" size={42} color={THEME.green} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            Order updates, offers and announcements will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.green]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  header: {
    backgroundColor: THEME.greenDark,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },
  headerSub: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  readAllBtn: {
    marginLeft: "auto",
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: { marginTop: 10, color: THEME.muted, fontWeight: "800" },
  list: { padding: 16, paddingBottom: 30 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 2,
  },
  unreadCard: {
    borderColor: "#86EFAC",
    backgroundColor: "#FFFFFF",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.soft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconBoxUnread: {
    backgroundColor: "#DCFCE7",
  },
  row: { flexDirection: "row", alignItems: "center" },
  title: {
    flex: 1,
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: THEME.green,
    marginLeft: 8,
  },
  body: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  time: {
    color: "#9CA3AF",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 30,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  emptyTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 20,
  },
  emptySub: {
    color: THEME.muted,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
});