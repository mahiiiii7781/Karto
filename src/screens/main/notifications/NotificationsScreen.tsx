import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  greenDark: "#16A34A",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

type NotificationItem = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  isRead?: boolean;
  is_read?: boolean;
  read?: boolean;
  createdAt?: string;
  created_at?: string;
  data?: any;
};

const getIcon = (type?: string) => {
  switch ((type || "").toUpperCase()) {
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
    case "RIDER":
      return "bicycle-outline";
    default:
      return "notifications-outline";
  }
};

const getTitle = (item: NotificationItem) =>
  item.title || "Karto Notification";

const getBody = (item: NotificationItem) =>
  item.body || item.message || "You have a new update.";

const isReadNotification = (item: NotificationItem) =>
  Boolean(item.isRead ?? item.is_read ?? item.read ?? false);

const normalizeNotifications = (res: any): NotificationItem[] => {
  const list =
    res?.data?.data ||
    res?.data?.notifications ||
    res?.data?.items ||
    res?.data ||
    [];

  return Array.isArray(list) ? list.filter(item => item?.id) : [];
};

const formatTime = (item: NotificationItem) => {
  const dateValue = item.createdAt || item.created_at;

  if (!dateValue) return "Just now";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const isGuest = !user?.id;

  const unreadCount = useMemo(
    () => notifications.filter(item => !isReadNotification(item)).length,
    [notifications]
  );

  const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string
  ) => {
    Toast.show({
      type,
      text1,
      text2,
      position: "bottom",
      visibilityTime: 1800,
    });
  };

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (isGuest) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const res = await apiClient.get("/push/notifications");
        setNotifications(normalizeNotifications(res));
      } catch (error: any) {
        setNotifications([]);
        showToast(
          "error",
          "Unable to load updates",
          error?.response?.data?.message || "Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications(false);
    }, [loadNotifications])
  );

  const onRefresh = () => loadNotifications(true);

  const markRead = async (id: string) => {
    if (!id || isGuest) return;

    setNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isRead: true, is_read: true, read: true } : item
      )
    );

    try {
      await apiClient.patch(`/push/notifications/${id}/read`);
    } catch {
      loadNotifications(true);
    }
  };

  const markAllRead = async () => {
    if (isGuest) {
      navigation.navigate("Auth");
      return;
    }

    if (!unreadCount || markingAll) return;

    try {
      setMarkingAll(true);
      await apiClient.patch("/push/notifications/read-all");

      setNotifications(prev =>
        prev.map(item => ({ ...item, isRead: true, is_read: true, read: true }))
      );

      showToast("success", "All caught up", "Notifications marked as read.");
    } catch (error: any) {
      showToast(
        "error",
        "Unable to update",
        error?.response?.data?.message || "Please try again."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (item: NotificationItem) => {
    if (!isReadNotification(item)) await markRead(item.id);

    const data = item.data || {};
    const orderId = data.orderId || data.order_id || data.kartoOrderId;

    if (orderId) {
      navigation.navigate("OrderDetail", { orderId });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const unread = !isReadNotification(item);

    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.unreadCard]}
        activeOpacity={0.88}
        onPress={() => openNotification(item)}
      >
        <View style={[styles.iconBox, unread && styles.iconBoxUnread]}>
          <Icon
            name={getIcon(item.type) as any}
            size={22}
            color={unread ? THEME.black : THEME.green}
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>
              {getTitle(item)}
            </Text>

            {unread && <View style={styles.dot} />}
          </View>

          <Text style={styles.body} numberOfLines={2}>
            {getBody(item)}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.time}>{formatTime(item)}</Text>
            {!!item.type && <Text style={styles.typeText}>{item.type}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon
          name={isGuest ? "person-circle-outline" : "notifications-outline"}
          size={48}
          color={THEME.yellow}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {isGuest ? "Login for updates" : "No notifications yet"}
      </Text>

      <Text style={styles.emptySub}>
        {isGuest
          ? "Sign in to see order alerts, offers, payments and support updates."
          : "Order updates, offers and announcements will appear here."}
      </Text>

      {isGuest && (
        <TouchableOpacity
          style={styles.loginBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Auth")}
        >
          <Text style={styles.loginText}>Login / Signup</Text>
          <Icon name="arrow-forward" size={18} color={THEME.black} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
              : "Orders, offers and updates"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.readAllBtn, (!unreadCount || markingAll) && styles.disabledBtn]}
          onPress={markAllRead}
          disabled={!unreadCount || markingAll}
          activeOpacity={0.85}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={THEME.black} />
          ) : (
            <Icon name="checkmark-done-outline" size={21} color={THEME.black} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Icon name="notifications" size={26} color={THEME.black} />
        </View>

        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Stay updated</Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            Live order alerts, payment status, offers and support messages in one place.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>K</Text>
          </View>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={styles.loaderText}>Loading updates...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.green}
              colors={[THEME.green]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 25,
    fontWeight: "900",
  },
  headerSub: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  readAllBtn: {
    width: 42,
    height: 42,
    borderRadius: 17,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  heroSub: {
    color: THEME.muted,
    marginTop: 5,
    lineHeight: 18,
    fontSize: 13,
    fontWeight: "700",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
    fontSize: 38,
    fontWeight: "900",
  },
  loaderText: {
    marginTop: 10,
    color: THEME.muted,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  unreadCard: {
    borderColor: "#245F38",
    backgroundColor: "#102116",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconBoxUnread: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  cardContent: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    backgroundColor: THEME.yellow,
    marginLeft: 8,
  },
  body: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },
  time: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
  },
  typeText: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 10,
    textTransform: "uppercase",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 34,
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
    fontSize: 21,
  },
  emptySub: {
    color: THEME.muted,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  loginBtn: {
    marginTop: 22,
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 15,
  },
});
