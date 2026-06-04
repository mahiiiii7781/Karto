import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  greenDark: "#15803D",
  yellow: "#FACC15",
  amberSoft: "#252109",
  blue: "#38BDF8",
  purple: "#A78BFA",
  orange: "#FB923C",
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

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  const isGuest = !user?.id;

  useEffect(() => {
    setFullName(user?.fullName || (user as any)?.name || "");
    setPhone(normalizePhone((user as any)?.phone || ""));
    setAvatarUri((user as any)?.avatarUrl || (user as any)?.avatar_url || "");
  }, [user]);

  const initials = useMemo(() => {
    const name = fullName.trim() || user?.email || "U";
    return name.charAt(0).toUpperCase();
  }, [fullName, user?.email]);

  const hasChanges = useMemo(() => {
    const oldName = user?.fullName || (user as any)?.name || "";
    const oldPhone = normalizePhone((user as any)?.phone || "");
    const oldAvatar = (user as any)?.avatarUrl || (user as any)?.avatar_url || "";

    return (
      fullName.trim() !== oldName.trim() ||
      phone.trim() !== oldPhone.trim() ||
      avatarUri !== oldAvatar
    );
  }, [fullName, phone, avatarUri, user]);

  const openLogin = () => navigation.navigate("Auth");

  const requireAuth = () => {
    if (!isGuest) return true;
    showToast("info", "Login required", "Please sign in to edit your profile.");
    return false;
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to update your profile photo.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickFromCamera = async () => {
    if (!requireAuth()) return;

    setPhotoModalVisible(false);
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      showToast("info", "Permission required", "Camera permission is required.");
      return;
    }

    try {
      setPickingPhoto(true);

      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
        cameraType: "front",
        saveToPhotos: false,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showToast("error", "Camera failed", result.errorMessage || "Please try again.");
        return;
      }

      const uri = result.assets?.[0]?.uri;

      if (uri) {
        setAvatarUri(uri);
        showToast("success", "Photo selected", "Save changes to update your profile.");
      }
    } catch {
      showToast("error", "Camera failed", "Please try again.");
    } finally {
      setPickingPhoto(false);
    }
  };

  const pickFromGallery = async () => {
    if (!requireAuth()) return;

    setPhotoModalVisible(false);

    try {
      setPickingPhoto(true);

      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.9,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showToast("error", "Gallery failed", result.errorMessage || "Please try again.");
        return;
      }

      const uri = result.assets?.[0]?.uri;

      if (uri) {
        setAvatarUri(uri);
        showToast("success", "Photo selected", "Save changes to update your profile.");
      }
    } catch {
      showToast("error", "Gallery failed", "Please try again.");
    } finally {
      setPickingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (!requireAuth()) return;
    setAvatarUri("");
    setPhotoModalVisible(false);
    showToast("info", "Photo removed", "Save changes to remove it from profile.");
  };

  const validate = () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      showToast("info", "Name required", "Please enter your full name.");
      return false;
    }

    if (cleanName.length < 2) {
      showToast("info", "Name too short", "Full name must be at least 2 characters.");
      return false;
    }

    if (cleanName.length > 60) {
      showToast("info", "Name too long", "Full name cannot be more than 60 characters.");
      return false;
    }

    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      showToast("info", "Invalid phone number", "Enter a valid 10 digit Indian phone number.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!requireAuth()) return;
    if (!validate()) return;

    if (!hasChanges) {
      showToast("info", "No changes", "Profile is already up to date.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUri || null,
      });

      if (error) {
        showToast("error", "Profile update failed", error.message || "Please try again.");
        return;
      }

      showToast("success", "Profile updated", "Your changes have been saved.");
      navigation.goBack();
    } catch (error: any) {
      showToast("error", "Profile update failed", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setFullName(user?.fullName || (user as any)?.name || "");
    setPhone(normalizePhone((user as any)?.phone || ""));
    setAvatarUri((user as any)?.avatarUrl || (user as any)?.avatar_url || "");
    showToast("info", "Changes reset", "Profile form restored.");
  };

  const confirmDiscard = () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setDiscardModalVisible(true);
  };

  const discardChanges = () => {
    setDiscardModalVisible(false);
    navigation.goBack();
  };

  if (isGuest) {
    return (
      <View style={styles.guestScreen}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

        <View style={styles.guestIcon}>
          <Icon name="person-circle-outline" size={58} color={THEME.yellow} />
        </View>

        <Text style={styles.guestTitle}>Login to edit profile</Text>
        <Text style={styles.guestSub}>
          Save your name, phone number and profile photo for faster checkout and delivery updates.
        </Text>

        <TouchableOpacity style={styles.guestBtn} onPress={openLogin} activeOpacity={0.9}>
          <Text style={styles.guestBtnText}>Login / Signup</Text>
          <Icon name="arrow-forward" size={19} color={THEME.black} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.guestBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={confirmDiscard} activeOpacity={0.85}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your Karto identity</Text>
          </View>

          {hasChanges && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetChanges} activeOpacity={0.85}>
              <Icon name="refresh" size={19} color={THEME.black} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTag}>KARTO PROFILE</Text>
            <Text style={styles.heroTitle}>Make it yours</Text>
            <Text style={styles.heroSub}>
              Keep details clean for smoother checkout, rider calls and order updates.
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="sparkles-outline" size={32} color={THEME.black} />
          </View>
        </View>

        <View style={styles.photoCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPhotoModalVisible(true)}
            disabled={pickingPhoto}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <View style={styles.cameraIcon}>
              {pickingPhoto ? (
                <ActivityIndicator size="small" color={THEME.black} />
              ) : (
                <Icon name="camera" size={18} color={THEME.black} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.photoTitle}>Profile Photo</Text>
          <Text style={styles.photoHint}>Camera or gallery only. No image URL input.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputBox}>
            <Icon name="person-outline" size={20} color={THEME.green} />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
              placeholderTextColor={THEME.muted}
              maxLength={60}
            />
          </View>
          <Text style={styles.hintText}>{fullName.length}/60 characters</Text>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputBox, styles.disabledBox]}>
            <Icon name="mail-outline" size={20} color={THEME.muted} />
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ""}
              editable={false}
              placeholder="Email"
              placeholderTextColor={THEME.muted}
            />
            <Icon name="lock-closed-outline" size={18} color={THEME.muted} />
          </View>
          <Text style={styles.hintLeft}>Email is linked with your login account.</Text>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputBox}>
            <Icon name="call-outline" size={20} color={THEME.green} />
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={text => setPhone(normalizePhone(text))}
              keyboardType="phone-pad"
              placeholder="Enter phone number"
              placeholderTextColor={THEME.muted}
              maxLength={10}
            />
          </View>

          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={18} color={THEME.green} />
            <Text style={styles.infoText}>
              Your phone number helps riders contact you for delivery updates.
            </Text>
          </View>
        </View>

        <View style={styles.accentRow}>
          <View style={[styles.accentCard, { borderColor: "#20462C" }]}>
            <Icon name="shield-checkmark-outline" size={23} color={THEME.green} />
            <Text style={styles.accentTitle}>Secure</Text>
            <Text style={styles.accentText}>Session protected</Text>
          </View>

          <View style={[styles.accentCard, { borderColor: "#3B2F7A" }]}>
            <Icon name="flash-outline" size={23} color={THEME.purple} />
            <Text style={styles.accentTitle}>Fast</Text>
            <Text style={styles.accentText}>Quick checkout</Text>
          </View>

          <View style={[styles.accentCard, { borderColor: "#6A3D12" }]}>
            <Icon name="call-outline" size={23} color={THEME.orange} />
            <Text style={styles.accentTitle}>Reachable</Text>
            <Text style={styles.accentText}>Rider support</Text>
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Profile Preview</Text>

          <View style={styles.previewRow}>
            <View style={styles.previewAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.previewImage} />
              ) : (
                <Text style={styles.previewAvatarText}>{initials}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.previewName} numberOfLines={1}>
                {fullName.trim() || "Karto User"}
              </Text>
              <Text style={styles.previewSub} numberOfLines={1}>
                {phone.trim() ? `+91 ${phone.trim()}` : "Phone number not added"}
              </Text>
              <View style={styles.previewPill}>
                <Icon name="checkmark-circle-outline" size={14} color={THEME.green} />
                <Text style={styles.previewPillText}>Customer Profile</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !hasChanges) && styles.disabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={THEME.black} />
          ) : (
            <>
              <Text style={styles.saveText}>{hasChanges ? "Save Changes" : "No Changes"}</Text>
              <Icon name="checkmark-circle" size={20} color={THEME.black} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionBox}>
            <View style={styles.optionIcon}>
              <Icon name="camera-outline" size={31} color={THEME.yellow} />
            </View>

            <Text style={styles.optionTitle}>Profile Photo</Text>
            <Text style={styles.optionSub}>Choose how you want to update your photo.</Text>

            <TouchableOpacity style={styles.optionRow} onPress={pickFromCamera} activeOpacity={0.85}>
              <Icon name="camera-outline" size={21} color={THEME.green} />
              <Text style={styles.optionText}>Take Photo</Text>
              <Icon name="chevron-forward" size={19} color={THEME.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={pickFromGallery} activeOpacity={0.85}>
              <Icon name="images-outline" size={21} color={THEME.green} />
              <Text style={styles.optionText}>Choose From Gallery</Text>
              <Icon name="chevron-forward" size={19} color={THEME.muted} />
            </TouchableOpacity>

            {!!avatarUri && (
              <TouchableOpacity style={styles.optionRow} onPress={removePhoto} activeOpacity={0.85}>
                <Icon name="trash-outline" size={21} color={THEME.danger} />
                <Text style={[styles.optionText, { color: THEME.danger }]}>Remove Photo</Text>
                <Icon name="chevron-forward" size={19} color={THEME.muted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={() => setPhotoModalVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={discardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiscardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="alert-circle-outline" size={31} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Discard changes?</Text>
            <Text style={styles.confirmText}>Your unsaved profile changes will be lost.</Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.keepBtn} onPress={() => setDiscardModalVisible(false)}>
                <Text style={styles.keepText}>Keep Editing</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.discardBtn} onPress={discardChanges}>
                <Text style={styles.discardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingBottom: 118 },
  guestScreen: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  guestIcon: {
    width: 108,
    height: 108,
    borderRadius: 38,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  guestTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  guestSub: {
    color: THEME.muted,
    marginTop: 8,
    lineHeight: 21,
    textAlign: "center",
    fontWeight: "700",
  },
  guestBtn: {
    marginTop: 24,
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guestBtnText: { color: THEME.black, fontWeight: "900", fontSize: 15 },
  guestBackBtn: { marginTop: 14, padding: 10 },
  guestBackText: { color: THEME.yellow, fontWeight: "900" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 16,
    gap: 12,
  },
  headerTextBox: { flex: 1 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 2, fontWeight: "700" },
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
  heroTitle: { color: THEME.text, fontSize: 22, fontWeight: "900", marginTop: 5 },
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
  photoCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 118,
    height: 118,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: THEME.green,
  },
  avatarPlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 42,
    backgroundColor: THEME.card2,
    borderWidth: 2,
    borderColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: THEME.green, fontSize: 40, fontWeight: "900" },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 38,
    height: 38,
    backgroundColor: THEME.green,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
  },
  photoTitle: { color: THEME.text, fontWeight: "900", fontSize: 17, marginTop: 13 },
  photoHint: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  formCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  label: { color: THEME.text, fontWeight: "800", marginBottom: 8, marginTop: 10 },
  inputBox: {
    minHeight: 56,
    backgroundColor: THEME.card2,
    borderRadius: 16,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
  },
  disabledBox: { opacity: 0.82 },
  input: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledInput: { color: THEME.muted },
  countryCode: { color: THEME.green, fontWeight: "900", marginLeft: 10 },
  hintText: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
    fontWeight: "700",
  },
  hintLeft: { color: THEME.muted, fontSize: 11, marginTop: 6, fontWeight: "700" },
  infoBox: {
    marginTop: 18,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    color: THEME.green,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
    fontWeight: "800",
  },
  accentRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  accentCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    alignItems: "center",
  },
  accentTitle: { color: THEME.text, marginTop: 7, fontSize: 12, fontWeight: "900" },
  accentText: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "700",
  },
  previewCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  previewAvatarText: { color: THEME.green, fontSize: 22, fontWeight: "900" },
  previewName: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  previewSub: { color: THEME.muted, marginTop: 3, fontWeight: "700" },
  previewPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  previewPillText: { color: THEME.green, fontSize: 11, fontWeight: "900" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.card,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 24,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  saveBtn: {
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabled: { opacity: 0.65 },
  saveText: { color: THEME.black, fontWeight: "900", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 22,
  },
  optionBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: THEME.amberSoft,
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  optionTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  optionSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  optionRow: {
    alignSelf: "stretch",
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  optionText: { flex: 1, color: THEME.text, fontWeight: "900" },
  modalBtn: {
    marginTop: 8,
    backgroundColor: THEME.green,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  modalBtnText: { color: THEME.black, fontWeight: "900" },
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
  discardBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  discardText: { color: THEME.black, fontWeight: "900" },
});
