import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { requireLogin } from "@/utils/authGuard";
const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  greenDark: "#12351F",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

const MenuRow = ({ icon, title, subtitle, danger, badge, onPress }: any) => (
  <TouchableOpacity style={styles.menuRow} activeOpacity={0.85} onPress={onPress}>
    <View style={[styles.menuIconBox, danger && styles.dangerIconBox]}>
      <Icon name={icon} size={21} color={danger ? THEME.danger : THEME.green} />
    </View>

    <View style={{ flex: 1 }}>
      <View style={styles.menuTitleRow}>
        <Text style={[styles.menuTitle, danger && { color: THEME.danger }]}>
          {title}
        </Text>

        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>

    <Icon name="chevron-forward" size={20} color={THEME.muted} />
  </TouchableOpacity>
);

const StatCard = ({ icon, value, label }: any) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={21} color={THEME.green} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function ProfileScreen() {
  
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
useFocusEffect(
    React.useCallback(() => {
      if (
        !requireLogin(
          user,
          navigation,
          "Please login to access your profile."
        )
      ) {
        navigation.goBack();
        return;
      }
    }, [user])
  );
  const profile = useMemo(() => {
    const fullName = user?.fullName || user?.email?.split("@")?.[0] || "Karto User";

    return {
      fullName,
      email: user?.email || "Not available",
      phone: user?.phone || "Add phone number",
      avatarUrl: user?.avatarUrl,
      role: user?.role || "CUSTOMER",
      isActive: user?.isActive ?? true,
    };
  }, [user]);

  const resetToAuth = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    );
  };

  const doLogout = async () => {
    try {
      setLoggingOut(true);

      try {
        await signOut?.();
      } catch (e) {
        console.log("SIGNOUT ERROR:", e);
      }

      await AsyncStorage.multiRemove([
        "accessToken",
        "refreshToken",
        "user",
        "hasLaunched",
      ]);

      resetToAuth();
    } catch {
      Alert.alert("Logout Failed", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: doLogout },
    ]);
  };

  const openComingSoon = (title: string) => {
    Alert.alert("Coming Soon", `${title} will be available soon.`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
        <View style={styles.hero}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSub}>Manage your Karto account</Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate("EditProfile")}
              activeOpacity={0.85}
            >
              <Icon name="create-outline" size={22} color={THEME.black} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarText}>
                  {profile.fullName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.fullName}
              </Text>

              <Text style={styles.email} numberOfLines={1}>
                {profile.email}
              </Text>

              <Text style={styles.phone} numberOfLines={1}>
                {profile.phone}
              </Text>

              <View style={styles.roleRow}>
                <View style={styles.rolePill}>
                  <Icon name="shield-checkmark-outline" size={14} color={THEME.green} />
                  <Text style={styles.roleText}>{profile.role}</Text>
                </View>

                <View style={[styles.statusPill, !profile.isActive && styles.inactivePill]}>
                  <Text style={[styles.statusText, !profile.isActive && { color: THEME.danger }]}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="bag-check-outline" value="0" label="Orders" />
          <StatCard icon="wallet-outline" value="₹0" label="Wallet" />
          <StatCard icon="gift-outline" value="0" label="Rewards" />
        </View>

        <View style={styles.quickCard}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate("Orders")}
          >
            <Icon name="receipt-outline" size={23} color={THEME.green} />
            <Text style={styles.quickText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate("Address")}
          >
            <Icon name="location-outline" size={23} color={THEME.green} />
            <Text style={styles.quickText}>Address</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => openComingSoon("Coupons")}
          >
            <Icon name="pricetag-outline" size={23} color={THEME.green} />
            <Text style={styles.quickText}>Coupons</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => openComingSoon("Support")}
          >
            <Icon name="headset-outline" size={23} color={THEME.green} />
            <Text style={styles.quickText}>Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <MenuRow
            icon="person-outline"
            title="Personal Information"
            subtitle={`${profile.phone} • Manage name, phone and avatar`}
            onPress={() => navigation.navigate("EditProfile")}
          />

          <MenuRow
            icon="location-outline"
            title="Saved Addresses"
            subtitle="Home, work and delivery locations"
            onPress={() => navigation.navigate("Address")}
          />

          <MenuRow
            icon="receipt-outline"
            title="My Orders"
            subtitle="Track current and past orders"
            onPress={() => navigation.navigate("Orders")}
          />

          <MenuRow
            icon="heart-outline"
            title="Favorites"
            subtitle="Your saved stores and restaurants"
            badge="Soon"
            onPress={() => openComingSoon("Favorites")}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Payments & Benefits</Text>

          <MenuRow
            icon="wallet-outline"
            title="Wallet"
            subtitle="Balance, refunds and credits"
            badge="Soon"
            onPress={() => openComingSoon("Wallet")}
          />

          <MenuRow
            icon="card-outline"
            title="Payment Methods"
            subtitle="UPI, cards and cash on delivery"
            badge="Soon"
            onPress={() => openComingSoon("Payment Methods")}
          />

          <MenuRow
            icon="gift-outline"
            title="Rewards & Coupons"
            subtitle="Offers, referral rewards and discounts"
            badge="Soon"
            onPress={() => openComingSoon("Rewards & Coupons")}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Support</Text>

          <MenuRow
            icon="chatbubble-ellipses-outline"
            title="Help & Support"
            subtitle="Get help with orders and payments"
            onPress={() => navigation.navigate("HelpSupport")}
          />

          <MenuRow
            icon="document-text-outline"
            title="Terms & Policies"
            subtitle="Privacy policy, refund policy and terms"
            onPress={() => openComingSoon("Terms & Policies")}
          />

          <MenuRow
            icon="information-circle-outline"
            title="About Karto"
            subtitle="Fast local delivery for your city"
            onPress={() => openComingSoon("About Karto")}
          />
        </View>

        <View style={styles.infoCard}>
          <MenuRow
            icon="log-out-outline"
            title={loggingOut ? "Logging out..." : "Logout"}
            subtitle="Sign out from this device"
            danger
            onPress={loggingOut ? undefined : handleLogout}
          />

          {loggingOut && <ActivityIndicator color={THEME.green} style={{ marginTop: 12 }} />}
        </View>

        <Text style={styles.footerText}>Karto • Fast local delivery experience</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  hero: {
    paddingBottom: 22,
    backgroundColor: THEME.bg,
  },

  header: {
    paddingTop: 34,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    color: THEME.text,
    fontSize: 32,
    fontWeight: "900",
  },

  headerSub: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 13,
  },

  editBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  avatarWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: THEME.card2,
    borderWidth: 2,
    borderColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    overflow: "hidden",
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 41,
  },

  avatarText: {
    color: THEME.green,
    fontSize: 34,
    fontWeight: "900",
  },

  name: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
  },

  email: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 13,
  },

  phone: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 13,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#102417",
    borderWidth: 1,
    borderColor: "#173923",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  roleText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
  },

  statusPill: {
    backgroundColor: "#102417",
    borderWidth: 1,
    borderColor: "#173923",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  inactivePill: {
    backgroundColor: "#1B0E0E",
    borderColor: "#3F1717",
  },

  statusText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  statValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },

  statLabel: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
  },

  quickCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },

  quickText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "800",
  },

  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
    marginLeft: 4,
  },

  menuRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  dangerIconBox: {
    backgroundColor: "#2A0D0D",
    borderColor: "#3F1717",
  },

  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  menuTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
  },

  menuSubtitle: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  badge: {
    backgroundColor: THEME.green,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },

  badgeText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },

  footerText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 4,
    fontSize: 12,
  },
});