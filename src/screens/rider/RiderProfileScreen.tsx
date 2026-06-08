import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { riderService } from "@/services/api/riderApi";
import { useAuth } from "@/context/AuthContext";
import { riderSocketService } from "@/services/socket/riderSocketService";

const T = {
  bg: "#070A08",
  card: "#101713",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

export default function RiderProfileScreen({ navigation }: any) {
  const { signOut, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<any>(null);

  const [form, setForm] = useState<any>({
    fullName: "",
    phone: "",
    address: "",
    vehicleType: "",
    vehicleNo: "",
    avatarUrl: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadProfile = useCallback(async () => {
    try {
      const res = await riderService.getProfile();

      if (res?.error) {
        showToast(res?.error?.message || "Failed to load profile");
        return;
      }

      const rider = res?.data || {};
      setProfile(rider);

      setForm({
        fullName: rider.fullName || "",
        phone: rider.phone || "",
        address: rider.address || "",
        vehicleType: rider.vehicleType || "",
        vehicleNo: rider.vehicleNo || "",
        avatarUrl: rider.avatarUrl || "",
      });
    } catch (e: any) {
      showToast(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const update = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    if (!form.fullName?.trim()) {
      showToast("Full name is required");
      return;
    }

    if (!form.phone?.trim()) {
      showToast("Phone number is required");
      return;
    }

    setSaving(true);

    try {
      const res = await riderService.updateProfile(form);

      if (res?.error) {
        showToast(res?.error?.message || "Could not update profile");
        return;
      }

      setProfile(res?.data || profile);
      showToast("Profile updated successfully");
      loadProfile();
    } catch (e: any) {
      showToast(e?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout from Rider app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            riderSocketService.disconnect(profile?.id || user?.id);
            await signOut();
          } catch {
            await signOut();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading rider profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={T.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rider Profile</Text>
          <Text style={styles.sub}>Manage delivery partner details</Text>
        </View>

        <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color={T.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Icon name="person" size={36} color={T.yellow} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.fullName || "Karto Rider"}</Text>
            <Text style={styles.email}>{profile?.email || "No email"}</Text>

            <View style={styles.badges}>
              <View style={profile?.isOnline ? styles.onlineBadge : styles.offlineBadge}>
                <Text style={profile?.isOnline ? styles.onlineText : styles.offlineText}>
                  {profile?.isOnline ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>

              <View style={styles.kycBadge}>
                <Text style={styles.kycText}>{profile?.kycStatus || "PENDING"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickCard
            icon="shield-checkmark-outline"
            title="KYC"
            value={profile?.kycStatus || "PENDING"}
            onPress={() => navigation?.navigate?.("RiderKyc")}
          />
          <QuickCard
            icon="wallet-outline"
            title="Wallet"
            value="Open"
            onPress={() => navigation?.navigate?.("RiderWallet")}
          />
          <QuickCard
            icon="help-circle-outline"
            title="Support"
            value="Tickets"
            onPress={() => navigation?.navigate?.("RiderSupport")}
          />
        </View>

        <Text style={styles.section}>Personal Details</Text>

        <Field
          icon="person-outline"
          label="Full Name"
          value={form.fullName}
          onChangeText={(v: string) => update("fullName", v)}
          placeholder="Enter full name"
        />

        <Field
          icon="call-outline"
          label="Phone"
          value={form.phone}
          onChangeText={(v: string) => update("phone", v.replace(/[^0-9]/g, "").slice(0, 10))}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Field
          icon="home-outline"
          label="Address"
          value={form.address}
          onChangeText={(v: string) => update("address", v)}
          placeholder="Enter address"
          multiline
        />

        <Text style={styles.section}>Vehicle Details</Text>

        <Field
          icon="bicycle-outline"
          label="Vehicle Type"
          value={form.vehicleType}
          onChangeText={(v: string) => update("vehicleType", v)}
          placeholder="Bike / Scooter / Cycle"
        />

        <Field
          icon="barcode-outline"
          label="Vehicle Number"
          value={form.vehicleNo}
          onChangeText={(v: string) => update("vehicleNo", v.toUpperCase())}
          placeholder="UP XX XX 0000"
        />

        <TouchableOpacity
          style={styles.kycBtn}
          onPress={() => navigation?.navigate?.("RiderKyc")}
        >
          <View>
            <Text style={styles.kycBtnTitle}>KYC Documents</Text>
            <Text style={styles.kycBtnSub}>Aadhaar, license and verification status</Text>
          </View>
          <Icon name="chevron-forward" size={22} color={T.yellow} />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={saving}
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={saveProfile}
        >
          {saving ? (
            <ActivityIndicator color={T.black} />
          ) : (
            <>
              <Text style={styles.saveText}>Save Profile</Text>
              <Icon name="checkmark-circle" size={19} color={T.black} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color={T.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.multilineBox]}>
        <Icon name={icon} size={19} color={T.yellow} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[styles.input, multiline && styles.multilineInput]}
        />
      </View>
    </View>
  );
}

function QuickCard({ icon, title, value, onPress }: any) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.quickCard} onPress={onPress}>
      <Icon name={icon} size={21} color={T.yellow} />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickValue}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: T.muted, marginTop: 12, fontWeight: "700" },

  toast: {
    position: "absolute",
    top: 44,
    left: 18,
    right: 18,
    zIndex: 99,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: T.black, fontWeight: "900", flex: 1 },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#2B1111",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 25, fontWeight: "900" },
  sub: { color: T.muted, marginTop: 3 },

  profileCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: T.text, fontSize: 19, fontWeight: "900" },
  email: { color: T.muted, fontSize: 12, marginTop: 4 },
  badges: { flexDirection: "row", gap: 8, marginTop: 10 },
  onlineBadge: {
    backgroundColor: "#0D2C1A",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  onlineText: { color: T.green, fontSize: 10, fontWeight: "900" },
  offlineBadge: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  offlineText: { color: T.muted, fontSize: 10, fontWeight: "900" },
  kycBadge: {
    backgroundColor: "#2B2207",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  kycText: { color: T.yellow, fontSize: 10, fontWeight: "900" },

  quickGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  quickCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  quickTitle: {
    color: T.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  quickValue: {
    color: T.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  fieldWrap: { marginBottom: 14 },
  label: { color: T.text, fontWeight: "900", marginBottom: 8 },
  inputBox: {
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  multilineBox: {
    minHeight: 86,
    alignItems: "flex-start",
    paddingTop: 14,
  },
  input: {
    flex: 1,
    color: T.text,
    fontWeight: "700",
    paddingVertical: 12,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: "top",
  },

  kycBtn: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  kycBtnTitle: { color: T.text, fontWeight: "900", fontSize: 16 },
  kycBtnSub: { color: T.muted, fontSize: 12, marginTop: 4 },

  saveBtn: {
    backgroundColor: T.yellow,
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledBtn: { opacity: 0.55 },
  saveText: { color: T.black, fontWeight: "900", fontSize: 16 },

  logoutBtn: {
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#7F1D1D",
    backgroundColor: "#2B1111",
  },
  logoutText: { color: T.danger, fontWeight: "900", fontSize: 16 },
});