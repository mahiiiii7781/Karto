import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");

const COLORS = {
  bg: "#070A08",
  card: "#101713",
  cardDark: "#0B120E",
  yellow: "#FACC15",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
};

export default function RoleSelectionScreen({ navigation }: any) {
  const openPanel = (routeName: string) => {
    navigation.replace(routeName);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.bg} barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.brand}>Karto</Text>
        <Text style={styles.title}>Admin Control Hub</Text>
        <Text style={styles.subtitle}>
          Choose which panel you want to open
        </Text>
      </View>

      <PanelCard
        icon="person-outline"
        title="User App"
        subtitle="Open customer shopping experience"
        onPress={() => openPanel("UserApp")}
      />

      <PanelCard
        icon="storefront-outline"
        title="Vendor App"
        subtitle="Manage stores, menu and orders"
        onPress={() => openPanel("VendorApp")}
      />

      <PanelCard
        icon="bicycle-outline"
        title="Rider App"
        subtitle="Manage deliveries and earnings"
        onPress={() => openPanel("RiderApp")}
      />

      <PanelCard
        icon="shield-checkmark-outline"
        title="Admin Panel"
        subtitle="Create vendors, riders and manage roles"
        onPress={() => openPanel("AdminPanel")}
        admin
      />
    </View>
  );
}

function PanelCard({ icon, title, subtitle, onPress, admin }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, admin && styles.adminCard]}
      onPress={onPress}
    >
      <View style={styles.iconWrapper}>
        <Icon name={icon} size={32} color={COLORS.green} />
      </View>

      <View style={styles.textWrapper}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>

      <Icon name="chevron-forward" size={22} color={COLORS.yellow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    width: width - 40,
    marginBottom: 24,
  },
  brand: {
    color: COLORS.yellow,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    width: width - 40,
    padding: 18,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 5,
  },
  adminCard: {
    backgroundColor: COLORS.cardDark,
    borderColor: COLORS.green,
  },
  iconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#07100B",
    borderWidth: 1,
    borderColor: "#173923",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textWrapper: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  cardSub: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});