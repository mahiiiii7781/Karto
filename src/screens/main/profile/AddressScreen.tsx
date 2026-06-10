// AddressScreen.tsx - corrected
// Fixes included:
// 1) Robust userId check: supports id, _id and userId.
// 2) Robust address list extraction from API responses.
// 3) First saved address is sent as default.
// 4) Removed automatic pincode API call while typing because uploaded backend does not contain GET /address/pincode/:pincode. Use Lookup button only if you add that backend route.
// 5) Save always reloads from GET /address after create/update.

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
  KeyboardAvoidingView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Geolocation from "react-native-geolocation-service";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import {
  addressService,
  CreateAddressPayload,
} from "@/services/api/addressService";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  orange: "#FB923C",
  blue: "#38BDF8",
  purple: "#A78BFA",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#050807",
};

const ADDRESS_LIMIT = 10;

const showToast = (
  type: "success" | "error" | "info",
  text1: string,
  text2?: string
) => {
  Toast.show({ type, text1, text2, position: "bottom", visibilityTime: 1900 });
};

const compact = (value?: string | null) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const getAddressList = (data: any) => {
  if (Array.isArray(data)) return data;

  const list =
    (Array.isArray(data?.addresses) && data.addresses) ||
    (Array.isArray(data?.data?.addresses) && data.data.addresses) ||
    (Array.isArray(data?.data) && data.data) ||
    [];

  return Array.isArray(list) ? list : [];
};

const normalizePinData = (data: any) => {
  const result = data?.data || data;

  return {
    city: result?.city || result?.district || result?.District || "",
    state: result?.state || result?.State || "",
    country: result?.country || result?.Country || "India",
    landmark: result?.landmark || result?.postOffice || result?.PostOffice || "",
    address: result?.address || result?.formattedAddress || "",
  };
};

const formatAddressPreview = (item: any) => {
  if (!item) return "Saved address";

  const houseArea = compact(
    item.address || item.addressLine || item.fullAddress || item.full_address
  );
  const landmark = compact(item.landmark);
  const city = compact(item.city || item.district);
  const state = compact(item.state || item.stateName || item.state_name);
  const pincode = compact(item.pincode || item.pinCode || item.pin_code);

  const first = [houseArea, landmark].filter(Boolean).join(", ");
  const second = [city, state].filter(Boolean).join(", ");

  if (first && second && pincode) return `${first}, ${second} - ${pincode}`;
  if (first && second) return `${first}, ${second}`;
  if (first && pincode) return `${first} - ${pincode}`;
  if (first) return first;
  if (second && pincode) return `${second} - ${pincode}`;
  return "Saved address";
};

const parseReverseAddress = (data: any) => {
  const a = data?.address || {};

  const houseNo = compact(
    a.house_number || a.building || a.residential || a.house || a.neighbourhood || ""
  );
  const road = compact(a.road || a.pedestrian || a.footway || "");
  const area = compact(
    a.suburb || a.neighbourhood || a.quarter || a.locality || a.village || a.hamlet || ""
  );
  const city = compact(a.city || a.town || a.village || a.county || "");
  const state = compact(a.state || "");
  const pincode = compact(a.postcode || "");
  const country = compact(a.country || "India");

  const addressParts = [houseNo, road, area].filter(Boolean);
  const address = addressParts.length
    ? addressParts.join(", ")
    : compact(String(data?.display_name || "").split(",").slice(0, 3).join(","));

  return {
    label: "Current Location",
    address: address || "Current location",
    landmark: area || road || city,
    city,
    state,
    pincode,
    country,
    formatted: formatAddressPreview({
      address: address || "Current location",
      landmark: area || road,
      city,
      state,
      pincode,
    }),
  };
};

