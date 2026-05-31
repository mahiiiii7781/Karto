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
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Icon from "react-native-vector-icons/Ionicons";
import { adminVendorService, City } from "@/services/api/adminVendorService";
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

const VENDOR_TYPES = ["RESTAURANT", "GROCERY", "MEDICINE", "BAKERY"];

type MessageState = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  onPrimary?: () => void;
};

export default function AdminVendorCreateScreen({ navigation }: any) {
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const [form, setForm] = useState<any>({
    name: "",
    ownerName: "",
    ownerMobileNo: "",
    phone: "",
    email: "",
    password: "123456",
    address: "",
    type: "RESTAURANT",
    commission: "10",
    cityId: "",
  });

  const [image, setImage] = useState<any>(null);

  useEffect(() => {
    loadCities();
  }, []);

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

    if (data?.length) {
      setForm((prev: any) => ({ ...prev, cityId: data[0].id }));
    }
  };

  const update = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.cityId),
    [cities, form.cityId]
  );

  const pickImage = async (fromCamera = false) => {
    const fn = fromCamera ? launchCamera : launchImageLibrary;

    const result = await fn({
      mediaType: "photo",
      quality: 0.8,
      selectionLimit: 1,
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

    setImage(asset);
  };

  const validate = () => {
    if (!form.cityId) return "Please select a service city.";
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
    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (!form.address.trim()) {
      return "Vendor address is required.";
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

    const payload = {
      ...form,
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerMobileNo: form.ownerMobileNo.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      commission: Number(form.commission),
      role: "VENDOR",
      image,
    };

    const res = await adminVendorService.createVendor(payload);

    setSaving(false);

    if (res.error) {
      showMessage(
        "error",
        "Vendor Creation Failed",
        res.error.message || "Unable to create vendor. Please try again."
      );
      return;
    }

    showMessage(
      "success",
      "Vendor Created Successfully",
      "Vendor profile, login access and commission setup are ready.",
      "Back to Vendors",
      () => {
        closeMessage();
        navigation.goBack();
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>VENDOR ONBOARDING</Text>
            <Text style={styles.title}>Add New Vendor</Text>
            <Text style={styles.subtitle}>Create vendor profile, login and commission</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Selected City</Text>
            <Text style={styles.heroTitle}>
              {selectedCity ? `${selectedCity.name} (${selectedCity.code})` : "No city selected"}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="storefront-outline" size={34} color={THEME.yellow} />
          </View>
        </View>

        <TouchableOpacity style={styles.imageBox} activeOpacity={0.9}>
          {image?.uri ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={38} color={THEME.yellow} />
              <Text style={styles.imageTitle}>Vendor Display Image</Text>
              <Text style={styles.imageSub}>Add a clean store or restaurant photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.greenImageBtn} onPress={() => pickImage(true)}>
            <Icon name="camera-outline" size={20} color="#000" />
            <Text style={styles.imageBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.yellowImageBtn} onPress={() => pickImage(false)}>
            <Icon name="images-outline" size={20} color="#000" />
            <Text style={styles.imageBtnText}>Gallery</Text>
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

        <Section title="Vendor Type" icon="apps-outline">
          <View style={styles.typeGrid}>
            {VENDOR_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, form.type === type && styles.typeBtnActive]}
                onPress={() => update("type", type)}
              >
                <Icon
                  name={getVendorTypeIcon(type)}
                  size={20}
                  color={form.type === type ? "#000" : THEME.yellow}
                />
                <Text
                  style={[
                    styles.typeText,
                    form.type === type && styles.typeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            label="Password"
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={(v: string) => update("password", v)}
            secureTextEntry
            placeholder="Minimum 6 characters"
          />
        </Section>

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
              <Text style={styles.createText}>Create Vendor</Text>
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

function getVendorTypeIcon(type: string) {
  switch (type) {
    case "GROCERY":
      return "basket-outline";
    case "MEDICINE":
      return "medkit-outline";
    case "BAKERY":
      return "cafe-outline";
    default:
      return "restaurant-outline";
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
    height: 50,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  yellowImageBtn: {
    flex: 1,
    height: 50,
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