import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
};

export default function VendorPlaceholderScreen({ route, navigation }: any) {
  const title = route?.params?.title || "Coming Soon";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Icon name="construct-outline" size={42} color={THEME.bg} />
        </View>

        <Text style={styles.kicker}>Karto Vendor</Text>
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.text}>
          This module is planned for vendor growth: inventory, offers, reviews,
          GST invoices, delivery settings, support desk and premium reports.
        </Text>

        <View style={styles.featureBox}>
          <Feature icon="cube-outline" text="Inventory Control" />
          <Feature icon="pricetag-outline" text="Offers & Coupons" />
          <Feature icon="star-outline" text="Reviews" />
          <Feature icon="document-text-outline" text="GST Reports" />
        </View>

        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={18} color={THEME.bg} />
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Feature({ icon, text }: any) {
  return (
    <View style={styles.feature}>
      <Icon name={icon} size={17} color={THEME.green} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
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
  featureText: {
    color: THEME.text,
    fontWeight: "800",
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