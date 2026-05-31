import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Geolocation from "react-native-geolocation-service";
import Geocoder from "react-native-geocoding";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  addressService,
  CreateAddressPayload,
} from "@/services/api/addressService";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

export default function AddressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const editAddress = route.params?.editAddress || null;
  const fromCheckout = route.params?.fromCheckout || false;

  const [addresses, setAddresses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(editAddress?.id || null);

  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultLoadingId, setDefaultLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (editAddress?.id) {
      fillForm(editAddress);
    }
  }, [editAddress?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      setLoading(true);

      const { data, error } = await addressService.getAddresses();

      if (error) {
        setAddresses([]);
        return;
      }

      setAddresses(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const fillForm = (item: any) => {
    setEditingId(item.id);
    setLabel(item.label || item.type || "Home");
    setAddress(item.address || item.addressLine || item.fullAddress || "");
    setLandmark(item.landmark || "");
    setCity(item.city || "");
    setStateName(item.state || item.stateName || "");
    setPincode(String(item.pincode || ""));
    setCountry(item.country || "India");
    setLatitude(item.latitude ? Number(item.latitude) : null);
    setLongitude(item.longitude ? Number(item.longitude) : null);
    setIsDefault(Boolean(item.isDefault || item.is_default));
  };

  const resetForm = () => {
    setEditingId(null);
    setLabel("Home");
    setAddress("");
    setLandmark("");
    setCity("");
    setStateName("");
    setPincode("");
    setCountry("India");
    setLatitude(null);
    setLongitude(null);
    setIsDefault(false);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Karto Location Permission",
        message: "Karto needs location permission to auto fetch your address.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const fetchPincodeDetails = async (pin = pincode) => {
    const cleanPin = pin.trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      Alert.alert("Invalid Pincode", "Please enter valid 6 digit pincode.");
      return;
    }

    setPincodeLoading(true);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      const json = await res.json();

      const result = json?.[0];
      const postOffice = result?.PostOffice?.[0];

      if (result?.Status !== "Success" || !postOffice) {
        Alert.alert("Not Found", "No location found for this pincode.");
        return;
      }

      const detectedCity = postOffice.District || "";
      const detectedState = postOffice.State || "";
      const detectedCountry = postOffice.Country || "India";
      const detectedLandmark = postOffice.Name || "";

      setCity(detectedCity);
      setStateName(detectedState);
      setCountry(detectedCountry);

      if (!landmark.trim()) {
        setLandmark(detectedLandmark);
      }

      if (!address.trim()) {
        setAddress(
          `${detectedLandmark}, ${postOffice.Block || ""}, ${detectedCity}, ${detectedState} - ${cleanPin}`
        );
      }
    } catch {
      Alert.alert("Error", "Pincode lookup failed.");
    } finally {
      setPincodeLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      Alert.alert("Permission Required", "Please allow location permission.");
      return;
    }

    setLocationLoading(true);

    Geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        try {
          const geoRes = await Geocoder.from(lat, lng);
          const result = geoRes.results?.[0];

          if (!result) {
            Alert.alert("Location Found", "Location attached. Please fill address manually.");
            return;
          }

          const components = result.address_components || [];

          const getComponent = (type: string) =>
            components.find((c: any) => c.types.includes(type))?.long_name || "";

          const detectedPin = getComponent("postal_code");
          const detectedCity =
            getComponent("locality") ||
            getComponent("administrative_area_level_2") ||
            "";
          const detectedState = getComponent("administrative_area_level_1");
          const detectedCountry = getComponent("country") || "India";
          const detectedLandmark =
            getComponent("sublocality") ||
            getComponent("sublocality_level_1") ||
            getComponent("neighborhood") ||
            getComponent("route") ||
            detectedCity;

          setLabel("Current Location");
          setAddress(result.formatted_address || "");
          setLandmark(detectedLandmark || "");
          setCity(detectedCity);
          setStateName(detectedState);
          setCountry(detectedCountry);
          setPincode(detectedPin || "");

          Alert.alert("Location Added", "Current location details filled successfully.");
        } catch {
          Alert.alert(
            "Location Attached",
            "Location attached. Please enter address and landmark manually."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        Alert.alert("Location Error", error?.message || "Failed to fetch location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }
    );
  };

  const validate = () => {
    if (!label.trim()) {
      Alert.alert("Validation", "Please select address label.");
      return false;
    }

    if (!address.trim() || address.trim().length < 8) {
      Alert.alert("Validation", "Please enter complete address.");
      return false;
    }

    if (!landmark.trim() || landmark.trim().length < 3) {
      Alert.alert("Landmark Required", "Please enter nearby landmark.");
      return false;
    }

    if (!city.trim()) {
      Alert.alert("Validation", "City is required.");
      return false;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      Alert.alert("Validation", "Please enter valid 6 digit pincode.");
      return false;
    }

    return true;
  };

  const buildPayload = (): CreateAddressPayload => ({
    label: label.trim(),
    address: address.trim(),
    landmark: landmark.trim(),
    city: city.trim(),
    state: stateName.trim() || null,
    pincode: pincode.trim(),
    country: country.trim() || "India",
    latitude,
    longitude,
    isDefault,
  });

  const saveAddress = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      const payload = buildPayload();

      if (editingId) {
        const { error } = await addressService.updateAddress(editingId, payload);

        if (error) {
          Alert.alert("Error", error?.message || "Failed to update address.");
          return;
        }

        Alert.alert("Updated", "Address updated successfully.");
      } else {
        const { error } = await addressService.createAddress(payload);

        if (error) {
          Alert.alert("Error", error?.message || "Failed to save address.");
          return;
        }

        Alert.alert("Saved", "Address saved successfully.");
      }

      resetForm();
      await loadAddresses();

      if (fromCheckout) {
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    Alert.alert("Delete Address", "Remove this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(id);

            const { error } = await addressService.deleteAddress(id);

            if (error) {
              Alert.alert("Error", error?.message || "Failed to delete address.");
              return;
            }

            setAddresses((prev) => prev.filter((x) => x.id !== id));

            if (editingId === id) resetForm();
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const setDefaultAddress = async (item: any) => {
    try {
      setDefaultLoadingId(item.id);

      const { error } = await addressService.setDefaultAddress(item.id);

      if (error) {
        Alert.alert("Error", error?.message || "Failed to set default address.");
        return;
      }

      setAddresses((prev) =>
        prev.map((x) => ({
          ...x,
          isDefault: x.id === item.id,
          is_default: x.id === item.id,
        }))
      );
    } finally {
      setDefaultLoadingId(null);
    }
  };

  const savedCountText = useMemo(() => `${addresses.length}/10`, [addresses.length]);

  const renderAddress = ({ item }: { item: any }) => {
    const activeDefault = Boolean(item.isDefault || item.is_default);
    const deleting = deletingId === item.id;
    const defaulting = defaultLoadingId === item.id;

    return (
      <View style={[styles.savedCard, activeDefault && styles.savedCardDefault]}>
        <View style={styles.savedTop}>
          <View style={styles.savedIcon}>
            <Icon name="location" size={20} color={THEME.green} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.savedLabelRow}>
              <Text style={styles.savedLabel}>{item.label || "Address"}</Text>

              {activeDefault && (
                <View style={styles.defaultPill}>
                  <Text style={styles.defaultPillText}>Default</Text>
                </View>
              )}
            </View>

            <Text style={styles.savedAddress}>
              {item.address || item.addressLine || item.fullAddress}
            </Text>

            <Text style={styles.savedMeta}>
              {[item.landmark, item.city, item.state, item.pincode]
                .filter(Boolean)
                .join(" • ")}
            </Text>

            {(item.latitude || item.longitude) && (
              <Text style={styles.savedLocation}>Location attached</Text>
            )}

            <View style={styles.savedActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => fillForm(item)}>
                <Icon name="create-outline" size={15} color={THEME.green} />
                <Text style={styles.smallBtnText}>Edit</Text>
              </TouchableOpacity>

              {!activeDefault && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  disabled={defaulting}
                  onPress={() => setDefaultAddress(item)}
                >
                  {defaulting ? (
                    <ActivityIndicator size="small" color={THEME.green} />
                  ) : (
                    <>
                      <Icon name="checkmark-circle-outline" size={15} color={THEME.green} />
                      <Text style={styles.smallBtnText}>Set Default</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            disabled={deleting}
            onPress={() => deleteAddress(item.id)}
            style={styles.deleteBtn}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={THEME.danger} />
            ) : (
              <Icon name="trash-outline" size={21} color={THEME.danger} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading addresses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="chevron-back" size={24} color={THEME.green} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Delivery Address</Text>
                <Text style={styles.subtitle}>
                  Add exact address with landmark and location
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>
                  {editingId ? "Update Address" : "Add New Address"}
                </Text>

                <Text style={styles.countText}>{savedCountText}</Text>
              </View>

              <TouchableOpacity
                style={[styles.currentLocationCard, locationLoading && styles.disabled]}
                onPress={useCurrentLocation}
                activeOpacity={0.85}
                disabled={locationLoading}
              >
                <View style={styles.currentLocationIcon}>
                  {locationLoading ? (
                    <ActivityIndicator color={THEME.black} />
                  ) : (
                    <Icon name="navigate" size={24} color={THEME.black} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.currentLocationTitle}>Use Current Location</Text>
                  <Text style={styles.currentLocationSub}>
                    Auto fetch address, pincode, city and landmark
                  </Text>

                  {!!latitude && !!longitude && (
                    <Text style={styles.locationAttached}>
                      Location attached successfully
                    </Text>
                  )}
                </View>

                <Icon name="chevron-forward" size={22} color={THEME.green} />
              </TouchableOpacity>

              <View style={styles.pickerBox}>
                <Icon name="bookmark-outline" size={20} color={THEME.green} />

                <Picker
                  selectedValue={label}
                  dropdownIconColor={THEME.green}
                  style={styles.picker}
                  onValueChange={(value) => setLabel(value)}
                >
                  <Picker.Item label="Home" value="Home" />
                  <Picker.Item label="Work" value="Work" />
                  <Picker.Item label="Current Location" value="Current Location" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>

              <View style={styles.inputBox}>
                <Icon name="pin-outline" size={20} color={THEME.green} />

                <TextInput
                  style={styles.input}
                  placeholder="Pincode"
                  placeholderTextColor={THEME.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(text) => {
                    const pin = text.replace(/\D/g, "");
                    setPincode(pin);
                    if (pin.length === 6) fetchPincodeDetails(pin);
                  }}
                />

                <TouchableOpacity
                  onPress={() => fetchPincodeDetails()}
                  disabled={pincodeLoading}
                >
                  {pincodeLoading ? (
                    <ActivityIndicator color={THEME.green} />
                  ) : (
                    <Text style={styles.lookupText}>Lookup</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.addressInput}
                placeholder="House no, floor, street, area"
                placeholderTextColor={THEME.muted}
                value={address}
                onChangeText={setAddress}
                multiline
              />

              <View style={styles.inputBox}>
                <Icon name="flag-outline" size={20} color={THEME.green} />

                <TextInput
                  style={styles.input}
                  placeholder="Landmark required"
                  placeholderTextColor={THEME.muted}
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>

              <View style={styles.inputBox}>
                <Icon name="business-outline" size={20} color={THEME.green} />

                <TextInput
                  style={styles.input}
                  placeholder="City / District"
                  placeholderTextColor={THEME.muted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={styles.inputBox}>
                <Icon name="map-outline" size={20} color={THEME.green} />

                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={THEME.muted}
                  value={stateName}
                  onChangeText={setStateName}
                />
              </View>

              <View style={styles.inputBox}>
                <Icon name="earth-outline" size={20} color={THEME.green} />

                <TextInput
                  style={styles.input}
                  placeholder="Country"
                  placeholderTextColor={THEME.muted}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>

              <TouchableOpacity
                style={styles.defaultToggle}
                activeOpacity={0.85}
                onPress={() => setIsDefault((prev) => !prev)}
              >
                <Icon
                  name={isDefault ? "checkbox" : "square-outline"}
                  size={22}
                  color={THEME.green}
                />
                <Text style={styles.defaultToggleText}>Make this default address</Text>
              </TouchableOpacity>

              {!!latitude && !!longitude && (
                <View style={styles.geoPill}>
                  <Icon name="checkmark-circle" size={17} color={THEME.green} />
                  <Text style={styles.geoText}>
                    Lat/Lng saved: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                {editingId && (
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={resetForm}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.disabled]}
                  onPress={saveAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={THEME.black} />
                  ) : (
                    <>
                      <Text style={styles.saveBtnText}>
                        {editingId ? "Update Address" : "Save Address"}
                      </Text>
                      <Icon name="checkmark-circle" size={20} color={THEME.black} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Saved Addresses</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="location-outline" size={56} color={THEME.green} />
            <Text style={styles.emptyTitle}>No saved address</Text>
            <Text style={styles.emptySub}>Add your first delivery address.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "700" },
  listContent: { padding: 18, paddingBottom: 38 },
  header: {
    marginTop: 10,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
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
  title: { color: THEME.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 5 },
  formCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  countText: { color: THEME.muted, fontWeight: "800" },
  currentLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  currentLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  currentLocationTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  currentLocationSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  locationAttached: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
  },
  pickerBox: {
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    marginBottom: 12,
  },
  picker: { flex: 1, color: THEME.text },
  inputBox: {
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  lookupText: { color: THEME.green, fontWeight: "900" },
  addressInput: {
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
    padding: 14,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  defaultToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
    paddingVertical: 4,
  },
  defaultToggleText: {
    color: THEME.text,
    fontWeight: "800",
  },
  geoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#102417",
    borderWidth: 1,
    borderColor: "#173923",
    padding: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  geoText: { color: THEME.green, fontSize: 12, fontWeight: "800" },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
  cancelEditBtn: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditText: {
    color: THEME.danger,
    fontWeight: "900",
  },
  disabled: { opacity: 0.65 },
  savedCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  savedCardDefault: {
    borderColor: THEME.green,
    backgroundColor: "#07150D",
  },
  savedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },
  savedLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  savedLabel: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  defaultPill: {
    backgroundColor: THEME.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  defaultPillText: {
    color: THEME.black,
    fontSize: 10,
    fontWeight: "900",
  },
  savedAddress: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 19,
  },
  savedMeta: {
    color: THEME.green,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
  },
  savedLocation: {
    color: THEME.yellow,
    marginTop: 5,
    fontSize: 12,
    fontWeight: "900",
  },
  savedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    backgroundColor: "#07110B",
    borderWidth: 1,
    borderColor: "#173923",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  smallBtnText: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#1B0E0E",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    padding: 30,
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },
  emptySub: { color: THEME.muted, marginTop: 5 },
});