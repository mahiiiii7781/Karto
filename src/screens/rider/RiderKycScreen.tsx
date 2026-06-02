import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function RiderKycScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const rider = res?.rider || {};
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

  const submitKyc = async () => {
    if (!form.aadhaarNumber || !form.drivingLicense) {
      showToast("Aadhaar and license number are required");
      return;
    }

    setSaving(true);
    try {
      const res = await riderService.updateKyc(form);
      setProfile((prev: any) => ({
        ...prev,
        ...(res?.rider || {}),
      }));
      showToast("KYC submitted for review");
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

        <View>
          <Text style={styles.title}>Rider KYC</Text>
          <Text style={styles.sub}>Verification documents</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        <View style={[styles.statusCard, approved && styles.statusApproved]}>
          <View style={styles.statusIcon}>
            <Icon
              name={approved ? "shield-checkmark" : "shield-outline"}
              size={30}
              color={approved ? T.green : T.yellow}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>KYC {kycStatus}</Text>
            <Text style={styles.statusSub}>
              {approved
                ? "Your rider account is verified for deliveries."
                : "Submit correct details. Admin will review your KYC."}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Identity Details</Text>

        <Field
          icon="card-outline"
          label="Aadhaar Number"
          value={form.aadhaarNumber}
          onChangeText={(v: string) => update("aadhaarNumber", v)}
          placeholder="Enter Aadhaar number"
          keyboardType="number-pad"
        />

        <Field
          icon="car-outline"
          label="Driving License"
          value={form.drivingLicense}
          onChangeText={(v: string) => update("drivingLicense", v.toUpperCase())}
          placeholder="Enter license number"
        />

        <Text style={styles.section}>Document Images</Text>

        <View style={styles.noteCard}>
          <Icon name="image-outline" size={22} color={T.yellow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>Image upload ready</Text>
            <Text style={styles.noteText}>
              Backend supports image URLs. Later we will connect this to gallery/camera upload API.
            </Text>
          </View>
        </View>

        <Field
          icon="document-attach-outline"
          label="Aadhaar Image URL"
          value={form.aadhaarImageUrl}
          onChangeText={(v: string) => update("aadhaarImageUrl", v)}
          placeholder="Upload URL will come here"
        />

        <Field
          icon="document-text-outline"
          label="License Image URL"
          value={form.licenseImageUrl}
          onChangeText={(v: string) => update("licenseImageUrl", v)}
          placeholder="Upload URL will come here"
        />

        <TouchableOpacity disabled={saving} style={styles.submitBtn} onPress={submitKyc}>
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
          style={styles.input}
        />
      </View>
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
  submitText: { color: T.black, fontWeight: "900", fontSize: 16 },
});