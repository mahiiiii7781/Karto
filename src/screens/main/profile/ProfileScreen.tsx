import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  greenDark: "#15803D",
  yellow: "#FACC15",
  orange: "#FB923C",
  blue: "#38BDF8",
  purple: "#A78BFA",
  pink: "#F472B6",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

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

const MenuRow = ({ icon, title, subtitle, danger, badge, color, onPress }: any) => (
  <TouchableOpacity style={styles.menuRow} activeOpacity={0.85} onPress={onPress}>
    <View
      style={[
        styles.menuIconBox,
        danger && styles.dangerIconBox,
        !!color && !danger && { borderColor: `${color}55`, backgroundColor: `${color}18` },
      ]}
    >
      <Icon name={icon} size={21} color={danger ? THEME.danger : color || THEME.green} />
    </View>

    <View style={styles.menuTextBox}>
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

const StatCard = ({ icon, value, label, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.quickIcon, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
      <Icon name={icon} size={23} color={color} />
    </View>
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const isLoggedIn = !!user?.id;

  const profile = useMemo(() => {
    const fullName =
      user?.fullName ||
      (user as any)?.name ||
      user?.email?.split("@")?.[0] ||
      "Guest User";

    return {
      fullName,
      email: user?.email || "Login to manage your account",
      phone: (user as any)?.phone || "Add phone number",
      avatarUrl: (user as any)?.avatarUrl || (user as any)?.avatar_url || "",
      role: user?.role || "GUEST",
      isActive: (user as any)?.isActive ?? (user as any)?.is_active ?? true,
    };
  }, [user]);

  const requireAuth = useCallback(
    (message = "Please sign in to continue.") => {
      if (isLoggedIn) return true;
      showToast("info", "Login required", message);
      navigation.navigate("Auth");
      return false;
    },
    [isLoggedIn, navigation]
  );

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
      } catch (error) {
        console.log("SIGNOUT ERROR:", error);
      }

      await AsyncStorage.multiRemove([
        "accessToken",
        "refreshToken",
        "user",
        "hasLaunched",
      ]);

      setLogoutModalVisible(false);
      showToast("success", "Logged out", "You have been signed out successfully.");
      resetToAuth();
    } catch {
      showToast("error", "Logout failed", "Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const safeNavigate = (screen: string, params?: any) => {
    if (!requireAuth()) return;
    navigation.navigate(screen, params);
  };

  const openCoupons = () => {
    navigation.navigate("Coupons");
  };

  const openAuth = () => navigation.navigate("Auth");

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSub}>
              {isLoggedIn ? "Manage your Karto account" : "Login for orders, coupons and rewards"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => safeNavigate("EditProfile")}
            activeOpacity={0.85}
          >
            <Icon name={isLoggedIn ? "create-outline" : "log-in-outline"} size={22} color={THEME.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroContent}>
            <Text style={styles.heroTag}>KARTO LOCAL PASS</Text>
            <Text style={styles.heroTitle}>Your city, delivered faster</Text>
            <Text style={styles.heroSub}>
              Orders, addresses, coupons and support in one clean place.
            </Text>

            {!isLoggedIn && (
              <TouchableOpacity style={styles.loginHeroBtn} onPress={openAuth} activeOpacity={0.9}>
                <Text style={styles.loginHeroText}>Login / Signup</Text>
                <Icon name="arrow-forward" size={16} color={THEME.black} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroIcon}>
            <Icon name="sparkles" size={34} color={THEME.black} />
          </View>
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

          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.fullName}
            </Text>

            <Text style={styles.email} numberOfLines={1}>
              {profile.email}
            </Text>

            {isLoggedIn && (
              <Text style={styles.phone} numberOfLines={1}>
                {profile.phone}
              </Text>
            )}

            <View style={styles.roleRow}>
              <View style={styles.rolePill}>
                <Icon name="shield-checkmark-outline" size={14} color={THEME.green} />
                <Text style={styles.roleText}>{profile.role}</Text>
              </View>

              {isLoggedIn && (
                <View style={[styles.statusPill, !profile.isActive && styles.inactivePill]}>
                  <Text style={[styles.statusText, !profile.isActive && { color: THEME.danger }]}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="bag-check-outline" value="0" label="Orders" color={THEME.green} />
          <StatCard icon="pricetag-outline" value="Live" label="Coupons" color={THEME.yellow} />
          <StatCard icon="sparkles-outline" value="New" label="Rewards" color={THEME.purple} />
        </View>

        <View style={styles.quickCard}>
          <QuickAction icon="receipt-outline" label="Orders" color={THEME.green} onPress={() => safeNavigate("Orders")} />
          <QuickAction icon="location-outline" label="Address" color={THEME.blue} onPress={() => safeNavigate("Address")} />
          <QuickAction icon="pricetag-outline" label="Coupons" color={THEME.yellow} onPress={openCoupons} />
          <QuickAction icon="headset-outline" label="Support" color={THEME.orange} onPress={() => safeNavigate("HelpSupport")} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <MenuRow
            icon="person-outline"
            title="Personal Information"
            subtitle="Manage name, phone and profile photo"
            color={THEME.green}
            onPress={() => safeNavigate("EditProfile")}
          />

          <MenuRow
            icon="location-outline"
            title="Saved Addresses"
            subtitle="Home, work and delivery locations"
            color={THEME.blue}
            onPress={() => safeNavigate("Address")}
          />

          <MenuRow
            icon="receipt-outline"
            title="My Orders"
            subtitle="Track current and past orders"
            color={THEME.yellow}
            onPress={() => safeNavigate("Orders")}
          />

          {/* Coming soon hidden for final UI */}
          {/*
          <MenuRow
            icon="heart-outline"
            title="Favorites"
            subtitle="Your saved stores and restaurants"
            badge="Soon"
            onPress={() => {}}
          />
          */}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Benefits</Text>

          <MenuRow
            icon="gift-outline"
            title="Rewards & Coupons"
            subtitle="Offers, referral rewards and discounts"
            color={THEME.yellow}
            onPress={openCoupons}
          />

          {/* Coming soon hidden for final UI */}
          {/*
          <MenuRow
            icon="wallet-outline"
            title="Wallet"
            subtitle="Balance, refunds and credits"
            badge="Soon"
            onPress={() => {}}
          />

          <MenuRow
            icon="card-outline"
            title="Payment Methods"
            subtitle="UPI, cards and cash on delivery"
            badge="Soon"
            onPress={() => {}}
          />
          */}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Support</Text>

          <MenuRow
            icon="chatbubble-ellipses-outline"
            title="Help & Support"
            subtitle="Get help with orders and payments"
            color={THEME.orange}
            onPress={() => safeNavigate("HelpSupport")}
          />

          {/* Coming soon hidden for final UI */}
          {/*
          <MenuRow
            icon="document-text-outline"
            title="Terms & Policies"
            subtitle="Privacy policy, refund policy and terms"
            onPress={() => {}}
          />

          <MenuRow
            icon="information-circle-outline"
            title="About Karto"
            subtitle="Fast local delivery for your city"
            onPress={() => {}}
          />
          */}
        </View>

        {isLoggedIn ? (
          <View style={styles.infoCard}>
            <MenuRow
              icon="log-out-outline"
              title={loggingOut ? "Logging out..." : "Logout"}
              subtitle="Sign out from this device"
              danger
              onPress={loggingOut ? undefined : () => setLogoutModalVisible(true)}
            />

            {loggingOut && <ActivityIndicator color={THEME.green} style={styles.logoutLoader} />}
          </View>
        ) : (
          <TouchableOpacity style={styles.guestLoginCard} onPress={openAuth} activeOpacity={0.9}>
            <View style={styles.guestIcon}>
              <Icon name="log-in-outline" size={25} color={THEME.black} />
            </View>
            <View style={styles.guestTextBox}>
              <Text style={styles.guestTitle}>Login to unlock your account</Text>
              <Text style={styles.guestSub}>Track orders, save addresses and use coupons.</Text>
            </View>
            <Icon name="arrow-forward" size={20} color={THEME.green} />
          </TouchableOpacity>
        )}

        <Text style={styles.footerText}>Karto • Fast local delivery experience</Text>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="log-out-outline" size={31} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Logout?</Text>
            <Text style={styles.confirmText}>
              You will be signed out from this device. You can login again anytime.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.keepText}>Stay Logged In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={doLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color={THEME.black} />
                ) : (
                  <Text style={styles.logoutConfirmText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingBottom: 35 },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextBox: { flex: 1 },
  headerTitle: {
    color: THEME.text,
    fontSize: 32,
    fontWeight: "900",
  },
  headerSub: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  editBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 70,
    backgroundColor: "rgba(34,197,94,0.16)",
    right: -45,
    top: -35,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 65,
    backgroundColor: "rgba(250,204,21,0.13)",
    left: -40,
    bottom: -55,
  },
  heroContent: { flex: 1 },
  heroTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "700",
  },
  loginHeroBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: THEME.green,
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  loginHeroText: { color: THEME.black, fontWeight: "900", fontSize: 13 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
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
    marginBottom: 14,
  },
  avatarWrap: {
    width: 82,
    height: 82,
    borderRadius: 30,
    backgroundColor: THEME.card2,
    borderWidth: 2,
    borderColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 30 },
  avatarText: { color: THEME.green, fontSize: 34, fontWeight: "900" },
  profileInfo: { flex: 1 },
  name: { color: THEME.text, fontSize: 21, fontWeight: "900" },
  email: { color: THEME.muted, marginTop: 4, fontSize: 13, fontWeight: "700" },
  phone: { color: THEME.muted, marginTop: 3, fontSize: 13, fontWeight: "700" },
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
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: { color: THEME.green, fontSize: 12, fontWeight: "900" },
  statusPill: {
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  inactivePill: { backgroundColor: "#1B0E0E", borderColor: "#3F1717" },
  statusText: { color: THEME.green, fontSize: 12, fontWeight: "900" },
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
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 7 },
  statLabel: { color: THEME.muted, fontSize: 12, marginTop: 3, fontWeight: "700" },
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
  quickAction: { flex: 1, alignItems: "center", gap: 7 },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { color: THEME.text, fontSize: 12, fontWeight: "800" },
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
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dangerIconBox: { backgroundColor: "#1B0E0E", borderColor: "#3F1717" },
  menuTextBox: { flex: 1 },
  menuTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  menuTitle: { color: THEME.text, fontSize: 15, fontWeight: "900" },
  menuSubtitle: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
    fontWeight: "700",
  },
  badge: { backgroundColor: THEME.yellow, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: THEME.black, fontSize: 10, fontWeight: "900" },
  guestLoginCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTextBox: { flex: 1 },
  guestTitle: { color: THEME.text, fontSize: 15, fontWeight: "900" },
  guestSub: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "700" },
  logoutLoader: { marginTop: 12 },
  footerText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: { color: THEME.text, fontWeight: "900" },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  logoutConfirmText: { color: THEME.black, fontWeight: "900" },
});
