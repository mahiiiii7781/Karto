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
import Clipboard from "@react-native-clipboard/clipboard";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { couponService, Coupon } from "@/services/api/couponService";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

type ToastType = "success" | "error" | "info";

const showToast = (type: ToastType, text1: string, text2?: string) => {
  Toast.show({
    type,
    text1,
    text2,
    position: "bottom",
    visibilityTime: 1800,
  });
};

const normalizeCoupons = (payload: any): Coupon[] => {
  const list =
    payload?.data?.data?.coupons ||
    payload?.data?.coupons ||
    payload?.data?.data ||
    payload?.data ||
    payload;

  return Array.isArray(list) ? list.filter(Boolean) : [];
};

const getCouponId = (coupon: Coupon, index: number) =>
  String(coupon.id || coupon.code || `coupon-${index}`);

const getCouponCode = (coupon: Coupon) => String(coupon.code || "").trim();

const getCouponTitle = (coupon: Coupon) =>
  coupon.title  || "Karto Offer";

const getCouponDescription = (coupon: Coupon) =>
  coupon.description || "Use this coupon to save more on your order.";

const getDiscountText = (coupon: Coupon) => {
  const type = String(coupon.discountType || coupon.discount_type || "FLAT").toUpperCase();
  const value = Number(coupon.discountValue ?? coupon.discount_value ?? 0);

  if (type === "PERCENTAGE") return `${value}% OFF`;
  return `₹${value} OFF`;
};

const getMinOrder = (coupon: Coupon) =>
  Number(coupon.minOrderAmount ?? coupon.min_order_amount ?? 0);

const getMaxDiscount = (coupon: Coupon) =>
  Number(coupon.maxDiscount ?? coupon.max_discount ?? 0);

const isCouponActive = (coupon: Coupon) => {
  const active = Boolean(coupon.isActive ?? coupon.is_active ?? true);
  const expiry = coupon.expiresAt || coupon.expires_at;

  if (!active) return false;
  if (!expiry) return true;

  const expiryTime = new Date(expiry).getTime();
  if (Number.isNaN(expiryTime)) return true;

  return expiryTime >= Date.now();
};

