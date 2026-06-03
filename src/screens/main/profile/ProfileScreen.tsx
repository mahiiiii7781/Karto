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
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
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
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const requireAuth = useCallback(() => {
    if (user?.id) return true;

    showToast("info", "Login required", "Please sign in to access your profile.");
    navigation.navigate("Auth");
    return false;
  }, [user?.id, navigation]);

  useFocusEffect(
    useCallback(() => {
      requireAuth();
    }, [requireAuth])
  );

  const profile = useMemo(() => {
    const fullName =
      user?.fullName ||
      (user as any)?.name ||
      user?.email?.split("@")?.[0] ||
      "Karto User";

    return {
      fullName,
      email: user?.email || "Not available",
      phone: (user as any)?.phone || "Add phone number",
      avatarUrl: (user as any)?.avatarUrl || (user as any)?.avatar_url || "",
      role: user?.role || "CUSTOMER",
      isActive: (user as any)?.isActive ?? (user as any)?.is_active ?? true,
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

  const openComingSoon = (title: string) => {
    showToast("info", "Coming soon", `${title} will be available soon.`);
  };

  const safeNavigate = (screen: string) => {
    if (!requireAuth()) return;
    navigation.navigate(screen);
  };

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 35 }}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSub}>Manage your Karto account</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => safeNavigate("EditProfile")}
            activeOpacity={0.85}
          >
            <Icon name="create-outline" size={22} color={THEME.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTag}>KARTO MEMBER</Text>
            <Text style={styles.heroTitle}>Fast local delivery</Text>
            <Text style={styles.heroSub}>
              Track orders, manage addresses, payments and rewards from one place.
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="person-circle-outline" size={40} color={THEME.black} />
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
                <Text
                  style={[
                    styles.statusText,
                    !profile.isActive && { color: THEME.danger },
                  ]}
                >
                  {profile.isActive ? "Active" : "Inactive"}
                </Text>
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
          <TouchableOpacity style={styles.quickAction} onPress={() => safeNavigate("Orders")}>
            <View style={styles.quickIcon}>
              <Icon name="receipt-outline" size={23} color={THEME.green} />
            </View>
            <Text style={styles.quickText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => safeNavigate("Address")}>
            <View style={styles.quickIcon}>
              <Icon name="location-outline" size={23} color={THEME.green} />
            </View>
            <Text style={styles.quickText}>Address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => openComingSoon("Coupons")}>
            <View style={styles.quickIcon}>
              <Icon name="pricetag-outline" size={23} color={THEME.green} />
            </View>
            <Text style={styles.quickText}>Coupons</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={() => openComingSoon("Support")}>
            <View style={styles.quickIcon}>
              <Icon name="headset-outline" size={23} color={THEME.green} />
            </View>
            <Text style={styles.quickText}>Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <MenuRow
            icon="person-outline"
            title="Personal Information"
            subtitle={`${profile.phone} • Manage name, phone and avatar`}
            onPress={() => safeNavigate("EditProfile")}
          />

          <MenuRow
            icon="location-outline"
            title="Saved Addresses"
            subtitle="Home, work and delivery locations"
            onPress={() => safeNavigate("Address")}
          />

          <MenuRow
            icon="receipt-outline"
            title="My Orders"
            subtitle="Track current and past orders"
            onPress={() => safeNavigate("Orders")}
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
            onPress={() => safeNavigate("HelpSupport")}
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
            onPress={loggingOut ? undefined : () => setLogoutModalVisible(true)}
          />

          {loggingOut && <ActivityIndicator color={THEME.green} style={{ marginTop: 12 }} />}
        </View>

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
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontWeight: "700",
  },
  editBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
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
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
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
    fontWeight: "700",
  },
  phone: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
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
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
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
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
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
    fontWeight: "700",
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
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dangerIconBox: {
    backgroundColor: "#1B0E0E",
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
    fontWeight: "700",
  },
  badge: {
    backgroundColor: THEME.yellow,
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
  confirmTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
  },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: {
    color: THEME.text,
    fontWeight: "900",
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  logoutConfirmText: {
    color: THEME.black,
    fontWeight: "900",
  },
});