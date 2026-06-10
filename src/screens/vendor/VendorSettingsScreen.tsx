import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
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
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";
import { imageUploadService } from "@/services/api/imageUploadService";
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
  orange: "#FB923C",
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
  imageUrl: string;
  bannerUrl: string;
};

type UploadType = "logo" | "banner";

const WEEK_DAYS = [
  "None",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const BUSY_PRESETS = [15, 30, 45, 60, 90];

const DELIVERY_PRESETS = ["20-30 mins", "30-45 mins", "45-60 mins"];

const PREP_PRESETS = [15, 20, 25, 30, 40];

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
  imageUrl: "",
  bannerUrl: "",
};

const unwrapData = (res: any) => {
  return (
    res?.data?.data ||
    res?.data?.dashboard ||
    res?.data?.restaurant ||
    res?.data?.profile ||
    res?.data ||
    null
  );
};

const getUploadedImageUrl = (res: any) => {
  return (
    res?.data?.imageUrl ||
    res?.data?.image_url ||
    res?.data?.bannerUrl ||
    res?.data?.banner_url ||
    res?.data?.logoUrl ||
    res?.data?.logo_url ||
    res?.data?.url ||
    res?.data?.secure_url ||
    res?.data?.data?.imageUrl ||
    res?.data?.data?.image_url ||
    res?.data?.data?.bannerUrl ||
    res?.data?.data?.banner_url ||
    res?.data?.data?.logoUrl ||
    res?.data?.data?.logo_url ||
    res?.data?.data?.url ||
    res?.data?.data?.secure_url ||
    res?.data?.file?.url ||
    res?.data?.file?.secure_url ||
    res?.data?.result?.url ||
    res?.data?.result?.secure_url ||
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
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const onlyNumber = (value: string) => value.replace(/[^0-9]/g, "");

const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, "");

const buildFormFromRestaurant = (restaurant?: VendorRestaurant | any): StoreForm => {
  if (!restaurant) return defaultForm;

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
    imageUrl:
      restaurant.imageUrl ||
      restaurant.image_url ||
      restaurant.logoUrl ||
      restaurant.logo_url ||
      restaurant.image ||
      "",
    bannerUrl:
      restaurant.bannerUrl ||
      restaurant.banner_url ||
      restaurant.coverUrl ||
      restaurant.cover_url ||
      restaurant.banner ||
      "",
  };
};

const validateTime = (value: string) => {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
};

const statusText = (form: StoreForm) => {
  if (form.isOpen && form.isAcceptingOrders) return "Store is Live";
  if (form.isOpen && !form.isAcceptingOrders) return "Open but Busy";
  return "Store is Paused";
};

const statusSubText = (form: StoreForm) => {
  if (form.isOpen && form.isAcceptingOrders) {
    return "Customers can place new orders right now.";
  }
  if (form.isOpen && !form.isAcceptingOrders) {
    return "Store is visible, but new orders are temporarily blocked.";
  }
  return "Customers cannot place orders until store is live.";
};