const getExpiry = (coupon: Coupon) => {
  const date = coupon.expiresAt || coupon.expires_at;
  if (!date) return "Limited time";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Limited time";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CouponsScreen() {
  const navigation = useNavigation<any>();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const activeCount = useMemo(
    () => coupons.filter(coupon => isCouponActive(coupon)).length,
    [coupons]
  );

  const loadCoupons = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setErrorText("");

    try {
      const res = await couponService.getCoupons();
      const data = normalizeCoupons(res);
      setCoupons(data);

      if (isRefresh) {
        showToast("success", "Coupons refreshed", "Latest offers loaded.");
      }
    } catch (error: any) {
      setCoupons([]);
      setErrorText(error?.message || "Unable to load coupons right now.");
      showToast("error", "Unable to load coupons", "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCoupons(false);
    }, [loadCoupons])
  );

  const copyCode = (code: string) => {
    if (!code) {
      showToast("info", "Code unavailable", "This coupon has no code.");
      return;
    }

    Clipboard.setString(code);
    showToast("success", "Coupon copied", `${code} is ready to use.`);
  };

  const renderCoupon = ({ item, index }: { item: Coupon; index: number }) => {
    const active = isCouponActive(item);
    const minOrder = getMinOrder(item);
    const maxDiscount = getMaxDiscount(item);
    const code = getCouponCode(item);

    return (
      <View style={[styles.couponCard, !active && styles.disabledCard]}>
        <View style={styles.couponTop}>
          <View style={[styles.discountBadge, !active && styles.discountBadgeDisabled]}>
            <Icon name="pricetag" size={17} color={THEME.black} />
            <Text style={styles.discountText}>{getDiscountText(item)}</Text>
          </View>

          <View style={[styles.statusPill, !active && styles.inactivePill]}>
            <Text style={[styles.statusText, !active && styles.inactiveText]}>
              {active ? "ACTIVE" : "EXPIRED"}
            </Text>
          </View>
        </View>

        <Text style={styles.couponTitle} numberOfLines={1}>
          {getCouponTitle(item)}
        </Text>

        <Text style={styles.couponDesc} numberOfLines={2}>
          {getCouponDescription(item)}
        </Text>

        <View style={styles.rulesBox}>
          <Rule icon="cart-outline" text={minOrder > 0 ? `Min order ₹${minOrder}` : "No minimum order"} />
          <Rule
            icon="cash-outline"
            text={maxDiscount > 0 ? `Max discount ₹${maxDiscount}` : "No max cap"}
          />
          <Rule icon="time-outline" text={`Valid till ${getExpiry(item)}`} />
        </View>

        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText} numberOfLines={1}>
              {code || "NO CODE"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.copyBtn, !active && styles.copyBtnDisabled]}
            disabled={!active}
            onPress={() => copyCode(code)}
            activeOpacity={0.85}
          >
            <Text style={styles.copyText}>{active ? "Copy" : "Expired"}</Text>
            {active && <Icon name="copy-outline" size={16} color={THEME.black} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>%</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Finding best offers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.title}>Coupons</Text>
          <Text style={styles.subtitle}>
            {coupons.length > 0
              ? `${activeCount} active offer${activeCount === 1 ? "" : "s"} available`
              : "Fresh rewards will appear here"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadCoupons(true)}
          disabled={refreshing}
          activeOpacity={0.85}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={THEME.black} />
          ) : (
            <Icon name="refresh" size={18} color={THEME.black} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTextBox}>
          <Text style={styles.heroTag}>KARTO SAVINGS</Text>
          <Text style={styles.heroTitle}>Unlock better deals</Text>
          <Text style={styles.heroSub}>
            Copy a valid code and apply it during checkout.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="ticket-outline" size={31} color={THEME.black} />
        </View>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={getCouponId}
        renderItem={renderCoupon}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCoupons(true)}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        contentContainerStyle={coupons.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={errorText ? "cloud-offline-outline" : "pricetag-outline"}
                size={54}
                color={THEME.yellow}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {errorText ? "Coupons unavailable" : "No coupons available"}
            </Text>

            <Text style={styles.emptyText}>
              {errorText || "New offers and rewards will appear here soon."}
            </Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadCoupons(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.retryText}>Refresh</Text>
              <Icon name="refresh" size={17} color={THEME.black} />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const Rule = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.ruleRow}>
    <Icon name={icon} size={15} color={THEME.green} />
    <Text style={styles.ruleText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
    fontSize: 36,
    fontWeight: "900",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 30,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "700",
    fontSize: 13,
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
  },
  heroTextBox: {
    flex: 1,
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 21,
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  couponCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 15,
  },
  disabledCard: {
    opacity: 0.62,
  },
  couponTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  discountBadge: {
    backgroundColor: THEME.green,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discountBadgeDisabled: {
    backgroundColor: THEME.muted,
  },
  discountText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 13,
  },
  statusPill: {
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inactivePill: {
    backgroundColor: "#1B0E0E",
    borderColor: "#3F1717",
  },
  statusText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  inactiveText: {
    color: THEME.danger,
  },
  couponTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  couponDesc: {
    color: THEME.muted,
    marginTop: 6,
    lineHeight: 20,
    fontWeight: "700",
  },
  rulesBox: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  ruleText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  codeRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.green,
    backgroundColor: "#07150D",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  codeText: {
    color: THEME.green,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  copyBtn: {
    minWidth: 91,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  copyBtnDisabled: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  copyText: {
    color: THEME.black,
    fontWeight: "900",
  },
  emptyBox: {
    alignItems: "center",
  },
  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 36,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: THEME.green,
    borderRadius: 17,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  retryText: {
    color: THEME.black,
    fontWeight: "900",
  },
});
