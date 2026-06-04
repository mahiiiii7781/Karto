import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import apiClient from "@/api/apiClient";

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

type VendorCategory = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  menuItems?: any[];
  menu_items?: any[];
  subCategories?: any[];
  sub_categories?: any[];
};

type ApiState = {
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  togglingId: string | null;
};

const unwrapList = (res: any): any[] => {
  const raw =
    res?.data?.data ??
    res?.data?.categories ??
    res?.data?.vendorCategories ??
    res?.data?.items ??
    res?.data ??
    [];

  return Array.isArray(raw) ? raw : [];
};

const normalizeCategory = (item: any): VendorCategory => ({
  id: String(item?.id ?? ""),
  name: item?.name ?? item?.category_name ?? item?.title ?? "Untitled",
  description: item?.description ?? item?.category_description ?? null,
  imageUrl: item?.imageUrl ?? item?.image_url ?? null,
  image_url: item?.image_url ?? item?.imageUrl ?? null,
  isActive: item?.isActive ?? item?.is_active ?? true,
  is_active: item?.is_active ?? item?.isActive ?? true,
  menuItems: Array.isArray(item?.menuItems) ? item.menuItems : item?.menu_items || [],
  menu_items: Array.isArray(item?.menu_items) ? item.menu_items : item?.menuItems || [],
  subCategories: Array.isArray(item?.subCategories)
    ? item.subCategories
    : item?.sub_categories || [],
  sub_categories: Array.isArray(item?.sub_categories)
    ? item.sub_categories
    : item?.subCategories || [],
});

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export default function VendorCategoriesScreen() {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [apiState, setApiState] = useState<ApiState>({
    loading: true,
    refreshing: false,
    saving: false,
    togglingId: null,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState<VendorCategory | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const setPartialApiState = (patch: Partial<ApiState>) => {
    setApiState((prev) => ({ ...prev, ...patch }));
  };

  const loadCategories = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setPartialApiState({ loading: true });
        const res = await apiClient.get("/vendors/categories");
        const list = unwrapList(res).map(normalizeCategory).filter((x) => x.id);
        setCategories(list);
      } catch (error: any) {
        setCategories([]);
        showToast(getErrorMessage(error, "Failed to load categories"));
      } finally {
        setPartialApiState({ loading: false, refreshing: false });
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadCategories();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loadCategories]);

  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive !== false).length;
    return {
      total: categories.length,
      active,
      inactive: categories.length - active,
      items: categories.reduce(
        (sum, c) => sum + Number(c.menuItems?.length || c.menu_items?.length || 0),
        0
      ),
    };
  }, [categories]);

  const resetForm = () => {
    setSelected(null);
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (category: VendorCategory) => {
    setSelected(category);
    setName(category.name || "");
    setDescription(category.description || "");
    setIsActive(category.isActive !== false);
    setModalVisible(true);
  };

  const closeForm = () => {
    if (apiState.saving) return;
    setModalVisible(false);
    resetForm();
  };

  const saveCategory = async () => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      showToast("Category name required");
      return;
    }

    const duplicate = categories.some(
      (c) =>
        c.id !== selected?.id &&
        c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      showToast("Category with this name already exists");
      return;
    }

    const payload = {
      name: cleanName,
      description: cleanDescription || null,
      isActive,
    };

    setPartialApiState({ saving: true });

    try {
      if (selected?.id) {
        const res = await apiClient.patch(`/vendors/categories/${selected.id}`, payload);
        const updated = normalizeCategory(res?.data?.data ?? res?.data?.category ?? {
          ...selected,
          ...payload,
        });
        setCategories((prev) => prev.map((c) => (c.id === selected.id ? updated : c)));
        showToast("Category updated");
      } else {
        const res = await apiClient.post("/vendors/categories", payload);
        const created = normalizeCategory(res?.data?.data ?? res?.data?.category ?? payload);
        if (created.id) {
          setCategories((prev) => [created, ...prev]);
        } else {
          await loadCategories(true);
        }
        showToast("Category created");
      }

      setModalVisible(false);
      resetForm();
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to save category"));
    } finally {
      setPartialApiState({ saving: false });
    }
  };

  const toggleCategory = async (category: VendorCategory) => {
    if (apiState.togglingId) return;

    const next = category.isActive === false;
    const previous = category.isActive !== false;

    setPartialApiState({ togglingId: category.id });
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isActive: next, is_active: next } : c))
    );

    try {
      await apiClient.patch(`/vendors/categories/${category.id}`, { isActive: next });
      showToast(next ? "Category activated" : "Category paused");
    } catch (error: any) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, isActive: previous, is_active: previous } : c
        )
      );
      showToast(getErrorMessage(error, "Failed to update category"));
    } finally {
      setPartialApiState({ togglingId: null });
    }
  };

  const askDelete = (category: VendorCategory) => {
    setSelected(category);
    setDeleteModal(true);
  };

  const deleteCategory = async () => {
    if (!selected?.id || apiState.saving) return;

    setPartialApiState({ saving: true });

    try {
      await apiClient.delete(`/vendors/categories/${selected.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== selected.id));
      setDeleteModal(false);
      setSelected(null);
      showToast("Category deleted");
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to delete category"));
    } finally {
      setPartialApiState({ saving: false });
    }
  };

  if (apiState.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading categories...</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Vendor Panel</Text>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>Group menu items for a cleaner store.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={openAdd}>
          <Icon name="add" size={24} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Menu Structure</Text>
          <Text style={styles.heroTitle}>{stats.total} Categories</Text>
          <Text style={styles.heroSub}>
            {stats.active} active • {stats.inactive} paused • {stats.items} items
          </Text>
        </View>

        <View style={styles.heroIcon}>
          <Icon name="grid-outline" size={28} color={THEME.bg} />
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={apiState.refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={() => {
              setPartialApiState({ refreshing: true });
              loadCategories(true);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="albums-outline" size={34} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptyText}>Create categories like Meals, Snacks, Drinks and Combos.</Text>
            <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Create Category</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <CategoryCard
            item={item}
            index={index}
            toggling={apiState.togglingId === item.id}
            onEdit={() => openEdit(item)}
            onDelete={() => askDelete(item)}
            onToggle={() => toggleCategory(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAdd}>
        <Icon name="add" size={30} color={THEME.bg} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeForm}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeForm}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>{selected ? "Edit Category" : "Create Category"}</Text>
              <Text style={styles.modalSub}>Keep category names simple and customer friendly.</Text>

              <View style={styles.imagePlaceholder}>
                <Icon name="image-outline" size={26} color={THEME.yellow} />
                <Text style={styles.imageTitle}>Category Image</Text>
                <Text style={styles.imageText}>Generic screen keeps URL inputs removed. Connect gallery upload later.</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Category name"
                placeholderTextColor={THEME.muted}
                value={name}
                onChangeText={setName}
                maxLength={40}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={THEME.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={140}
              />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Active Category</Text>
                  <Text style={styles.toggleSub}>Paused categories can be hidden from customers.</Text>
                </View>

                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  thumbColor={isActive ? THEME.green : THEME.muted}
                  trackColor={{ false: "#293029", true: "rgba(34,197,94,0.35)" }}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, apiState.saving && styles.disabled]}
                activeOpacity={0.85}
                disabled={apiState.saving}
                onPress={saveCategory}
              >
                {apiState.saving ? (
                  <ActivityIndicator color={THEME.bg} />
                ) : (
                  <Text style={styles.saveText}>{selected ? "Update Category" : "Save Category"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.85}
                disabled={apiState.saving}
                onPress={closeForm}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModal(false)}>
          <Pressable style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-outline" size={28} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Delete category?</Text>
            <Text style={styles.confirmText}>
              {selected?.name ? `"${selected.name}" will be removed.` : "This category will be removed."} Menu items may become uncategorized.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                activeOpacity={0.85}
                disabled={apiState.saving}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDelete, apiState.saving && styles.disabled]}
                activeOpacity={0.85}
                disabled={apiState.saving}
                onPress={deleteCategory}
              >
                {apiState.saving ? (
                  <ActivityIndicator color={THEME.text} />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CategoryCard({ item, index, onEdit, onDelete, onToggle, toggling }: any) {
  const active = item.isActive !== false;
  const itemCount = item.menuItems?.length || item.menu_items?.length || 0;
  const subCount = item.subCategories?.length || item.sub_categories?.length || 0;

  return (
    <View style={styles.card}>
      <View style={styles.rankBox}>
        <Text style={styles.rankText}>{String(index + 1).padStart(2, "0")}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

          <View style={[styles.statusBadge, !active && styles.pausedBadge]}>
            <Text style={[styles.statusText, !active && styles.pausedText]}>
              {active ? "Active" : "Paused"}
            </Text>
          </View>
        </View>

        {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Icon name="fast-food-outline" size={13} color={THEME.yellow} />
            <Text style={styles.metaText}>{itemCount} items</Text>
          </View>

          <View style={styles.metaPill}>
            <Icon name="git-branch-outline" size={13} color={THEME.green} />
            <Text style={styles.metaText}>{subCount} sub</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {toggling ? (
          <ActivityIndicator size="small" color={THEME.green} />
        ) : (
          <Switch
            value={active}
            onValueChange={onToggle}
            thumbColor={active ? THEME.green : THEME.muted}
            trackColor={{ false: "#293029", true: "rgba(34,197,94,0.35)" }}
          />
        )}

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={onEdit}>
          <Icon name="create-outline" size={19} color={THEME.green} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={onDelete}>
          <Icon name="trash-outline" size={19} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16, paddingTop: 18 },
  center: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
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
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  kicker: { color: THEME.green, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  addBtn: { width: 48, height: 48, borderRadius: 17, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.75 },
  heroTitle: { color: THEME.bg, fontSize: 28, fontWeight: "900", marginTop: 4 },
  heroSub: { color: THEME.bg, fontWeight: "800", opacity: 0.78, marginTop: 4 },
  heroIcon: { width: 58, height: 58, borderRadius: 22, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 110 },
  card: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  rankBox: { width: 42, height: 42, borderRadius: 16, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center" },
  rankText: { color: THEME.yellow, fontWeight: "900" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, color: THEME.text, fontSize: 17, fontWeight: "900" },
  desc: { color: THEME.muted, fontWeight: "600", marginTop: 5, lineHeight: 18 },
  statusBadge: {
    backgroundColor: "rgba(34,197,94,0.13)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pausedBadge: { backgroundColor: "rgba(239,68,68,0.13)", borderColor: "rgba(239,68,68,0.35)" },
  statusText: { color: THEME.green, fontSize: 10, fontWeight: "900" },
  pausedText: { color: THEME.danger },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: THEME.card2, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  metaText: { color: THEME.text, fontSize: 11, fontWeight: "800" },
  actions: { alignItems: "center", gap: 9 },
  iconBtn: { width: 36, height: 36, borderRadius: 14, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center" },
  emptyBox: { marginTop: 70, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 26, padding: 24, alignItems: "center" },
  emptyIcon: { width: 74, height: 74, borderRadius: 28, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 5, fontWeight: "700" },
  emptyBtn: { marginTop: 16, backgroundColor: THEME.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16 },
  emptyBtnText: { color: THEME.bg, fontWeight: "900" },
  fab: { position: "absolute", right: 18, bottom: 24, width: 60, height: 60, borderRadius: 22, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: THEME.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderWidth: 1, borderColor: THEME.border },
  modalHandle: { width: 48, height: 5, borderRadius: 99, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 18 },
  modalTitle: { color: THEME.text, fontSize: 23, fontWeight: "900" },
  modalSub: { color: THEME.muted, marginTop: 6, marginBottom: 14, fontWeight: "700" },
  imagePlaceholder: { borderWidth: 1, borderColor: THEME.border, borderStyle: "dashed", backgroundColor: "#0B100B", borderRadius: 20, padding: 16, alignItems: "center", marginBottom: 12 },
  imageTitle: { color: THEME.text, fontWeight: "900", marginTop: 8 },
  imageText: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12, textAlign: "center" },
  input: { backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, color: THEME.text, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, fontWeight: "800", marginBottom: 10 },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  toggleRow: { backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  toggleTitle: { color: THEME.text, fontWeight: "900" },
  toggleSub: { color: THEME.muted, fontWeight: "600", marginTop: 3, fontSize: 12 },
  saveBtn: { height: 52, borderRadius: 17, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { color: THEME.bg, fontWeight: "900", fontSize: 15 },
  cancelBtn: { height: 50, borderRadius: 16, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", marginTop: 10 },
  cancelText: { color: THEME.text, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  confirmCard: { backgroundColor: THEME.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, borderWidth: 1, borderColor: THEME.border },
  confirmIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  confirmText: { color: THEME.muted, marginTop: 6, fontWeight: "700" },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  confirmCancel: { flex: 1, height: 50, borderRadius: 16, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { color: THEME.text, fontWeight: "900" },
  confirmDelete: { flex: 1, height: 50, borderRadius: 16, backgroundColor: THEME.danger, alignItems: "center", justifyContent: "center" },
  confirmDeleteText: { color: THEME.text, fontWeight: "900" },
});
