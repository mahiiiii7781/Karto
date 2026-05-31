import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  greenDark: "#12351F",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  yellow: "#FACC15",
  black: "#041008",
};

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    setAvatarUri(user?.avatarUrl || "");
  }, [user]);

  const initials = useMemo(() => {
    const name = fullName.trim() || user?.email || "U";
    return name.charAt(0).toUpperCase();
  }, [fullName, user?.email]);

  const hasChanges = useMemo(() => {
    return (
      fullName.trim() !== (user?.fullName || "") ||
      phone.trim() !== (user?.phone || "") ||
      avatarUri !== (user?.avatarUrl || "")
    );
  }, [fullName, phone, avatarUri, user]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Karto Camera Permission",
        message: "Karto needs camera access to update your profile photo.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert("Permission Required", "Camera permission is required.");
      return;
    }

    const result = await launchCamera({
      mediaType: "photo",
      quality: 1,
      cameraType: "front",
      saveToPhotos: false,
    });

    if (result.didCancel) return;

    if (result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 1,
      selectionLimit: 1,
    });

    if (result.didCancel) return;

    if (result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    Alert.alert("Profile Photo", "Choose photo source", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      {
        text: "Remove Photo",
        style: "destructive",
        onPress: () => setAvatarUri(""),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const validate = () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      Alert.alert("Validation", "Full name is required.");
      return false;
    }

    if (cleanName.length < 2) {
      Alert.alert("Validation", "Full name must be at least 2 characters.");
      return false;
    }

    if (cleanName.length > 60) {
      Alert.alert("Validation", "Full name cannot be more than 60 characters.");
      return false;
    }

    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert("Validation", "Enter valid 10 digit Indian phone number.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!hasChanges) {
      Toast.show({
        type: "info",
        text1: "No changes",
        text2: "Profile is already up to date.",
        position: "bottom",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || null,

        // Local URI save hoga. Production me Cloudinary/S3 upload karke URL save karna best hai.
        avatarUrl: avatarUri || null,
      });

      if (error) {
        Alert.alert("Error", error.message || "Profile update failed.");
        return;
      }

      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your changes have been saved.",
        position: "bottom",
      });

      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Profile update failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetChanges = () => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    setAvatarUri(user?.avatarUrl || "");
  };

  const confirmDiscard = () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert("Discard Changes?", "Your unsaved changes will be lost.", [
      { text: "Keep Editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 118 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={confirmDiscard}>
            <Icon name="chevron-back" size={24} color={THEME.green} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your personal details</Text>
          </View>

          {hasChanges && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetChanges}>
              <Icon name="refresh" size={19} color={THEME.green} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroCard}>
          <TouchableOpacity activeOpacity={0.85} onPress={pickImage}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <View style={styles.cameraIcon}>
              <Icon name="camera" size={18} color={THEME.black} />
            </View>
          </TouchableOpacity>

          <Text style={styles.photoTitle}>Profile Photo</Text>
          <Text style={styles.photoHint}>Tap photo to use camera or gallery</Text>
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

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputBox}>
            <Icon name="call-outline" size={20} color={THEME.green} />
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/\D/g, ""))}
              keyboardType="phone-pad"
              placeholder="Enter phone number"
              placeholderTextColor={THEME.muted}
              maxLength={10}
            />
          </View>

          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={18} color={THEME.green} />
            <Text style={styles.infoText}>
              Email cannot be changed here. Profile photo from camera/gallery will show instantly.
            </Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Icon name="shield-checkmark-outline" size={24} color={THEME.green} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Account Security</Text>
            <Text style={styles.securitySub}>
              Your profile updates are protected with your login session.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (loading || !hasChanges) && { opacity: 0.65 },
          ]}
          onPress={handleSave}
          disabled={loading || !hasChanges}
        >
          {loading ? (
            <ActivityIndicator color={THEME.black} />
          ) : (
            <>
              <Text style={styles.saveText}>
                {hasChanges ? "Save Changes" : "No Changes"}
              </Text>
              <Icon name="checkmark-circle" size={20} color={THEME.black} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
    gap: 12,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: "900",
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 2,
  },

  heroCard: {
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
    borderRadius: 59,
    borderWidth: 2,
    borderColor: THEME.green,
  },

  avatarPlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: THEME.card2,
    borderWidth: 2,
    borderColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: THEME.green,
    fontSize: 40,
    fontWeight: "900",
  },

  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: THEME.green,
    borderRadius: 20,
    padding: 9,
    borderWidth: 2,
    borderColor: THEME.card,
  },

  photoTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 17,
    marginTop: 13,
  },

  photoHint: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
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

  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },

  label: {
    color: THEME.text,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 10,
  },

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

  disabledBox: {
    opacity: 0.8,
  },

  input: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
  },

  disabledInput: {
    color: THEME.muted,
  },

  countryCode: {
    color: THEME.green,
    fontWeight: "900",
    marginLeft: 10,
  },

  hintText: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },

  infoBox: {
    marginTop: 18,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoText: {
    color: THEME.muted,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },

  securityCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  securityTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },

  securitySub: {
    color: THEME.muted,
    marginTop: 3,
    lineHeight: 18,
    fontSize: 12,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.card,
    padding: 16,
    paddingBottom: 26,
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

  saveText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
});