import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Karto</Text>
      <Text style={styles.subtitle}>Admin access panel</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.replace("UserApp")}
      >
        <View style={styles.iconWrapper}>
          <Icon name="person-outline" size={36} color="#22C55E" />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.cardTitle}>User App</Text>
          <Text style={styles.cardSub}>Open customer shopping experience</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.replace("VendorApp")}
      >
        <View style={styles.iconWrapper}>
          <Icon name="storefront-outline" size={36} color="#22C55E" />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.cardTitle}>Vendor App</Text>
          <Text style={styles.cardSub}>Manage stores, menu and orders</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.replace("RiderApp")}
      >
        <View style={styles.iconWrapper}>
          <Icon name="bicycle-outline" size={36} color="#22C55E" />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.cardTitle}>Rider App</Text>
          <Text style={styles.cardSub}>Manage deliveries and earnings</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.adminCard]}
        onPress={() => navigation.replace("AdminPanel")}
      >
        <View style={styles.iconWrapper}>
          <Icon name="shield-checkmark-outline" size={36} color="#22C55E" />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.cardTitle}>Admin Panel</Text>
          <Text style={styles.cardSub}>Create vendors, riders and manage roles</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#22C55E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    marginBottom: 24,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 18,
    width: width - 40,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
    elevation: 4,
  },
  adminCard: {
    borderColor: "#173923",
    backgroundColor: "#0A120E",
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#0A120E",
    borderWidth: 1,
    borderColor: "#173923",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textWrapper: {
    flex: 1,
  },
  cardTitle: {
    color: "#22C55E",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSub: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});