import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import vendorService, {
  VendorDashboard,
  VendorRestaurant,
} from "@/services/api/vendorService";

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
  email: string;
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
  email: "",
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

const unwrapData = (res: any) => {
  return (
    res?.data?.data ||
    res?.data?.dashboard ||
    res?.data?.restaurant ||
    res?.data ||
    null
  );
};

const normalizeErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const toStringValue = (value: any, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const buildFormFromRestaurant = (restaurant?: VendorRestaurant | any): StoreForm => {
  if (!restaurant) {
    return defaultForm;
  }

  const open = restaurant.isOpen ?? restaurant.is_open ?? true;
  const accepting =
    restaurant.isAcceptingOrders ??
    restaurant.is_accepting_orders ??
    restaurant.acceptingOrders ??
    open;

  return {
    id: restaurant.id,
    name:
      restaurant.name ||
      restaurant.restaurant_name ||
      restaurant.storeName ||
      "",
    phone: restaurant.phone || "",
    email: restaurant.email || "",
    address:
      restaurant.address ||
      restaurant.fullAddress ||
      restaurant.location ||
      "",
    deliveryTime:
      restaurant.deliveryTime ||
      restaurant.delivery_time ||
      "30-45 mins",
    minimumOrder: toStringValue(
      restaurant.minimumOrder ?? restaurant.minimum_order,
      "0"
    ),
    defaultPrepTime: toStringValue(
      restaurant.defaultPrepTime ??
        restaurant.default_prep_time ??
        restaurant.prepTimeMin ??
        restaurant.prep_time_min,
      "30"
    ),
    openingTime:
      restaurant.openingTime ||
      restaurant.opening_time ||
      "10:00",
    closingTime:
      restaurant.closingTime ||
      restaurant.closing_time ||
      "23:00",
    weeklyOffDay:
      restaurant.weeklyOffDay ||
      restaurant.weekly_off_day ||
      "None",
    isOpen: Boolean(open),
    isAcceptingOrders: Boolean(accepting),
    busyMinutes: "30",
  };
};

const validateTime = (value: string) => {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
};

export default function VendorSettingsScreen() {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<StoreForm>(defaultForm);
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);
  const [busySaving, setBusySaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [errorText, setErrorText] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast(msg);

    toastTimerRef.current = setTimeout(() => {
      setToast("");
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const update = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadSettings = useCallback(async () => {
    setErrorText("");

    const { data, error } = await vendorService.getDashboard();

    if (error || !data) {
      setErrorText(error?.message || "Failed to load settings");
      showToast(error?.message || "Failed to load settings");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setDashboard(data);

    const restaurant = data.restaurants?.[0];

    if (restaurant) {
      setForm(buildFormFromRestaurant(restaurant));
    }

    setLoading(false);
    setRefreshing(false);
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettingsByRoute = async (restaurantId: string | undefined, payload: any) => {
    const attempts = restaurantId
      ? [
          () => vendorService.updateRestaurant(restaurantId, payload),
          () => apiClient.patch(`/vendors/restaurants/${restaurantId}`, payload),
          () => apiClient.patch(`/vendors/settings/${restaurantId}`, payload),
          () => apiClient.patch("/vendors/settings/me", payload),
        ]
      : [
          () => apiClient.patch("/vendors/settings/me", payload),
          () => apiClient.patch("/vendors/restaurants/me", payload),
        ];

    let lastError: any = null;

    for (const attempt of attempts) {
      try {
        const res: any = await attempt();

        if (res?.error) {
          lastError = res.error;
          continue;
        }

        return unwrapData(res) || res?.data || true;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to save settings");
  };

  const saveStatusByRoute = async (
    restaurantId: string | undefined,
    isOpen: boolean,
    isAcceptingOrders: boolean
  ) => {
    const payload = {
      isOpen,
      is_open: isOpen,
      isAcceptingOrders,
      is_accepting_orders: isAcceptingOrders,
    };

    const attempts = restaurantId
      ? [
          () => vendorService.updateRestaurantStatus(restaurantId, isOpen),
          () => apiClient.patch(`/vendors/restaurants/${restaurantId}/status`, payload),
          () => apiClient.patch(`/vendors/settings/${restaurantId}/status`, payload),
          () => apiClient.patch("/vendors/settings/status", payload),
        ]
      : [
          () => apiClient.patch("/vendors/settings/status", payload),
          () => apiClient.patch("/vendors/restaurants/me/status", payload),
        ];

    let lastError: any = null;

    for (const attempt of attempts) {
      try {
        const res: any = await attempt();

        if (res?.error) {
          lastError = res.error;
          continue;
        }

        return true;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to update store status");
  };

  const validateForm = () => {
    const minimumOrder = Number(form.minimumOrder || 0);
    const defaultPrepTime = Number(form.defaultPrepTime || 0);

    if (!form.name.trim()) {
      showToast("Store name required");
      return false;
    }

    if (!form.phone.trim()) {
      showToast("Phone required");
      return false;
    }

    if (form.phone.trim().length < 10) {
      showToast("Enter valid phone number");
      return false;
    }

    if (!form.address.trim()) {
      showToast("Address required");
      return false;
    }

    if (Number.isNaN(minimumOrder) || minimumOrder < 0) {
      showToast("Minimum order cannot be negative");
      return false;
    }

    if (!defaultPrepTime || defaultPrepTime < 5 || defaultPrepTime > 180) {
      showToast("Prep time must be 5 to 180 minutes");
      return false;
    }

    if (!validateTime(form.openingTime)) {
      showToast("Opening time format should be HH:mm");
      return false;
    }

    if (!validateTime(form.closingTime)) {
      showToast("Closing time format should be HH:mm");
      return false;
    }

    return true;
  };

  const saveSettings = async () => {
    if (saving) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      restaurant_name: form.name.trim(),

      phone: form.phone.trim(),
      email: form.email.trim() || null,

      address: form.address.trim(),

      deliveryTime: form.deliveryTime.trim(),
      delivery_time: form.deliveryTime.trim(),

      minimumOrder: Number(form.minimumOrder || 0),
      minimum_order: Number(form.minimumOrder || 0),

      defaultPrepTime: Number(form.defaultPrepTime || 30),
      default_prep_time: Number(form.defaultPrepTime || 30),

      openingTime: form.openingTime.trim(),
      opening_time: form.openingTime.trim(),

      closingTime: form.closingTime.trim(),
      closing_time: form.closingTime.trim(),

      weeklyOffDay: form.weeklyOffDay.trim() || "None",
      weekly_off_day: form.weeklyOffDay.trim() || "None",

      isOpen: form.isOpen,
      is_open: form.isOpen,

      isAcceptingOrders: form.isAcceptingOrders,
      is_accepting_orders: form.isAcceptingOrders,
    };

    try {
      const saved = await saveSettingsByRoute(form.id, payload);

      if (saved && typeof saved === "object") {
        setForm(buildFormFromRestaurant(saved));
      }

      showToast("Settings saved successfully");
    } catch (error: any) {
      showToast(normalizeErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const toggleLiveStatus = async (next: boolean) => {
    if (statusSaving) {
      return;
    }

    const previousOpen = form.isOpen;
    const previousAccepting = form.isAcceptingOrders;

    update("isOpen", next);
    update("isAcceptingOrders", next);

    setStatusSaving(true);

    try {
      await saveStatusByRoute(form.id, next, next);
      showToast(next ? "Store is live" : "Store paused");
    } catch (error: any) {
      update("isOpen", previousOpen);
      update("isAcceptingOrders", previousAccepting);
      showToast(normalizeErrorMessage(error, "Failed to update store status"));
    } finally {
      setStatusSaving(false);
    }
  };

  const setBusyMode = async () => {
    if (busySaving) {
      return;
    }

    const minutes = Number(form.busyMinutes || 30);

    if (!minutes || minutes < 5 || minutes > 180) {
      showToast("Busy time must be 5 to 180 minutes");
      return;
    }

    const previousAccepting = form.isAcceptingOrders;

    update("isAcceptingOrders", false);
    setBusySaving(true);

    const payload = {
      minutes,
      busyMinutes: minutes,
      isAcceptingOrders: false,
      is_accepting_orders: false,
    };

    const attempts = [
      () => apiClient.patch("/vendors/settings/busy-mode", payload),
      () => apiClient.patch("/vendors/restaurants/busy-mode", payload),
      () =>
        form.id
          ? apiClient.patch(`/vendors/restaurants/${form.id}/busy-mode`, payload)
          : Promise.reject(new Error("Restaurant id missing")),
    ];

    let saved = false;
    let lastError: any = null;

    for (const attempt of attempts) {
      try {
        await attempt();
        saved = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (saved) {
      showToast(`Busy mode enabled for ${minutes} min`);
    } else {
      update("isAcceptingOrders", previousAccepting);
      showToast(normalizeErrorMessage(lastError, "Busy mode API not available"));
    }

    setBusySaving(false);
  };

  const restaurantCount = dashboard?.totalRestaurants || dashboard?.restaurants?.length || 0;
  const menuCount = dashboard?.totalMenuItems || 0;
  const todayOrders = dashboard?.todayOrders || 0;

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

        {!!errorText && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={20} color={THEME.danger} />
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Accepting Orders</Text>

            <Text style={styles.statusTitle}>
              {form.isOpen && form.isAcceptingOrders
                ? "Store is Live"
                : "Store is Paused"}
            </Text>

            <Text style={styles.statusSub}>
              Customers can order only when store is open.
            </Text>
          </View>

          <View style={styles.statusSwitchBox}>
            {statusSaving ? (
              <ActivityIndicator color={THEME.bg} />
            ) : (
              <Switch
                value={form.isOpen && form.isAcceptingOrders}
                onValueChange={toggleLiveStatus}
                thumbColor={
                  form.isOpen && form.isAcceptingOrders
                    ? THEME.green
                    : THEME.muted
                }
                trackColor={{
                  false: "#293029",
                  true: "rgba(34,197,94,0.35)",
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat label="Stores" value={restaurantCount} icon="storefront-outline" />
          <MiniStat label="Menu" value={menuCount} icon="fast-food-outline" />
          <MiniStat label="Today" value={todayOrders} icon="receipt-outline" />
        </View>

        <Section title="Store Profile" icon="storefront-outline">
          <Field
            label="Store Name"
            value={form.name}
            onChange={(v: string) => update("name", v)}
          />

          <Field
            label="Phone"
            value={form.phone}
            onChange={(v: string) => update("phone", v)}
            keyboardType="phone-pad"
          />

          <Field
            label="Email"
            value={form.email}
            onChange={(v: string) => update("email", v)}
            keyboardType="email-address"
          />

          <Field
            label="Address"
            value={form.address}
            onChange={(v: string) => update("address", v)}
            multiline
          />

          <Field
            label="Delivery Time Text"
            value={form.deliveryTime}
            onChange={(v: string) => update("deliveryTime", v)}
          />

          <Field
            label="Minimum Order"
            value={form.minimumOrder}
            onChange={(v: string) => update("minimumOrder", v)}
            keyboardType="numeric"
          />
        </Section>

        <Section title="Timing & Prep Time" icon="time-outline">
          <View style={styles.twoCol}>
            <Field
              label="Opening Time"
              value={form.openingTime}
              onChange={(v: string) => update("openingTime", v)}
            />

            <Field
              label="Closing Time"
              value={form.closingTime}
              onChange={(v: string) => update("closingTime", v)}
            />
          </View>

          <Text style={styles.fieldHint}>Use 24-hour format, example 10:00 or 23:30.</Text>

          <Field
            label="Weekly Off Day"
            value={form.weeklyOffDay}
            onChange={(v: string) => update("weeklyOffDay", v)}
          />

          <Field
            label="Default Prep Time"
            value={form.defaultPrepTime}
            onChange={(v: string) => update("defaultPrepTime", v)}
            keyboardType="number-pad"
          />
        </Section>

        <Section title="Busy Mode" icon="flash-outline">
          <Text style={styles.helperText}>
            Busy mode stops new orders for selected minutes. Existing orders stay active.
          </Text>

          <Field
            label="Busy Minutes"
            value={form.busyMinutes}
            onChange={(v: string) => update("busyMinutes", v)}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[styles.busyBtn, busySaving && styles.disabledBtn]}
            activeOpacity={0.85}
            disabled={busySaving}
            onPress={setBusyMode}
          >
            {busySaving ? (
              <ActivityIndicator color={THEME.bg} />
            ) : (
              <>
                <Icon name="pause-circle-outline" size={18} color={THEME.bg} />
                <Text style={styles.busyBtnText}>Enable Busy Mode</Text>
              </>
            )}
          </TouchableOpacity>
        </Section>

        <View style={styles.mediaCard}>
          <View style={styles.mediaIcon}>
            <Icon name="image-outline" size={24} color={THEME.yellow} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.mediaTitle}>Logo & Banner</Text>
            <Text style={styles.mediaText}>
              Image upload is handled separately with gallery/camera. No image URL input.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          activeOpacity={0.85}
          disabled={saving}
          onPress={saveSettings}
        >
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

function Field({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: FieldProps) {
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
        style={[
          styles.input,
          multiline && {
            minHeight: 76,
            textAlignVertical: "top",
          },
        ]}
      />
    </View>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.miniStatIcon}>
        <Icon name={icon} size={17} color={THEME.bg} />
      </View>

      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
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
  toastText: {
    color: THEME.text,
    fontWeight: "900",
    flex: 1,
  },
  header: {
    marginTop: 8,
    marginBottom: 18,
  },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: THEME.text,
    fontSize: 33,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    color: THEME.text,
    flex: 1,
    fontWeight: "800",
  },
  statusCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusLabel: {
    color: THEME.bg,
    fontWeight: "900",
    opacity: 0.75,
  },
  statusTitle: {
    color: THEME.bg,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  statusSub: {
    color: THEME.bg,
    fontWeight: "800",
    opacity: 0.78,
    marginTop: 4,
  },
  statusSwitchBox: {
    minWidth: 58,
    minHeight: 44,
    backgroundColor: THEME.yellow,
    borderRadius: 18,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  miniStat: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 12,
  },
  miniStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  miniStatValue: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: "900",
  },
  miniStatLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  section: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 15,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },
  fieldBox: {
    marginBottom: 11,
    flex: 1,
  },
  fieldLabel: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 7,
  },
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
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  fieldHint: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 10,
    marginTop: -3,
  },
  helperText: {
    color: THEME.muted,
    fontWeight: "700",
    marginBottom: 10,
    lineHeight: 20,
  },
  busyBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  busyBtnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  mediaCard: {
    backgroundColor: "rgba(246,195,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.3)",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  mediaIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaTitle: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  mediaText: {
    color: THEME.text,
    marginTop: 4,
    fontWeight: "700",
    lineHeight: 19,
  },
  saveBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  saveText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 15,
  },
});
