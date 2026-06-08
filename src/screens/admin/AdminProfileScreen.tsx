import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuth } from "@/context/AuthContext";
import { adminService } from "@/services/api/adminService";
import KartoMessageModal, { KartoMessageType } from "@/components/common/KartoMessageModal";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  input: "#0E100E",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  orange: "#FFB020",
};

export default function AdminProfileScreen({ navigation }: any) {
  const auth: any = useAuth();
  const user = auth?.user || auth?.currentUser || {};

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [msg, setMsg] = useState<any>({
    visible: false,
    type: "info" as KartoMessageType,
    title: "",
    message: "",
  });

  useEffect(() => {
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      email: user?.email || "",
      password: "",
    });

    loadDashboard();
  }, [user?.id]);

  const loadDashboard = async () => {
    const res = await adminService.dashboard?.();

    if (!res?.error) setDashboard(res?.data || null);

    setLoading(false);
  };

  const stats = useMemo(() => {
    return {
      users: dashboard?.totalUsers || dashboard?.users || 0,
      vendors: dashboard?.totalVendors || dashboard?.vendors || 0,
      riders: dashboard?.totalRiders || dashboard?.riders || 0,
      orders: dashboard?.totalOrders || dashboard?.orders || 0,
    };
  }, [dashboard]);

  const closeMsg = () => setMsg((p: any) => ({ ...p, visible: false, loading: false }));

  const showMsg = (
    type: KartoMessageType,
    title: string,
    message: string,
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMsg({ visible: true, type, title, message, primaryText, onPrimary, secondaryText, onSecondary });
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const updateForm = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to update profile photo.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickImage = async (camera = false) => {
    try {
      if (camera) {
        const granted = await requestCameraPermission();

        if (!granted) {
          showMsg("warning", "Camera Permission Required", "Camera permission allow karo.");
          return;
        }
      }

      const result = await (camera ? launchCamera : launchImageLibrary)({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
        saveToPhotos: camera,
        cameraType: "back",
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showMsg("error", "Image Error", result.errorMessage || "Image select nahi hui.");
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) return;

      setImage({
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        fileName: asset.fileName || `admin-profile-${Date.now()}.jpg`,
        name: asset.fileName || `admin-profile-${Date.now()}.jpg`,
      });
    } catch (e: any) {
      showMsg("error", "Image Error", e?.message || "Camera/gallery open nahi ho paya.");
    }
  };

  const saveProfile = async () => {
    if (!form.fullName.trim()) {
      showMsg("warning", "Required", "Full name required hai.");
      return;
    }

    if (form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.trim())) {
      showMsg("warning", "Invalid Phone", "Phone number valid 10 digit hona chahiye.");
      return;
    }

    if (form.password && form.password.length < 6) {
      showMsg("warning", "Invalid Password", "Password minimum 6 characters hona chahiye.");
      return;
    }

    setSaving(true);

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      password: form.password?.trim() || undefined,
      image,
    };

    const res = await adminService.updateProfile?.(payload);

    setSaving(false);

    if (!res || res.error) {
      showMsg(
        "error",
        "Profile Update Failed",
        res?.error?.message || "Backend me profile update route/service missing ho sakta hai."
      );
      return;
    }

    setModal(false);

    if (auth?.reloadUser) await auth.reloadUser();
    if (auth?.updateProfile) await auth.updateProfile(payload);

    showMsg("success", "Profile Updated", "Admin profile successfully update ho gaya.");
  };

  const confirmLogout = () => {
    showMsg(
      "warning",
      "Logout?",
      "Admin panel se logout karna hai?",
      "Logout",
      async () => {
        closeMsg();

        if (auth?.signOut) await auth.signOut();
        else if (auth?.logout) await auth.logout();

        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        });
      },
      "Cancel",
      closeMsg
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const avatarUri = image?.uri || user?.imageUrl || user?.avatarUrl;

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>ADMIN ACCOUNT</Text>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage admin account and logout</Text>
          </View>

          <TouchableOpacity style={styles.editTopBtn} onPress={() => setModal(true)}>
            <Icon name="create-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user?.fullName || user?.email || "Admin")}</Text>
            )}
          </View>

          <Text style={styles.name}>{user?.fullName || "Karto Admin"}</Text>
          <Text style={styles.email}>{user?.email || "admin@karto.in"}</Text>

          <View style={styles.rolePill}>
            <Icon name="shield-checkmark-outline" size={16} color={THEME.yellow} />
            <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatBox icon="people-outline" label="Users" value={stats.users} />
          <StatBox icon="storefront-outline" label="Vendors" value={stats.vendors} />
          <StatBox icon="bicycle-outline" label="Riders" value={stats.riders} />
          <StatBox icon="receipt-outline" label="Orders" value={stats.orders} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <ActionRow icon="analytics-outline" title="Analytics" sub="Platform reports" onPress={() => navigation.navigate("AdminAnalytics")} />
          <ActionRow icon="people-outline" title="Users" sub="Manage all users" onPress={() => navigation.navigate("AdminUsers")} />
          <ActionRow icon="storefront-outline" title="Vendors" sub="Manage vendors" onPress={() => navigation.navigate("AdminVendors")} />
          <ActionRow icon="bicycle-outline" title="Riders" sub="Manage riders" onPress={() => navigation.navigate("AdminRiders")} />
          <ActionRow icon="ticket-outline" title="Coupons" sub="Create offers" onPress={() => navigation.navigate("AdminCoupons")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <ActionRow icon="create-outline" title="Edit Profile" sub="Name, phone, photo" onPress={() => setModal(true)} />
          <ActionRow icon="refresh-outline" title="Reload Account" sub="Refresh latest user data" onPress={() => auth?.reloadUser?.()} />
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
            <Icon name="log-out-outline" size={22} color={THEME.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 42 }} />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>ADMIN PROFILE</Text>
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setModal(false)}>
                <Icon name="close" size={23} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewBox}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewEmpty}>
                  <Icon name="person-circle-outline" size={42} color={THEME.yellow} />
                  <Text style={styles.previewText}>No profile photo</Text>
                </View>
              )}
            </View>

            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.greenImageBtn} onPress={() => pickImage(true)}>
                <Icon name="camera-outline" size={20} color="#000" />
                <Text style={styles.imageBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.yellowImageBtn} onPress={() => pickImage(false)}>
                <Icon name="images-outline" size={20} color="#000" />
                <Text style={styles.imageBtnText}>Upload File</Text>
              </TouchableOpacity>
            </View>

            <Input label="Full Name" icon="person-outline" value={form.fullName} onChangeText={(v: string) => updateForm("fullName", v)} />
            <Input label="Email" icon="mail-outline" value={form.email} editable={false} />
            <Input label="Phone" icon="call-outline" value={form.phone} keyboardType="phone-pad" maxLength={10} onChangeText={(v: string) => updateForm("phone", v)} />
            <Input label="New Password Optional" icon="lock-closed-outline" value={form.password} secureTextEntry onChangeText={(v: string) => updateForm("password", v)} />

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KartoMessageModal
        visible={msg.visible}
        type={msg.type}
        title={msg.title}
        message={msg.message}
        primaryText={msg.primaryText}
        secondaryText={msg.secondaryText}
        loading={msg.loading}
        onPrimary={msg.onPrimary}
        onSecondary={msg.onSecondary}
        onClose={closeMsg}
      />
    </View>
  );
}

