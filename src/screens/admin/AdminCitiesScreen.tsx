import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  input: "#0E100E",
};

type City = {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export default function AdminCitiesScreen({ navigation }: any) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCities = useCallback(async () => {
    const res = await adminService.getCities();

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to load cities");
    } else {
      setCities(res.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return cities;

    return cities.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q)
    );
  }, [cities, search]);

  const activeCities = cities.filter((c) => c.isActive !== false).length;
  const inactiveCities = cities.filter((c) => c.isActive === false).length;

  const onRefresh = () => {
    setRefreshing(true);
    loadCities();
  };

  const resetForm = () => {
    setName("");
    setCode("");
  };

  const closeModal = () => {
    resetForm();
    setModalVisible(false);
  };

  const createCity = async () => {
    const cityName = name.trim();
    const cityCode = code.trim().toUpperCase();

    if (!cityName) {
      Alert.alert("Required", "Please enter city name");
      return;
    }

    if (!cityCode) {
      Alert.alert("Required", "Please enter city code");
      return;
    }

    setSaving(true);

    const res = await adminService.createCity({
      name: cityName,
      code: cityCode,
    });

    setSaving(false);

    if (res.error) {
      Alert.alert("Error", res.error.message || "Failed to create city");
      return;
    }

    Alert.alert("Success", "City created successfully");
    closeModal();
    loadCities();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator size="large" color={THEME.yellow} />
        <Text style={styles.loadingText}>Loading cities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
            colors={[THEME.yellow, THEME.green]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>CITY OPERATIONS</Text>
            <Text style={styles.title}>Cities Management</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Icon name="add" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Total Service Cities</Text>
              <Text style={styles.summaryValue}>{cities.length}</Text>
            </View>

            <View style={styles.cityIconBig}>
              <Icon name="business-outline" size={34} color={THEME.yellow} />
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryMini}>
              <Text style={styles.summaryMiniValue}>{activeCities}</Text>
              <Text style={styles.summaryMiniLabel}>Active</Text>
            </View>

            <View style={styles.summaryMini}>
              <Text style={styles.summaryMiniValue}>{inactiveCities}</Text>
              <Text style={styles.summaryMiniLabel}>Inactive</Text>
            </View>

            <View style={styles.summaryMini}>
              <Text style={styles.summaryMiniValue}>{filteredCities.length}</Text>
              <Text style={styles.summaryMiniLabel}>Showing</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={THEME.muted} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search city or code..."
            placeholderTextColor={THEME.muted}
            style={styles.searchInput}
          />

          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Icon name="close-circle" size={21} color={THEME.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cities List</Text>
          <Text style={styles.sectionAction}>{filteredCities.length} found</Text>
        </View>

        {filteredCities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="location-outline" size={38} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No cities found</Text>
            <Text style={styles.emptyText}>
              Add your first city to start vendor onboarding and delivery operations.
            </Text>
          </View>
        ) : (
          filteredCities.map((city) => (
            <View key={city.id} style={styles.cityCard}>
              <View style={styles.cityLeft}>
                <View style={styles.cityIcon}>
                  <Icon name="business-outline" size={23} color={THEME.yellow} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cityName}>{city.name}</Text>

                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{city.code || "NO CODE"}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Icon name="calendar-outline" size={13} color={THEME.muted} />
                    <Text style={styles.metaText}>
                      {city.createdAt
                        ? new Date(city.createdAt).toLocaleDateString()
                        : "Recently added"}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  city.isActive === false ? styles.inactiveBadge : styles.activeBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    city.isActive === false ? styles.inactiveText : styles.activeText,
                  ]}
                >
                  {city.isActive === false ? "Inactive" : "Active"}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 38 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>NEW CITY</Text>
                <Text style={styles.modalTitle}>Add Service City</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <Icon name="close" size={23} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>City Name</Text>
            <View style={styles.inputBox}>
              <Icon name="location-outline" size={20} color={THEME.yellow} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Example: Jalalabad"
                placeholderTextColor={THEME.muted}
                style={styles.input}
              />
            </View>

            <Text style={styles.inputLabel}>City Code</Text>
            <View style={styles.inputBox}>
              <Icon name="barcode-outline" size={20} color={THEME.yellow} />
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Example: JBD"
                placeholderTextColor={THEME.muted}
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.65 }]}
              onPress={createCity}
              disabled={saving}
              activeOpacity={0.86}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Create City</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },

  header: {
    paddingTop: 22,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

  addBtn: {
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
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },

  summaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  summaryValue: {
    color: THEME.yellow,
    fontSize: 40,
    fontWeight: "900",
    marginTop: 5,
  },

  cityIconBig: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  summaryMini: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  summaryMiniValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },

  summaryMiniLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  searchBox: {
    marginTop: 17,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
    fontSize: 14,
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },

  sectionAction: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },

  cityCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cityLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  cityIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  cityName: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },

  codePill: {
    marginTop: 5,
    alignSelf: "flex-start",
    backgroundColor: "#142818",
    borderColor: "#1F6B35",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  codeText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },

  metaText: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  activeBadge: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },

  inactiveBadge: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  activeText: {
    color: THEME.green,
  },

  inactiveText: {
    color: THEME.danger,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: THEME.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  modalLabel: {
    color: THEME.green,
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: "900",
  },

  modalTitle: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },

  closeBtn: {
    width: 43,
    height: 43,
    borderRadius: 17,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 10,
  },

  inputBox: {
    height: 54,
    borderRadius: 19,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
  },

  saveBtn: {
    height: 55,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  saveText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
  },

  cancelBtn: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  cancelText: {
    color: THEME.muted,
    fontWeight: "900",
  },
});