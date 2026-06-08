import React, {
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
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import apiClient from "@/api/apiClient";
import {
  vendorService,
  VendorCategory,
  VendorMenuItem,
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
};

type StockFilter = "ALL" | "LIVE" | "OUT";

type MenuForm = {
  name: string;
  price: string;
  description: string;
  prepTimeMin: string;
  categoryId: string;
  restaurantId: string;
  imageUrl: string | null;
  localImageUri: string | null;
  isVeg: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isAvailable: boolean;
};

const STOCK_FILTERS: StockFilter[] = ["ALL", "LIVE", "OUT"];

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const getImageUrlFromUpload = (res: any) =>
  res?.data?.imageUrl ||
  res?.data?.url ||
  res?.data?.secure_url ||
  res?.data?.data?.imageUrl ||
  res?.data?.data?.url ||
  res?.data?.data?.secure_url ||
  res?.data?.file?.url ||
  res?.data?.result?.secure_url ||
  null;


const getImageUrl = (item: VendorMenuItem) => {
  return item.imageUrl || (item as any).image_url || null;
};

const getItemCategoryName = (item: VendorMenuItem) => {
  return (
    (item as any).vendorCategory?.name ||
    (item as any).category?.name ||
    (item as any).categoryName ||
    (typeof (item as any).category === "string" ? (item as any).category : "") ||
    "Uncategorized"
  );
};

const getItemCategoryId = (item: VendorMenuItem) => {
  return (
    item.categoryId ||
    (item as any).vendorCategoryId ||
    (item as any).category_id ||
    (item as any).category?.id ||
    ""
  );
};

const getItemRestaurantId = (item: VendorMenuItem) => {
  return (
    item.restaurantId ||
    (item as any).restaurant_id ||
    (item as any).restaurant?.id ||
    ""
  );
};

const isItemVeg = (item: VendorMenuItem) => {
  return Boolean(
    (item as any).isVeg ??
      (item as any).isVegetarian ??
      (item as any).is_vegetarian ??
      false
  );
};

const isItemAvailable = (item: VendorMenuItem) => {
  return Boolean(
    item.isAvailable ??
      (item as any).is_available ??
      true
  );
};

const isItemPopular = (item: VendorMenuItem) => {
  return Boolean(
    (item as any).isPopular ??
      (item as any).is_popular ??
      false
  );
};

const isItemBestSeller = (item: VendorMenuItem) => {
  return Boolean(
    (item as any).isBestSeller ??
      (item as any).is_best_seller ??
      false
  );
};

const normalizeNumberText = (text: string) => {
  return text.replace(/[^0-9.]/g, "");
};

const normalizeIntegerText = (text: string) => {
  return text.replace(/[^0-9]/g, "");
};

const createInitialForm = (): MenuForm => ({
  name: "",
  price: "",
  description: "",
  prepTimeMin: "20",
  categoryId: "",
  restaurantId: "",
  imageUrl: null,
  localImageUri: null,
  isVeg: true,
  isPopular: false,
  isBestSeller: false,
  isAvailable: true,
});

export default function VendorMenuScreen() {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<VendorMenuItem[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState<VendorMenuItem | null>(null);
  const [form, setForm] = useState<MenuForm>(createInitialForm());

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 2200);
  }, []);

  const patchForm = (next: Partial<MenuForm>) => {
    setForm((prev) => ({
      ...prev,
      ...next,
    }));
  };

  const loadMenu = useCallback(async () => {
    const [menuRes, categoryRes, restaurantRes] = await Promise.all([
      vendorService.getMenuItems(),
      vendorService.getCategories(),
      vendorService.getRestaurants(),
    ]);

    if (menuRes.error) {
      showToast(menuRes.error?.message || "Failed to load menu");
      setItems([]);
    } else {
      setItems(menuRes.data || []);
    }

    if (!categoryRes.error) {
      setCategories(categoryRes.data || []);
    }

    if (!restaurantRes.error) {
      setRestaurants(restaurantRes.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [showToast]);

  useEffect(() => {
    loadMenu();

    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [loadMenu]);

  const defaultRestaurantId = useMemo(() => {
    return restaurants?.[0]?.id || "";
  }, [restaurants]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter(isItemAvailable).length,
      out: items.filter((item) => !isItemAvailable(item)).length,
      best: items.filter(isItemBestSeller).length,
    };
  }, [items]);

  const categoryNames = useMemo(() => {
    const namesFromItems = items.map(getItemCategoryName).filter(Boolean);
    const namesFromCategories = categories.map((cat) => cat.name).filter(Boolean);
    const allNames = [...namesFromCategories, ...namesFromItems];

    return ["All", ...Array.from(new Set(allNames))];
  }, [items, categories]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const itemCategory = getItemCategoryName(item);

      const nameMatch = item.name?.toLowerCase().includes(normalizedSearch);
      const descriptionMatch = item.description
        ?.toLowerCase()
        .includes(normalizedSearch);

      const matchSearch =
        !normalizedSearch ||
        Boolean(nameMatch) ||
        Boolean(descriptionMatch);

      const available = isItemAvailable(item);

      const matchStock =
        stockFilter === "ALL" ||
        (stockFilter === "LIVE" && available) ||
        (stockFilter === "OUT" && !available);

      const matchCategory =
        categoryFilter === "All" || itemCategory === categoryFilter;

      return matchSearch && matchStock && matchCategory;
    });
  }, [items, search, stockFilter, categoryFilter]);

  const resetForm = () => {
    setSelectedItem(null);

    setForm({
      ...createInitialForm(),
      restaurantId: defaultRestaurantId,
      categoryId: categories?.[0]?.id || "",
    });
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: VendorMenuItem) => {
    setSelectedItem(item);

    setForm({
      name: item.name || "",
      price: String(item.price || ""),
      description: item.description || "",
      prepTimeMin: String((item as any).prepTimeMin || (item as any).prep_time_min || 20),
      categoryId: getItemCategoryId(item) || categories?.[0]?.id || "",
      restaurantId: getItemRestaurantId(item) || defaultRestaurantId,
      imageUrl: getImageUrl(item),
      localImageUri: null,
      isVeg: isItemVeg(item),
      isPopular: isItemPopular(item),
      isBestSeller: isItemBestSeller(item),
      isAvailable: isItemAvailable(item),
    });

    setModalVisible(true);
  };

  const uploadSelectedImage = async (asset: any) => {
    if (!asset?.uri) return;

    patchForm({ localImageUri: asset.uri });
    setUploading(true);

    try {
      const file: any = {
        uri: asset.uri,
        name: asset.fileName || `vendor-menu-${Date.now()}.jpg`,
        type: asset.type || "image/jpeg",
      };

      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", "menu");

      let res: any;

      try {
        res = await apiClient.post("/upload/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        res = await apiClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const uploadedUrl = getImageUrlFromUpload(res);

      if (!uploadedUrl) {
        showToast("Image uploaded but URL not found");
        return;
      }

      patchForm({ imageUrl: uploadedUrl });
      showToast("Image selected");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Image upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      selectionLimit: 1,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      showToast(result.errorMessage || "Gallery error");
      return;
    }

    await uploadSelectedImage(result.assets?.[0]);
  };

  const openCamera = async () => {
    const result = await launchCamera({
      mediaType: "photo",
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
      cameraType: "back",
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      showToast(result.errorMessage || "Camera error");
      return;
    }

    await uploadSelectedImage(result.assets?.[0]);
  };

  const showImageOptions = () => {
    Alert.alert("Item Photo", "Choose image source", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: pickFromGallery },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => patchForm({ imageUrl: null, localImageUri: null }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const validateForm = () => {
    const price = Number(form.price);
    const prepTime = Number(form.prepTimeMin);

    if (!form.name.trim()) {
      showToast("Item name required");
      return false;
    }

    if (!price || price <= 0) {
      showToast("Valid price required");
      return false;
    }

    if (price > 99999) {
      showToast("Price looks too high");
      return false;
    }

    if (!prepTime || prepTime < 1 || prepTime > 180) {
      showToast("Prep time must be 1 to 180 minutes");
      return false;
    }

    if (restaurants.length > 0 && !form.restaurantId) {
      showToast("Restaurant required");
      return false;
    }

    return true;
  };

  const saveItem = async () => {
    if (saving || !validateForm()) {
      return;
    }

    setSaving(true);

    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      prepTimeMin: Number(form.prepTimeMin),
      prep_time_min: Number(form.prepTimeMin),
      categoryId: form.categoryId || undefined,
      category_id: form.categoryId || undefined,
      restaurantId: form.restaurantId || defaultRestaurantId || undefined,
      restaurant_id: form.restaurantId || defaultRestaurantId || undefined,
      imageUrl: form.imageUrl || undefined,
      image_url: form.imageUrl || undefined,
      isVeg: form.isVeg,
      is_veg: form.isVeg,
      isVegetarian: form.isVeg,
      is_vegetarian: form.isVeg,
      isPopular: form.isPopular,
      is_popular: form.isPopular,
      isBestSeller: form.isBestSeller,
      is_best_seller: form.isBestSeller,
      isAvailable: form.isAvailable,
      is_available: form.isAvailable,
    };

    const result = selectedItem
      ? await vendorService.updateMenuItem(selectedItem.id, payload)
      : await vendorService.createMenuItem(payload);

    if (result.error || !result.data) {
      showToast(result.error?.message || "Failed to save item");
      setSaving(false);
      return;
    }

    setModalVisible(false);
    resetForm();
    setSaving(false);

    showToast(selectedItem ? "Item updated" : "Item added");
    loadMenu();
  };

  const toggleAvailability = async (item: VendorMenuItem) => {
    if (toggleLoadingId) {
      return;
    }

    const currentValue = isItemAvailable(item);
    const nextValue = !currentValue;

    setToggleLoadingId(item.id);

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              isAvailable: nextValue,
              is_available: nextValue,
            } as any
          : row
      )
    );

    const { error } = await vendorService.toggleMenuItemAvailability(
      item.id,
      nextValue
    );

    if (error) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                isAvailable: currentValue,
                is_available: currentValue,
              } as any
            : row
        )
      );

      showToast(error?.message || "Failed to update item");
    } else {
      showToast(nextValue ? "Item available now" : "Item marked out of stock");
    }

    setToggleLoadingId(null);
  };

  const confirmDelete = (item: VendorMenuItem) => {
    setSelectedItem(item);
    setDeleteModal(true);
  };

  const deleteItem = async () => {
    if (!selectedItem || saving) {
      return;
    }

    setSaving(true);

    const { error } = await vendorService.deleteMenuItem(selectedItem.id);

    if (error) {
      showToast(error?.message || "Failed to delete item");
      setSaving(false);
      return;
    }

    setItems((prev) => prev.filter((row) => row.id !== selectedItem.id));
    setDeleteModal(false);
    setSelectedItem(null);
    setSaving(false);
    showToast("Item deleted");
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMenu();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading menu...</Text>
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

      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>Vendor Panel</Text>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>Manage items, price, categories and stock.</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={openAddModal}
        >
          <Icon name="add" size={24} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroLabel}>Menu Health</Text>
          <Text style={styles.heroTitle}>{stats.available}/{stats.total} Live</Text>
          <Text style={styles.heroSub}>
            {stats.best} bestsellers • {stats.out} out of stock
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="fast-food-outline" size={28} color={THEME.bg} />
        </View>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search-outline" size={18} color={THEME.muted} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search menu items..."
          placeholderTextColor={THEME.muted}
          style={styles.searchInput}
        />

        {!!search && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSearch("")}>
            <Icon name="close-circle" size={18} color={THEME.muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Total" value={stats.total} icon="fast-food-outline" />
        <StatCard label="Live" value={stats.available} icon="checkmark-circle-outline" />
        <StatCard label="Out" value={stats.out} icon="close-circle-outline" />
      </View>

      <FlatList
        horizontal
        data={STOCK_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.stockFilterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              stockFilter === item && styles.filterChipActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setStockFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                stockFilter === item && styles.filterTextActive,
              ]}
            >
              {item === "ALL"
                ? "All Items"
                : item === "LIVE"
                ? "Live"
                : "Out of Stock"}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        horizontal
        data={categoryNames}
        keyExtractor={(item) => String(item)}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              categoryFilter === item && styles.categoryChipActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setCategoryFilter(String(item))}
          >
            <Text
              style={[
                styles.categoryText,
                categoryFilter === item && styles.categoryTextActive,
              ]}
            >
              {String(item)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="restaurant-outline" size={34} color={THEME.yellow} />
            </View>

            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptyText}>Try another filter or add a new item.</Text>

            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.85}
              onPress={openAddModal}
            >
              <Text style={styles.emptyBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <MenuCard
            item={item}
            toggleLoading={toggleLoadingId === item.id}
            onEdit={() => openEditModal(item)}
            onDelete={() => confirmDelete(item)}
            onToggle={() => toggleAvailability(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={openAddModal}
      >
        <Icon name="add" size={30} color={THEME.bg} />
      </TouchableOpacity>

      <MenuItemModal
        visible={modalVisible}
        selectedItem={selectedItem}
        form={form}
        categories={categories}
        restaurants={restaurants}
        saving={saving}
        uploading={uploading}
        onPatch={patchForm}
        onPickImage={showImageOptions}
        onGallery={pickFromGallery}
        onCamera={openCamera}
        onSave={saveItem}
        onClose={() => {
          if (!saving) {
            setModalVisible(false);
          }
        }}
      />

      <DeleteModal
        visible={deleteModal}
        itemName={selectedItem?.name || "this item"}
        saving={saving}
        onCancel={() => {
          if (!saving) {
            setDeleteModal(false);
          }
        }}
        onDelete={deleteItem}
      />
    </View>
  );
}

function MenuItemModal({
  visible,
  selectedItem,
  form,
  categories,
  restaurants,
  saving,
  uploading,
  onPatch,
  onPickImage,
  onGallery,
  onCamera,
  onSave,
  onClose,
}: {
  visible: boolean;
  selectedItem: VendorMenuItem | null;
  form: MenuForm;
  categories: VendorCategory[];
  restaurants: VendorRestaurant[];
  saving: boolean;
  uploading: boolean;
  onPatch: (next: Partial<MenuForm>) => void;
  onPickImage: () => void;
  onGallery: () => void;
  onCamera: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>
                {selectedItem ? "Edit Menu Item" : "Add Menu Item"}
              </Text>

              <TouchableOpacity
                style={styles.imagePickerBox}
                activeOpacity={0.85}
                onPress={onPickImage}
                disabled={uploading}
              >
                {form.localImageUri || form.imageUrl ? (
                  <Image
                    source={{ uri: form.localImageUri || form.imageUrl || "" }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.imagePickerInner}>
                    <Icon name="camera-outline" size={28} color={THEME.yellow} />
                    <Text style={styles.imagePickerTitle}>Item Photo</Text>
                    <Text style={styles.imagePickerText}>
                      Gallery / Camera upload only. No URL input.
                    </Text>
                  </View>
                )}

                <View style={styles.imageOverlay}>
                  {uploading ? (
                    <ActivityIndicator color={THEME.bg} />
                  ) : (
                    <>
                      <Icon name="image-outline" size={16} color={THEME.bg} />
                      <Text style={styles.imageOverlayText}>
                        {form.localImageUri || form.imageUrl ? "Change" : "Select"}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.imageActionRow}>
                <TouchableOpacity
                  style={styles.imageActionBtn}
                  activeOpacity={0.85}
                  disabled={uploading}
                  onPress={onGallery}
                >
                  <Icon name="images-outline" size={18} color={THEME.green} />
                  <Text style={styles.imageActionText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageActionBtn}
                  activeOpacity={0.85}
                  disabled={uploading}
                  onPress={onCamera}
                >
                  <Icon name="camera-outline" size={18} color={THEME.yellow} />
                  <Text style={styles.imageActionText}>Camera</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor={THEME.muted}
                value={form.name}
                onChangeText={(value) => onPatch({ name: value })}
              />

              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Description"
                placeholderTextColor={THEME.muted}
                value={form.description}
                onChangeText={(value) => onPatch({ description: value })}
                multiline
              />

              <View style={styles.twoCol}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Price"
                  placeholderTextColor={THEME.muted}
                  keyboardType="numeric"
                  value={form.price}
                  onChangeText={(value) => onPatch({ price: normalizeNumberText(value) })}
                />

                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Prep min"
                  placeholderTextColor={THEME.muted}
                  keyboardType="number-pad"
                  value={form.prepTimeMin}
                  onChangeText={(value) => onPatch({ prepTimeMin: normalizeIntegerText(value) })}
                />
              </View>

              {restaurants.length > 1 && (
                <View style={styles.selectBlock}>
                  <Text style={styles.selectTitle}>Restaurant</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {restaurants.map((restaurant) => {
                      const active = form.restaurantId === restaurant.id;

                      return (
                        <TouchableOpacity
                          key={restaurant.id}
                          activeOpacity={0.85}
                          style={[
                            styles.selectChip,
                            active && styles.selectChipActive,
                          ]}
                          onPress={() => onPatch({ restaurantId: restaurant.id })}
                        >
                          <Text
                            style={[
                              styles.selectChipText,
                              active && styles.selectChipTextActive,
                            ]}
                          >
                            {restaurant.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {categories.length > 0 && (
                <View style={styles.selectBlock}>
                  <Text style={styles.selectTitle}>Category</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((category) => {
                      const active = form.categoryId === category.id;

                      return (
                        <TouchableOpacity
                          key={category.id}
                          activeOpacity={0.85}
                          style={[
                            styles.selectChip,
                            active && styles.selectChipActive,
                          ]}
                          onPress={() => onPatch({ categoryId: category.id })}
                        >
                          <Text
                            style={[
                              styles.selectChipText,
                              active && styles.selectChipTextActive,
                            ]}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <ToggleRow
                label="Available"
                value={form.isAvailable}
                onChange={(value: boolean) => onPatch({ isAvailable: value })}
              />

              <ToggleRow
                label="Veg Item"
                value={form.isVeg}
                onChange={(value: boolean) => onPatch({ isVeg: value })}
              />

              <ToggleRow
                label="Popular"
                value={form.isPopular}
                onChange={(value: boolean) => onPatch({ isPopular: value })}
              />

              <ToggleRow
                label="Best Seller"
                value={form.isBestSeller}
                onChange={(value: boolean) => onPatch({ isBestSeller: value })}
              />

              <TouchableOpacity
                style={[styles.saveBtn, (saving || uploading) && styles.disabledBtn]}
                activeOpacity={0.85}
                disabled={saving || uploading}
                onPress={onSave}
              >
                {saving ? (
                  <ActivityIndicator color={THEME.bg} />
                ) : (
                  <Text style={styles.saveText}>
                    {selectedItem ? "Update Item" : "Save Item"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.85}
                disabled={saving}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function DeleteModal({
  visible,
  itemName,
  saving,
  onCancel,
  onDelete,
}: {
  visible: boolean;
  itemName: string;
  saving: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.confirmCard}>
          <View style={styles.confirmIcon}>
            <Icon name="trash-outline" size={28} color={THEME.danger} />
          </View>

          <Text style={styles.confirmTitle}>Delete item?</Text>
          <Text style={styles.confirmText}>
            This will remove {itemName} from your menu.
          </Text>

          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancel}
              activeOpacity={0.85}
              disabled={saving}
              onPress={onCancel}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmDelete, saving && styles.disabledBtn]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={onDelete}
            >
              {saving ? (
                <ActivityIndicator color={THEME.text} />
              ) : (
                <Text style={styles.confirmDeleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuCard({
  item,
  toggleLoading,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: VendorMenuItem;
  toggleLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const imageUrl = getImageUrl(item);
  const available = isItemAvailable(item);
  const veg = isItemVeg(item);
  const popular = isItemPopular(item);
  const bestSeller = isItemBestSeller(item);
  const prepTime = Number((item as any).prepTimeMin || (item as any).prep_time_min || 0);
  const fastPrep = prepTime <= 15 && prepTime > 0;

  return (
    <View style={styles.card}>
      <View style={styles.imageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <Icon name="fast-food-outline" size={28} color={THEME.yellow} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={[styles.stockBadge, !available && styles.outBadge]}>
            <Text style={[styles.stockText, !available && styles.outText]}>
              {available ? "Live" : "Out"}
            </Text>
          </View>
        </View>

        {!!item.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.badgeRow}>
          <View style={styles.miniBadge}>
            <Text style={styles.miniBadgeText}>
              {veg ? "Veg" : "Non-Veg"}
            </Text>
          </View>

          {!!prepTime && (
            <View style={fastPrep ? styles.greenBadge : styles.yellowBadge}>
              <Text style={fastPrep ? styles.greenBadgeText : styles.yellowBadgeText}>
                {prepTime} min
              </Text>
            </View>
          )}

          {!!bestSeller && (
            <View style={styles.yellowBadge}>
              <Text style={styles.yellowBadgeText}>Bestseller</Text>
            </View>
          )}

          {!!popular && (
            <View style={styles.greenBadge}>
              <Text style={styles.greenBadgeText}>Popular</Text>
            </View>
          )}
        </View>

        <Text style={styles.categoryName} numberOfLines={1}>
          {getItemCategoryName(item)}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{money(item.price)}</Text>

          <View style={styles.switchWrap}>
            <Text style={styles.switchText}>Stock</Text>

            {toggleLoading ? (
              <ActivityIndicator size="small" color={THEME.green} />
            ) : (
              <Switch
                value={available}
                onValueChange={onToggle}
                thumbColor={available ? THEME.green : THEME.muted}
                trackColor={{
                  false: "#293029",
                  true: "rgba(34,197,94,0.35)",
                }}
              />
            )}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.85}
          onPress={onEdit}
        >
          <Icon name="create-outline" size={20} color={THEME.green} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.85}
          onPress={onDelete}
        >
          <Icon name="trash-outline" size={20} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={17} color={THEME.bg} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>

      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? THEME.green : THEME.muted}
        trackColor={{
          false: "#293029",
          true: "rgba(34,197,94,0.35)",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
    paddingTop: 18,
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
    alignItems: "center",
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
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
    fontSize: 34,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroLabel: {
    color: THEME.bg,
    fontWeight: "900",
    opacity: 0.75,
  },
  heroTitle: {
    color: THEME.bg,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSub: {
    color: THEME.bg,
    fontWeight: "800",
    opacity: 0.78,
    marginTop: 4,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    height: 48,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 17,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 13,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  stockFilterList: {
    maxHeight: 40,
    marginBottom: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  filterText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  filterTextActive: {
    color: THEME.bg,
  },
  categoryList: {
    maxHeight: 40,
    marginBottom: 8,
  },
  categoryChip: {
    height: 35,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  categoryText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  categoryTextActive: {
    color: THEME.bg,
  },
  listContent: {
    paddingBottom: 110,
  },
  card: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 13,
    marginBottom: 12,
    gap: 12,
  },
  imageBox: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    flex: 1,
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  desc: {
    color: THEME.muted,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 18,
  },
  stockBadge: {
    backgroundColor: "rgba(34,197,94,0.13)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  outBadge: {
    backgroundColor: "rgba(239,68,68,0.13)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  stockText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },
  outText: {
    color: THEME.danger,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  miniBadge: {
    backgroundColor: THEME.card2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  miniBadgeText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: "900",
  },
  yellowBadge: {
    backgroundColor: "rgba(246,195,67,0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  yellowBadgeText: {
    color: THEME.yellow,
    fontSize: 10,
    fontWeight: "900",
  },
  greenBadge: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  greenBadgeText: {
    color: THEME.green,
    fontSize: 10,
    fontWeight: "900",
  },
  categoryName: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 7,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  price: {
    color: THEME.green,
    fontSize: 18,
    fontWeight: "900",
  },
  switchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  switchText: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  actions: {
    gap: 9,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    marginTop: 70,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 5,
    fontWeight: "700",
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: THEME.green,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "92%",
    backgroundColor: THEME.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 99,
    backgroundColor: THEME.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 14,
  },
  imagePickerBox: {
    height: 170,
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "dashed",
    backgroundColor: "#0B100B",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  imagePickerInner: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageOverlayText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 12,
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  imageActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  imageActionText: {
    color: THEME.text,
    fontWeight: "900",
  },
  imagePickerTitle: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 8,
  },
  imagePickerText: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 3,
    fontSize: 12,
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
    marginBottom: 10,
  },
  descriptionInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  flexInput: {
    flex: 1,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  selectBlock: {
    marginBottom: 10,
  },
  selectTitle: {
    color: THEME.text,
    fontWeight: "900",
    marginBottom: 8,
  },
  selectChip: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectChipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  selectChipText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  selectChipTextActive: {
    color: THEME.bg,
  },
  toggleRow: {
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    color: THEME.text,
    fontWeight: "900",
  },
  saveBtn: {
    height: 52,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveText: {
    color: THEME.bg,
    fontWeight: "900",
    fontSize: 15,
  },
  cancelBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  cancelText: {
    color: THEME.text,
    fontWeight: "900",
  },
  disabledBtn: {
    opacity: 0.65,
  },
  confirmCard: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  confirmIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "rgba(239,68,68,0.12)",
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
    marginTop: 6,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  confirmCancel: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    color: THEME.text,
    fontWeight: "900",
  },
  confirmDelete: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    color: THEME.text,
    fontWeight: "900",
  },
});