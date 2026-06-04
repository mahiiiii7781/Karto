import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

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

type VendorPlaceholderRouteParams = {
  title?: string;
  subtitle?: string;
  module?:
    | "inventory"
    | "offers"
    | "reviews"
    | "reports"
    | "support"
    | "settings"
    | "default";
};

type VendorPlaceholderScreenProps = {
  route?: {
    params?: VendorPlaceholderRouteParams;
  };
  navigation?: any;
};

type FeatureItem = {
  icon: string;
  text: string;
};

const MODULE_CONFIG: Record<
  NonNullable<VendorPlaceholderRouteParams["module"]>,
  {
    icon: string;
    title: string;
    subtitle: string;
    features: FeatureItem[];
  }
> = {
  inventory: {
    icon: "cube-outline",
    title: "Inventory Control",
    subtitle:
      "Track stock, low inventory alerts and item-level availability from one place.",
    features: [
      { icon: "layers-outline", text: "Live stock tracking" },
      { icon: "alert-circle-outline", text: "Low stock alerts" },
      { icon: "sync-outline", text: "Auto menu availability" },
      { icon: "analytics-outline", text: "Inventory reports" },
    ],
  },
  offers: {
    icon: "pricetag-outline",
    title: "Offers & Coupons",
    subtitle:
      "Create smart discounts, combos and campaign offers for your customers.",
    features: [
      { icon: "flash-outline", text: "Instant offer campaigns" },
      { icon: "gift-outline", text: "Coupon codes" },
      { icon: "restaurant-outline", text: "Combo deals" },
      { icon: "calendar-outline", text: "Scheduled promotions" },
    ],
  },
  reviews: {
    icon: "star-outline",
    title: "Reviews",
    subtitle:
      "Monitor customer feedback, ratings and item-level review quality.",
    features: [
      { icon: "star-half-outline", text: "Rating insights" },
      { icon: "chatbubble-outline", text: "Customer feedback" },
      { icon: "trending-up-outline", text: "Quality trends" },
      { icon: "shield-checkmark-outline", text: "Review moderation" },
    ],
  },
  reports: {
    icon: "document-text-outline",
    title: "Reports",
    subtitle:
      "Download GST, payout, sales and performance reports for your store.",
    features: [
      { icon: "receipt-outline", text: "GST invoices" },
      { icon: "wallet-outline", text: "Payout reports" },
      { icon: "bar-chart-outline", text: "Sales summary" },
      { icon: "download-outline", text: "Export-ready data" },
    ],
  },
  support: {
    icon: "headset-outline",
    title: "Support Desk",
    subtitle:
      "Handle order issues, vendor tickets and customer support requests faster.",
    features: [
      { icon: "help-circle-outline", text: "Issue tickets" },
      { icon: "chatbubbles-outline", text: "Support conversations" },
      { icon: "time-outline", text: "Priority handling" },
      { icon: "checkmark-done-outline", text: "Resolution tracking" },
    ],
  },
  settings: {
    icon: "settings-outline",
    title: "Delivery Settings",
    subtitle:
      "Control delivery radius, service timing, packaging rules and store policies.",
    features: [
      { icon: "location-outline", text: "Delivery radius" },
      { icon: "timer-outline", text: "Store timings" },
      { icon: "bag-handle-outline", text: "Packaging rules" },
      { icon: "business-outline", text: "Store policies" },
    ],
  },
  default: {
    icon: "construct-outline",
    title: "Coming Soon",
    subtitle:
      "This module is planned for vendor growth and will be connected with backend APIs later.",
    features: [
      { icon: "cube-outline", text: "Inventory Control" },
      { icon: "pricetag-outline", text: "Offers & Coupons" },
      { icon: "star-outline", text: "Reviews" },
      { icon: "document-text-outline", text: "GST Reports" },
    ],
  },
};

export default function VendorPlaceholderScreen({
  route,
  navigation,
}: VendorPlaceholderScreenProps) {
  const params = route?.params || {};
  const moduleKey = params.module || "default";

  const config = useMemo(() => {
    const baseConfig = MODULE_CONFIG[moduleKey] || MODULE_CONFIG.default;

    return {
      ...baseConfig,
      title: params.title?.trim() || baseConfig.title,
      subtitle: params.subtitle?.trim() || baseConfig.subtitle,
    };
  }, [moduleKey, params.title, params.subtitle]);

  const canGoBack = Boolean(navigation?.canGoBack?.());

  const handlePrimaryAction = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    navigation?.navigate?.("VendorDashboard");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Icon name={config.icon} size={42} color={THEME.bg} />
          </View>

          <Text style={styles.kicker}>Karto Vendor</Text>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.text}>{config.subtitle}</Text>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Planned Module</Text>
          </View>

          <View style={styles.featureBox}>
            {config.features.map((feature) => (
              <Feature
                key={`${feature.icon}-${feature.text}`}
                icon={feature.icon}
                text={feature.text}
              />
            ))}
          </View>

          <View style={styles.noteBox}>
            <Icon name="information-circle-outline" size={20} color={THEME.yellow} />
            <Text style={styles.noteText}>
              This screen is safe for production navigation. Backend integration can
              be plugged in without affecting existing vendor workflow.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btn}
            activeOpacity={0.85}
            onPress={handlePrimaryAction}
          >
            <Icon
              name={canGoBack ? "arrow-back" : "grid-outline"}
              size={18}
              color={THEME.bg}
            />
            <Text style={styles.btnText}>
              {canGoBack ? "Go Back" : "Go Dashboard"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, text }: FeatureItem) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={17} color={THEME.green} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  iconBox: {
    width: 86,
    height: 86,
    borderRadius: 32,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  text: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 10,
  },
  statusPill: {
    marginTop: 16,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: THEME.green,
  },
  statusText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
  },
  featureBox: {
    width: "100%",
    backgroundColor: THEME.card2,
    borderRadius: 22,
    padding: 14,
    marginTop: 18,
    gap: 10,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: THEME.text,
    fontWeight: "800",
    flex: 1,
  },
  noteBox: {
    width: "100%",
    backgroundColor: "rgba(246,195,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.28)",
    borderRadius: 18,
    padding: 13,
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noteText: {
    color: THEME.text,
    flex: 1,
    fontWeight: "700",
    lineHeight: 19,
  },
  btn: {
    marginTop: 20,
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
});
