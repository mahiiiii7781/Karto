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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { couponService, Coupon } from "@/services/api/couponService";

const THEME = {
  bg: "#F8FAF5",

  card: "#FFFFFF",
  card2: "#F1F5EC",
  surface: "#F7FAF2",

  orange: "#FACC15",
  orangeSoft: "#FEF9C3",

  blue: "#111827",

  green: "#22C55E",
  greenDark: "#15803D",

  yellow: "#FACC15",
  yellowSoft: "#FEF9C3",

  text: "#111827",
  muted: "#6B7280",
  border: "#DDE5D7",

  danger: "#EF4444",

  white: "#FFFFFF",
  black: "#111827",
  blackSoft: "#1F2937",
};

type ToastType = "success" | "error" | "info";
type TabType = "ACTIVE" | "EXPIRED";

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
    payload?.coupons ||
    payload;

  return Array.isArray(list) ? list.filter(Boolean) : [];
};

const getCouponId = (coupon: Coupon, index: number) =>
  String((coupon as any).id || (coupon as any).code || `coupon-${index}`);

const getCouponCode = (coupon: Coupon) =>
  String((coupon as any).code || (coupon as any).couponCode || (coupon as any).coupon_code || "")
    .trim()
    .toUpperCase();

const getCouponTitle = (coupon: Coupon) =>
  (coupon as any).title || (coupon as any).name || "Karto Offer";

const getCouponDescription = (coupon: Coupon) =>
  (coupon as any).description || "Use this coupon to save more on your order.";

const getDiscountType = (coupon: Coupon) =>
  String(
    (coupon as any).discountType ||
      (coupon as any).discount_type ||
      (coupon as any).type ||
      "FLAT"
  ).toUpperCase();

const getDiscountValue = (coupon: Coupon) =>
  Number((coupon as any).discountValue ?? (coupon as any).discount_value ?? (coupon as any).value ?? 0);

const getDiscountText = (coupon: Coupon) => {
  const type = getDiscountType(coupon);
  const value = getDiscountValue(coupon);

  if (type === "PERCENTAGE" || type === "PERCENT") return `${value}% OFF`;
  return `₹${value} OFF`;
};

const getMinOrder = (coupon: Coupon) =>
  Number((coupon as any).minOrderAmount ?? (coupon as any).min_order_amount ?? (coupon as any).minimumOrderAmount ?? 0);

const getMaxDiscount = (coupon: Coupon) =>
  Number((coupon as any).maxDiscount ?? (coupon as any).max_discount ?? (coupon as any).maximumDiscount ?? 0);

const getUsageLimit = (coupon: Coupon) =>
  Number((coupon as any).usageLimit ?? (coupon as any).usage_limit ?? 0);

const isCouponActive = (coupon: Coupon) => {
  const active = Boolean((coupon as any).isActive ?? (coupon as any).is_active ?? true);
  const expiry = (coupon as any).expiresAt || (coupon as any).expires_at || (coupon as any).validTill || (coupon as any).valid_till;

  if (!active) return false;
  if (!expiry) return true;

  const expiryTime = new Date(expiry).getTime();
  if (Number.isNaN(expiryTime)) return true;

  return expiryTime >= Date.now();
};

const getExpiry = (coupon: Coupon) => {
  const date =
    (coupon as any).expiresAt ||
    (coupon as any).expires_at ||
    (coupon as any).validTill ||
    (coupon as any).valid_till;

  if (!date) return "Limited time";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Limited time";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const canUseWithCart = (coupon: Coupon, cartTotal?: number) => {
  if (!isCouponActive(coupon)) return false;
  if (!cartTotal && cartTotal !== 0) return true;
  return Number(cartTotal || 0) >= getMinOrder(coupon);
};

