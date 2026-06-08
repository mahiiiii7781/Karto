import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  ScrollView,
  StatusBar,
  RefreshControl,
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

const emptyCatForm = {
  name: "",
  description: "",
  image: null,
  existingImageUrl: "",
};

const emptySubForm = {
  categoryId: "",
  name: "",
  description: "",
  image: null,
  existingImageUrl: "",
};

export default function AdminCategoriesScreen({ navigation }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [catModal, setCatModal] = useState(false);
  const [subModal, setSubModal] = useState(false);

  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingSub, setEditingSub] = useState<any>(null);

  const [savingCat, setSavingCat] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  const [catForm, setCatForm] = useState<any>(emptyCatForm);
  const [subForm, setSubForm] = useState<any>(emptySubForm);

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

  const loadData = useCallback(async () => {
    const [catRes, subRes] = await Promise.all([
      adminService.categories(),
      adminService.subCategories(selectedCategoryId),
    ]);

    if (catRes.error) {
      showMessage(
        "error",
        "Category Load Failed",
        catRes.error.message || "Failed to load categories"
      );
    } else {
      setCategories(catRes.data || []);
    }

    if (subRes.error) {
      showMessage(
        "error",
        "Subcategory Load Failed",
        subRes.error.message || "Failed to load subcategories"
      );
    } else {
      setSubCategories(subRes.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const stats = useMemo(() => {
    return {
      totalCategories: categories.length,
      totalSubCategories: subCategories.length,
      totalVendors: categories.reduce(
        (sum, item) => sum + Number(item.restaurants?.length || 0),
        0
      ),
      totalItems: categories.reduce(
        (sum, item) => sum + Number(item.menuItems?.length || 0),
        0
      ),
    };
  }, [categories, subCategories]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    });
  }, [categories, search]);

  const filteredSubCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subCategories;

    return subCategories.filter((item) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.name?.toLowerCase().includes(q)
      );
    });
  }, [subCategories, search]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "Karto needs camera access to capture category images.",
        buttonPositive: "Allow",
        buttonNegative: "Cancel",
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickImage = async (setter: any, fromCamera = false) => {
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
          "Image Error",
          result.errorMessage || "Unable to pick image"
        );
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        showMessage("warning", "No Image Found", "Please select a valid image.");
        return;
      }

      setter((prev: any) => ({
        ...prev,
        image: {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          fileName: asset.fileName || `category-${Date.now()}.jpg`,
          name: asset.fileName || `category-${Date.now()}.jpg`,
        },
      }));
    } catch (error: any) {
      showMessage(
        "error",
        "Image Error",
        error?.message || "Camera/gallery open nahi ho paya."
      );
    }
  };

  const closeCatModal = () => {
    setCatModal(false);
    setEditingCat(null);
    setSavingCat(false);
    setCatForm(emptyCatForm);
  };

  const closeSubModal = () => {
    setSubModal(false);
    setEditingSub(null);
    setSavingSub(false);
    setSubForm(emptySubForm);
  };

  const openCat = (cat?: any) => {
    setEditingCat(cat || null);
    setCatForm({
      name: cat?.name || "",
      description: cat?.description || "",
      image: null,
      existingImageUrl: cat?.imageUrl || cat?.image_url || "",
    });
    setCatModal(true);
  };

  const openSub = (sub?: any) => {
    setEditingSub(sub || null);
    setSubForm({
      categoryId:
        sub?.categoryId ||
        sub?.category?.id ||
        (selectedCategoryId !== "ALL" ? selectedCategoryId : categories[0]?.id || ""),
      name: sub?.name || "",
      description: sub?.description || "",
      image: null,
      existingImageUrl: sub?.imageUrl || sub?.image_url || "",
    });
    setSubModal(true);
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) {
      showMessage("warning", "Required", "Category name is required.");
      return;
    }

    setSavingCat(true);

    const payload = {
      name: catForm.name.trim(),
      description: catForm.description?.trim(),
      image: catForm.image,
    };

    const res = editingCat
      ? await adminService.updateCategory(editingCat.id, payload)
      : await adminService.createCategory(payload);

    setSavingCat(false);

    if (res.error) {
      showMessage(
        "error",
        "Category Save Failed",
        res.error.message || "Please try again."
      );
      return;
    }

    closeCatModal();
    showMessage(
      "success",
      editingCat ? "Category Updated" : "Category Created",
      editingCat ? "Category updated successfully." : "Category created successfully.",
      "Done",
      () => {
        closeMessage();
        loadData();
      }
    );
  };

  const saveSubCategory = async () => {
    if (!subForm.categoryId) {
      showMessage("warning", "Required", "Please select parent category.");
      return;
    }

    if (!subForm.name.trim()) {
      showMessage("warning", "Required", "Subcategory name is required.");
      return;
    }

    setSavingSub(true);

    const payload = {
      categoryId: subForm.categoryId,
      name: subForm.name.trim(),
      description: subForm.description?.trim(),
      image: subForm.image,
    };

    const res = editingSub
      ? await adminService.updateSubCategory(editingSub.id, payload)
      : await adminService.createSubCategory(payload);

    setSavingSub(false);

    if (res.error) {
      showMessage(
        "error",
        "Subcategory Save Failed",
        res.error.message || "Please try again."
      );
      return;
    }

    closeSubModal();
    showMessage(
      "success",
      editingSub ? "Subcategory Updated" : "Subcategory Created",
      editingSub
        ? "Subcategory updated successfully."
        : "Subcategory created successfully.",
      "Done",
      () => {
        closeMessage();
        loadData();
      }
    );
  };

  const askDeleteCategory = (cat: any) => {
    const linkedVendors = Number(cat.restaurants?.length || 0);
    const linkedItems = Number(cat.menuItems?.length || 0);
    const linkedSubs = Number(cat.subCategories?.length || 0);

    showMessage(
      "warning",
      "Delete Category?",
      `${cat.name || "This category"} will be deleted. Linked data: ${linkedVendors} vendors, ${linkedSubs} subcategories, ${linkedItems} items.`,
      "Delete",
      () => deleteCategory(cat.id),
      "Cancel",
      closeMessage
    );
  };

  const deleteCategory = async (id: string) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const res = await adminService.deleteCategory(id);

    if (res.error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message:
          res.error.message ||
          "Category delete nahi hui. Shayad linked vendors/items/subcategories hain.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Category Deleted",
      message: "Category deleted successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadData();
      },
    });
  };

  const askDeleteSubCategory = (sub: any) => {
    showMessage(
      "warning",
      "Delete Subcategory?",
      `${sub.name || "This subcategory"} will be deleted.`,
      "Delete",
      () => deleteSubCategory(sub.id),
      "Cancel",
      closeMessage
    );
  };

  const deleteSubCategory = async (id: string) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const res = await adminService.deleteSubCategory(id);

    if (res.error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message:
          res.error.message ||
          "Subcategory delete nahi hui. Shayad linked menu items hain.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Subcategory Deleted",
      message: "Subcategory deleted successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadData();
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading business categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>BUSINESS SETUP</Text>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>Manage business categories and product subcategories</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("AdminDashboard")}>
          <Icon name="home-outline" size={21} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCategories}
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
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>Business Category Center</Text>
                  <Text style={styles.summaryValue}>{stats.totalCategories}</Text>
                </View>

                <View style={styles.summaryIcon}>
                  <Icon name="grid-outline" size={34} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Categories" value={stats.totalCategories} />
                <MiniStat label="Subcategories" value={stats.totalSubCategories} />
                <MiniStat label="Linked Vendors" value={stats.totalVendors} />
                <MiniStat label="Menu Items" value={stats.totalItems} />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.yellowBtn} onPress={() => openCat()} activeOpacity={0.86}>
                <Icon name="add-circle-outline" size={21} color="#000" />
                <Text style={styles.yellowText}>Category</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.greenBtn} onPress={() => openSub()} activeOpacity={0.86}>
                <Icon name="layers-outline" size={21} color="#000" />
                <Text style={styles.greenText}>Subcategory</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search category or subcategory..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />

              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icon name="close-circle" size={21} color={THEME.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Filter Subcategories</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, selectedCategoryId === "ALL" && styles.chipActive]}
                onPress={() => setSelectedCategoryId("ALL")}
              >
                <Text style={[styles.chipText, selectedCategoryId === "ALL" && styles.chipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Business Categories</Text>
              <Text style={styles.sectionCount}>{filteredCategories.length} total</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <CategoryCard
            item={item}
            onEdit={() => openCat(item)}
            onDelete={() => askDeleteCategory(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="grid-outline" size={38} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptyText}>
              Create categories like Restaurant, Grocery, Pharmacy or Electronics.
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Product Subcategories</Text>
              <Text style={styles.sectionCount}>{filteredSubCategories.length} total</Text>
            </View>

            {filteredSubCategories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="albums-outline" size={38} color={THEME.green} />
                <Text style={styles.emptyTitle}>No subcategories found</Text>
                <Text style={styles.emptyText}>
                  Add subcategories like Pizza, Snacks, Sweets, Grocery Items.
                </Text>
              </View>
            ) : (
              filteredSubCategories.map((item) => (
                <SubCategoryCard
                  key={item.id}
                  item={item}
                  onEdit={() => openSub(item)}
                  onDelete={() => askDeleteSubCategory(item)}
                />
              ))
            )}

            <View style={{ height: 35 }} />
          </>
        }
      />

      <CategoryModal
        visible={catModal}
        title={editingCat ? "Edit Category" : "Create Category"}
        form={catForm}
        setForm={setCatForm}
        saving={savingCat}
        onCamera={() => pickImage(setCatForm, true)}
        onGallery={() => pickImage(setCatForm, false)}
        onSave={saveCategory}
        onClose={closeCatModal}
      />

      <SubCategoryModal
        visible={subModal}
        title={editingSub ? "Edit Subcategory" : "Create Subcategory"}
        categories={categories}
        form={subForm}
        setForm={setSubForm}
        saving={savingSub}
        onCamera={() => pickImage(setSubForm, true)}
        onGallery={() => pickImage(setSubForm, false)}
        onSave={saveSubCategory}
        onClose={closeSubModal}
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

function CategoryCard({ item, onEdit, onDelete }: any) {
  const imageUrl = item.imageUrl || item.image_url;

  return (
    <View style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumb} />
      ) : (
        <View style={styles.fallbackIcon}>
          <Icon name="grid-outline" size={27} color={THEME.yellow} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.description || "No description added"}</Text>

        <View style={styles.cardMetaRow}>
          <Icon name="storefront-outline" size={13} color={THEME.green} />
          <Text style={styles.cardMetaText}>Vendors: {item.restaurants?.length || 0}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.cardMetaText}>Items: {item.menuItems?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Icon name="create-outline" size={18} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Icon name="trash-outline" size={18} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SubCategoryCard({ item, onEdit, onDelete }: any) {
  const imageUrl = item.imageUrl || item.image_url;

  return (
    <View style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.thumb} />
      ) : (
        <View style={styles.fallbackIconGreen}>
          <Icon name="albums-outline" size={27} color={THEME.green} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>Category: {item.category?.name || "-"}</Text>
        <Text style={styles.meta}>{item.description || "No description added"}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Icon name="create-outline" size={18} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Icon name="trash-outline" size={18} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CategoryModal({
  visible,
  title,
  form,
  setForm,
  saving,
  onCamera,
  onGallery,
  onSave,
  onClose,
}: any) {
  return (
    <ProfessionalModal visible={visible} title={title} label="CATEGORY FORM" onClose={onClose}>
      <FormInput
        label="Category Name"
        icon="grid-outline"
        value={form.name}
        onChangeText={(v: string) => setForm((p: any) => ({ ...p, name: v }))}
        placeholder="Example: Restaurants"
      />

      <FormInput
        label="Description"
        icon="document-text-outline"
        value={form.description}
        onChangeText={(v: string) => setForm((p: any) => ({ ...p, description: v }))}
        placeholder="Example: Food, snacks, sweets and beverages"
        multiline
      />

      <ImagePickerPreview
        image={form.image}
        existingImageUrl={form.existingImageUrl}
        title="Category Image"
        onCamera={onCamera}
        onGallery={onGallery}
      />

      <PrimarySaveButton saving={saving} title="Save Category" onPress={onSave} />
    </ProfessionalModal>
  );
}

function SubCategoryModal({
  visible,
  title,
  categories,
  form,
  setForm,
  saving,
  onCamera,
  onGallery,
  onSave,
  onClose,
}: any) {
  return (
    <ProfessionalModal visible={visible} title={title} label="SUBCATEGORY FORM" onClose={onClose}>
      <Text style={styles.inputLabel}>Parent Category</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipScroll}>
        {categories.map((cat: any) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.formChip, form.categoryId === cat.id && styles.formChipActive]}
            onPress={() => setForm((p: any) => ({ ...p, categoryId: cat.id }))}
          >
            <Text style={[styles.formChipText, form.categoryId === cat.id && styles.formChipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FormInput
        label="Subcategory Name"
        icon="albums-outline"
        value={form.name}
        onChangeText={(v: string) => setForm((p: any) => ({ ...p, name: v }))}
        placeholder="Example: Pizza"
      />

      <FormInput
        label="Description"
        icon="document-text-outline"
        value={form.description}
        onChangeText={(v: string) => setForm((p: any) => ({ ...p, description: v }))}
        placeholder="Example: Cheese pizza, veg pizza, loaded pizza"
        multiline
      />

      <ImagePickerPreview
        image={form.image}
        existingImageUrl={form.existingImageUrl}
        title="Subcategory Image"
        onCamera={onCamera}
        onGallery={onGallery}
      />

      <PrimarySaveButton saving={saving} title="Save Subcategory" onPress={onSave} />
    </ProfessionalModal>
  );
}

function ProfessionalModal({ visible, title, label, children, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>{label}</Text>
              <Text style={styles.modalTitle}>{title}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
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

function ImagePickerPreview({
  image,
  existingImageUrl,
  title,
  onCamera,
  onGallery,
}: any) {
  const previewUri = image?.uri || existingImageUrl;

  return (
    <View style={styles.imageSection}>
      <Text style={styles.inputLabel}>{title}</Text>

      <View style={styles.imagePreviewBox}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <View style={styles.emptyImage}>
            <Icon name="image-outline" size={34} color={THEME.yellow} />
            <Text style={styles.emptyImageText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={styles.imageActions}>
        <TouchableOpacity style={styles.imageBtnGreen} onPress={onCamera}>
          <Icon name="camera-outline" size={20} color="#000" />
          <Text style={styles.imageBtnText}>Open Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageBtnYellow} onPress={onGallery}>
          <Icon name="images-outline" size={20} color="#000" />
          <Text style={styles.imageBtnText}>Upload File</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PrimarySaveButton({ saving, title, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.saveBtn, saving && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.86}
    >
      {saving ? (
        <ActivityIndicator color="#000" />
      ) : (
        <>
          <Icon name="checkmark-circle-outline" size={22} color="#000" />
          <Text style={styles.saveText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.bg,
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
  smallLabel: { color: THEME.green, fontWeight: "900", fontSize: 11, letterSpacing: 1.1 },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 35 },
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
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: THEME.muted, fontSize: 13, fontWeight: "800" },
  summaryValue: { color: THEME.yellow, fontSize: 40, fontWeight: "900", marginTop: 5 },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  miniStat: {
    width: "48.5%",
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  miniLabel: { color: THEME.muted, fontSize: 10, fontWeight: "800", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  yellowBtn: {
    flex: 1,
    height: 52,
    backgroundColor: THEME.yellow,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  yellowText: { color: "#000", fontWeight: "900" },
  greenBtn: {
    flex: 1,
    height: 52,
    backgroundColor: THEME.green,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  greenText: { color: "#000", fontWeight: "900" },
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
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800", fontSize: 14 },
  chipScroll: { maxHeight: 48, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  chipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  chipText: { color: THEME.muted, fontWeight: "900" },
  chipTextActive: { color: "#000" },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 19, fontWeight: "900", marginTop: 22, marginBottom: 12 },
  sectionTitleNoMargin: { color: THEME.text, fontSize: 19, fontWeight: "900" },
  sectionCount: { color: THEME.yellow, fontWeight: "900" },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 18, backgroundColor: THEME.card2 },
  fallbackIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackIconGreen: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#102517",
    borderWidth: 1,
    borderColor: "#1F6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: THEME.text, fontSize: 16, fontWeight: "900" },
  meta: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7, flexWrap: "wrap" },
  cardMetaText: { color: THEME.green, fontSize: 11, fontWeight: "900" },
  dot: { color: THEME.muted, fontWeight: "900" },
  cardActions: { gap: 8 },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 7, lineHeight: 20, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "flex-end" },
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
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  modalLabel: { color: THEME.green, fontSize: 11, letterSpacing: 1.1, fontWeight: "900" },
  modalTitle: { color: THEME.text, fontSize: 24, fontWeight: "900", marginTop: 3 },
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
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: THEME.text, fontSize: 13, fontWeight: "900", marginBottom: 8 },
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
  textAreaBox: { minHeight: 96, alignItems: "flex-start", paddingTop: 14 },
  input: { flex: 1, color: THEME.text, fontWeight: "800" },
  textArea: { minHeight: 75, textAlignVertical: "top" },
  formChipScroll: { maxHeight: 47, marginBottom: 16 },
  formChip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: THEME.card,
  },
  formChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  formChipText: { color: THEME.muted, fontWeight: "900" },
  formChipTextActive: { color: "#000" },
  imageSection: { marginTop: 2, marginBottom: 15 },
  imagePreviewBox: {
    height: 152,
    borderRadius: 22,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  preview: { width: "100%", height: "100%" },
  emptyImage: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyImageText: { color: THEME.muted, marginTop: 8, fontWeight: "800" },
  imageActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  imageBtnGreen: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 8,
  },
  imageBtnYellow: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 8,
  },
  imageBtnText: { color: "#000", fontWeight: "900", fontSize: 12 },
  saveBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    marginTop: 8,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
});