export default function VendorSettingsScreen({ navigation }: any) {
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [form, setForm] = useState<StoreForm>(defaultForm);
  const [dashboard, setDashboard] = useState<VendorDashboard | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statusSaving, setStatusSaving] = useState(false);
  const [busySaving, setBusySaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<UploadType | null>(null);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [errorText, setErrorText] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast(msg);

    toastTimerRef.current = setTimeout(() => {
      setToast("");
    }, 2300);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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

    const [profileRes, dashboardRes] = await Promise.all([
      vendorService.getProfile(),
      vendorService.getDashboard(),
    ]);

    if (!mountedRef.current) return;

    if (dashboardRes.data) {
      setDashboard(dashboardRes.data);
    }

    if (profileRes.error && dashboardRes.error) {
      const msg =
        profileRes.error?.message ||
        dashboardRes.error?.message ||
        "Failed to load settings";
      setErrorText(msg);
      showToast(msg);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const restaurant =
      profileRes.data ||
      dashboardRes.data?.restaurants?.[0] ||
      null;

    if (restaurant) {
      setForm(buildFormFromRestaurant(restaurant));
    }

    setLoading(false);
    setRefreshing(false);
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

    const digitPhone = form.phone.replace(/\D/g, "");
    if (digitPhone.length < 10) {
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
    if (saving || !validateForm()) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      deliveryTime: form.deliveryTime.trim(),
      minimumOrder: Number(form.minimumOrder || 0),
      defaultPrepTime: Number(form.defaultPrepTime || 30),
      openingTime: form.openingTime.trim(),
      closingTime: form.closingTime.trim(),
      weeklyOffDay: form.weeklyOffDay.trim() || "None",
      isOpen: form.isOpen,
      isAcceptingOrders: form.isAcceptingOrders,
      imageUrl: form.imageUrl || null,
      bannerUrl: form.bannerUrl || null,
    };

    try {
      const { data, error } = await vendorService.updateSettings(
        payload as any,
        form.id
      );

      if (error) {
        showToast(error.message || "Failed to save settings");
        setSaving(false);
        return;
      }

      if (data) {
        setForm((prev) => ({
          ...buildFormFromRestaurant(data),
          busyMinutes: prev.busyMinutes,
        }));
      }

      showToast("Settings saved successfully");
      loadSettings();
    } catch (error: any) {
      showToast(normalizeErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const toggleLiveStatus = async (next: boolean) => {
    if (statusSaving) return;

    const previousOpen = form.isOpen;
    const previousAccepting = form.isAcceptingOrders;

    update("isOpen", next);
    update("isAcceptingOrders", next);

    setStatusSaving(true);

    try {
      const { data, error } = await vendorService.toggleOpenClose(next);

      if (error) {
        throw error;
      }

      if (data) {
        setForm((prev) => ({
          ...prev,
          ...buildFormFromRestaurant(data),
          busyMinutes: prev.busyMinutes,
        }));
      }

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
    if (busySaving) return;

    const minutes = Number(form.busyMinutes || 30);

    if (!minutes || minutes < 5 || minutes > 180) {
      showToast("Busy time must be 5 to 180 minutes");
      return;
    }

    const previousOpen = form.isOpen;
    const previousAccepting = form.isAcceptingOrders;

    update("isOpen", false);
    update("isAcceptingOrders", false);
    setBusySaving(true);

    try {
      const { data, error } = await vendorService.setBusyMode(minutes);

      if (error) {
        throw error;
      }

      const restaurant = data?.restaurant || data;
      if (restaurant?.id) {
        setForm((prev) => ({
          ...prev,
          ...buildFormFromRestaurant(restaurant),
          busyMinutes: String(minutes),
        }));
      }

      showToast(`Busy mode enabled for ${minutes} min`);
    } catch (error: any) {
      update("isOpen", previousOpen);
      update("isAcceptingOrders", previousAccepting);
      showToast(normalizeErrorMessage(error, "Busy mode failed"));
    } finally {
      setBusySaving(false);
    }
  };

  const patchRestaurantMedia = async (
    type: UploadType,
    url: string | null
  ) => {
    const payload =
      type === "banner"
        ? {
            bannerUrl: url,
            banner_url: url,
            coverUrl: url,
          }
        : {
            imageUrl: url,
            image_url: url,
            logoUrl: url,
          };

    const endpoint = form.id
      ? `/vendor/settings/${form.id}`
      : "/vendor/settings/me";

    const res = await apiClient.patch(endpoint, payload);
    return unwrapData(res);
  };

  const applyRestaurantMediaLocally = (
    type: UploadType,
    url: string | null,
    restaurant?: any
  ) => {
    setForm((prev) => {
      const next = restaurant?.id
        ? {
            ...buildFormFromRestaurant({
              ...restaurant,
              imageUrl:
                restaurant.imageUrl ||
                restaurant.image_url ||
                restaurant.logoUrl ||
                restaurant.logo_url ||
                prev.imageUrl,
              bannerUrl:
                restaurant.bannerUrl ||
                restaurant.banner_url ||
                restaurant.coverUrl ||
                restaurant.cover_url ||
                prev.bannerUrl,
            }),
            busyMinutes: prev.busyMinutes,
          }
        : prev;

      return {
        ...next,
        imageUrl: type === "logo" ? url || "" : next.imageUrl,
        bannerUrl: type === "banner" ? url || "" : next.bannerUrl,
      };
    });

    setImageVersion(Date.now());
  };

  const uploadImageToServer = async (type: UploadType) => {
    if (uploadingType) return null;

    setUploadingType(type);

    try {
      const folder = type === "banner" ? "vendor/banner" : "vendor/logo";

      const url = await imageUploadService.pickAndUpload(folder);

      if (!url) {
        return null;
      }

      applyRestaurantMediaLocally(type, url);

      try {
        const updatedRestaurant = await patchRestaurantMedia(type, url);
        applyRestaurantMediaLocally(type, url, updatedRestaurant);
      } catch (patchError: any) {
        showToast(
          normalizeErrorMessage(
            patchError,
            "Image uploaded, but store profile update failed"
          )
        );
        return null;
      }

      showToast(type === "banner" ? "Banner updated" : "Logo updated");

     setImageVersion(Date.now());

await loadSettings();

      return url;
    } catch (error: any) {
      showToast(normalizeErrorMessage(error, "Image upload failed"));
      return null;
    } finally {
      setUploadingType(null);
    }
  };

  const pickImage = async (type: UploadType) => {
    await uploadImageToServer(type);
  };

  const removeMedia = async (type: UploadType) => {
    if (uploadingType) return;

    const previousUrl = type === "banner" ? form.bannerUrl : form.imageUrl;

    applyRestaurantMediaLocally(type, null);

    try {
      await patchRestaurantMedia(type, null);
      showToast(type === "banner" ? "Banner removed" : "Logo removed");
      setImageVersion(Date.now());
      await loadSettings();
    } catch (error: any) {
      applyRestaurantMediaLocally(type, previousUrl);
      showToast(normalizeErrorMessage(error, "Failed to remove image"));
    }
  };

  const showImageOptions = (type: UploadType) => {
    Alert.alert(
      type === "banner" ? "Store Banner" : "Store Logo",
      "Choose image source",
      [
        { text: "Gallery", onPress: () => pickImage(type) },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMedia(type),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const restaurantCount =
    dashboard?.totalRestaurants || dashboard?.restaurants?.length || 0;
  const menuCount = dashboard?.totalMenuItems || 0;
  const todayOrders = dashboard?.todayOrders || 0;
  const activeOrders = dashboard?.activeOrders || 0;

  const profileCompleteness = useMemo(() => {
    const checks = [
      form.name,
      form.phone,
      form.address,
      form.deliveryTime,
      form.openingTime,
      form.closingTime,
      form.imageUrl,
      form.bannerUrl,
    ];

    const done = checks.filter((item) => String(item || "").trim()).length;
    return Math.round((done / checks.length) * 100);
  }, [form]);

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

      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.85}
              onPress={() => navigation?.goBack?.()}
            >
              <Icon name="arrow-back" size={21} color={THEME.text} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Vendor Panel</Text>
              <Text style={styles.title}>Store Settings</Text>
              <Text style={styles.subtitle}>Timing, availability and profile.</Text>
            </View>
          </View>

          {!!errorText && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={20} color={THEME.danger} />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <View style={[styles.statusCard, !(form.isOpen && form.isAcceptingOrders) && styles.pausedStatusCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Accepting Orders</Text>
              <Text style={styles.statusTitle}>{statusText(form)}</Text>
              <Text style={styles.statusSub}>{statusSubText(form)}</Text>
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
            <MiniStat label="Active" value={activeOrders} icon="flame-outline" />
          </View>

          <View style={styles.profileCard}>
            <View>
              <Text style={styles.sectionTitle}>Profile Completion</Text>
              <Text style={styles.sectionSub}>
                Add logo, banner and store details for better trust.
              </Text>
            </View>

            <View style={styles.completionCircle}>
              <Text style={styles.completionText}>{profileCompleteness}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${profileCompleteness}%` },
                ]}
              />
            </View>
          </View>

          <Section title="Store Media" icon="image-outline">
            <ImagePickerCard
              type="banner"
              title="Store Banner"
              subtitle="Best for store header and customer trust"
              imageUrl={form.bannerUrl}
              imageVersion={imageVersion}
              uploading={uploadingType === "banner"}
              onPress={() => showImageOptions("banner")}
            />

            <ImagePickerCard
              type="logo"
              title="Store Logo"
              subtitle="Shown in restaurant cards and profile"
              imageUrl={form.imageUrl}
              imageVersion={imageVersion}
              uploading={uploadingType === "logo"}
              onPress={() => showImageOptions("logo")}
            />
          </Section>

          <Section title="Store Profile" icon="storefront-outline">
            <Field
              label="Store Name"
              value={form.name}
              onChange={(v: string) => update("name", v)}
            />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(v: string) => update("phone", normalizePhone(v))}
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

            <ChipRow
              items={DELIVERY_PRESETS}
              active={form.deliveryTime}
              onSelect={(value) => update("deliveryTime", value)}
            />

            <Field
              label="Minimum Order"
              value={form.minimumOrder}
              onChange={(v: string) => update("minimumOrder", onlyNumber(v))}
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

            <Text style={styles.fieldHint}>
              Use 24-hour format, example 10:00 or 23:30.
            </Text>

            <Text style={styles.fieldLabel}>Weekly Off Day</Text>
            <ChipRow
              items={WEEK_DAYS}
              active={form.weeklyOffDay}
              onSelect={(value) => update("weeklyOffDay", value)}
            />

            <Field
              label="Default Prep Time"
              value={form.defaultPrepTime}
              onChange={(v: string) => update("defaultPrepTime", onlyNumber(v))}
              keyboardType="number-pad"
            />

            <ChipRow
              items={PREP_PRESETS.map(String)}
              active={form.defaultPrepTime}
              onSelect={(value) => update("defaultPrepTime", value)}
              suffix=" min"
            />
          </Section>

          <Section title="Busy Mode" icon="flash-outline">
            <Text style={styles.helperText}>
              Busy mode stops new orders for selected minutes. Existing orders stay active.
            </Text>

            <Field
              label="Busy Minutes"
              value={form.busyMinutes}
              onChange={(v: string) => update("busyMinutes", onlyNumber(v))}
              keyboardType="number-pad"
            />

            <ChipRow
              items={BUSY_PRESETS.map(String)}
              active={form.busyMinutes}
              onSelect={(value) => update("busyMinutes", value)}
              suffix=" min"
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

          <View style={styles.noteCard}>
            <Icon name="shield-checkmark-outline" size={22} color={THEME.yellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>Safe Vendor Controls</Text>
              <Text style={styles.noteText}>
                These settings are connected with backend vendor APIs. Image URL input
                is removed; camera and gallery upload are used instead.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabledBtn]}
            activeOpacity={0.85}
            disabled={saving || uploadingType !== null}
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
      </KeyboardAvoidingView>
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
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        placeholder={label}
        placeholderTextColor={THEME.muted}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function ChipRow({
  items,
  active,
  onSelect,
  suffix = "",
}: {
  items: string[];
  active: string;
  onSelect: (value: string) => void;
  suffix?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {items.map((item) => {
        const selected = item === active;

        return (
          <TouchableOpacity
            key={item}
            style={[styles.chip, selected && styles.chipActive]}
            activeOpacity={0.85}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>
              {item}
              {suffix}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ImagePickerCard({
  type,
  title,
  subtitle,
  imageUrl,
  imageVersion,
  uploading,
  onPress,
}: {
  type: UploadType;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageVersion: number;
  uploading: boolean;
  onPress: () => void;
}) {
  const isBanner = type === "banner";

  return (
    <TouchableOpacity
      style={isBanner ? styles.bannerPicker : styles.logoPicker}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={uploading}
    >
      {imageUrl ? (
        <Image
          key={`${type}-${imageUrl}-${imageVersion}`}
          source={{
            uri: imageUrl.includes("?")
              ? `${imageUrl}&v=${imageVersion}`
              : `${imageUrl}?v=${imageVersion}`,
          }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imageEmpty}>
          <Icon
            name={isBanner ? "images-outline" : "camera-outline"}
            size={isBanner ? 34 : 28}
            color={THEME.yellow}
          />
        </View>
      )}

      <View style={styles.imageShade} />

      <View style={styles.imagePickerContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.imageTitle}>{title}</Text>
          <Text style={styles.imageSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.imageAction}>
          {uploading ? (
            <ActivityIndicator color={THEME.bg} />
          ) : (
            <>
              <Icon name="camera-outline" size={16} color={THEME.bg} />
              <Text style={styles.imageActionText}>
                {imageUrl ? "Change" : "Add"}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  keyboardRoot: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 42,
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
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
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
  pausedStatusCard: {
    backgroundColor: THEME.orange,
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
  profileCard: {
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  completionCircle: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  completionText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 18,
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: THEME.card2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.green,
    borderRadius: 999,
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
  sectionSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
    paddingRight: 80,
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
  multilineInput: {
    minHeight: 78,
    textAlignVertical: "top",
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
  chipRow: {
    gap: 8,
    paddingBottom: 10,
  },
  chip: {
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  chipText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  chipTextActive: {
    color: THEME.bg,
  },
  busyBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 2,
  },
  busyBtnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  bannerPicker: {
    height: 145,
    borderRadius: 22,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  logoPicker: {
    height: 108,
    borderRadius: 22,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  imageEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  imagePickerContent: {
    flex: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  imageTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 16,
  },
  imageSubtitle: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
    fontSize: 12,
  },
  imageAction: {
    minWidth: 82,
    height: 38,
    borderRadius: 999,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
  },
  imageActionText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 12,
  },
  noteCard: {
    backgroundColor: "rgba(246,195,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.3)",
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  noteTitle: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  noteText: {
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
