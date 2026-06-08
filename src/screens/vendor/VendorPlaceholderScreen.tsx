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
  orange: "#FB923C",
};

type ModuleKey =
  | "inventory"
  | "offers"
  | "reviews"
  | "reports"
  | "support"
  | "settings"
  | "default";

type VendorPlaceholderRouteParams = {
  title?: string;
  subtitle?: string;
  module?: ModuleKey;
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
  sub?: string;
};

type ModuleConfig = {
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  progress: number;
  eta: string;
  features: FeatureItem[];
  nextSteps: string[];
};

const MODULE_CONFIG: Record<ModuleKey, ModuleConfig> = {
  inventory: {
    icon: "cube-outline",
    title: "Inventory Control",
    subtitle:
      "Track stock, low inventory alerts and item-level availability from one place.",
    badge: "Stock Module",
    progress: 68,
    eta: "Phase 2",
    features: [
      { icon: "layers-outline", text: "Live stock tracking", sub: "Item-wise inventory" },
      { icon: "alert-circle-outline", text: "Low stock alerts", sub: "Auto warning badges" },
      { icon: "sync-outline", text: "Auto menu availability", sub: "Out of stock sync" },
      { icon: "analytics-outline", text: "Inventory reports", sub: "Daily stock movement" },
    ],
    nextSteps: ["Create inventory model", "Add stock update API", "Connect menu availability"],
  },
  offers: {
    icon: "pricetag-outline",
    title: "Offers & Coupons",
    subtitle:
      "Create smart discounts, combos and campaign offers for your customers.",
    badge: "Growth Module",
    progress: 55,
    eta: "Phase 2",
    features: [
      { icon: "flash-outline", text: "Instant campaigns", sub: "Quick discount launch" },
      { icon: "gift-outline", text: "Coupon codes", sub: "Vendor-level coupons" },
      { icon: "restaurant-outline", text: "Combo deals", sub: "Meal combo builder" },
      { icon: "calendar-outline", text: "Scheduled offers", sub: "Start and end dates" },
    ],
    nextSteps: ["Add coupon rules", "Connect cart discount", "Add campaign analytics"],
  },
  reviews: {
    icon: "star-outline",
    title: "Reviews",
    subtitle:
      "Monitor customer feedback, ratings and item-level review quality.",
    badge: "Trust Module",
    progress: 60,
    eta: "Phase 2",
    features: [
      { icon: "star-half-outline", text: "Rating insights", sub: "Store and item ratings" },
      { icon: "chatbubble-outline", text: "Customer feedback", sub: "Review messages" },
      { icon: "trending-up-outline", text: "Quality trends", sub: "Rating movement" },
      { icon: "shield-checkmark-outline", text: "Review moderation", sub: "Safe review control" },
    ],
    nextSteps: ["Add review reply API", "Add rating filters", "Show item-level insights"],
  },
  reports: {
    icon: "document-text-outline",
    title: "Reports",
    subtitle:
      "Download GST, payout, sales and performance reports for your store.",
    badge: "Reports Module",
    progress: 50,
    eta: "Phase 2",
    features: [
      { icon: "receipt-outline", text: "GST invoices", sub: "Order-wise invoices" },
      { icon: "wallet-outline", text: "Payout reports", sub: "Settlement export" },
      { icon: "bar-chart-outline", text: "Sales summary", sub: "Daily and monthly" },
      { icon: "download-outline", text: "Export-ready data", sub: "PDF and Excel later" },
    ],
    nextSteps: ["Create report endpoint", "Add export flow", "Connect payments data"],
  },
  support: {
    icon: "headset-outline",
    title: "Support Desk",
    subtitle:
      "Handle order issues, vendor tickets and customer support requests faster.",
    badge: "Support Module",
    progress: 45,
    eta: "Phase 2",
    features: [
      { icon: "help-circle-outline", text: "Issue tickets", sub: "Order complaints" },
      { icon: "chatbubbles-outline", text: "Support chat", sub: "Vendor-admin messages" },
      { icon: "time-outline", text: "Priority handling", sub: "Urgent issues first" },
      { icon: "checkmark-done-outline", text: "Resolution tracking", sub: "Ticket lifecycle" },
    ],
    nextSteps: ["Add ticket model", "Create support APIs", "Add admin support dashboard"],
  },
  settings: {
    icon: "settings-outline",
    title: "Delivery Settings",
    subtitle:
      "Control delivery radius, service timing, packaging rules and store policies.",
    badge: "Config Module",
    progress: 62,
    eta: "Phase 2",
    features: [
      { icon: "location-outline", text: "Delivery radius", sub: "Area-wise delivery" },
      { icon: "timer-outline", text: "Store timings", sub: "Advanced schedules" },
      { icon: "bag-handle-outline", text: "Packaging rules", sub: "Charges and rules" },
      { icon: "business-outline", text: "Store policies", sub: "Custom vendor policies" },
    ],
    nextSteps: ["Add delivery config model", "Connect settings API", "Add radius validation"],
  },
  default: {
    icon: "construct-outline",
    title: "Coming Soon",
    subtitle:
      "This module is planned for vendor growth and will be connected with backend APIs later.",
    badge: "Planned",
    progress: 40,
    eta: "Upcoming",
    features: [
      { icon: "cube-outline", text: "Inventory Control", sub: "Stock management" },
      { icon: "pricetag-outline", text: "Offers & Coupons", sub: "Promotions" },
      { icon: "star-outline", text: "Reviews", sub: "Customer trust" },
      { icon: "document-text-outline", text: "GST Reports", sub: "Business reports" },
    ],
    nextSteps: ["Finalize backend APIs", "Connect screen UI", "Test vendor workflow"],
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
    if (canGoBack) navigation.goBack();
    else navigation?.navigate?.("VendorDashboard");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={handlePrimaryAction}
          >
            <Icon
              name={canGoBack ? "arrow-back" : "grid-outline"}
              size={21}
              color={THEME.text}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Karto Vendor</Text>
            <Text style={styles.headerTitle}>Module Preview</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.iconBox}>
            <Icon name={config.icon} size={42} color={THEME.bg} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>{config.badge}</Text>
            </View>

            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.text}>{config.subtitle}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.sectionTitle}>Build Progress</Text>
              <Text style={styles.sectionSub}>Backend integration planned safely.</Text>
            </View>

            <View style={styles.percentCircle}>
              <Text style={styles.percentText}>{config.progress}%</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${config.progress}%` }]} />
          </View>

          <View style={styles.metaRow}>
            <MetaPill icon="rocket-outline" text={config.eta} />
            <MetaPill icon="shield-checkmark-outline" text="Safe Navigation" />
          </View>
        </View>

        <View style={styles.featureBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What this module will do</Text>
            <Icon name="sparkles-outline" size={20} color={THEME.yellow} />
          </View>

          {config.features.map((feature) => (
            <Feature
              key={`${feature.icon}-${feature.text}`}
              icon={feature.icon}
              text={feature.text}
              sub={feature.sub}
            />
          ))}
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.sectionTitle}>Next Integration Steps</Text>

          {config.nextSteps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Icon name="information-circle-outline" size={21} color={THEME.yellow} />
          <Text style={styles.noteText}>
            This screen keeps vendor navigation production-safe. Real APIs can be
            plugged later without breaking dashboard, orders, menu, payments or analytics.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate?.("VendorDashboard")}
          >
            <Icon name="grid-outline" size={18} color={THEME.green} />
            <Text style={styles.secondaryBtnText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            activeOpacity={0.85}
            onPress={handlePrimaryAction}
          >
            <Icon
              name={canGoBack ? "arrow-back" : "checkmark-done-outline"}
              size={18}
              color={THEME.bg}
            />
            <Text style={styles.btnText}>
              {canGoBack ? "Go Back" : "Done"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, text, sub }: FeatureItem) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={18} color={THEME.green} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.featureText}>{text}</Text>
        {!!sub && <Text style={styles.featureSub}>{sub}</Text>}
      </View>

      <Icon name="chevron-forward" size={18} color={THEME.muted} />
    </View>
  );
}

function MetaPill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.metaPill}>
      <Icon name={icon} size={14} color={THEME.yellow} />
      <Text style={styles.metaPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 18, paddingBottom: 38 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  headerTitle: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  iconBox: {
    width: 86,
    height: 86,
    borderRadius: 32,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: THEME.green,
  },
  badgeText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: THEME.text,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10,
  },
  text: {
    color: THEME.muted,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 7,
  },
  progressCard: {
    marginTop: 14,
    backgroundColor: "#0B100B",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },
  percentCircle: {
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  percentText: {
    color: THEME.bg,
    fontSize: 18,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    borderRadius: 99,
    backgroundColor: THEME.card2,
    overflow: "hidden",
    marginTop: 15,
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.green,
    borderRadius: 99,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.card2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillText: {
    color: THEME.text,
    fontWeight: "800",
    fontSize: 12,
  },
  featureBox: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginTop: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
    marginBottom: 9,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: THEME.text,
    fontWeight: "900",
  },
  featureSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
    fontSize: 12,
  },
  nextCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 15,
    marginTop: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  stepText: {
    color: THEME.text,
    fontWeight: "800",
    flex: 1,
  },
  noteBox: {
    width: "100%",
    backgroundColor: "rgba(246,195,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.28)",
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: {
    color: THEME.green,
    fontWeight: "900",
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
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