export default function AddressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const editAddress = route.params?.editAddress || null;
  const fromCheckout = Boolean(route.params?.fromCheckout);

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

  const [searchText, setSearchText] = useState("");
  const [currentLocationPreview, setCurrentLocationPreview] = useState("Use your current location");
  const [currentLocationMeta, setCurrentLocationMeta] = useState("Tap to fetch house no, area, city, state and pincode");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultLoadingId, setDefaultLoadingId] = useState<string | null>(null);

  const userId = (user as any)?.id || (user as any)?._id || (user as any)?.userId;
  const isGuest = !userId;

  const filteredAddresses = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return addresses;

    return addresses.filter(item =>
      [
        item.label,
        item.address,
        item.landmark,
        item.city,
        item.state,
        item.pincode,
        formatAddressPreview(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [addresses, searchText]);

  const savedCountText = useMemo(() => `${addresses.length}/${ADDRESS_LIMIT}`, [addresses.length]);

  const isRealUser = useCallback(async () => {
    const token = await AsyncStorage.getItem("accessToken");
    return Boolean(userId && token);
  }, [userId]);

  const requireRealLogin = useCallback(async () => {
    const ok = await isRealUser();

    if (!ok) {
      setAuthModal(true);
      return false;
    }

    return true;
  }, [isRealUser]);

  const fillForm = useCallback((item: any) => {
    setEditingId(item.id || null);
    setLabel(item.label || item.type || "Home");
    setAddress(item.address || item.addressLine || item.fullAddress || item.full_address || "");
    setLandmark(item.landmark || "");
    setCity(item.city || item.district || "");
    setStateName(item.state || item.stateName || item.state_name || "");
    setPincode(String(item.pincode || item.pinCode || item.pin_code || ""));
    setCountry(item.country || "India");
    setLatitude(item.latitude ? Number(item.latitude) : null);
    setLongitude(item.longitude ? Number(item.longitude) : null);
    setIsDefault(Boolean(item.isDefault || item.is_default));
  }, []);

  useEffect(() => {
    if (editAddress?.id) fillForm(editAddress);
  }, [editAddress?.id, fillForm]);

  const loadAddresses = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const ok = await isRealUser();

        if (!ok) {
          setAddresses([]);
          return;
        }

        const { data, error } = await addressService.getAddresses();

        if (error) {
          setAddresses([]);
          showToast("error", "Unable to load addresses", error?.message || "Please try again.");
          return;
        }

        const list = getAddressList(data);
        setAddresses(list);
      } catch {
        setAddresses([]);
        showToast("error", "Unable to load addresses", "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isRealUser]
  );

  useFocusEffect(
    useCallback(() => {
      loadAddresses(false);
    }, [loadAddresses])
  );

  const openLogin = () => {
    setAuthModal(false);
    navigation.navigate("Auth");
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
        message: "Karto needs location permission to detect your delivery address.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "KartoApp/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error("Reverse geocode failed");

    const json = await res.json();
    return parseReverseAddress(json);
  };

  const fetchPincodeDetails = async (pin = pincode) => {
    const cleanPin = String(pin || "").trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      showToast("info", "Invalid pincode", "Please enter a valid 6 digit pincode.");
      return;
    }

    const lookup = (addressService as any).lookupPincode;

    if (typeof lookup !== "function") {
      showToast("info", "Lookup unavailable", "Please enter city and state manually.");
      return;
    }

    setPincodeLoading(true);

    try {
      const { data, error } = await lookup(cleanPin);

      if (error || !data) {
        showToast("info", "Pincode not found", error?.message || "No location found.");
        return;
      }

      const pinData = normalizePinData(data);

      if (pinData.city) setCity(pinData.city);
      if (pinData.state) setStateName(pinData.state);
      if (pinData.country) setCountry(pinData.country);
      if (pinData.landmark && !landmark.trim()) setLandmark(pinData.landmark);
      if (pinData.address && !address.trim()) setAddress(pinData.address);

      showToast("success", "Pincode verified", [pinData.city, pinData.state].filter(Boolean).join(", "));
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
    setCurrentLocationPreview("Fetching current address...");
    setCurrentLocationMeta("Please wait");

    Geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        try {
          const parsed = await reverseGeocode(lat, lng);

          setLabel(parsed.label);
          setAddress(parsed.address || "");
          setLandmark(parsed.landmark || "");
          setCity(parsed.city || "");
          setStateName(parsed.state || "");
          setPincode(parsed.pincode || "");
          setCountry(parsed.country || "India");
          setIsDefault(addresses.length === 0);

          setCurrentLocationPreview(parsed.formatted || "Current location fetched");
          setCurrentLocationMeta("House no, area, city, state and pincode attached");

          showToast("success", "Current address fetched", parsed.formatted);
        } catch {
          if (!label.trim() || label === "Home") setLabel("Current Location");
          setCurrentLocationPreview("Current location attached");
          setCurrentLocationMeta(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          showToast("success", "Location attached", "Complete address details manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      error => {
        setLocationLoading(false);
        setCurrentLocationPreview("Use your current location");
        setCurrentLocationMeta("Unable to fetch location. Tap again.");
        showToast("error", "Location unavailable", error?.message || "Unable to fetch your location.");
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
      showToast("info", "Complete address required", "Please enter house no, street and area.");
      return false;
    }

    if (!city.trim()) {
      showToast("info", "City required", "Please enter city or district.");
      return false;
    }

    if (!stateName.trim()) {
      showToast("info", "State required", "Please enter state.");
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
    landmark: landmark.trim() || null,
    city: city.trim(),
    state: stateName.trim() || null,
    pincode: pincode.trim(),
    country: country.trim() || "India",
    latitude,
    longitude,
    isDefault: addresses.length === 0 ? true : isDefault,
  });

  const saveAddress = async () => {
    const canSave = await requireRealLogin();
    if (!canSave || saving) return;

    if (addresses.length >= ADDRESS_LIMIT && !editingId) {
      showToast("info", "Address limit reached", `You can save up to ${ADDRESS_LIMIT} addresses.`);
      return;
    }

    if (!validate()) return;

    setSaving(true);

    try {
      const payload = buildPayload();
      const result = editingId
        ? await addressService.updateAddress(editingId, payload)
        : await addressService.createAddress(payload);

      if (result.error) {
        showToast(
          "error",
          editingId ? "Update failed" : "Save failed",
          result.error?.message || "Please try again."
        );
        return;
      }

      showToast(
        "success",
        editingId ? "Address updated" : "Address saved",
        "Your delivery address is ready."
      );

      resetForm();
      await loadAddresses(false);

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
    if (!canUpdate || !item?.id) return;

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

      if (fromCheckout) navigation.goBack();

      showToast("success", "Default updated", "This is now your selected address.");
    } catch {
      showToast("error", "Update failed", "Please try again.");
    } finally {
      setDefaultLoadingId(null);
    }
  };

  const renderAddress = ({ item }: { item: any }) => {
    const activeDefault = Boolean(item.isDefault || item.is_default);
    const deleting = deletingId === item.id;
    const defaulting = defaultLoadingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.savedCard, activeDefault && styles.savedCardDefault]}
        activeOpacity={0.92}
        onPress={() => setDefaultAddress(item)}
      >
        <View style={styles.savedTop}>
          <View style={[styles.savedIcon, activeDefault && styles.savedIconDefault]}>
            <Icon
              name={activeDefault ? "home" : "location"}
              size={20}
              color={activeDefault ? THEME.black : THEME.green}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.savedLabelRow}>
              <Text style={styles.savedLabel}>{item.label || item.type || "Address"}</Text>

              {activeDefault && (
                <View style={styles.defaultPill}>
                  <Text style={styles.defaultPillText}>Selected</Text>
                </View>
              )}
            </View>

            <Text style={styles.savedAddress} numberOfLines={3}>
              {formatAddressPreview(item)}
            </Text>

            {(item.latitude || item.longitude) && (
              <Text style={styles.savedLocation}>Pinned location attached</Text>
            )}

            <View style={styles.savedActions}>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => fillForm(item)}
                activeOpacity={0.85}
              >
                <Icon name="create-outline" size={15} color={THEME.blue} />
                <Text style={[styles.smallBtnText, { color: THEME.blue }]}>Edit</Text>
              </TouchableOpacity>

              {!activeDefault && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  disabled={defaulting}
                  onPress={() => setDefaultAddress(item)}
                  activeOpacity={0.85}
                >
                  {defaulting ? (
                    <ActivityIndicator size="small" color={THEME.green} />
                  ) : (
                    <>
                      <Icon name="checkmark-circle-outline" size={15} color={THEME.green} />
                      <Text style={styles.smallBtnText}>Select</Text>
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
            activeOpacity={0.85}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={THEME.danger} />
            ) : (
              <Icon name="trash-outline" size={20} color={THEME.danger} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGuest = () => (
    <View style={styles.guestBox}>
      <View style={styles.guestIcon}>
        <Icon name="lock-closed-outline" size={36} color={THEME.yellow} />
      </View>
      <Text style={styles.guestTitle}>Login to save addresses</Text>
      <Text style={styles.guestText}>
        Add home, work and delivery locations for faster checkout.
      </Text>
      <TouchableOpacity style={styles.loginBtn} onPress={openLogin} activeOpacity={0.9}>
        <Text style={styles.loginBtnText}>Login / Sign up</Text>
        <Icon name="arrow-forward" size={19} color={THEME.black} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading addresses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={isGuest ? [] : filteredAddresses}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          renderItem={renderAddress}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadAddresses(true)}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.85}
                >
                  <Icon name="chevron-back" size={24} color={THEME.text} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Select a location</Text>
                  <Text style={styles.subtitle}>Choose where your order should arrive</Text>
                </View>
              </View>

              <View style={styles.searchCard}>
                <Icon name="search" size={20} color={THEME.green} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search for area, street name..."
                  placeholderTextColor={THEME.muted}
                  style={styles.searchInput}
                />
                {!!searchText && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <Icon name="close-circle" size={20} color={THEME.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {isGuest ? (
                renderGuest()
              ) : (
                <>
                  <View style={styles.actionPanel}>
                    <TouchableOpacity
                      style={styles.actionRow}
                      activeOpacity={0.9}
                      onPress={resetForm}
                    >
                      <View style={styles.actionIconSoft}>
                        <Icon name="add" size={21} color={THEME.green} />
                      </View>
                      <Text style={styles.actionTitle}>Add address</Text>
                      <Icon name="chevron-forward" size={19} color={THEME.muted} />
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity
                      style={[styles.actionRow, locationLoading && styles.disabled]}
                      activeOpacity={0.9}
                      onPress={useCurrentLocation}
                      disabled={locationLoading}
                    >
                      <View style={styles.actionIconStrong}>
                        {locationLoading ? (
                          <ActivityIndicator color={THEME.black} />
                        ) : (
                          <Icon name="locate" size={21} color={THEME.black} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{currentLocationPreview}</Text>
                        <Text style={styles.actionSub} numberOfLines={2}>
                          {currentLocationMeta}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={19} color={THEME.muted} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sectionDividerRow}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>Saved addresses</Text>
                    <View style={styles.line} />
                  </View>

                  <View style={styles.formCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>
                        {editingId ? "Update Address" : "Add New Address"}
                      </Text>
                      <Text style={styles.countText}>{savedCountText}</Text>
                    </View>

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
                        }}
                      />

                      <TouchableOpacity
                        onPress={() => fetchPincodeDetails()}
                        disabled={pincodeLoading}
                        activeOpacity={0.85}
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
                      <Icon name="flag-outline" size={20} color={THEME.orange} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nearby landmark"
                        placeholderTextColor={THEME.muted}
                        value={landmark}
                        onChangeText={setLandmark}
                      />
                    </View>

                    <View style={styles.inputBox}>
                      <Icon name="business-outline" size={20} color={THEME.blue} />
                      <TextInput
                        style={styles.input}
                        placeholder="City / District"
                        placeholderTextColor={THEME.muted}
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>

                    <View style={styles.inputBox}>
                      <Icon name="map-outline" size={20} color={THEME.purple} />
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
                      <Text style={styles.defaultToggleText}>Make this selected address</Text>
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
                        <TouchableOpacity
                          style={styles.cancelEditBtn}
                          onPress={resetForm}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.cancelEditText}>Cancel</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.disabled]}
                        onPress={saveAddress}
                        disabled={saving}
                        activeOpacity={0.9}
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
                </>
              )}
            </>
          }
          ListEmptyComponent={
            isGuest ? null : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Icon name="location-outline" size={54} color={THEME.yellow} />
                </View>
                <Text style={styles.emptyTitle}>No saved address</Text>
                <Text style={styles.emptySub}>Add your first delivery address.</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>

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
                  <ActivityIndicator color={THEME.black} />
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

            <TouchableOpacity style={styles.loginBtn} onPress={openLogin} activeOpacity={0.9}>
              <Text style={styles.loginBtnText}>Login / Sign up</Text>
              <Icon name="arrow-forward" size={20} color={THEME.black} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => setAuthModal(false)}
              activeOpacity={0.85}
            >
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
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: { color: THEME.yellow, fontSize: 38, fontWeight: "900" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  listContent: { padding: 18, paddingBottom: 38 },
  header: {
    marginTop: Platform.OS === "ios" ? 34 : 10,
    marginBottom: 14,
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
  title: { color: THEME.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  searchCard: {
    height: 54,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 10,
    fontWeight: "800",
  },
  actionPanel: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
  },
  actionRow: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginLeft: 68,
  },
  actionIconSoft: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconStrong: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { color: THEME.text, fontSize: 15, fontWeight: "900", flex: 1 },
  actionSub: { color: THEME.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  line: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
    marginHorizontal: 12,
  },
  formCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 20,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  countText: { color: THEME.yellow, fontWeight: "900" },
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
  input: { flex: 1, color: THEME.text, paddingHorizontal: 12, fontSize: 15, fontWeight: "700" },
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
  defaultToggle: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12, paddingVertical: 4 },
  defaultToggleText: { color: THEME.text, fontWeight: "800" },
  geoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    padding: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  geoText: { color: THEME.green, fontSize: 12, fontWeight: "800", flex: 1 },
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
  saveBtnText: { color: THEME.black, fontWeight: "900", fontSize: 16 },
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
  cancelEditText: { color: THEME.danger, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  savedCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  savedCardDefault: { borderColor: THEME.green, backgroundColor: "#102116" },
  savedTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  savedIconDefault: { backgroundColor: THEME.green, borderColor: THEME.green },
  savedLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  savedLabel: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  defaultPill: { backgroundColor: THEME.yellow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  defaultPillText: { color: THEME.black, fontSize: 10, fontWeight: "900" },
  savedAddress: { color: THEME.muted, marginTop: 4, lineHeight: 19, fontWeight: "700" },
  savedLocation: { color: THEME.yellow, marginTop: 5, fontSize: 12, fontWeight: "900" },
  savedActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
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
  smallBtnText: { color: THEME.green, fontSize: 12, fontWeight: "900" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
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
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: THEME.text, fontSize: 20, fontWeight: "900", marginTop: 12 },
  emptySub: { color: THEME.muted, marginTop: 5, fontWeight: "700", textAlign: "center" },
  guestBox: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  guestIcon: {
    width: 82,
    height: 82,
    borderRadius: 30,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: { color: THEME.text, fontSize: 21, fontWeight: "900", marginTop: 15 },
  guestText: { color: THEME.muted, textAlign: "center", marginTop: 7, lineHeight: 20, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 22 },
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
    backgroundColor: "#1B0E0E",
    borderWidth: 1,
    borderColor: "#3F1717",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  confirmText: { color: THEME.muted, textAlign: "center", lineHeight: 20, marginTop: 8, fontWeight: "700" },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  keepBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  keepText: { color: THEME.text, fontWeight: "900" },
  deleteConfirmBtn: { flex: 1, backgroundColor: THEME.green, borderRadius: 16, paddingVertical: 13, alignItems: "center" },
  deleteConfirmText: { color: THEME.black, fontWeight: "900" },
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
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  authTitle: { color: THEME.text, fontSize: 23, fontWeight: "900" },
  authMessage: { color: THEME.muted, textAlign: "center", lineHeight: 20, marginTop: 8, fontWeight: "700" },
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
  loginBtnText: { color: THEME.black, fontSize: 16, fontWeight: "900" },
  browseBtn: {
    marginTop: 12,
    width: "100%",
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: { color: THEME.text, fontWeight: "900" },
});
