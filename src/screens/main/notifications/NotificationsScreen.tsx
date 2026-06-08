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
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  surface: "#F9FAFC",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  green: "#22C55E",
  yellow: "#F59E0B",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  white: "#FFFFFF",
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
  updatedAt?: string;
  updated_at?: string;
  data?: any;
};

const normalizeType = (type?: string) => String(type || "SYSTEM").toUpperCase();

const getIcon = (type?: string) => {
  const t = normalizeType(type);

  if (t.includes("ORDER")) return "receipt-outline";
  if (t.includes("PAYMENT")) return "card-outline";
  if (t.includes("OFFER") || t.includes("COUPON")) return "gift-outline";
  if (t.includes("SUPPORT")) return "chatbubble-ellipses-outline";
  if (t.includes("REFERRAL")) return "people-outline";
  if (t.includes("WALLET")) return "wallet-outline";
  if (t.includes("RIDER") || t.includes("DELIVERY")) return "bicycle-outline";
  if (t.includes("CANCEL")) return "close-circle-outline";
  if (t.includes("DELIVERED")) return "checkmark-circle-outline";

  return "notifications-outline";
};

const getColor = (type?: string) => {
  const t = normalizeType(type);

  if (t.includes("PAYMENT") || t.includes("WALLET")) return THEME.green;
  if (t.includes("CANCEL") || t.includes("FAILED")) return THEME.danger;
  if (t.includes("OFFER") || t.includes("COUPON")) return THEME.yellow;
  return THEME.orange;
};

const getTitle = (item: NotificationItem) => item.title || "Karto Notification";

const getBody = (item: NotificationItem) =>
  item.body || item.message || "You have a new update.";

const isReadNotification = (item: NotificationItem) =>
  Boolean(item.isRead ?? item.is_read ?? item.read ?? false);

const normalizeNotifications = (res: any): NotificationItem[] => {
  const list =
    res?.data?.data?.notifications ||
    res?.data?.data ||
    res?.data?.notifications ||
    res?.data?.items ||
    res?.data ||
    [];

  return Array.isArray(list) ? list.filter(item => item?.id) : [];
};

const parseData = (raw: any) => {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  return raw;
};

const getOrderId = (item: NotificationItem) => {
  const data = parseData(item.data);

  return (
    data.orderId ||
    data.order_id ||
    data.kartoOrderId ||
    data.karto_order_id ||
    data.id ||
    null
  );
};

const formatTime = (item: NotificationItem) => {
  const dateValue = item.createdAt || item.created_at || item.updatedAt || item.updated_at;

  if (!dateValue) return "Just now";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hr ago`;

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
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const isGuest = !user?.id;

  const unreadCount = useMemo(
    () => notifications.filter(item => !isReadNotification(item)).length,
    [notifications]
  );

  const orderUpdateCount = useMemo(
    () => notifications.filter(item => normalizeType(item.type).includes("ORDER")).length,
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
    if (!item?.id || openingId) return;

    try {
      setOpeningId(item.id);

      if (!isReadNotification(item)) {
        await markRead(item.id);
      }

      const orderId = getOrderId(item);

      if (orderId) {
        navigation.navigate("OrderDetail", { orderId });
        return;
      }

      const type = normalizeType(item.type);

      if (type.includes("OFFER") || type.includes("COUPON")) {
        navigation.navigate("Coupons");
        return;
      }

      if (type.includes("WALLET") || type.includes("PAYMENT")) {
        navigation.navigate("Wallet");
        return;
      }

      if (type.includes("SUPPORT")) {
        navigation.navigate("HelpSupport");
        return;
      }
    } finally {
      setOpeningId(null);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const unread = !isReadNotification(item);
    const color = getColor(item.type);
    const type = normalizeType(item.type);
    const orderId = getOrderId(item);
    const isOpening = openingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, unread && styles.unreadCard]}
        activeOpacity={0.9}
        onPress={() => openNotification(item)}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: unread ? color : THEME.orangeSoft },
          ]}
        >
          <Icon
            name={getIcon(item.type) as any}
            size={22}
            color={unread ? THEME.white : color}
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>
              {getTitle(item)}
            </Text>

            {isOpening ? (
              <ActivityIndicator size="small" color={THEME.orange} />
            ) : unread ? (
              <View style={styles.dot} />
            ) : null}
          </View>

          <Text style={styles.body} numberOfLines={2}>
            {getBody(item)}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Icon name="time-outline" size={12} color={THEME.muted} />
              <Text style={styles.time}>{formatTime(item)}</Text>
            </View>

            <View style={styles.tagRow}>
              {!!orderId && (
                <View style={styles.orderTag}>
                  <Text style={styles.orderTagText}>ORDER</Text>
                </View>
              )}

              <View style={[styles.typeTag, { backgroundColor: unread ? THEME.orangeSoft : THEME.card2 }]}>
                <Text style={[styles.typeText, { color }]}>{type}</Text>
              </View>
            </View>
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
          color={THEME.orange}
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

      <TouchableOpacity
        style={styles.loginBtn}
        activeOpacity={0.9}
        onPress={isGuest ? () => navigation.navigate("Auth") : onRefresh}
      >
        <Text style={styles.loginText}>{isGuest ? "Login / Signup" : "Refresh"}</Text>
        <Icon name={isGuest ? "arrow-forward" : "refresh"} size={18} color={THEME.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.blue} />
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
            <ActivityIndicator size="small" color={THEME.white} />
          ) : (
            <Icon name="checkmark-done-outline" size={21} color={THEME.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Icon name="notifications" size={26} color={THEME.white} />
        </View>

        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Stay updated</Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            Live order alerts, payment status, offers and support messages in one place.
          </Text>
        </View>
      </View>

      {!loading && notifications.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orderUpdateCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>K</Text>
          </View>
          <ActivityIndicator size="large" color={THEME.orange} />
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
              tintColor={THEME.orange}
              colors={[THEME.orange]}
            />
          }
        />
      )}
    </View>
  );
}

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

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
    borderRadius: 16,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    color: THEME.blue,
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
    borderRadius: 16,
    backgroundColor: THEME.orange,
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  disabledBtn: {
    opacity: 0.45,
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: THEME.blue,
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 17,
    paddingVertical: 12,
    alignItems: "center",
    ...shadow,
  },
  statValue: {
    color: THEME.orange,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
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
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    ...shadow,
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: "#FFD6C8",
    backgroundColor: THEME.orangeSoft,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: THEME.orange,
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
    gap: 8,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 11,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  typeTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  typeText: {
    fontWeight: "900",
    fontSize: 9,
    textTransform: "uppercase",
  },
  orderTag: {
    backgroundColor: THEME.orange,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  orderTagText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: "900",
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
    marginBottom: 16,
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  loginText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 15,
  },
});
