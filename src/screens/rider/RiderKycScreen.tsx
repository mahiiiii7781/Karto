import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import apiClient from "@/api/apiClient";
import { riderService } from "@/services/api/riderApi";

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

const UPLOAD_ENDPOINT = "/upload/image";

export default function RiderKycScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<any>(null);

  const [form, setForm] = useState<any>({
    aadhaarNumber: "",
    drivingLicense: "",
    aadhaarImageUrl: "",
    licenseImageUrl: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadProfile = useCallback(async () => {
    try {
      const res = await riderService.getProfile();

      if (res?.error) {
        showToast(res?.error?.message || "Failed to load KYC");
        return;
      }

      const rider = res?.data || {};
      setProfile(rider);

      setForm({
        aadhaarNumber: rider.aadhaarNumber || "",
        drivingLicense: rider.drivingLicense || "",
        aadhaarImageUrl: rider.aadhaarImageUrl || "",
        licenseImageUrl: rider.licenseImageUrl || "",
      });
    } catch (e: any) {
      showToast(e?.message || "Failed to load KYC");
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

  const pickDocument = (key: "aadhaarImageUrl" | "licenseImageUrl") => {
    Alert.alert("Upload document", "Choose document image source", [
      {
        text: "Camera",
        onPress: () => uploadImage(key, true),
      },
      {
        text: "Gallery",
        onPress: () => uploadImage(key, false),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const uploadImage = async (
    key: "aadhaarImageUrl" | "licenseImageUrl",
    camera: boolean
  ) => {
    try {
      setUploadingKey(key);

      const result = await (camera ? launchCamera : launchImageLibrary)({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
        saveToPhotos: camera,
        cameraType: "back",
      });

      if (result.didCancel) return;

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        showToast("Image not selected");
        return;
      }

      const formData = new FormData();

      formData.append("image", {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `rider-kyc-${Date.now()}.jpg`,
      } as any);

      const res = await apiClient.post(UPLOAD_ENDPOINT, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const imageUrl =
        res?.data?.imageUrl ||
        res?.data?.url ||
        res?.data?.data?.imageUrl ||
        res?.data?.data?.url ||
        res?.data?.file?.url ||
        "";

      if (!imageUrl) {
        showToast("Image uploaded but URL not received");
        return;
      }

      update(key, imageUrl);
      showToast("Document uploaded successfully");
    } catch (e: any) {
      showToast(e?.message || "Image upload failed");
    } finally {
      setUploadingKey("");
    }
  };

  const submitKyc = async () => {
    if (!form.aadhaarNumber || form.aadhaarNumber.length < 12) {
      showToast("Valid Aadhaar number is required");
      return;
    }

    if (!form.drivingLicense) {
      showToast("Driving license number is required");
      return;
    }

    if (!form.aadhaarImageUrl) {
      showToast("Please upload Aadhaar image");
      return;
    }

    if (!form.licenseImageUrl) {
      showToast("Please upload license image");
      return;
    }

    setSaving(true);

    try {
      const res = await riderService.updateKyc(form);

      if (res?.error) {
        showToast(res?.error?.message || "Could not submit KYC");
        return;
      }

      setProfile((prev: any) => ({
        ...prev,
        ...(res?.data || {}),
      }));

      showToast("KYC submitted for review");
      loadProfile();
    } catch (e: any) {
      showToast(e?.message || "Could not submit KYC");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading KYC...</Text>
      </SafeAreaView>
    );
  }

  const kycStatus = profile?.kycStatus || "PENDING";
  const approved = kycStatus === "APPROVED";
  const rejected = kycStatus === "REJECTED";

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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rider KYC</Text>
          <Text style={styles.sub}>Verification documents</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadProfile}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
          />
        }
      >
        <View
          style={[
            styles.statusCard,
            approved && styles.statusApproved,
            rejected && styles.statusRejected,
          ]}
        >
          <View style={styles.statusIcon}>
            <Icon
              name={
                approved
                  ? "shield-checkmark"
                  : rejected
                  ? "warning-outline"
                  : "shield-outline"
              }
              size={30}
              color={approved ? T.green : rejected ? T.danger : T.yellow}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>KYC {kycStatus}</Text>
            <Text style={styles.statusSub}>
              {approved
                ? "Your rider account is verified for deliveries."
                : rejected
                ? "Your KYC was rejected. Upload correct documents again."
                : "Submit correct details. Admin will review your KYC."}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Identity Details</Text>

        <Field
          icon="card-outline"
          label="Aadhaar Number"
          value={form.aadhaarNumber}
          onChangeText={(v: string) =>
            update("aadhaarNumber", v.replace(/[^0-9]/g, "").slice(0, 12))
          }
          placeholder="Enter 12 digit Aadhaar number"
          keyboardType="number-pad"
          editable={!saving}
        />

        <Field
          icon="car-outline"
          label="Driving License"
          value={form.drivingLicense}
          onChangeText={(v: string) =>
            update("drivingLicense", v.toUpperCase().trim())
          }
          placeholder="Enter license number"
          editable={!saving}
        />

        <Text style={styles.section}>Document Images</Text>

        <View style={styles.noteCard}>
          <Icon name="image-outline" size={22} color={T.yellow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>Upload from camera/gallery</Text>
            <Text style={styles.noteText}>
              No URL input. Select Aadhaar and license images from file/gallery
              or camera.
            </Text>
          </View>
        </View>

        <DocumentUploadCard
          title="Aadhaar Image"
          imageUrl={form.aadhaarImageUrl}
          icon="document-attach-outline"
          uploading={uploadingKey === "aadhaarImageUrl"}
          onPress={() => pickDocument("aadhaarImageUrl")}
        />

        <DocumentUploadCard
          title="Driving License Image"
          imageUrl={form.licenseImageUrl}
          icon="document-text-outline"
          uploading={uploadingKey === "licenseImageUrl"}
          onPress={() => pickDocument("licenseImageUrl")}
        />

        <TouchableOpacity
          disabled={saving || !!uploadingKey}
          style={[
            styles.submitBtn,
            (saving || !!uploadingKey) && styles.disabledBtn,
          ]}
          onPress={submitKyc}
        >
          {saving ? (
            <ActivityIndicator color={T.black} />
          ) : (
            <>
              <Text style={styles.submitText}>Submit KYC</Text>
              <Icon name="send" size={18} color={T.black} />
            </>
          )}
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
  editable = true,
}: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <Icon name={icon} size={19} color={T.yellow} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          keyboardType={keyboardType}
          editable={editable}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function DocumentUploadCard({
  title,
  imageUrl,
  icon,
  uploading,
  onPress,
}: any) {
  return (
    <View style={styles.uploadCard}>
      <View style={styles.uploadTop}>
        <View style={styles.uploadIcon}>
          <Icon name={icon} size={22} color={T.yellow} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadSub}>
            {imageUrl ? "Image selected and uploaded" : "Camera or gallery"}
          </Text>
        </View>

        {imageUrl ? (
          <Icon name="checkmark-circle" size={24} color={T.green} />
        ) : null}
      </View>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="image-outline" size={34} color={T.muted} />
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.uploadBtn}
        onPress={onPress}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={T.black} />
        ) : (
          <>
            <Text style={styles.uploadBtnText}>
              {imageUrl ? "Change Image" : "Upload Image"}
            </Text>
            <Icon name="cloud-upload" size={18} color={T.black} />
          </>
        )}
      </TouchableOpacity>
    </View>
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
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 25, fontWeight: "900" },
  sub: { color: T.muted, marginTop: 3 },

  statusCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 17,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusApproved: { borderColor: "#1F6B3B", backgroundColor: "#0C1510" },
  statusRejected: { borderColor: "#7F1D1D", backgroundColor: "#2B1111" },
  statusIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { color: T.text, fontSize: 18, fontWeight: "900" },
  statusSub: { color: T.muted, marginTop: 5, lineHeight: 18, fontSize: 12 },

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
  input: {
    flex: 1,
    color: T.text,
    fontWeight: "700",
    paddingVertical: 12,
  },

  noteCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  noteTitle: { color: T.text, fontWeight: "900" },
  noteText: { color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },

  uploadCard: {
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 14,
  },
  uploadTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { color: T.text, fontWeight: "900", fontSize: 15 },
  uploadSub: { color: T.muted, fontSize: 12, marginTop: 3 },
  preview: {
    width: "100%",
    height: 170,
    borderRadius: 18,
    marginTop: 14,
    backgroundColor: T.black,
  },
  placeholder: {
    height: 150,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  placeholderText: { color: T.muted, marginTop: 8, fontWeight: "700" },
  uploadBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  uploadBtnText: { color: T.black, fontWeight: "900" },

  submitBtn: {
    backgroundColor: T.yellow,
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledBtn: { opacity: 0.55 },
  submitText: { color: T.black, fontWeight: "900", fontSize: 16 },
});