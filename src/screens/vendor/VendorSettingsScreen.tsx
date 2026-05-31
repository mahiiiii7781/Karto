import React, { ReactNode, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  RefreshControl,
  KeyboardTypeOptions,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  yellow: "#F6C343",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
};

type StoreForm = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  deliveryTime: string;
  minimumOrder: string;
  defaultPrepTime: string;
  openingTime: string;
  closingTime: string;
  weeklyOffDay: string;
  isOpen: boolean;
  isAcceptingOrders: boolean;
  busyMinutes: string;
};

const defaultForm: StoreForm = {
  name: "",
  phone: "",
  address: "",
  deliveryTime: "30-45 mins",
  minimumOrder: "0",
  defaultPrepTime: "30",
  openingTime: "10:00",
  closingTime: "23:00",
  weeklyOffDay: "None",
  isOpen: true,
  isAcceptingOrders: true,
  busyMinutes: "30",
};

export default function VendorSettingsScreen() {
  const [form, setForm] = useState<StoreForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const update = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiClient.get("/vendors/dashboard/me");
      const data = res.data.data || res.data.dashboard || res.data;
      const restaurant = data?.restaurants?.[0];

      if (restaurant) {
        setForm({
          id: restaurant.id,
          name: restaurant.name || "",
          phone: restaurant.phone || "",
          address: restaurant.address || "",
          deliveryTime: restaurant.deliveryTime || "30-45 mins",
          minimumOrder: String(restaurant.minimumOrder || 0),
          defaultPrepTime: String(restaurant.defaultPrepTime || 30),
          openingTime: restaurant.openingTime || "10:00",
          closingTime: restaurant.closingTime || "23:00",
          weeklyOffDay: restaurant.weeklyOffDay || "None",
          isOpen: Boolean(restaurant.isOpen),
          isAcceptingOrders:
            restaurant.isAcceptingOrders === undefined
              ? Boolean(restaurant.isOpen)
              : Boolean(restaurant.isAcceptingOrders),
          busyMinutes: "30",
        });
      }
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!form.name.trim()) return showToast("Store name required");
    if (!form.phone.trim()) return showToast("Phone required");
    if (!form.address.trim()) return showToast("Address required");

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      deliveryTime: form.deliveryTime.trim(),
      minimumOrder: Number(form.minimumOrder || 0),
      defaultPrepTime: Number(form.defaultPrepTime || 30),
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      weeklyOffDay: form.weeklyOffDay,
      isOpen: form.isOpen,
      isAcceptingOrders: form.isAcceptingOrders,
    };

    try {
      if (form.id) {
        await apiClient.patch(`/vendors/settings/${form.id}`, payload);
      } else {
        await apiClient.patch("/vendors/settings/me", payload);
      }

      showToast("Settings saved successfully");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Settings API missing");
    } finally {
      setSaving(false);
    }
  };

  const setBusyMode = async () => {
    const minutes = Number(form.busyMinutes || 30);

    if (!minutes || minutes < 5 || minutes > 180) {
      showToast("Busy time must be 5 to 180 minutes");
      return;
    }

    update("isAcceptingOrders", false);

    try {
      await apiClient.patch("/vendors/settings/busy-mode", { minutes });
      showToast(`Busy mode enabled for ${minutes} min`);
    } catch {
      showToast("Busy mode saved locally. Backend API pending.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading store settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon name="checkmark-circle" size={18} color={THEME.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={() => {
              setRefreshing(true);
              loadSettings();
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Vendor Panel</Text>
          <Text style={styles.title}>Store Settings</Text>
          <Text style={styles.subtitle}>Timing, availability and profile.</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Accepting Orders</Text>
            <Text style={styles.statusTitle}>
              {form.isOpen && form.isAcceptingOrders ? "Store is Live" : "Store is Paused"}
            </Text>
            <Text style={styles.statusSub}>
              Customers can order only when store is open.
            </Text>
          </View>

          <View style={styles.statusSwitchBox}>
            <Switch
              value={form.isOpen && form.isAcceptingOrders}
              onValueChange={(v: boolean) => {
                update("isOpen", v);
                update("isAcceptingOrders", v);
              }}
              thumbColor={form.isOpen && form.isAcceptingOrders ? THEME.green : THEME.muted}
              trackColor={{ false: "#293029", true: "rgba(34,197,94,0.35)" }}
            />
          </View>
        </View>

        <Section title="Store Profile" icon="storefront-outline">
          <Field label="Store Name" value={form.name} onChange={(v: string) => update("name", v)} />
          <Field label="Phone" value={form.phone} onChange={(v: string) => update("phone", v)} keyboardType="phone-pad" />
          <Field label="Address" value={form.address} onChange={(v: string) => update("address", v)} multiline />
          <Field label="Delivery Time Text" value={form.deliveryTime} onChange={(v: string) => update("deliveryTime", v)} />
          <Field label="Minimum Order" value={form.minimumOrder} onChange={(v: string) => update("minimumOrder", v)} keyboardType="numeric" />
        </Section>

        <Section title="Timing & Prep Time" icon="time-outline">
          <View style={styles.twoCol}>
            <Field label="Opening Time" value={form.openingTime} onChange={(v: string) => update("openingTime", v)} />
            <Field label="Closing Time" value={form.closingTime} onChange={(v: string) => update("closingTime", v)} />
          </View>

          <Field label="Weekly Off Day" value={form.weeklyOffDay} onChange={(v: string) => update("weeklyOffDay", v)} />
          <Field label="Default Prep Time" value={form.defaultPrepTime} onChange={(v: string) => update("defaultPrepTime", v)} keyboardType="number-pad" />
        </Section>

        <Section title="Busy Mode" icon="flash-outline">
          <Text style={styles.helperText}>
            Busy mode stops new orders for selected minutes. Existing orders stay active.
          </Text>

          <Field label="Busy Minutes" value={form.busyMinutes} onChange={(v: string) => update("busyMinutes", v)} keyboardType="number-pad" />

          <TouchableOpacity style={styles.busyBtn} activeOpacity={0.85} onPress={setBusyMode}>
            <Icon name="pause-circle-outline" size={18} color={THEME.bg} />
            <Text style={styles.busyBtnText}>Enable Busy Mode</Text>
          </TouchableOpacity>
        </Section>

        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} disabled={saving} onPress={saveSettings}>
          {saving ? (
            <ActivityIndicator color={THEME.bg} />
          ) : (
            <>
              <Icon name="save-outline" size={18} color={THEME.bg} />
              <Text style={styles.saveText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type SectionProps = {
  title: string;
  icon: string;
  children: ReactNode;
};

function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={18} color={THEME.bg} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
};

function Field({ label, value, onChange, keyboardType, multiline }: FieldProps) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={label}
        placeholderTextColor={THEME.muted}
        style={[styles.input, multiline && { minHeight: 76, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: "#101A10",
    borderWidth: 1,
    borderColor: THEME.green,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },
  header: { marginTop: 8, marginBottom: 18 },
  kicker: { color: THEME.green, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: THEME.text, fontSize: 33, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 4 },
  statusCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.75 },
  statusTitle: { color: THEME.bg, fontSize: 24, fontWeight: "900", marginTop: 4 },
  statusSub: { color: THEME.bg, fontWeight: "800", opacity: 0.78, marginTop: 4 },
  statusSwitchBox: { backgroundColor: THEME.yellow, borderRadius: 18, padding: 6 },
  section: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 15,
    marginBottom: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  fieldBox: { marginBottom: 11, flex: 1 },
  fieldLabel: { color: THEME.muted, fontWeight: "800", fontSize: 12, marginBottom: 7 },
  input: {
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontWeight: "800",
  },
  twoCol: { flexDirection: "row", gap: 10 },
  helperText: { color: THEME.muted, fontWeight: "700", marginBottom: 10, lineHeight: 20 },
  busyBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  busyBtnText: { color: THEME.bg, fontWeight: "900" },
  saveBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { color: THEME.bg, fontWeight: "900", fontSize: 15 },
});