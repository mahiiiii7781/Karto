import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  StatusBar,
  RefreshControl,
  Image,
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
  orange: "#FFB020",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

type MessageState = {
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

export default function AdminMenuScreen({ navigation }: any) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    restaurantId: "",
    categoryId: "",
    name: "",
    description: "",
    price: "",
    image: null,
    isAvailable: true,
    isVegetarian: false,
    isPopular: false,
  });

  const [message, setMessage] = useState<MessageState>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMessage = (
    type: KartoMessageType,
    title: string,
    msg: string,
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMessage({
      visible: true,
      type,
      title,
      message: msg,
      primaryText,
      secondaryText,
      onPrimary,
      onSecondary,
    });
  };

  const closeMessage = () => {
    setMessage((prev) => ({ ...prev, visible: false, loading: false }));
  };

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  const loadData = async () => {
    const [vendorRes, catRes, itemRes] = await Promise.all([
      adminService.vendors(),
      adminService.categories(),
      selectedVendorId
        ? adminService.getMenuItems({
            restaurantId: selectedVendorId,
            categoryId: selectedCategoryId,
          })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (vendorRes.error) {
      showMessage(
        "error",
        "Unable to Load Vendors",
        vendorRes.error.message || "Failed to load vendors."
      );
    } else {
      const vendorList = vendorRes.data || [];
      setVendors(vendorList);

      if (!selectedVendorId && vendorList.length > 0) {
        setSelectedVendorId(vendorList[0].id);
      }
    }

    if (catRes.error) {
      showMessage(
        "error",
        "Unable to Load Categories",
        catRes.error.message || "Failed to load categories."
      );
    } else {
      setCategories(catRes.data || []);
    }

    if (itemRes.error) {
      showMessage(
        "error",
        "Unable to Load Menu",
        itemRes.error.message || "Failed to load menu items."
      );
    } else if (selectedVendorId) {
      setMenuItems(itemRes.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVendorId) {
      loadMenuItems();
    }
  }, [selectedVendorId, selectedCategoryId]);

  const loadMenuItems = async () => {
    const res = await adminService.getMenuItems({
      restaurantId: selectedVendorId,
      categoryId: selectedCategoryId,
    });

    if (res.error) {
      showMessage(
        "error",
        "Unable to Load Menu Items",
        res.error.message || "Failed to load menu items."
      );
    } else {
      setMenuItems(res.data || []);
    }

    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMenuItems();
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return menuItems;

    return menuItems.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.name?.toLowerCase().includes(q)
      );
    });
  }, [menuItems, search]);

  const stats = useMemo(() => {
    const totalValue = filteredItems.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    return {
      total: filteredItems.length,
      available: filteredItems.filter((item) => item.isAvailable !== false).length,
      unavailable: filteredItems.filter((item) => item.isAvailable === false).length,
      popular: filteredItems.filter((item) => item.isPopular === true).length,
      avgPrice: filteredItems.length ? totalValue / filteredItems.length : 0,
    };
  }, [filteredItems]);

  const updateForm = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

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
      showMessage("warning", "No Image Found", "Please select a valid item image.");
      return;
    }

    updateForm("image", asset);
  };

  const openCreate = () => {
    if (!selectedVendorId) {
      showMessage("warning", "Vendor Required", "Please select a vendor first.");
      return;
    }

    setEditing(null);
    setForm({
      restaurantId: selectedVendorId,
      categoryId: categories[0]?.id || "",
      name: "",
      description: "",
      price: "",
      image: null,
      isAvailable: true,
      isVegetarian: false,
      isPopular: false,
    });
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      restaurantId: item.restaurantId || selectedVendorId,
      categoryId: item.categoryId || item.category?.id || "",
      name: item.name || "",
      description: item.description || "",
      price: String(item.price || ""),
      image: null,
      existingImageUrl: item.imageUrl || item.image_url || "",
      isAvailable: item.isAvailable ?? true,
      isVegetarian: item.isVegetarian ?? false,
      isPopular: item.isPopular ?? false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setSaving(false);
  };

  const validate = () => {
    if (!form.restaurantId) return "Please select a vendor.";
    if (!form.name.trim()) return "Menu item name is required.";
    if (!form.price.trim()) return "Menu item price is required.";

    const price = Number(form.price);

    if (Number.isNaN(price) || price <= 0) {
      return "Price should be greater than 0.";
    }

    return null;
  };

  const saveItem = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      showMessage("warning", "Please Check Details", validationMessage);
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      categoryId: form.categoryId || undefined,
      image: form.image,
      isAvailable: form.isAvailable,
      isVegetarian: form.isVegetarian,
      isPopular: form.isPopular,
    };

    const res = editing
      ? await adminService.updateMenuItem(editing.id, payload)
      : await adminService.createMenuItem(payload);

    setSaving(false);

    if (res.error) {
      showMessage("error", "Menu Save Failed", res.error.message || "Menu save failed.");
      return;
    }

    closeModal();

    showMessage(
      "success",
      editing ? "Menu Item Updated" : "Menu Item Created",
      editing
        ? "Item details have been updated successfully."
        : "New item has been added to vendor menu.",
      "Done",
      () => {
        closeMessage();
        loadMenuItems();
      }
    );
  };

  const askDeleteItem = (item: any) => {
    showMessage(
      "warning",
      "Delete Menu Item?",
      `${item.name || "This item"} will be removed from the vendor menu.`,
      "Delete",
      () => deleteItem(item.id),
      "Cancel",
      closeMessage
    );
  };

  const deleteItem = async (id: string) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const { error } = await adminService.deleteMenuItem(id);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message: error.message || "Unable to delete menu item.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Item Deleted",
      message: "Menu item has been removed successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadMenuItems();
      },
    });
  };

  const toggleStock = async (item: any) => {
    const { error } = await adminService.updateMenuItem(item.id, {
      isAvailable: !item.isAvailable,
    });

    if (error) {
      showMessage(
        "error",
        "Availability Update Failed",
        error.message || "Availability update failed."
      );
      return;
    }

    loadMenuItems();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading menu management...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredItems}
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
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>MENU OPERATIONS</Text>
                <Text style={styles.title}>Menu Management</Text>
                <Text style={styles.subtitle}>Create, update and control vendor items</Text>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.86}>
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>Selected Vendor</Text>
                <Text style={styles.heroTitle}>
                  {selectedVendor?.name || "Select Vendor"}
                </Text>
                <Text style={styles.heroSub}>
                  {selectedVendor?.city?.name || "No city"} • {selectedVendor?.type || "Business"}
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="fast-food-outline" size={35} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.statGrid}>
              <MiniStat label="Items" value={stats.total} />
              <MiniStat label="Available" value={stats.available} />
              <MiniStat label="Out Stock" value={stats.unavailable} />
              <MiniStat label="Avg Price" value={money(stats.avgPrice)} />
            </View>

            <Text style={styles.sectionTitle}>Vendors</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {vendors.map((vendor) => (
                <TouchableOpacity
                  key={vendor.id}
                  style={[
                    styles.chip,
                    selectedVendorId === vendor.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedVendorId(vendor.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedVendorId === vendor.id && styles.chipTextActive,
                    ]}
                  >
                    {vendor.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Categories</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, selectedCategoryId === "ALL" && styles.chipActive]}
                onPress={() => setSelectedCategoryId("ALL")}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === "ALL" && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    selectedCategoryId === cat.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategoryId === cat.id && styles.chipTextActive,
                    ]}
                  >
                    {cat.name || cat.category_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search item, category, description..."
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
              <Text style={styles.sectionTitleNoMargin}>Menu Items</Text>
              <Text style={styles.sectionCount}>{filteredItems.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="fast-food-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptyText}>
              Add your first item to start receiving customer orders.
            </Text>

            <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate} activeOpacity={0.86}>
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => askDeleteItem(item)}
            onToggleStock={() => toggleStock(item)}
          />
        )}
      />

      <MenuItemModal
        visible={modalVisible}
        editing={editing}
        form={form}
        categories={categories}
        saving={saving}
        updateForm={updateForm}
        onCamera={() => pickImage(true)}
        onGallery={() => pickImage(false)}
        onClose={closeModal}
        onSave={saveItem}
      />

      <KartoMessageModal
        visible={message.visible}
        type={message.type}
        title={message.title}
        message={message.message}
        primaryText={message.primaryText}
        secondaryText={message.secondaryText}
        loading={message.loading}
        onPrimary={message.onPrimary}
        onSecondary={message.onSecondary}
        onClose={closeMessage}
      />
    </View>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function MenuItemCard({ item, onEdit, onDelete, onToggleStock }: any) {
  const imageUrl = item.imageUrl || item.image_url;
  const available = item.isAvailable !== false;

  return (
    <View style={styles.card}>
      <View style={styles.itemTop}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImageFallback}>
            <Icon name="fast-food-outline" size={28} color={THEME.yellow} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || "Menu Item"}
            </Text>

            <View style={[styles.statusBadge, available ? styles.availableBadge : styles.outBadge]}>
              <Text style={[styles.statusText, available ? styles.availableText : styles.outText]}>
                {available ? "Available" : "Out Stock"}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {item.category?.name || "No category"} • {money(item.price)}
          </Text>

          <Text style={styles.meta} numberOfLines={2}>
            {item.description || "No description added"}
          </Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        {item.isVegetarian ? <Tag text="Veg" green /> : null}
        {item.isPopular ? <Tag text="Popular" yellow /> : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, available ? styles.outlineDanger : styles.greenBtn]}
          onPress={onToggleStock}
        >
          <Icon
            name={available ? "close-circle-outline" : "checkmark-circle-outline"}
            size={17}
            color={available ? THEME.danger : "#000"}
          />
          <Text style={[styles.actionText, available ? styles.dangerText : styles.blackText]}>
            {available ? "Out Stock" : "Available"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Icon name="create-outline" size={17} color="#000" />
          <Text style={styles.blackText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Icon name="trash-outline" size={17} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Tag({ text, green, yellow }: any) {
  return (
    <View
      style={[
        styles.tag,
        green && styles.greenTag,
        yellow && styles.yellowTag,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          green && { color: THEME.green },
          yellow && { color: THEME.yellow },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function MenuItemModal({
  visible,
  editing,
  form,
  categories,
  saving,
  updateForm,
  onCamera,
  onGallery,
  onClose,
  onSave,
}: any) {
  const previewUrl = form.image?.uri || form.existingImageUrl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>MENU FORM</Text>
              <Text style={styles.modalTitle}>
                {editing ? "Edit Menu Item" : "Create Menu Item"}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FormInput
              label="Item Name"
              icon="fast-food-outline"
              value={form.name}
              onChangeText={(v: string) => updateForm("name", v)}
              placeholder="Example: Cheese Pizza"
            />

            <FormInput
              label="Description"
              icon="document-text-outline"
              value={form.description}
              onChangeText={(v: string) => updateForm("description", v)}
              placeholder="Short item description"
              multiline
            />

            <FormInput
              label="Price"
              icon="cash-outline"
              value={form.price}
              onChangeText={(v: string) => updateForm("price", v)}
              keyboardType="numeric"
              placeholder="Example: 149"
            />

            <Text style={styles.inputLabel}>Item Image</Text>

            <View style={styles.previewBox}>
              {previewUrl ? (
                <Image source={{ uri: previewUrl }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewEmpty}>
                  <Icon name="image-outline" size={34} color={THEME.yellow} />
                  <Text style={styles.previewEmptyText}>No image selected</Text>
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
                <Text style={styles.imageBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipScroll}>
              {categories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.formChip,
                    form.categoryId === cat.id && styles.formChipActive,
                  ]}
                  onPress={() => updateForm("categoryId", cat.id)}
                >
                  <Text
                    style={[
                      styles.formChipText,
                      form.categoryId === cat.id && styles.formChipTextActive,
                    ]}
                  >
                    {cat.name || cat.category_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.switchGrid}>
              <ToggleCard
                title="Available"
                icon="checkmark-circle-outline"
                active={form.isAvailable}
                onPress={() => updateForm("isAvailable", !form.isAvailable)}
              />

              <ToggleCard
                title="Vegetarian"
                icon="leaf-outline"
                active={form.isVegetarian}
                onPress={() => updateForm("isVegetarian", !form.isVegetarian)}
              />

              <ToggleCard
                title="Popular"
                icon="flame-outline"
                active={form.isPopular}
                onPress={() => updateForm("isPopular", !form.isPopular)}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={onSave}
              disabled={saving}
              activeOpacity={0.86}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Save Item</Text>
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

function FormInput({ label, icon, multiline, ...props }: any) {
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

function ToggleCard({ title, icon, active, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.toggleCard, active && styles.toggleCardActive]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Icon name={icon} size={20} color={active ? "#000" : THEME.yellow} />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 38,
  },

  header: {
    paddingTop: 22,
    paddingBottom: 16,
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
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
    fontSize: 12,
  },

  heroCard: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: THEME.yellow,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },
  heroLabel: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  heroTitle: {
    color: THEME.yellow,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  miniStat: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: {
    color: THEME.text,
    fontSize: 21,
    fontWeight: "900",
  },
  miniLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitleNoMargin: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionCount: {
    color: THEME.yellow,
    fontWeight: "900",
  },

  chipScroll: {
    maxHeight: 48,
  },
  chip: {
    height: 38,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  chipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  chipText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 11,
  },
  chipTextActive: {
    color: "#000",
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
  emptyAddBtn: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  emptyAddText: {
    color: "#000",
    fontWeight: "900",
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemTop: {
    flexDirection: "row",
    gap: 12,
  },
  itemImage: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: THEME.card2,
  },
  itemImageFallback: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: THEME.text,
  },
  meta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  availableBadge: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },
  outBadge: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  availableText: {
    color: THEME.green,
  },
  outText: {
    color: THEME.danger,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  greenTag: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },
  yellowTag: {
    backgroundColor: "#1C190D",
    borderColor: "#5D4D0B",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  outlineDanger: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },
  greenBtn: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  editBtn: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  deleteBtn: {
    width: 46,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontWeight: "900",
    fontSize: 12,
  },
  blackText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
  },
  dangerText: {
    color: THEME.danger,
    fontWeight: "900",
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "flex-end",
  },
  modalBox: {
    maxHeight: "92%",
    backgroundColor: THEME.bg,
    padding: 18,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: THEME.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 55,
    borderRadius: 19,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textAreaBox: {
    minHeight: 96,
    alignItems: "flex-start",
    paddingTop: 14,
  },
  input: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
  },
  textArea: {
    minHeight: 75,
    textAlignVertical: "top",
  },

  previewBox: {
    height: 152,
    borderRadius: 22,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmptyText: {
    color: THEME.muted,
    marginTop: 8,
    fontWeight: "800",
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 15,
  },
  greenImageBtn: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  yellowImageBtn: {
    flex: 1,
    height: 48,
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

  formChipScroll: {
    maxHeight: 47,
    marginBottom: 16,
  },
  formChip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  formChipActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  formChipText: {
    color: THEME.muted,
    fontWeight: "900",
  },
  formChipTextActive: {
    color: "#000",
  },

  switchGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  toggleCard: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  toggleCardActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  toggleText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 11,
  },
  toggleTextActive: {
    color: "#000",
  },

  saveBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    marginTop: 8,
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