import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

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

const SUPPORT_EMAIL = "mradulm148@gmail.com";
const SUPPORT_PHONE = "8418069880";

export default function HelpSupportScreen() {
  const navigation = useNavigation<any>();

  const callSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert("Error", "Unable to open dialer.");
    });
  };

  const mailSupport = () => {
    const subject = encodeURIComponent("Karto Support Request");
    const body = encodeURIComponent(
      "Hi Karto Support,\n\nI need help with:\n\nOrder ID:\nIssue:\n\nThanks."
    );

    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert("Error", "Unable to open mail app.");
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.green} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>We are here to help you quickly</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="headset-outline" size={36} color={THEME.green} />
          </View>

          <Text style={styles.heroTitle}>Need help with Karto?</Text>
          <Text style={styles.heroText}>
            Whether it is an order issue, payment concern, delivery delay, or account help,
            our team will support you with a quick and friendly response.
          </Text>
        </View>

        <View style={styles.contactGrid}>
          <TouchableOpacity style={styles.contactCard} onPress={callSupport}>
            <View style={styles.contactIcon}>
              <Icon name="call-outline" size={26} color={THEME.black} />
            </View>
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text style={styles.contactValue}>+91 {SUPPORT_PHONE}</Text>
            <Text style={styles.contactSub}>Best for urgent help</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={mailSupport}>
            <View style={styles.contactIcon}>
              <Icon name="mail-outline" size={26} color={THEME.black} />
            </View>
            <Text style={styles.contactTitle}>Email Us</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.contactSub}>Best for detailed issues</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>How we can help</Text>

          <SupportRow
            icon="receipt-outline"
            title="Order Support"
            text="Facing an issue with your order status, cancellation, delivery, or restaurant confirmation?"
          />

          <SupportRow
            icon="card-outline"
            title="Payment Help"
            text="Need help with online payment, refund, wallet credit, or failed transaction?"
          />

          <SupportRow
            icon="location-outline"
            title="Delivery Address"
            text="Changed location, wrong address, or rider unable to find your place? Contact us."
          />

          <SupportRow
            icon="person-outline"
            title="Account Support"
            text="Need help with login, profile, phone number, or saved address? We will guide you."
          />
        </View>

        <View style={styles.noteCard}>
          <Icon name="shield-checkmark-outline" size={24} color={THEME.green} />
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

const SupportRow = ({ icon, title, text }: any) => (
  <View style={styles.supportRow}>
    <View style={styles.rowIcon}>
      <Icon name={icon} size={21} color={THEME.green} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
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

  heroCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },

  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
  },

  heroText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
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
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },

  contactIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },

  contactTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },

  contactValue: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
    textAlign: "center",
  },

  contactSub: {
    color: THEME.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
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

  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
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
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
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
  },

  noteCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#07150D",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "#173923",
    flexDirection: "row",
    gap: 12,
  },

  noteTitle: {
    color: THEME.green,
    fontSize: 16,
    fontWeight: "900",
  },

  noteText: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 19,
  },
});