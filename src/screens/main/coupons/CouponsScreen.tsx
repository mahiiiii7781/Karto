import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { couponService, Coupon } from "@/services/api/couponService";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

const DEMO_COUPONS: Coupon[] = [
  {
    id: "welcome50",
    code: "KARTO50",
    title: "Welcome Offer",
    description: "Get flat ₹50 off on your first order.",
    discountType: "FLAT",
    discountValue: 50,
    minOrderAmount: 199,
    maxDiscount: 50,
    isActive: true,
  },
  {
    id: "save10",
    code: "SAVE10",
    title: "Save More",
    description: "Get 10% off on food and daily essentials.",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderAmount: 299,
    maxDiscount: 80,
    isActive: true,
  },
];

export default function CouponsScreen() {
  const navigation = useNavigation<any>();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCoupons(false);
    }, [])
  );

  const loadCoupons = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    const { data } = await couponService.getCoupons();

    if (Array.isArray(data) && data.length > 0) {
      setCoupons(data);
    } else {
      setCoupons(DEMO_COUPONS);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const copyCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert("Copied", `${code} copied successfully.`);
  };

  const getDiscountText = (coupon: Coupon) => {
    const type = coupon.discountType || coupon.discount_type;
    const value = Number(coupon.discountValue ?? coupon.discount_value ?? 0);

    if (type === "PERCENTAGE") return `${value}% OFF`;
    return `₹${value} OFF`;
  };

  const getMinOrder = (coupon: Coupon) =>
    Number(coupon.minOrderAmount ?? coupon.min_order_amount ?? 0);

  const getMaxDiscount = (coupon: Coupon) =>
    Number(coupon.maxDiscount ?? coupon.max_discount ?? 0);

  const getExpiry = (coupon: Coupon) => {
    const date = coupon.expiresAt || coupon.expires_at;
    if (!date) return "Limited time";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderCoupon = ({ item }: { item: Coupon }) => {
    const active = Boolean(item.isActive ?? item.is_active ?? true);
    const minOrder = getMinOrder(item);
    const maxDiscount = getMaxDiscount(item);

    return (
      <View style={[styles.couponCard, !active && styles.disabledCard]}>
        <View style={styles.couponTop}>
          <View style={styles.discountBadge}>
            <Icon name="pricetag" size={18} color={THEME.black} />
            <Text style={styles.discountText}>{getDiscountText(item)}</Text>
          </View>

          <View style={[styles.statusPill, !active && styles.inactivePill]}>
            <Text style={[styles.statusText, !active && styles.inactiveText]}>
              {active ? "ACTIVE" : "EXPIRED"}
            </Text>
          </View>
        </View>

        <Text style={styles.couponTitle}>{item.title || "Karto Offer"}</Text>
        <Text style={styles.couponDesc}>
          {item.description || "Use this coupon to save more on your order."}
        </Text>

        <View style={styles.rulesBox}>
          <Rule icon="cart-outline" text={`Min order ₹${minOrder}`} />
          <Rule
            icon="cash-outline"
            text={maxDiscount > 0 ? `Max discount ₹${maxDiscount}` : "No max cap"}
          />
          <Rule icon="time-outline" text={`Valid till ${getExpiry(item)}`} />
        </View>

        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>

          <TouchableOpacity
            style={styles.copyBtn}
            disabled={!active}
            onPress={() => copyCode(item.code)}
          >
            <Text style={styles.copyText}>Copy</Text>
            <Icon name="copy-outline" size={16} color={THEME.black} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading coupons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={THEME.green} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rewards & Coupons</Text>
          <Text style={styles.subtitle}>Save more on every Karto order</Text>
        </View>
      </View>

      <View style={styles.referralCard}>
        <View style={styles.referralIcon}>
          <Icon name="gift-outline" size={28} color={THEME.green} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.referralTitle}>Referral rewards coming soon</Text>
          <Text style={styles.referralSub}>
            Invite friends and earn wallet credits.
          </Text>
        </View>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCoupons(true)}
            tintColor={THEME.green}
          />
        }
        contentContainerStyle={
          coupons.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="pricetag-outline" size={56} color={THEME.green} />
            <Text style={styles.emptyTitle}>No coupons available</Text>
            <Text style={styles.emptyText}>
              New offers and rewards will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const Rule = ({ icon, text }: any) => (
  <View style={styles.ruleRow}>
    <Icon name={icon} size={15} color={THEME.green} />
    <Text style={styles.ruleText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
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
  },

  referralCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  referralIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  referralTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },

  referralSub: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  emptyList: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
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
    opacity: 0.6,
  },

  couponTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    alignItems: "center",
  },

  codeText: {
    color: THEME.green,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  copyBtn: {
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  copyText: {
    color: THEME.black,
    fontWeight: "900",
  },

  emptyBox: {
    alignItems: "center",
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
  },

  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
  },
});