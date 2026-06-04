import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  orange: "#FB923C",
  blue: "#38BDF8",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

const SUPPORT_EMAIL = "mradulm148@gmail.com";
const SUPPORT_PHONE = "8418069880";

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
    visibilityTime: 1900,
  });
};

export default function HelpSupportScreen() {
  const navigation = useNavigation<any>();

  const openLink = async (url: string, errorText: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        showToast("error", "Unable to open", errorText);
        return;
      }

      await Linking.openURL(url);
    } catch {
      showToast("error", "Unable to open", errorText);
    }
  };

  const callSupport = () => {
    openLink(`tel:${SUPPORT_PHONE}`, "Dialer is not available on this device.");
  };

  const mailSupport = () => {
    const subject = encodeURIComponent("Karto Support Request");
    const body = encodeURIComponent(
      "Hi Karto Support,\n\nI need help with:\n\nOrder ID:\nIssue:\n\nThanks."
    );

    openLink(
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`,
      "Mail app is not available on this device."
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>Fast help for orders, payment and delivery</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />

          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Icon name="headset" size={38} color={THEME.black} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTag}>KARTO SUPPORT</Text>
              <Text style={styles.heroTitle}>We’re here to help</Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            Get support for order status, delivery delay, refund, payment issue,
            account help or address changes.
          </Text>
        </View>

        <View style={styles.contactGrid}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={callSupport}
            activeOpacity={0.88}
          >
            <View style={[styles.contactIcon, { backgroundColor: THEME.green }]}>
              <Icon name="call-outline" size={25} color={THEME.black} />
            </View>

            <Text style={styles.contactTitle}>Call Support</Text>
            <Text style={styles.contactValue}>+91 {SUPPORT_PHONE}</Text>
            <Text style={styles.contactSub}>Urgent order help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={mailSupport}
            activeOpacity={0.88}
          >
            <View style={[styles.contactIcon, { backgroundColor: THEME.yellow }]}>
              <Icon name="mail-outline" size={25} color={THEME.black} />
            </View>

            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactValue} numberOfLines={1}>
              {SUPPORT_EMAIL}
            </Text>
            <Text style={styles.contactSub}>Detailed issue report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>How we can help</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Support</Text>
            </View>
          </View>

          <SupportRow
            icon="receipt-outline"
            color={THEME.green}
            title="Order Support"
            text="Order status, cancellation, restaurant confirmation, delivery delay or wrong item."
          />

          <SupportRow
            icon="card-outline"
            color={THEME.blue}
            title="Payment Help"
            text="Online payment, failed transaction, refund, wallet credit or bill mismatch."
          />

          <SupportRow
            icon="location-outline"
            color={THEME.yellow}
            title="Delivery Address"
            text="Wrong location, address update, landmark issue or rider unable to find you."
          />

          <SupportRow
            icon="person-outline"
            color={THEME.orange}
            title="Account Support"
            text="Login, profile, phone number, saved address or account related help."
          />
        </View>

        <View style={styles.quickTipsCard}>
          <Text style={styles.sectionTitle}>Before contacting</Text>

          <View style={styles.tipRow}>
            <Icon name="checkmark-circle-outline" size={18} color={THEME.green} />
            <Text style={styles.tipText}>Keep your order ID ready.</Text>
          </View>

          <View style={styles.tipRow}>
            <Icon name="checkmark-circle-outline" size={18} color={THEME.green} />
            <Text style={styles.tipText}>For payment issues, mention payment method.</Text>
          </View>

          <View style={styles.tipRow}>
            <Icon name="checkmark-circle-outline" size={18} color={THEME.green} />
            <Text style={styles.tipText}>For delivery help, share your landmark clearly.</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Icon name="shield-checkmark-outline" size={24} color={THEME.yellow} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>Karto Promise</Text>
            <Text style={styles.noteText}>
              We are building Karto for fast, reliable and trusted local delivery.
              Your feedback helps us improve every day.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SupportRow = ({ icon, title, text, color }: any) => (
  <View style={styles.supportRow}>
    <View style={[styles.rowIcon, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Icon name={icon} size={21} color={color} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  headerText: {
    flex: 1,
  },
  title: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    right: -46,
    top: -46,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "rgba(250,204,21,0.18)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },
  heroText: {
    color: THEME.muted,
    marginTop: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  contactGrid: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  contactIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
  },
  contactValue: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
    textAlign: "center",
    maxWidth: "100%",
  },
  contactSub: {
    color: THEME.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
    fontWeight: "700",
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  livePill: {
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  liveText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },
  supportRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  rowText: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
    fontWeight: "700",
  },
  quickTipsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 8,
  },
  tipText: {
    flex: 1,
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  noteCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#252109",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "#57470A",
    flexDirection: "row",
    gap: 12,
  },
  noteIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
  },
  noteTitle: {
    color: THEME.yellow,
    fontSize: 16,
    fontWeight: "900",
  },
  noteText: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 19,
    fontWeight: "700",
  },
});