function StatBox({ icon, label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Icon name={icon} size={24} color={THEME.yellow} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, title, sub, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={21} color={THEME.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>

      <Icon name="chevron-forward" size={20} color={THEME.muted} />
    </TouchableOpacity>
  );
}

function Input({ label, icon, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <Icon name={icon} size={20} color={THEME.yellow} />
        <TextInput {...props} placeholderTextColor={THEME.muted} style={[styles.input, props.editable === false && { color: THEME.muted }]} />
      </View>
    </View>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16 },
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },

  header: { paddingTop: 22, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  editTopBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  smallLabel: { color: THEME.green, fontWeight: "900", fontSize: 11, letterSpacing: 1.1 },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },

  profileCard: {
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 34,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarText: { color: THEME.yellow, fontSize: 28, fontWeight: "900" },
  name: { color: THEME.text, fontSize: 24, fontWeight: "900", marginTop: 14 },
  email: { color: THEME.muted, fontWeight: "700", marginTop: 5 },
  rolePill: {
    marginTop: 14,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  roleText: { color: THEME.yellow, fontWeight: "900", fontSize: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  statBox: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statValue: { color: THEME.text, fontSize: 22, fontWeight: "900", marginTop: 9 },
  statLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800", marginTop: 3 },

  section: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 16,
  },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginBottom: 10 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  actionSub: { color: THEME.muted, fontWeight: "700", fontSize: 11, marginTop: 3 },

  logoutBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: { color: THEME.danger, fontWeight: "900", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "flex-end" },
  modalBox: { maxHeight: "92%", backgroundColor: THEME.bg, padding: 18, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: THEME.border },
  modalHandle: { width: 52, height: 5, borderRadius: 999, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  modalLabel: { color: THEME.green, fontSize: 11, letterSpacing: 1.1, fontWeight: "900" },
  modalTitle: { color: THEME.text, fontSize: 24, fontWeight: "900", marginTop: 3 },
  closeBtn: { width: 43, height: 43, borderRadius: 17, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },

  previewBox: { height: 150, borderRadius: 22, backgroundColor: THEME.input, borderWidth: 1, borderColor: THEME.border, overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  previewEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewText: { color: THEME.muted, marginTop: 8, fontWeight: "800" },

  imageActions: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 15 },
  greenImageBtn: { flex: 1, height: 48, borderRadius: 18, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  yellowImageBtn: { flex: 1, height: 48, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  imageBtnText: { color: "#000", fontWeight: "900" },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: THEME.text, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  inputBox: { minHeight: 55, borderRadius: 19, backgroundColor: THEME.input, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: THEME.text, fontWeight: "800" },

  saveBtn: { height: 56, borderRadius: 20, backgroundColor: THEME.yellow, marginTop: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: THEME.muted, fontWeight: "900" },
});