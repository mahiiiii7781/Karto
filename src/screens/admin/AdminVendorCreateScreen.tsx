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
import { adminVendorService, City } from "@/services/api/adminVendorService";
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

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  onPrimary?: () => void;
};

export default function AdminVendorCreateScreen({ route, navigation }: any) {
  const editingVendor = route?.params?.vendor || null;
  const isEditMode = route?.params?.mode === "edit" || !!editingVendor;

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  const [image, setImage] = useState<any>(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    primaryText: "Done",
  });

  const [form, setForm] = useState<any>({
    name: "",
    ownerName: "",
    ownerMobileNo: "",
    phone: "",
    email: "",
    password: "123456",
    address: "",
    latitude: "",
    longitude: "",
    type: "",
    commission: "10",
    cityId: "",
    categoryId: "",
    isOpen: true,
    isActive: true,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (editingVendor) {
      const vendorCategoryId =
        editingVendor.categoryId || editingVendor.category?.id || "";

      const vendorType =
        editingVendor.type ||
        editingVendor.category?.name?.toUpperCase?.() ||
        "";

      setForm({
        name: editingVendor.name || "",
        ownerName: editingVendor.ownerName || editingVendor.vendor?.fullName || "",
        ownerMobileNo:
          editingVendor.ownerMobileNo || editingVendor.vendor?.phone || "",
        phone: editingVendor.phone || "",
        email: editingVendor.email || editingVendor.vendor?.email || "",
        password: "",
        address: editingVendor.address || "",
        latitude:
          editingVendor.latitude !== undefined && editingVendor.latitude !== null
            ? String(editingVendor.latitude)
            : "",
        longitude:
          editingVendor.longitude !== undefined && editingVendor.longitude !== null
            ? String(editingVendor.longitude)
            : "",
        type: vendorType,
        commission: String(editingVendor.commission ?? 10),
        cityId: editingVendor.cityId || editingVendor.city?.id || "",
        categoryId: vendorCategoryId,
        isOpen: editingVendor.isOpen !== false,
        isActive: editingVendor.vendor?.isActive !== false,
      });

      setExistingImageUrl(editingVendor.imageUrl || editingVendor.image_url || "");
    }
  }, [editingVendor]);

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
    else navigation.navigate("AdminVendors");
  };

  const loadInitialData = async () => {
    await Promise.all([loadCities(), loadCategories()]);
  };

  const loadCities = async () => {
    setLoadingCities(true);

    const { data, error } = await adminVendorService.getCities();

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

    if (!editingVendor && data?.length) {
      setForm((prev: any) => ({
        ...prev,
        cityId: prev.cityId || data[0].id,
      }));
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);

    const { data, error } = await adminService.categories();

    setLoadingCategories(false);

    if (error) {
      showMessage(
        "error",
        "Unable to Load Categories",
        error.message || "Business categories load nahi hui."
      );
      return;
    }

    const activeCategories = (data || []).filter(
      (cat: any) => cat.isActive !== false
    );

    setCategories(activeCategories);

    if (!editingVendor && activeCategories.length > 0) {
      const first = activeCategories[0];

      setForm((prev: any) => ({
        ...prev,
        categoryId: prev.categoryId || first.id,
        type: prev.type || normalizeType(first.name),
      }));
    }
  };

  const update = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateCategory = (category: any) => {
    setForm((prev: any) => ({
      ...prev,
      categoryId: category.id,
      type: normalizeType(category.name),
    }));
  };

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.cityId),
    [cities, form.cityId]
  );

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === form.categoryId),
    [categories, form.categoryId]
  );

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to capture vendor image.",
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
        showMessage("warning", "No Image Found", "Please select a valid vendor image.");
        return;
      }

      setImage({
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        fileName: asset.fileName || `vendor-${Date.now()}.jpg`,
        name: asset.fileName || `vendor-${Date.now()}.jpg`,
      });
    } catch (error: any) {
      showMessage(
        "error",
        "Image Error",
        error?.message || "Camera/gallery open nahi ho paya."
      );
    }
  };

  const validateCoordinate = (value: string, type: "lat" | "lng") => {
    if (!String(value || "").trim()) return true;

    const n = Number(value);

    if (Number.isNaN(n)) return false;

    if (type === "lat") return n >= -90 && n <= 90;

    return n >= -180 && n <= 180;
  };

  const validate = () => {
    if (!form.cityId) return "Please select a service city.";
    if (!form.categoryId) return "Please select dynamic business category.";
    if (!form.name.trim()) return "Vendor name is required.";
    if (!form.ownerName.trim()) return "Owner name is required.";

    if (!/^[6-9]\d{9}$/.test(form.ownerMobileNo.trim())) {
      return "Enter a valid 10 digit owner mobile number.";
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return "Enter a valid 10 digit vendor phone number.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    if (!isEditMode && form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (isEditMode && form.password && form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (!form.address.trim()) return "Vendor address is required.";

    if (!validateCoordinate(form.latitude, "lat")) {
      return "Latitude must be a valid number between -90 and 90.";
    }

    if (!validateCoordinate(form.longitude, "lng")) {
      return "Longitude must be a valid number between -180 and 180.";
    }

    if (
      (String(form.latitude || "").trim() && !String(form.longitude || "").trim()) ||
      (!String(form.latitude || "").trim() && String(form.longitude || "").trim())
    ) {
      return "Latitude and longitude dono enter karo ya dono blank rakho.";
    }

    const commission = Number(form.commission);

    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      return "Commission must be between 0 and 100.";
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

    const payload: any = {
      cityId: form.cityId,
      categoryId: form.categoryId,
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerMobileNo: form.ownerMobileNo.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password?.trim() || undefined,
      address: form.address.trim(),
      type: normalizeType(selectedCategory?.name || form.type),
      commission: Number(form.commission),
      role: "VENDOR",
      image,
      isOpen: form.isOpen,
      isActive: form.isActive,
    };

    if (String(form.latitude || "").trim() && String(form.longitude || "").trim()) {
      payload.latitude = Number(form.latitude);
      payload.longitude = Number(form.longitude);
    }

    const res = isEditMode
      ? await adminVendorService.updateVendor(editingVendor.id, payload)
      : await adminVendorService.createVendor(payload);

    setSaving(false);

    if (res.error) {
      showMessage(
        "error",
        isEditMode ? "Vendor Update Failed" : "Vendor Creation Failed",
        res.error.message || "Unable to save vendor. Please try again."
      );
      return;
    }

    showMessage(
      "success",
      isEditMode ? "Vendor Updated Successfully" : "Vendor Created Successfully",
      isEditMode
        ? "Vendor profile, location, category, login and commission updated."
        : "Vendor profile, location, dynamic category, login access and commission setup are ready.",
      "Back to Vendors",
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
              {isEditMode ? "VENDOR PROFILE" : "VENDOR ONBOARDING"}
            </Text>
            <Text style={styles.title}>
              {isEditMode ? "Edit Vendor" : "Add New Vendor"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode
                ? "Update vendor profile, image, login, category, location and commission"
                : "Create vendor with dynamic business category and location"}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Selected Setup</Text>
            <Text style={styles.heroTitle}>
              {selectedCity ? `${selectedCity.name} (${selectedCity.code})` : "No city selected"}
            </Text>
            <Text style={styles.heroSub}>
              {selectedCategory?.name || "No business category"}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name={getCategoryIcon(selectedCategory?.name)} size={34} color={THEME.yellow} />
          </View>
        </View>

        <TouchableOpacity style={styles.imageBox} activeOpacity={0.9}>
          {image?.uri || existingImageUrl ? (
            <Image source={{ uri: image?.uri || existingImageUrl }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={38} color={THEME.yellow} />
              <Text style={styles.imageTitle}>Vendor Display Image</Text>
              <Text style={styles.imageSub}>Add clean store or restaurant photo</Text>
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
            <LoadingBox text="Loading cities..." />
          ) : cities.length === 0 ? (
            <EmptyBox text="No cities found. Create city first." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.chip, form.cityId === city.id && styles.chipActive]}
                  onPress={() => update("cityId", city.id)}
                >
                  <Text style={[styles.chipText, form.cityId === city.id && styles.chipTextActive]}>
                    {city.name} ({city.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Section>

        <Section title="Business Category" icon="grid-outline">
          {loadingCategories ? (
            <LoadingBox text="Loading categories..." />
          ) : categories.length === 0 ? (
            <EmptyBox text="No business categories found. Add category first from Admin Categories." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    form.categoryId === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => updateCategory(category)}
                >
                  <Icon
                    name={getCategoryIcon(category.name)}
                    size={18}
                    color={form.categoryId === category.id ? "#000" : THEME.yellow}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      form.categoryId === category.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Section>

        <Section title="Vendor Details" icon="storefront-outline">
          <Input
            label="Vendor Name"
            icon="storefront-outline"
            value={form.name}
            onChangeText={(v: string) => update("name", v)}
            placeholder="Example: Karto Fresh Mart"
          />

          <Input
            label="Vendor Phone"
            icon="call-outline"
            value={form.phone}
            onChangeText={(v: string) => update("phone", v)}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Example: 9876543210"
          />

          <Input
            label="Vendor Email"
            icon="mail-outline"
            value={form.email}
            onChangeText={(v: string) => update("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="vendor@karto.in"
          />

          <Input
            label="Commission %"
            icon="pricetag-outline"
            value={form.commission}
            onChangeText={(v: string) => update("commission", v)}
            keyboardType="numeric"
            placeholder="Example: 10"
          />

          <Input
            label="Full Address"
            icon="location-outline"
            value={form.address}
            onChangeText={(v: string) => update("address", v)}
            multiline
            placeholder="Shop number, market, landmark, city"
          />
        </Section>

        <Section title="Vendor Location For Delivery Fee" icon="navigate-circle-outline">
          <View style={styles.locationNote}>
            <Icon name="information-circle-outline" size={18} color={THEME.yellow} />
            <Text style={styles.locationNoteText}>
              Latitude/Longitude se customer distance calculate hoga. Blank rakhoge to distance 0 maanega.
            </Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Input
                label="Latitude"
                icon="map-outline"
                value={form.latitude}
                onChangeText={(v: string) => update("latitude", v)}
                keyboardType="decimal-pad"
                placeholder="27.9124"
              />
            </View>

            <View style={styles.halfInput}>
              <Input
                label="Longitude"
                icon="navigate-outline"
                value={form.longitude}
                onChangeText={(v: string) => update("longitude", v)}
                keyboardType="decimal-pad"
                placeholder="79.9097"
              />
            </View>
          </View>
        </Section>

        <Section title="Owner Login Details" icon="person-circle-outline">
          <Input
            label="Owner Name"
            icon="person-outline"
            value={form.ownerName}
            onChangeText={(v: string) => update("ownerName", v)}
            placeholder="Example: Rahul Sharma"
          />

          <Input
            label="Owner Mobile No"
            icon="phone-portrait-outline"
            value={form.ownerMobileNo}
            onChangeText={(v: string) => update("ownerMobileNo", v)}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Example: 9876543210"
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
          <Section title="Vendor Status" icon="checkmark-circle-outline">
            <TouchableOpacity
              style={[styles.statusToggle, form.isOpen && styles.statusToggleActive]}
              onPress={() => update("isOpen", !form.isOpen)}
              activeOpacity={0.86}
            >
              <Icon
                name={form.isOpen ? "checkmark-circle-outline" : "ban-outline"}
                size={22}
                color={form.isOpen ? "#000" : THEME.danger}
              />
              <Text style={[styles.statusToggleText, form.isOpen && styles.statusToggleTextActive]}>
                {form.isOpen ? "Vendor Open / Active" : "Vendor Blocked / Closed"}
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
                {isEditMode ? "Update Vendor" : "Create Vendor"}
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

function normalizeType(value?: string) {
  if (!value) return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function getCategoryIcon(name?: string) {
  const value = String(name || "").toLowerCase();

  if (value.includes("grocery") || value.includes("kirana")) return "basket-outline";
  if (value.includes("medicine") || value.includes("medical") || value.includes("pharmacy")) return "medkit-outline";
  if (value.includes("bakery") || value.includes("cafe")) return "cafe-outline";
  if (value.includes("sweet") || value.includes("mithai")) return "ice-cream-outline";
  if (value.includes("fruit")) return "nutrition-outline";
  if (value.includes("vegetable")) return "leaf-outline";
  if (value.includes("electronic")) return "phone-portrait-outline";
  if (value.includes("beauty")) return "sparkles-outline";
  if (value.includes("restaurant") || value.includes("food")) return "restaurant-outline";

  return "grid-outline";
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

function LoadingBox({ text }: any) {
  return (
    <View style={styles.loadingBox}>
      <ActivityIndicator color={THEME.yellow} />
      <Text style={styles.loadingBoxText}>{text}</Text>
    </View>
  );
}

function EmptyBox({ text }: any) {
  return (
    <View style={styles.emptyBox}>
      <Icon name="alert-circle-outline" size={20} color={THEME.danger} />
      <Text style={styles.emptyBoxText}>{text}</Text>
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
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
  },

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

  heroSub: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "800",
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

  imagePreview: {
    width: "100%",
    height: "100%",
  },

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

  locationNote: {
    minHeight: 46,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 13,
  },

  locationNoteText: {
    flex: 1,
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 17,
  },

  rowInputs: {
    flexDirection: "row",
    gap: 10,
  },

  halfInput: {
    flex: 1,
  },

  loadingBox: {
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },

  loadingBoxText: {
    color: THEME.muted,
    fontWeight: "800",
  },

  emptyBox: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },

  emptyBoxText: {
    flex: 1,
    color: THEME.danger,
    fontWeight: "800",
    fontSize: 12,
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

  categoryChip: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: THEME.input,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  categoryChipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },

  categoryChipText: {
    color: THEME.muted,
    fontWeight: "900",
  },

  categoryChipTextActive: {
    color: "#000",
  },

  inputGroup: {
    marginBottom: 13,
  },

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