export default function CouponsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const fromCheckout = Boolean(route.params?.fromCheckout);
  const cartTotal = Number(route.params?.cartTotal ?? route.params?.subtotal ?? 0);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");

  const activeCoupons = useMemo(
    () => coupons.filter(coupon => isCouponActive(coupon)),
    [coupons]
  );

  const expiredCoupons = useMemo(
    () => coupons.filter(coupon => !isCouponActive(coupon)),
    [coupons]
  );

  const filteredCoupons = activeTab === "ACTIVE" ? activeCoupons : expiredCoupons;

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
      setErrorText(error?.response?.data?.message || error?.message || "Unable to load coupons right now.");
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

  const applyCoupon = (coupon: Coupon) => {
    const code = getCouponCode(coupon);

    if (!code) {
      showToast("info", "Code unavailable", "This coupon has no code.");
      return;
    }

    if (!isCouponActive(coupon)) {
      showToast("info", "Coupon expired", "Please choose an active offer.");
      return;
    }

    if (!canUseWithCart(coupon, cartTotal)) {
      showToast(
        "info",
        "Minimum order required",
        `Add items worth ₹${Math.max(getMinOrder(coupon) - cartTotal, 0).toFixed(0)} more.`
      );
      return;
    }

    Clipboard.setString(code);

    if (fromCheckout) {
      navigation.navigate({
        name: "Checkout",
        params: {
          appliedCoupon: coupon,
          couponCode: code,
        },
        merge: true,
      } as never);
      return;
    }

    showToast("success", "Coupon ready", `${code} copied. Apply it during checkout.`);
  };

  const renderCoupon = ({ item, index }: { item: Coupon; index: number }) => {
    const active = isCouponActive(item);
    const minOrder = getMinOrder(item);
    const maxDiscount = getMaxDiscount(item);
    const usageLimit = getUsageLimit(item);
    const code = getCouponCode(item);
    const usable = canUseWithCart(item, cartTotal);

    return (
      <View style={[styles.couponCard, !active && styles.disabledCard]}>
        <View style={styles.ticketCutLeft} />
        <View style={styles.ticketCutRight} />

        <View style={styles.couponTop}>
          <View style={[styles.discountBadge, !active && styles.discountBadgeDisabled]}>
            <Icon name="pricetag" size={17} color={THEME.white} />
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
          <Rule
            icon="cart-outline"
            text={minOrder > 0 ? `Min order ₹${minOrder}` : "No minimum order"}
          />
          <Rule
            icon="cash-outline"
            text={maxDiscount > 0 ? `Max discount ₹${maxDiscount}` : "No max cap"}
          />
          <Rule icon="time-outline" text={`Valid till ${getExpiry(item)}`} />
          {usageLimit > 0 && <Rule icon="repeat-outline" text={`Usage limit ${usageLimit}`} />}
        </View>

        {fromCheckout && active && !usable && (
          <View style={styles.warningBox}>
            <Icon name="alert-circle-outline" size={15} color={THEME.danger} />
            <Text style={styles.warningText}>
              Add ₹{Math.max(minOrder - cartTotal, 0).toFixed(0)} more to use this coupon.
            </Text>
          </View>
        )}

        <View style={styles.codeRow}>
          <TouchableOpacity
            style={styles.codeBox}
            activeOpacity={0.85}
            onPress={() => copyCode(code)}
          >
            <Icon name="copy-outline" size={15} color={active ? THEME.orange : THEME.muted} />
            <Text
              style={[styles.codeText, !active && { color: THEME.muted }]}
              numberOfLines={1}
            >
              {code || "NO CODE"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.copyBtn,
              (!active || (fromCheckout && !usable)) && styles.copyBtnDisabled,
            ]}
            disabled={!active || (fromCheckout && !usable)}
            onPress={() => applyCoupon(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.copyText}>
              {!active ? "Expired" : fromCheckout ? "Apply" : "Copy"}
            </Text>
            {active && (
              <Icon
                name={fromCheckout ? "checkmark-circle-outline" : "copy-outline"}
                size={16}
                color={THEME.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Icon
          name={errorText ? "cloud-offline-outline" : "pricetag-outline"}
          size={54}
          color={THEME.orange}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {errorText
          ? "Coupons unavailable"
          : activeTab === "ACTIVE"
          ? "No active coupons"
          : "No expired coupons"}
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
        <Icon name="refresh" size={17} color={THEME.white} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>%</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Finding best offers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.blue} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.title}>Coupons</Text>
          <Text style={styles.subtitle}>
            {coupons.length > 0
              ? `${activeCoupons.length} active offer${activeCoupons.length === 1 ? "" : "s"} available`
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
            <ActivityIndicator size="small" color={THEME.white} />
          ) : (
            <Icon name="refresh" size={18} color={THEME.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTextBox}>
          <Text style={styles.heroTag}>KARTO SAVINGS</Text>
          <Text style={styles.heroTitle}>Unlock better deals</Text>
          <Text style={styles.heroSub}>
            {fromCheckout
              ? "Apply a valid code to reduce your checkout amount."
              : "Copy a valid code and apply it during checkout."}
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="ticket-outline" size={31} color={THEME.white} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{coupons.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeCoupons.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{expiredCoupons.length}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "ACTIVE" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ACTIVE")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "ACTIVE" && styles.tabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "EXPIRED" && styles.tabBtnActive]}
          onPress={() => setActiveTab("EXPIRED")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, activeTab === "EXPIRED" && styles.tabTextActive]}>
            Expired
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCoupons}
        keyExtractor={getCouponId}
        renderItem={renderCoupon}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCoupons(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
        contentContainerStyle={filteredCoupons.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

const Rule = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.ruleRow}>
    <Icon name={icon as any} size={15} color={THEME.orange} />
    <Text style={styles.ruleText} numberOfLines={1}>
      {text}
    </Text>
  </View>
);

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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
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
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: {
    color: THEME.blue,
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
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroTextBox: {
    flex: 1,
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
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
  tabs: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 5,
    flexDirection: "row",
    marginBottom: 14,
    ...shadow,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: THEME.orange,
  },
  tabText: {
    color: THEME.muted,
    fontWeight: "900",
  },
  tabTextActive: {
    color: THEME.white,
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
    marginBottom: 15,
    overflow: "hidden",
    ...shadow,
  },
  ticketCutLeft: {
    position: "absolute",
    left: -12,
    top: "52%",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.bg,
  },
  ticketCutRight: {
    position: "absolute",
    right: -12,
    top: "52%",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.bg,
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
    backgroundColor: THEME.orange,
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
    color: THEME.white,
    fontWeight: "900",
    fontSize: 13,
  },
  statusPill: {
    backgroundColor: THEME.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inactivePill: {
    backgroundColor: "#FFF1F1",
  },
  statusText: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
  },
  inactiveText: {
    color: THEME.danger,
  },
  couponTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.surface,
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
  warningBox: {
    backgroundColor: "#FFF1F1",
    borderRadius: 14,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  warningText: {
    flex: 1,
    color: THEME.danger,
    fontSize: 12,
    fontWeight: "800",
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
    borderColor: THEME.orange,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  codeText: {
    color: THEME.orange,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  copyBtn: {
    minWidth: 91,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  copyBtnDisabled: {
    backgroundColor: THEME.muted,
  },
  copyText: {
    color: THEME.white,
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
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  retryText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
