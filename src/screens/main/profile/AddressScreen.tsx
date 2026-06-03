import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Geolocation from "react-native-geolocation-service";
import Geocoder from "react-native-geocoding";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import {
  addressService,
  CreateAddressPayload,
} from "@/services/api/addressService";

const THEME = {
  bg: "#F7FAF6",
  soft: "#ECFDF3",
  card: "#FFFFFF",
  card2: "#F4FBF6",
  green: "#16A34A",
  green2: "#22C55E",
  yellow: "#FACC15",
  yellow2: "#FFF7CC",
  text: "#101713",
  muted: "#647067",
  border: "#DDE7DE",
  danger: "#EF4444",
  black: "#07110B",
};

export default function AddressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const editAddress = route.params?.editAddress || null;
  const fromCheckout = route.params?.fromCheckout || false;

  const [addresses, setAddresses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(editAddress?.id || null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [authModal, setAuthModal] = useState(false);

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

  const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string
  ) => {
    Toast.show({
      type,
      text1,
      text2,
      position: "bottom",
      visibilityTime: 1900,
    });
  };

  const isRealUser = async () => {
    const token = await AsyncStorage.getItem("accessToken");
    return Boolean(user?.id && token);
  };

  const requireRealLogin = async () => {
    const ok = await isRealUser();

    if (!ok) {
      setAuthModal(true);
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (editAddress?.id) fillForm(editAddress);
  }, [editAddress?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [user?.id])
  );

  const openLogin = () => {
    setAuthModal(false);
    navigation.navigate("Auth");
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);

      const ok = await isRealUser();

      if (!ok) {
        setAddresses([]);
        return;
      }

      const { data, error } = await addressService.getAddresses();

      if (error) {
        setAddresses([]);
        showToast("error", "Unable to load addresses", "Please try again.");
        return;
      }

      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      setAddresses([]);
      showToast("error", "Unable to load addresses", "Please try again.");
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
        title: "Location Permission",
        message: "Karto needs location permission to fetch your delivery address.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const fetchPincodeDetails = async (pin = pincode) => {
    const cleanPin = String(pin || "").trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      showToast("info", "Invalid pincode", "Please enter a valid 6 digit pincode.");
      return;
    }

    setPincodeLoading(true);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      const json = await res.json();

      const result = json?.[0];
      const postOffice = result?.PostOffice?.[0];

      if (result?.Status !== "Success" || !postOffice) {
        showToast("info", "Pincode not found", "No location found for this pincode.");
        return;
      }

      const detectedCity = postOffice.District || "";
      const detectedState = postOffice.State || "";
      const detectedCountry = postOffice.Country || "India";
      const detectedLandmark = postOffice.Name || "";

      setCity(detectedCity);
      setStateName(detectedState);
      setCountry(detectedCountry);

      if (!landmark.trim()) setLandmark(detectedLandmark);

      if (!address.trim()) {
        setAddress(
          `${detectedLandmark}, ${postOffice.Block || ""}, ${detectedCity}, ${detectedState} - ${cleanPin}`
        );
      }

      showToast("success", "Pincode verified", `${detectedCity}, ${detectedState}`);
    } catch {
      showToast("error", "Pincode lookup failed", "Please try again.");
    } finally {
      setPincodeLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      showToast("info", "Permission required", "Please allow location permission.");
      return;
    }

    setLocationLoading(true);

    Geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        try {
          const geoRes = await Geocoder.from(lat, lng);
          const result = geoRes.results?.[0];

          if (!result) {
            showToast("success", "Location attached", "Please complete address manually.");
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

          showToast("success", "Location added", "Address details filled successfully.");
        } catch {
          showToast("success", "Location attached", "Please enter address manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      error => {
        setLocationLoading(false);
        showToast(
          "error",
          "Location unavailable",
          error?.message || "Unable to fetch your location."
        );
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
      showToast("info", "Label required", "Please select address label.");
      return false;
    }

    if (!address.trim() || address.trim().length < 8) {
      showToast("info", "Complete address required", "Please enter your full address.");
      return false;
    }

    if (!landmark.trim() || landmark.trim().length < 3) {
      showToast("info", "Landmark required", "Please enter a nearby landmark.");
      return false;
    }

    if (!city.trim()) {
      showToast("info", "City required", "Please enter city or district.");
      return false;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      showToast("info", "Invalid pincode", "Please enter a valid 6 digit pincode.");
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
    const canSave = await requireRealLogin();
    if (!canSave) return;

    if (!validate()) return;

    setSaving(true);

    try {
      const payload = buildPayload();

      if (editingId) {
        const { error } = await addressService.updateAddress(editingId, payload);

        if (error) {
          showToast("error", "Update failed", error?.message || "Failed to update address.");
          return;
        }

        showToast("success", "Address updated", "Your delivery address has been updated.");
      } else {
        const { error } = await addressService.createAddress(payload);

        if (error) {
          showToast("error", "Save failed", error?.message || "Failed to save address.");
          return;
        }

        showToast("success", "Address saved", "Your delivery address has been saved.");
      }

      resetForm();
      await loadAddresses();

      if (fromCheckout) navigation.goBack();
    } catch {
      showToast("error", "Save failed", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async () => {
    if (!deleteTarget?.id) return;

    const canDelete = await requireRealLogin();
    if (!canDelete) return;

    try {
      setDeletingId(deleteTarget.id);

      const { error } = await addressService.deleteAddress(deleteTarget.id);

      if (error) {
        showToast("error", "Delete failed", error?.message || "Failed to delete address.");
        return;
      }

      setAddresses(prev => prev.filter(x => x.id !== deleteTarget.id));

      if (editingId === deleteTarget.id) resetForm();

      setDeleteTarget(null);
      showToast("success", "Address deleted", "Address removed successfully.");
    } catch {
      showToast("error", "Delete failed", "Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const setDefaultAddress = async (item: any) => {
    const canUpdate = await requireRealLogin();
    if (!canUpdate) return;

    try {
      setDefaultLoadingId(item.id);

      const { error } = await addressService.setDefaultAddress(item.id);

      if (error) {
        showToast("error", "Update failed", error?.message || "Failed to set default.");
        return;
      }

      setAddresses(prev =>
        prev.map(x => ({
          ...x,
          isDefault: x.id === item.id,
          is_default: x.id === item.id,
        }))
      );

      showToast("success", "Default updated", "This is now your default address.");
    } catch {
      showToast("error", "Update failed", "Please try again.");
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
              {item.address || item.addressLine || item.fullAddress || "Saved address"}
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
            onPress={() => setDeleteTarget(item)}
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
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading addresses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <FlatList
        data={addresses}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        renderItem={renderAddress}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Delivery Address</Text>
                <Text style={styles.subtitle}>Add exact details for faster delivery</Text>
              </View>
            </View>

            <View style={styles.heroBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTag}>KARTO DELIVERY</Text>
                <Text style={styles.heroTitle}>Save accurate address</Text>
                <Text style={styles.heroSub}>
                  Exact pincode, landmark and location help riders deliver faster.
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="navigate-outline" size={33} color={THEME.black} />
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
                    <ActivityIndicator color={THEME.card} />
                  ) : (
                    <Icon name="navigate" size={24} color={THEME.card} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.currentLocationTitle}>Use Current Location</Text>
                  <Text style={styles.currentLocationSub}>
                    Auto-fill address, pincode, city and landmark
                  </Text>

                  {!!latitude && !!longitude && (
                    <Text style={styles.locationAttached}>Location attached</Text>
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
                  onValueChange={value => setLabel(value)}
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
                  onChangeText={text => {
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
                  placeholder="Nearby landmark"
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
                onPress={() => setIsDefault(prev => !prev)}
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
                    Location saved: {latitude.toFixed(5)}, {longitude.toFixed(5)}
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
                    <ActivityIndicator color={THEME.card} />
                  ) : (
                    <>
                      <Text style={styles.saveBtnText}>
                        {editingId ? "Update Address" : "Save Address"}
                      </Text>
                      <Icon name="checkmark-circle" size={20} color={THEME.card} />
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
            <View style={styles.emptyIcon}>
              <Icon name="location-outline" size={56} color={THEME.green} />
            </View>
            <Text style={styles.emptyTitle}>No saved address</Text>
            <Text style={styles.emptySub}>Add your first delivery address.</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-outline" size={30} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Delete address?</Text>
            <Text style={styles.confirmText}>
              This address will be removed from your saved delivery addresses.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setDeleteTarget(null)}
                disabled={!!deletingId}
              >
                <Text style={styles.keepText}>Keep</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={deleteAddress}
                disabled={!!deletingId}
              >
                {deletingId ? (
                  <ActivityIndicator color={THEME.card} />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={authModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.authBox}>
            <View style={styles.authIcon}>
              <Icon name="lock-closed-outline" size={32} color={THEME.yellow} />
            </View>

            <Text style={styles.authTitle}>Login required</Text>
            <Text style={styles.authMessage}>
              Login to save addresses, checkout and track your orders.
            </Text>

            <TouchableOpacity style={styles.loginBtn} onPress={openLogin}>
              <Text style={styles.loginBtnText}>Login / Sign up</Text>
              <Icon name="arrow-forward" size={20} color={THEME.card} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.browseBtn} onPress={() => setAuthModal(false)}>
              <Text style={styles.browseText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  listContent: { padding: 18, paddingBottom: 38 },
  header: {
    marginTop: Platform.OS === "ios" ? 34 : 10,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: THEME.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 5, fontWeight: "700" },
  heroBanner: {
    backgroundColor: THEME.yellow2,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F4DE7A",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  heroTag: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "700",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
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
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: "#BDEDCB",
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
    fontWeight: "700",
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
    minHeight: 56,
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: "#BDEDCB",
    padding: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  geoText: { color: THEME.green, fontSize: 12, fontWeight: "800" },
  buttonRow: { flexDirection: "row", gap: 10 },
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
    color: THEME.card,
    fontWeight: "900",
    fontSize: 16,
  },
  cancelEditBtn: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD6D6",
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
    backgroundColor: THEME.soft,
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
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: "#BDEDCB",
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
    color: THEME.card,
    fontSize: 10,
    fontWeight: "900",
  },
  savedAddress: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 19,
    fontWeight: "700",
  },
  savedMeta: {
    color: THEME.green,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
  },
  savedLocation: {
    color: THEME.black,
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
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
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
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD6D6",
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
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: "#BDEDCB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },
  emptySub: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,17,11,0.56)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
  },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: {
    color: THEME.text,
    fontWeight: "900",
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  deleteConfirmText: {
    color: THEME.card,
    fontWeight: "900",
  },
  authBox: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    alignItems: "center",
  },
  authIcon: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: THEME.yellow2,
    borderWidth: 1,
    borderColor: "#F4DE7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  authTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
  },
  authMessage: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  loginBtn: {
    marginTop: 22,
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loginBtnText: {
    color: THEME.card,
    fontSize: 16,
    fontWeight: "900",
  },
  browseBtn: {
    marginTop: 12,
    width: "100%",
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.soft,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: {
    color: THEME.text,
    fontWeight: "900",
  },
});