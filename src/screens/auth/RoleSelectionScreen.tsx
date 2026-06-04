import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");

const COLORS = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  cardDark: "#0B120E",
  yellow: "#FACC15",
  green: "#22C55E",
  blue: "#38BDF8",
  orange: "#FB923C",
  purple: "#A78BFA",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
};

const PANELS = [
  {
    icon: "person-outline",
    title: "User App",
    subtitle: "Open customer shopping experience",
    routeName: "UserApp",
    color: COLORS.green,
  },
  {
    icon: "storefront-outline",
    title: "Vendor App",
    subtitle: "Manage stores, menu and orders",
    routeName: "VendorApp",
    color: COLORS.yellow,
  },
  {
    icon: "bicycle-outline",
    title: "Rider App",
    subtitle: "Manage deliveries and earnings",
    routeName: "RiderApp",
    color: COLORS.blue,
  },
  {
    icon: "shield-checkmark-outline",
    title: "Admin Panel",
    subtitle: "Create vendors, riders and manage roles",
    routeName: "AdminPanel",
    color: COLORS.purple,
    admin: true,
  },
];

export default function RoleSelectionScreen({ navigation }: any) {
  const openPanel = (routeName: string) => {
    navigation.replace(routeName);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.bg} barStyle="light-content" />

      <View style={styles.greenGlow} />
      <View style={styles.yellowGlow} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Icon name="bag-handle" size={22} color={COLORS.black} />
          </View>

          <View>
            <Text style={styles.brand}>Karto</Text>
            <Text style={styles.brandSub}>Admin access mode</Text>
          </View>
        </View>

        <Text style={styles.title}>Control Hub</Text>
        <Text style={styles.subtitle}>
          Choose a panel to inspect customer, vendor, rider or admin workflows.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTag}>ADMIN ONLY</Text>
          <Text style={styles.heroTitle}>Role based navigation</Text>
          <Text style={styles.heroText}>
            Admin can jump across panels. Vendors, riders and customers should open
            their own apps directly after login.
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="grid-outline" size={32} color={COLORS.black} />
        </View>
      </View>

      <View style={styles.panelList}>
        {PANELS.map(panel => (
          <PanelCard
            key={panel.routeName}
            icon={panel.icon}
            title={panel.title}
            subtitle={panel.subtitle}
            color={panel.color}
            admin={panel.admin}
            onPress={() => openPanel(panel.routeName)}
          />
        ))}
      </View>

      <View style={styles.footerNote}>
        <Icon name="information-circle-outline" size={18} color={COLORS.yellow} />
        <Text style={styles.footerText}>
          Keep this screen hidden for non-admin roles.
        </Text>
      </View>
    </View>
  );
}

function PanelCard({ icon, title, subtitle, onPress, admin, color }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.card, admin && styles.adminCard]}
      onPress={onPress}
    >
      <View style={[styles.iconWrapper, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
        <Icon name={icon} size={29} color={color} />
      </View>

      <View style={styles.textWrapper}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>

          {admin && (
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>Admin</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>

      <View style={[styles.arrowBox, { backgroundColor: color }]}>
        <Icon name="chevron-forward" size={20} color={COLORS.black} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 40,
    paddingBottom: 24,
  },
  greenGlow: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  yellowGlow: {
    position: "absolute",
    bottom: -110,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(250,204,21,0.10)",
  },
  header: {
    width: "100%",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 18,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  brandSub: {
    color: COLORS.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroTag: {
    color: COLORS.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
  },
  heroText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "700",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  panelList: {
    gap: 13,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 22,
    width: width - 40,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminCard: {
    backgroundColor: COLORS.cardDark,
    borderColor: "#3A2F0A",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  textWrapper: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  adminPill: {
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  adminPillText: {
    color: COLORS.yellow,
    fontSize: 9,
    fontWeight: "900",
  },
  cardSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
    fontWeight: "700",
  },
  arrowBox: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  footerNote: {
    marginTop: "auto",
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
