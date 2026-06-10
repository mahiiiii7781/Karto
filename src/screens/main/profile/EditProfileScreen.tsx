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
  KeyboardAvoidingView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#F8FAF5",

  card: "#FFFFFF",
  card2: "#F1F5EC",
  surface: "#F7FAF2",

  orange: "#FACC15",
  orangeSoft: "#FEF9C3",

  blue: "#111827",

  green: "#22C55E",
  greenDark: "#15803D",

  yellow: "#FACC15",
  yellowSoft: "#FEF9C3",

  purple: "#8B5CF6",

  text: "#111827",
  muted: "#6B7280",
  border: "#DDE5D7",

  danger: "#EF4444",

  white: "#FFFFFF",
  black: "#111827",
  blackSoft: "#1F2937",
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

const isRemoteUrl = (value?: string | null) => {
  const uri = String(value || "");
  return uri.startsWith("http://") || uri.startsWith("https://");
};

const getFileNameFromUri = (uri: string) => {
  const clean = uri.split("?")[0];
  const name = clean.split("/").pop();
  return name || `profile-${Date.now()}.jpg`;
};

const getMimeFromUri = (uri: string) => {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";

  return "image/jpeg";
};

const uploadProfileImage = async (uri: string) => {
  if (!uri) return null;
  if (isRemoteUrl(uri)) return uri;

  const formData = new FormData();

  formData.append("folder", "user/profile");
  formData.append("image", {
    uri,
    name: getFileNameFromUri(uri),
    type: getMimeFromUri(uri),
  } as any);

  const res = await apiClient.post("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 30000,
  });

  return res.data?.imageUrl || res.data?.url || res.data?.data?.imageUrl || null;
};

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateProfile, reloadUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  const isGuest = !user?.id;

  useEffect(() => {
    setFullName(user?.fullName || (user as any)?.name || "");
    setPhone(normalizePhone((user as any)?.phone || ""));
    setAvatarUri(
      (user as any)?.avatarUrl ||
        (user as any)?.avatar_url ||
        (user as any)?.profileImage ||
        ""
    );
  }, [user]);

  const oldValues = useMemo(
    () => ({
      fullName: user?.fullName || (user as any)?.name || "",
      phone: normalizePhone((user as any)?.phone || ""),
      avatar:
        (user as any)?.avatarUrl ||
        (user as any)?.avatar_url ||
        (user as any)?.profileImage ||
        "",
    }),
    [user]
  );

  const initials = useMemo(() => {
    const name = fullName.trim() || user?.email || "U";
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.charAt(0).toUpperCase();
  }, [fullName, user?.email]);

  const hasChanges = useMemo(() => {
    return (
      fullName.trim() !== oldValues.fullName.trim() ||
      phone.trim() !== oldValues.phone.trim() ||
      avatarUri !== oldValues.avatar
    );
  }, [fullName, phone, avatarUri, oldValues]);

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
        includeBase64: false,
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
        includeBase64: false,
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

      let finalAvatarUrl: string | null = avatarUri || null;

      if (avatarUri && !isRemoteUrl(avatarUri)) {
        setUploadingPhoto(true);

        const uploadedUrl = await uploadProfileImage(avatarUri);

        if (!uploadedUrl) {
          showToast("error", "Image upload failed", "Please try again.");
          return;
        }

        finalAvatarUrl = uploadedUrl;
      }

      const { error } = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        avatarUrl: finalAvatarUrl,
      });

      if (error) {
        showToast("error", "Profile update failed", error.message || "Please try again.");
        return;
      }

      await reloadUser?.();

      showToast("success", "Profile updated", "Your changes have been saved.");
      navigation.goBack();
    } catch (error: any) {
      showToast(
        "error",
        "Profile update failed",
        error?.response?.data?.message || error?.message || "Please try again."
      );
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  const resetChanges = () => {
    setFullName(oldValues.fullName);
    setPhone(oldValues.phone);
    setAvatarUri(oldValues.avatar);
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
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

        <View style={styles.guestIcon}>
          <Icon name="person-circle-outline" size={58} color={THEME.orange} />
        </View>

        <Text style={styles.guestTitle}>Login to edit profile</Text>
        <Text style={styles.guestSub}>
          Save your name, phone number and profile photo for faster checkout and delivery updates.
        </Text>

        <TouchableOpacity style={styles.guestBtn} onPress={openLogin} activeOpacity={0.9}>
          <Text style={styles.guestBtnText}>Login / Signup</Text>
          <Icon name="arrow-forward" size={19} color={THEME.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.guestBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={confirmDiscard} activeOpacity={0.85}>
              <Icon name="chevron-back" size={24} color={THEME.blue} />
            </TouchableOpacity>

            <View style={styles.headerTextBox}>
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Update your Karto identity</Text>
            </View>

            {hasChanges && (
              <TouchableOpacity style={styles.resetBtn} onPress={resetChanges} activeOpacity={0.85}>
                <Icon name="refresh" size={19} color={THEME.white} />
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
              <Icon name="sparkles-outline" size={32} color={THEME.white} />
            </View>
          </View>

          <View style={styles.photoCard}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPhotoModalVisible(true)}
              disabled={pickingPhoto || saving}
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
                  <ActivityIndicator size="small" color={THEME.white} />
                ) : (
                  <Icon name="camera" size={18} color={THEME.white} />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.photoTitle}>Profile Photo</Text>
            <Text style={styles.photoHint}>Camera or gallery only. No image URL input.</Text>

            {uploadingPhoto && (
              <View style={styles.uploadPill}>
                <ActivityIndicator size="small" color={THEME.orange} />
                <Text style={styles.uploadPillText}>Uploading image...</Text>
              </View>
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputBox}>
              <Icon name="person-outline" size={20} color={THEME.orange} />
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
              <Icon name="call-outline" size={20} color={THEME.orange} />
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
              <Icon name="information-circle-outline" size={18} color={THEME.orange} />
              <Text style={styles.infoText}>
                Your phone number helps riders contact you for delivery updates.
              </Text>
            </View>
          </View>

          <View style={styles.accentRow}>
            <View style={styles.accentCard}>
              <Icon name="shield-checkmark-outline" size={23} color={THEME.green} />
              <Text style={styles.accentTitle}>Secure</Text>
              <Text style={styles.accentText}>Session protected</Text>
            </View>

            <View style={styles.accentCard}>
              <Icon name="flash-outline" size={23} color={THEME.purple} />
              <Text style={styles.accentTitle}>Fast</Text>
              <Text style={styles.accentText}>Quick checkout</Text>
            </View>

            <View style={styles.accentCard}>
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
                  <Icon name="checkmark-circle-outline" size={14} color={THEME.orange} />
                  <Text style={styles.previewPillText}>Customer Profile</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !hasChanges) && styles.disabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={THEME.white} />
          ) : (
            <>
              <Text style={styles.saveText}>{hasChanges ? "Save Changes" : "No Changes"}</Text>
              <Icon name="checkmark-circle" size={20} color={THEME.white} />
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
              <Icon name="camera-outline" size={31} color={THEME.orange} />
            </View>

            <Text style={styles.optionTitle}>Profile Photo</Text>
            <Text style={styles.optionSub}>Choose how you want to update your photo.</Text>

            <TouchableOpacity style={styles.optionRow} onPress={pickFromCamera} activeOpacity={0.85}>
              <Icon name="camera-outline" size={21} color={THEME.orange} />
              <Text style={styles.optionText}>Take Photo</Text>
              <Icon name="chevron-forward" size={19} color={THEME.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={pickFromGallery} activeOpacity={0.85}>
              <Icon name="images-outline" size={21} color={THEME.orange} />
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

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  guestTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  guestBtnText: { color: THEME.white, fontWeight: "900", fontSize: 15 },
  guestBackBtn: { marginTop: 14, padding: 10 },
  guestBackText: { color: THEME.orange, fontWeight: "900" },
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
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  title: { color: THEME.blue, fontSize: 27, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 2, fontWeight: "700" },
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: { color: THEME.blue, fontSize: 22, fontWeight: "900", marginTop: 5 },
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
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  photoCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    ...shadow,
  },
  avatar: {
    width: 118,
    height: 118,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 42,
    backgroundColor: THEME.orangeSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: THEME.orange, fontSize: 40, fontWeight: "900" },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 38,
    height: 38,
    backgroundColor: THEME.orange,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
  },
  photoTitle: { color: THEME.blue, fontWeight: "900", fontSize: 17, marginTop: 13 },
  photoHint: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  uploadPill: {
    marginTop: 12,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadPillText: {
    color: THEME.orange,
    fontWeight: "900",
    fontSize: 12,
  },
  formCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    ...shadow,
  },
  sectionTitle: { color: THEME.blue, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  label: { color: THEME.blue, fontWeight: "900", marginBottom: 8, marginTop: 10 },
  inputBox: {
    minHeight: 56,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  disabledBox: { opacity: 0.82 },
  input: {
    flex: 1,
    color: THEME.blue,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledInput: { color: THEME.muted },
  countryCode: { color: THEME.orange, fontWeight: "900", marginLeft: 10 },
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
    backgroundColor: THEME.orangeSoft,
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    color: THEME.orange,
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
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    ...shadow,
  },
  accentTitle: { color: THEME.blue, marginTop: 7, fontSize: 12, fontWeight: "900" },
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
    ...shadow,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  previewAvatarText: { color: THEME.orange, fontSize: 22, fontWeight: "900" },
  previewName: { color: THEME.blue, fontSize: 16, fontWeight: "900" },
  previewSub: { color: THEME.muted, marginTop: 3, fontWeight: "700" },
  previewPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: THEME.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  previewPillText: { color: THEME.orange, fontSize: 11, fontWeight: "900" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.card,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 24,
    ...shadow,
  },
  saveBtn: {
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabled: { opacity: 0.65 },
  saveText: { color: THEME.white, fontWeight: "900", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  optionBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  optionTitle: { color: THEME.blue, fontSize: 22, fontWeight: "900" },
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
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  optionText: { flex: 1, color: THEME.blue, fontWeight: "900" },
  modalBtn: {
    marginTop: 8,
    backgroundColor: THEME.orange,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  modalBtnText: { color: THEME.white, fontWeight: "900" },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: { color: THEME.blue, fontSize: 22, fontWeight: "900" },
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
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: { color: THEME.blue, fontWeight: "900" },
  discardBtn: {
    flex: 1,
    backgroundColor: THEME.danger,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  discardText: { color: THEME.white, fontWeight: "900" },
});
