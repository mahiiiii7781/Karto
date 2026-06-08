import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Image,
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

type Msg = {
  visible: boolean;
  type: KartoMessageType;
  title: string;
  message: string;
  primaryText?: string;
  secondaryText?: string;
  loading?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

const emptyForm = {
  restaurantId: "",
  categoryId: "",
  name: "",
  description: "",
  image: null,
  existingImageUrl: "",
  isActive: true,
};

export default function AdminVendorSubCategoriesScreen({ route, navigation }: any) {
  const routeRestaurantId = route?.params?.restaurantId || "";
  const routeCategoryId = route?.params?.vendorCategoryId || route?.params?.categoryId || "";

  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState(routeRestaurantId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(routeCategoryId);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const [msg, setMsg] = useState<Msg>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMsg = (
    type: KartoMessageType,
    title: string,
    message: string,
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMsg({
      visible: true,
      type,
      title,
      message,
      primaryText,
      onPrimary,
      secondaryText,
      onSecondary,
    });
  };

  const closeMsg = () => setMsg((p) => ({ ...p, visible: false, loading: false }));

  const load = useCallback(async () => {
    const [vendorRes, catRes, subRes] = await Promise.all([
      adminService.vendors(),
      adminService.getVendorCategories({
        restaurantId: selectedVendorId || routeRestaurantId || undefined,
      }),
      adminService.getVendorSubCategories({
        restaurantId: selectedVendorId || routeRestaurantId || undefined,
        categoryId: selectedCategoryId || routeCategoryId || undefined,
      }),
    ]);

    if (!vendorRes.error) {
      const list = vendorRes.data || [];
      setVendors(list);

      if (!selectedVendorId && list.length > 0) {
        setSelectedVendorId(routeRestaurantId || list[0].id);
      }
    } else {
      showMsg("error", "Vendors Load Failed", vendorRes.error.message || "Failed to load vendors.");
    }

    if (!catRes.error) {
      const list = catRes.data || [];
      setCategories(list);

      if (!selectedCategoryId && list.length > 0) {
        setSelectedCategoryId(routeCategoryId || list[0].id);
      }
    } else {
      showMsg("error", "Categories Load Failed", catRes.error.message || "Failed to load vendor categories.");
    }

    if (!subRes.error) {
      setSubCategories(subRes.data || []);
    } else {
      showMsg("error", "Subcategories Load Failed", subRes.error.message || "Failed to load vendor subcategories.");
    }

    setLoading(false);
    setRefreshing(false);
  }, [selectedVendorId, selectedCategoryId, routeRestaurantId, routeCategoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  const filteredCategories = useMemo(() => {
    if (!selectedVendorId) return categories;
    return categories.filter((c) => c.restaurantId === selectedVendorId);
  }, [categories, selectedVendorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return subCategories.filter((s) => {
      const vendorMatch = selectedVendorId ? s.restaurantId === selectedVendorId : true;
      const categoryMatch = selectedCategoryId ? s.categoryId === selectedCategoryId : true;

      const textMatch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.name?.toLowerCase().includes(q) ||
        s.restaurant?.name?.toLowerCase().includes(q);

      return vendorMatch && categoryMatch && textMatch;
    });
  }, [subCategories, search, selectedVendorId, selectedCategoryId]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      active: filtered.filter((s) => s.isActive !== false).length,
      inactive: filtered.filter((s) => s.isActive === false).length,
      items: filtered.reduce((sum, s) => sum + Number(s.menuItems?.length || 0), 0),
    };
  }, [filtered]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to capture subcategory image.",
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
          showMsg("warning", "Camera Permission Required", "Camera permission allow karo.");
          return;
        }
      }

      const picker = fromCamera ? launchCamera : launchImageLibrary;

      const result = await picker({
        mediaType: "photo",
        quality:1,
        selectionLimit: 1,
        includeBase64: false,
        saveToPhotos: fromCamera,
        cameraType: "back",
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showMsg("error", "Image Error", result.errorMessage || "Image select nahi hui.");
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        showMsg("warning", "No Image Found", "Valid image select karo.");
        return;
      }

      updateForm("image", {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        fileName: asset.fileName || `vendor-subcategory-${Date.now()}.jpg`,
        name: asset.fileName || `vendor-subcategory-${Date.now()}.jpg`,
      });
    } catch (e: any) {
      showMsg("error", "Image Error", e?.message || "Camera/gallery open nahi ho paya.");
    }
  };

  const openCreate = () => {
    if (!selectedVendorId) {
      showMsg("warning", "Vendor Required", "Pehle vendor select karo.");
      return;
    }

    if (!selectedCategoryId) {
      showMsg("warning", "Category Required", "Pehle vendor category select karo.");
      return;
    }

    setEditing(null);
    setForm({
      ...emptyForm,
      restaurantId: selectedVendorId,
      categoryId: selectedCategoryId,
    });
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      restaurantId: item.restaurantId || item.restaurant?.id || selectedVendorId,
      categoryId: item.categoryId || item.category?.id || selectedCategoryId,
      name: item.name || "",
      description: item.description || "",
      image: null,
      existingImageUrl: item.imageUrl || item.image_url || "",
      isActive: item.isActive !== false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setSaving(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.restaurantId) {
      showMsg("warning", "Vendor Required", "Vendor select karo.");
      return;
    }

    if (!form.categoryId) {
      showMsg("warning", "Category Required", "Vendor category select karo.");
      return;
    }

    if (!form.name.trim()) {
      showMsg("warning", "Required", "Subcategory name required hai.");
      return;
    }

    setSaving(true);

    const payload = {
      restaurantId: form.restaurantId,
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description?.trim(),
      image: form.image,
      isActive: form.isActive,
    };

    const res = editing
      ? await adminService.updateVendorSubCategory(editing.id, payload)
      : await adminService.createVendorSubCategory(payload);

    setSaving(false);

    if (res.error) {
      showMsg("error", "Save Failed", res.error.message || "Vendor subcategory save nahi hui.");
      return;
    }

    closeModal();
    showMsg(
      "success",
      editing ? "Subcategory Updated" : "Subcategory Created",
      editing ? "Vendor subcategory update ho gayi." : "Vendor subcategory create ho gayi.",
      "Done",
      () => {
        closeMsg();
        load();
      }
    );
  };

  const askDelete = (item: any) => {
    showMsg(
      "warning",
      "Delete Subcategory?",
      `${item.name || "This subcategory"} delete karni hai? Linked items hue to backend safe block karega.`,
      "Delete",
      () => deleteItem(item.id),
      "Cancel",
      closeMsg
    );
  };

  const deleteItem = async (id: string) => {
    setMsg((p) => ({ ...p, loading: true }));

    const res = await adminService.deleteVendorSubCategory(id);

    if (res.error) {
      setMsg({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message: res.error.message || "Subcategory delete nahi hui.",
        primaryText: "Okay",
      });
      return;
    }

    setMsg({
      visible: true,
      type: "success",
      title: "Subcategory Deleted",
      message: "Vendor subcategory delete/block ho gayi.",
      primaryText: "Done",
      onPrimary: () => {
        closeMsg();
        load();
      },
    });
  };

  const toggleStatus = async (item: any) => {
    const res = await adminService.updateVendorSubCategory(item.id, {
      isActive: item.isActive === false,
    });

    if (res.error) {
      showMsg("error", "Status Failed", res.error.message || "Status update nahi hua.");
      return;
    }

    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading vendor subcategories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.yellow}
            colors={[THEME.yellow, THEME.green]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>VENDOR MENU SETUP</Text>
                <Text style={styles.title}>Vendor Subcategories</Text>
                <Text style={styles.subtitle}>Vendor category ke andar subcategories manage karo</Text>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>Selected Vendor</Text>
                <Text style={styles.heroTitle}>{selectedVendor?.name || "Select Vendor"}</Text>
                <Text style={styles.heroSub}>
                  {selectedVendor?.city?.name || "No city"} • {selectedVendor?.category?.name || selectedVendor?.type || "Business"}
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="layers-outline" size={34} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.statGrid}>
              <MiniStat label="Subcats" value={stats.total} />
              <MiniStat label="Active" value={stats.active} green />
              <MiniStat label="Inactive" value={stats.inactive} danger />
              <MiniStat label="Items" value={stats.items} />
            </View>

            <Text style={styles.sectionTitle}>Vendors</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {vendors.map((vendor) => (
                <TouchableOpacity
                  key={vendor.id}
                  style={[styles.chip, selectedVendorId === vendor.id && styles.chipActive]}
                  onPress={() => {
                    setSelectedVendorId(vendor.id);
                    setSelectedCategoryId("");
                  }}
                >
                  <Text style={[styles.chipText, selectedVendorId === vendor.id && styles.chipTextActive]}>
                    {vendor.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Vendor Categories</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.chip, selectedCategoryId === category.id && styles.chipActive]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text style={[styles.chipText, selectedCategoryId === category.id && styles.chipTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search subcategory..."
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
              <Text style={styles.sectionTitleNoMargin}>Subcategory List</Text>
              <Text style={styles.sectionCount}>{filtered.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="layers-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No vendor subcategories found</Text>
            <Text style={styles.emptyText}>Create first subcategory like Veg Pizza, Cold Drinks, Combo.</Text>

            <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Subcategory</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SubCategoryCard
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => askDelete(item)}
            onToggle={() => toggleStatus(item)}
            onItems={() =>
              navigation.navigate("AdminMenuItems", {
                restaurantId: item.restaurantId,
                categoryId: item.categoryId,
                subCategoryId: item.id,
              })
            }
          />
        )}
      />

      <SubCategoryModal
        visible={modalVisible}
        editing={editing}
        form={form}
        categories={filteredCategories}
        updateForm={updateForm}
        saving={saving}
        onCamera={() => pickImage(true)}
        onGallery={() => pickImage(false)}
        onClose={closeModal}
        onSave={save}
      />

      <KartoMessageModal
        visible={msg.visible}
        type={msg.type}
        title={msg.title}
        message={msg.message}
        primaryText={msg.primaryText}
        secondaryText={msg.secondaryText}
        loading={msg.loading}
        onPrimary={msg.onPrimary}
        onSecondary={msg.onSecondary}
        onClose={closeMsg}
      />
    </View>
  );
}

function MiniStat({ label, value, green, danger }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, green && { color: THEME.green }, danger && { color: THEME.danger }]}>
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SubCategoryCard({ item, onEdit, onDelete, onToggle, onItems }: any) {
  const imageUrl = item.imageUrl || item.image_url;
  const active = item.isActive !== false;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbFallback}>
            <Icon name="layers-outline" size={27} color={THEME.yellow} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, active ? styles.activeText : styles.inactiveText]}>
                {active ? "Active" : "Blocked"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={2}>
            {item.description || "No description added"}
          </Text>

          <Text style={styles.vendorText} numberOfLines={1}>
            {item.restaurant?.name || "Vendor"} • {item.category?.name || "Category"} • Items {item.menuItems?.length || 0}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Action icon="create-outline" text="Edit" onPress={onEdit} />
        <Action icon="fast-food-outline" text="Items" onPress={onItems} outline />
        <Action icon={active ? "ban-outline" : "checkmark-circle-outline"} text={active ? "Block" : "Active"} onPress={onToggle} outline />
        <Action icon="trash-outline" text="Delete" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function Action({ icon, text, onPress, outline, danger }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, outline && styles.actionOutline, danger && styles.actionDanger]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Icon name={icon} size={16} color={outline ? THEME.yellow : danger ? THEME.danger : "#000"} />
      <Text style={[styles.actionText, outline && styles.actionTextOutline, danger && styles.actionTextDanger]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function SubCategoryModal({
  visible,
  editing,
  form,
  categories,
  updateForm,
  saving,
  onCamera,
  onGallery,
  onClose,
  onSave,
}: any) {
  const preview = form.image?.uri || form.existingImageUrl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>VENDOR SUBCATEGORY</Text>
              <Text style={styles.modalTitle}>{editing ? "Edit Subcategory" : "Create Subcategory"}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Parent Vendor Category</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {categories.map((category: any) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.chip, form.categoryId === category.id && styles.chipActive]}
                  onPress={() => updateForm("categoryId", category.id)}
                >
                  <Text style={[styles.chipText, form.categoryId === category.id && styles.chipTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Subcategory Name"
              icon="layers-outline"
              value={form.name}
              onChangeText={(v: string) => updateForm("name", v)}
              placeholder="Example: Veg Pizza"
            />

            <Input
              label="Description"
              icon="document-text-outline"
              value={form.description}
              onChangeText={(v: string) => updateForm("description", v)}
              placeholder="Example: Fresh veg pizza options"
              multiline
            />

            <Text style={styles.inputLabel}>Subcategory Image</Text>

            <View style={styles.previewBox}>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewEmpty}>
                  <Icon name="image-outline" size={34} color={THEME.yellow} />
                  <Text style={styles.previewText}>No image selected</Text>
                </View>
              )}
            </View>

            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.greenImageBtn} onPress={onCamera}>
                <Icon name="camera-outline" size={20} color="#000" />
                <Text style={styles.imageBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.yellowImageBtn} onPress={onGallery}>
                <Icon name="images-outline" size={20} color="#000" />
                <Text style={styles.imageBtnText}>Upload File</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.statusToggle, form.isActive && styles.statusToggleActive]}
              onPress={() => updateForm("isActive", !form.isActive)}
            >
              <Icon
                name={form.isActive ? "checkmark-circle-outline" : "ban-outline"}
                size={20}
                color={form.isActive ? "#000" : THEME.danger}
              />
              <Text style={[styles.statusToggleText, form.isActive && styles.statusToggleTextActive]}>
                {form.isActive ? "Active Subcategory" : "Blocked Subcategory"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Save Subcategory</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Input({ label, icon, multiline, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
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
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  listContent: { paddingHorizontal: 16, paddingBottom: 38 },
  header: { paddingTop: 22, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 46, height: 46, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  smallLabel: { color: THEME.green, fontWeight: "900", fontSize: 11, letterSpacing: 1.1 },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },
  heroCard: { backgroundColor: THEME.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: THEME.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: THEME.muted, fontSize: 13, fontWeight: "800" },
  heroTitle: { color: THEME.yellow, fontSize: 22, fontWeight: "900", marginTop: 5 },
  heroSub: { color: THEME.muted, fontSize: 12, fontWeight: "700", marginTop: 5 },
  heroIcon: { width: 64, height: 64, borderRadius: 23, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  miniStat: { width: "48.5%", backgroundColor: THEME.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.border },
  miniValue: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  miniLabel: { color: THEME.muted, fontSize: 10.5, fontWeight: "800", marginTop: 4 },
  sectionTitle: { color: THEME.text, fontSize: 19, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  sectionTitleNoMargin: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionCount: { color: THEME.yellow, fontWeight: "900" },
  chipScroll: { maxHeight: 48, marginBottom: 10 },
  chip: { height: 38, borderWidth: 1, borderColor: THEME.border, borderRadius: 999, justifyContent: "center", paddingHorizontal: 14, marginRight: 8, backgroundColor: THEME.card },
  chipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  chipText: { color: THEME.muted, fontWeight: "900", fontSize: 11 },
  chipTextActive: { color: "#000" },
  searchBox: { marginTop: 17, height: 54, borderRadius: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800", fontSize: 14 },
  emptyBox: { backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: THEME.border },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 7, lineHeight: 20, fontWeight: "700" },
  emptyAddBtn: { marginTop: 18, height: 48, paddingHorizontal: 18, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  emptyAddText: { color: "#000", fontWeight: "900" },
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 64, height: 64, borderRadius: 20, backgroundColor: THEME.card2 },
  thumbFallback: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, color: THEME.text, fontSize: 17, fontWeight: "900" },
  meta: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "700" },
  vendorText: { color: THEME.green, marginTop: 6, fontSize: 11, fontWeight: "900" },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  activeBadge: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  inactiveBadge: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  statusText: { fontSize: 10, fontWeight: "900" },
  activeText: { color: THEME.green },
  inactiveText: { color: THEME.danger },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  actionBtn: { flex: 1, minHeight: 40, borderRadius: 15, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: THEME.yellow },
  actionOutline: { backgroundColor: THEME.card2, borderColor: THEME.border },
  actionDanger: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  actionText: { color: "#000", fontSize: 12, fontWeight: "900" },
  actionTextOutline: { color: THEME.yellow },
  actionTextDanger: { color: THEME.danger },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "flex-end" },
  modalBox: { maxHeight: "92%", backgroundColor: THEME.bg, padding: 18, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: THEME.border },
  modalHandle: { width: 52, height: 5, borderRadius: 999, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  modalLabel: { color: THEME.green, fontSize: 11, letterSpacing: 1.1, fontWeight: "900" },
  modalTitle: { color: THEME.text, fontSize: 24, fontWeight: "900", marginTop: 3 },
  closeBtn: { width: 43, height: 43, borderRadius: 17, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: THEME.text, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  inputBox: { minHeight: 55, borderRadius: 19, backgroundColor: THEME.input, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  textAreaBox: { minHeight: 96, alignItems: "flex-start", paddingTop: 14 },
  input: { flex: 1, color: THEME.text, fontWeight: "800" },
  textArea: { minHeight: 75, textAlignVertical: "top" },
  previewBox: { height: 152, borderRadius: 22, backgroundColor: THEME.input, borderWidth: 1, borderColor: THEME.border, overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  previewEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewText: { color: THEME.muted, marginTop: 8, fontWeight: "800" },
  imageActions: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 15 },
  greenImageBtn: { flex: 1, height: 48, borderRadius: 18, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  yellowImageBtn: { flex: 1, height: 48, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  imageBtnText: { color: "#000", fontWeight: "900" },
  statusToggle: { minHeight: 52, borderRadius: 18, backgroundColor: "#251010", borderWidth: 1, borderColor: "#6B1F1F", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 },
  statusToggleActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  statusToggleText: { color: THEME.danger, fontWeight: "900" },
  statusToggleTextActive: { color: "#000" },
  saveBtn: { height: 56, borderRadius: 20, backgroundColor: THEME.yellow, marginTop: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: THEME.muted, fontWeight: "900" },
});