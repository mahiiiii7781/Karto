import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";
import KartoMessageModal, {
  KartoMessageType,
} from "@/components/common/KartoMessageModal";

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
};

const VEHICLE_TYPES = ["BIKE", "SCOOTER", "CYCLE", "E-RICKSHAW"];

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  onPrimary?: () => void;
};

export default function AdminRiderCreateScreen({ route, navigation }: any) {
  const editingRider = route?.params?.rider || null;
  const isEditMode = route?.params?.mode === "edit" || !!editingRider;

  const [cities, setCities] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<any>(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [form, setForm] = useState<any>({
    cityId: "",
    fullName: "",
    email: "",
    password: "123456",
    phone: "",
    vehicleNo: "",
    vehicleType: "BIKE",
    address: "",
    isActive: true,
  });

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (editingRider) {
      setForm({
        cityId: editingRider.cityId || editingRider.city?.id || "",
        fullName: editingRider.fullName || "",
        email: editingRider.email || "",
        password: "",
        phone: editingRider.phone || "",
        vehicleNo: editingRider.vehicleNo || "",
        vehicleType: editingRider.vehicleType || "BIKE",
        address: editingRider.address || "",
        isActive: editingRider.isActive !== false,
      });

      setExistingImageUrl(editingRider.imageUrl || editingRider.image_url || "");
    }
  }, [editingRider]);

  const showMessage = (
    type: KartoMessageType,
    title: string,
    msg: string,
    primaryText = "Done",
    onPrimary?: () => void
  ) => {
    setMessage({
      visible: true,
      type,
      title,
      message: msg,
      primaryText,
      onPrimary,
    });
  };

  const closeMessage = () => {
    setMessage((prev) => ({ ...prev, visible: false }));
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminRiders");
  };

  const loadCities = async () => {
    setLoadingCities(true);

    const { data, error } = await adminService.getCities();

    setLoadingCities(false);

    if (error) {
      showMessage(
        "error",
        "Unable to Load Cities",
        error.message || "Please check your connection and try again."
      );
      return;
    }

    setCities(data || []);

    if (!editingRider && data?.length) {
      setForm((prev: any) => ({ ...prev, cityId: data[0].id }));
    }
  };

  const update = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.cityId),
    [cities, form.cityId]
  );

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to capture rider image.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickImage = async (fromCamera = false) => {
    try {
      if (fromCamera) {
        const granted = await requestCameraPermission();

        if (!granted) {
          showMessage(
            "warning",
            "Camera Permission Required",
            "Camera permission allow karo, tabhi camera open hoga."
          );
          return;
        }
      }

      const fn = fromCamera ? launchCamera : launchImageLibrary;

      const result = await fn({
        mediaType: "photo",
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
        saveToPhotos: fromCamera,
        cameraType: "back",
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showMessage(
          "error",
          "Image Selection Failed",
          result.errorMessage || "Unable to select image. Please try again."
        );
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        showMessage("warning", "No Image Found", "Please select a valid rider image.");
        return;
      }

      setImage({
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        fileName: asset.fileName || `rider-${Date.now()}.jpg`,
        name: asset.fileName || `rider-${Date.now()}.jpg`,
      });
    } catch (error: any) {
      showMessage(
        "error",
        "Image Error",
        error?.message || "Camera/gallery open nahi ho paya."
      );
    }
  };

  const validate = () => {
    if (!form.cityId) return "Please select a service city.";
    if (!form.fullName.trim()) return "Rider name is required.";

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return "Mobile number should contain 10 digits and start with 6, 7, 8 or 9.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Please enter a valid email address for rider login.";
    }

    if (!isEditMode && form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (isEditMode && form.password && form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (!form.vehicleNo.trim()) {
      return "Vehicle number is required.";
    }

    if (!form.address.trim()) {
      return "Rider address is required.";
    }

    return null;
  };

  const submit = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      showMessage("warning", "Please Check Details", validationMessage);
      return;
    }

    setSaving(true);

    const payload = {
      cityId: form.cityId,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password?.trim() || undefined,
      vehicleNo: form.vehicleNo.trim().toUpperCase(),
      vehicleType: form.vehicleType,
      address: form.address.trim(),
      isActive: form.isActive,
      role: "RIDER",
      image,
    };

    const res = isEditMode
      ? await adminService.updateRider(editingRider.id, payload)
      : await adminService.createRider(payload);

    setSaving(false);

    if (res.error) {
      showMessage(
        "error",
        isEditMode ? "Rider Update Failed" : "Rider Creation Failed",
        res.error.message || "Unable to save rider. Please try again."
      );
      return;
    }

    showMessage(
      "success",
      isEditMode ? "Rider Updated Successfully" : "Rider Created Successfully",
      isEditMode
        ? "Delivery partner profile has been updated."
        : "Delivery partner login, city and vehicle profile are ready.",
      "Back to Riders",
      () => {
        closeMessage();
        goBack();
      }
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>
              {isEditMode ? "RIDER PROFILE" : "RIDER ONBOARDING"}
            </Text>
            <Text style={styles.title}>
              {isEditMode ? "Edit Delivery Partner" : "Add Delivery Partner"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode
                ? "Update rider login, city and vehicle profile"
                : "Create rider login, city and vehicle profile"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate("AdminDashboard")}
          >
            <Icon name="home-outline" size={21} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Assignment Ready Profile</Text>
            <Text style={styles.heroTitle}>
              {selectedCity
                ? `${selectedCity.name} • ${form.vehicleType}`
                : `Select City • ${form.vehicleType}`}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name={getVehicleIcon(form.vehicleType)} size={34} color={THEME.yellow} />
          </View>
        </View>

        <TouchableOpacity style={styles.imageBox} activeOpacity={0.9}>
          {image?.uri || existingImageUrl ? (
            <Image source={{ uri: image?.uri || existingImageUrl }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="person-circle-outline" size={42} color={THEME.yellow} />
              <Text style={styles.imageTitle}>Rider Profile Photo</Text>
              <Text style={styles.imageSub}>Add a clear face photo for verification</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.greenImageBtn} onPress={() => pickImage(true)}>
            <Icon name="camera-outline" size={20} color="#000" />
            <Text style={styles.imageBtnText}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.yellowImageBtn} onPress={() => pickImage(false)}>
            <Icon name="images-outline" size={20} color="#000" />
            <Text style={styles.imageBtnText}>Upload File</Text>
          </TouchableOpacity>
        </View>

        <Section title="Service City" icon="business-outline">
          {loadingCities ? (
            <View style={styles.loadingCityBox}>
              <ActivityIndicator color={THEME.yellow} />
              <Text style={styles.loadingCityText}>Loading cities...</Text>
            </View>
          ) : cities.length === 0 ? (
            <View style={styles.emptyCityBox}>
              <Text style={styles.emptyCityText}>No cities found. Create city first.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.chip, form.cityId === city.id && styles.chipActive]}
                  onPress={() => update("cityId", city.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.cityId === city.id && styles.chipTextActive,
                    ]}
                  >
                    {city.name} ({city.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Section>

        <Section title="Vehicle Type" icon="bicycle-outline">
          <View style={styles.typeGrid}>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, form.vehicleType === type && styles.typeBtnActive]}
                onPress={() => update("vehicleType", type)}
              >
                <Icon
                  name={getVehicleIcon(type)}
                  size={22}
                  color={form.vehicleType === type ? "#000" : THEME.yellow}
                />
                <Text
                  style={[
                    styles.typeText,
                    form.vehicleType === type && styles.typeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Personal Information" icon="person-circle-outline">
          <Input
            label="Rider Name"
            icon="person-outline"
            value={form.fullName}
            onChangeText={(v: string) => update("fullName", v)}
            placeholder="Example: Aman Kumar"
          />

          <Input
            label="Mobile Number"
            icon="call-outline"
            value={form.phone}
            onChangeText={(v: string) => update("phone", v)}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Example: 9876543210"
          />

          <Input
            label="Email Address"
            icon="mail-outline"
            value={form.email}
            onChangeText={(v: string) => update("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="rider@karto.in"
          />

          <Input
            label="Address"
            icon="location-outline"
            value={form.address}
            onChangeText={(v: string) => update("address", v)}
            multiline
            placeholder="House number, area, landmark, city"
          />
        </Section>

        <Section title="Vehicle & Login Details" icon="shield-checkmark-outline">
          <Input
            label="Vehicle Number"
            icon="barcode-outline"
            value={form.vehicleNo}
            onChangeText={(v: string) => update("vehicleNo", v)}
            autoCapitalize="characters"
            placeholder="Example: UP27AB1234"
          />

          <Input
            label={isEditMode ? "New Password Optional" : "Password"}
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={(v: string) => update("password", v)}
            secureTextEntry
            placeholder={isEditMode ? "Leave blank to keep old password" : "Minimum 6 characters"}
          />
        </Section>

        {isEditMode ? (
          <Section title="Rider Status" icon="checkmark-circle-outline">
            <TouchableOpacity
              style={[styles.statusToggle, form.isActive && styles.statusToggleActive]}
              onPress={() => update("isActive", !form.isActive)}
              activeOpacity={0.86}
            >
              <Icon
                name={form.isActive ? "checkmark-circle-outline" : "ban-outline"}
                size={22}
                color={form.isActive ? "#000" : THEME.danger}
              />
              <Text
                style={[
                  styles.statusToggleText,
                  form.isActive && styles.statusToggleTextActive,
                ]}
              >
                {form.isActive ? "Rider Active" : "Rider Blocked"}
              </Text>
            </TouchableOpacity>
          </Section>
        ) : null}

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.7 }]}
          onPress={submit}
          disabled={saving}
          activeOpacity={0.86}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Icon name="checkmark-circle-outline" size={22} color="#000" />
              <Text style={styles.createText}>
                {isEditMode ? "Update Delivery Partner" : "Create Delivery Partner"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 42 }} />
      </ScrollView>

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        primaryText={message.primaryText}
        onPrimary={message.onPrimary}
        onClose={closeMessage}
      />
    </View>
  );
}

function getVehicleIcon(type: string) {
  switch (type) {
    case "SCOOTER":
      return "speedometer-outline";
    case "CYCLE":
      return "bicycle-outline";
    case "E-RICKSHAW":
      return "car-outline";
    default:
      return "bicycle-outline";
  }
}

function Section({ title, icon, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={20} color={THEME.yellow} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {children}
    </View>
  );
}

function Input({ label, icon, multiline, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputBox, multiline && styles.textAreaBox]}>
        <Icon name={icon} size={20} color={THEME.yellow} />
        <TextInput
          {...props}
          placeholderTextColor={THEME.muted}
          style={[styles.input, multiline && styles.textArea]}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 16,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  homeBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  smallLabel: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.1,
  },
  title: {
    color: THEME.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "700",
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    color: THEME.yellow,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 5,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  imageBox: {
    height: 174,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 8,
  },
  imageSub: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  greenImageBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  yellowImageBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  imageBtnText: {
    color: "#000",
    fontWeight: "900",
  },
  section: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },
  loadingCityBox: {
    height: 48,
    borderRadius: 17,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  loadingCityText: {
    color: THEME.muted,
    fontWeight: "800",
  },
  emptyCityBox: {
    padding: 14,
    borderRadius: 17,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyCityText: {
    color: THEME.muted,
    fontWeight: "800",
  },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: THEME.input,
  },
  chipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  chipText: {
    color: THEME.muted,
    fontWeight: "900",
  },
  chipTextActive: {
    color: "#000",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  typeBtn: {
    width: "48%",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 13,
    borderRadius: 17,
    backgroundColor: THEME.input,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  typeBtnActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  typeText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 12,
  },
  typeTextActive: {
    color: "#000",
  },
  inputGroup: { marginBottom: 13 },
  label: {
    color: THEME.text,
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 13,
  },
  inputBox: {
    minHeight: 55,
    backgroundColor: THEME.input,
    borderRadius: 19,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
  },
  textAreaBox: {
    minHeight: 98,
    alignItems: "flex-start",
    paddingTop: 14,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  statusToggle: {
    minHeight: 54,
    borderRadius: 19,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  statusToggleActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  statusToggleText: {
    color: THEME.danger,
    fontWeight: "900",
  },
  statusToggleTextActive: {
    color: "#000",
  },
  createBtn: {
    backgroundColor: THEME.yellow,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  createText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
});