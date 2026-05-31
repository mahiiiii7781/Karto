import React, { useCallback, useEffect, useMemo, useState } from "react";
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

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  isAvailable?: boolean;
  isVeg?: boolean;
  isVegetarian?: boolean;
  isPopular?: boolean;
  isBestSeller?: boolean;
  prepTimeMin?: number | null;
  category?: any;
  vendorCategory?: any;
};

type StockFilter = "ALL" | "LIVE" | "OUT";

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

export default function VendorMenuScreen({ navigation }: any) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [prepTimeMin, setPrepTimeMin] = useState("20");
  const [isVeg, setIsVeg] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const loadMenu = useCallback(async () => {
    try {
      const res = await apiClient.get("/vendors/menu");
      setItems(res.data.data || res.data.items || res.data.menuItems || []);
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to load menu");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter((i) => i.isAvailable).length,
      out: items.filter((i) => !i.isAvailable).length,
      best: items.filter((i) => i.isBestSeller).length,
    };
  }, [items]);

  const categories = useMemo(() => {
    const names = items
      .map(
        (i) =>
          i.vendorCategory?.name ||
          i.category?.name ||
          i.category ||
          "Uncategorized"
      )
      .filter(Boolean);

    return ["All", ...Array.from(new Set(names))];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const itemCategory =
        item.vendorCategory?.name ||
        item.category?.name ||
        item.category ||
        "Uncategorized";

      const matchSearch =
        !search.trim() ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());

      const matchStock =
        stockFilter === "ALL" ||
        (stockFilter === "LIVE" && item.isAvailable) ||
        (stockFilter === "OUT" && !item.isAvailable);

      const matchCategory =
        categoryFilter === "All" || itemCategory === categoryFilter;

      return matchSearch && matchStock && matchCategory;
    });
  }, [items, search, stockFilter, categoryFilter]);

  const resetForm = () => {
    setSelectedItem(null);
    setName("");
    setPrice("");
    setDescription("");
    setPrepTimeMin("20");
    setIsVeg(true);
    setIsPopular(false);
    setIsBestSeller(false);
    setIsAvailable(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setName(item.name || "");
    setPrice(String(item.price || ""));
    setDescription(item.description || "");
    setPrepTimeMin(String(item.prepTimeMin || 20));
    setIsVeg(Boolean(item.isVeg ?? item.isVegetarian ?? true));
    setIsPopular(Boolean(item.isPopular));
    setIsBestSeller(Boolean(item.isBestSeller));
    setIsAvailable(Boolean(item.isAvailable));
    setModalVisible(true);
  };

  const saveItem = async () => {
    if (!name.trim()) return showToast("Item name required");
    if (!price || Number(price) <= 0) return showToast("Valid price required");

    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      prepTimeMin: Number(prepTimeMin) || 20,
      isVeg,
      isVegetarian: isVeg,
      isPopular,
      isBestSeller,
      isAvailable,
    };

    try {
      if (selectedItem) {
        await apiClient.patch(`/vendors/menu/${selectedItem.id}`, payload);
        showToast("Item updated");
      } else {
        await apiClient.post("/vendors/menu", payload);
        showToast("Item added");
      }

      setModalVisible(false);
      resetForm();
      loadMenu();
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    const nextValue = !item.isAvailable;

    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, isAvailable: nextValue } : x))
    );

    try {
      await apiClient.patch(`/vendors/menu/${item.id}`, {
        isAvailable: nextValue,
      });

      showToast(nextValue ? "Item available now" : "Item marked out of stock");
    } catch (error: any) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, isAvailable: !nextValue } : x
        )
      );
      showToast(error?.response?.data?.message || "Failed to update item");
    }
  };

  const confirmDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setDeleteModal(true);
  };

  const deleteItem = async () => {
    if (!selectedItem) return;

    setSaving(true);

    try {
      await apiClient.delete(`/vendors/menu/${selectedItem.id}`);
      setItems((prev) => prev.filter((x) => x.id !== selectedItem.id));
      setDeleteModal(false);
      setSelectedItem(null);
      showToast("Item deleted");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Failed to delete item");
    } finally {
      setSaving(false);
    }
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
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Vendor Panel</Text>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.subtitle}>Manage items, price and stock.</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={openAddModal}>
          <Icon name="add" size={24} color={THEME.bg} />
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroLabel}>Menu Health</Text>
          <Text style={styles.heroTitle}>{stats.available}/{stats.total} Live</Text>
          <Text style={styles.heroSub}>{stats.best} bestsellers • {stats.out} out of stock</Text>
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
          <TouchableOpacity onPress={() => setSearch("")}>
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
        data={["ALL", "LIVE", "OUT"] as StockFilter[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.stockFilterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              stockFilter === item && styles.filterChipActive,
            ]}
            onPress={() => setStockFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                stockFilter === item && styles.filterTextActive,
              ]}
            >
              {item === "ALL" ? "All Items" : item === "LIVE" ? "Live" : "Out of Stock"}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => String(item)}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              categoryFilter === item && styles.categoryChipActive,
            ]}
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
            onRefresh={() => {
              setRefreshing(true);
              loadMenu();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="restaurant-outline" size={34} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptyText}>Try another filter or add a new item.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
              <Text style={styles.emptyBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <MenuCard
            item={item}
            onEdit={() => openEditModal(item)}
            onDelete={() => confirmDelete(item)}
            onToggle={() => toggleAvailability(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={openAddModal}>
        <Icon name="add" size={30} color={THEME.bg} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              {selectedItem ? "Edit Menu Item" : "Add Menu Item"}
            </Text>

            <View style={styles.imagePickerBox}>
              <Icon name="camera-outline" size={26} color={THEME.yellow} />
              <Text style={styles.imagePickerTitle}>Item Photo</Text>
              <Text style={styles.imagePickerText}>Gallery / Camera upload next. No URL input.</Text>
            </View>

            <TextInput style={styles.input} placeholder="Item name" placeholderTextColor={THEME.muted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description" placeholderTextColor={THEME.muted} value={description} onChangeText={setDescription} multiline />

            <View style={styles.twoCol}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Price" placeholderTextColor={THEME.muted} keyboardType="numeric" value={price} onChangeText={setPrice} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Prep min" placeholderTextColor={THEME.muted} keyboardType="number-pad" value={prepTimeMin} onChangeText={setPrepTimeMin} />
            </View>

            <ToggleRow label="Available" value={isAvailable} onChange={setIsAvailable} />
            <ToggleRow label="Veg Item" value={isVeg} onChange={setIsVeg} />
            <ToggleRow label="Popular" value={isPopular} onChange={setIsPopular} />
            <ToggleRow label="Best Seller" value={isBestSeller} onChange={setIsBestSeller} />

            <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} disabled={saving} onPress={saveItem}>
              {saving ? <ActivityIndicator color={THEME.bg} /> : <Text style={styles.saveText}>{selectedItem ? "Update Item" : "Save Item"}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={deleteModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModal(false)}>
          <Pressable style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-outline" size={28} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Delete item?</Text>
            <Text style={styles.confirmText}>
              This will remove {selectedItem?.name || "this item"} from your menu.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteModal(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmDelete} disabled={saving} onPress={deleteItem}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuCard({ item, onEdit, onDelete, onToggle }: any) {
  const hasImage = Boolean(item.imageUrl);
  const fastPrep = Number(item.prepTimeMin || 0) <= 15 && Number(item.prepTimeMin || 0) > 0;

  return (
    <View style={styles.card}>
      <View style={styles.imageBox}>
        {hasImage ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <Icon name="fast-food-outline" size={28} color={THEME.yellow} />}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.stockBadge, !item.isAvailable && styles.outBadge]}>
            <Text style={[styles.stockText, !item.isAvailable && styles.outText]}>{item.isAvailable ? "Live" : "Out"}</Text>
          </View>
        </View>

        {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}

        <View style={styles.badgeRow}>
          <View style={styles.miniBadge}>
            <Text style={styles.miniBadgeText}>{item.isVeg || item.isVegetarian ? "Veg" : "Non-Veg"}</Text>
          </View>

          {!!item.prepTimeMin && (
            <View style={fastPrep ? styles.greenBadge : styles.yellowBadge}>
              <Text style={fastPrep ? styles.greenBadgeText : styles.yellowBadgeText}>
                {item.prepTimeMin} min
              </Text>
            </View>
          )}

          {!!item.isBestSeller && <View style={styles.yellowBadge}><Text style={styles.yellowBadgeText}>Bestseller</Text></View>}
          {!!item.isPopular && <View style={styles.greenBadge}><Text style={styles.greenBadgeText}>Popular</Text></View>}
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{money(item.price)}</Text>

          <View style={styles.switchWrap}>
            <Text style={styles.switchText}>Stock</Text>
            <Switch value={Boolean(item.isAvailable)} onValueChange={onToggle} thumbColor={item.isAvailable ? THEME.green : THEME.muted} trackColor={{ false: "#293029", true: "rgba(34,197,94,0.35)" }} />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
          <Icon name="create-outline" size={20} color={THEME.green} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
          <Icon name="trash-outline" size={20} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}><Icon name={icon} size={17} color={THEME.bg} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: any) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} thumbColor={value ? THEME.green : THEME.muted} trackColor={{ false: "#293029", true: "rgba(34,197,94,0.35)" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16, paddingTop: 18 },
  center: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  toast: { position: "absolute", top: 14, left: 16, right: 16, zIndex: 50, backgroundColor: "#101A10", borderWidth: 1, borderColor: THEME.green, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  kicker: { color: THEME.green, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, marginTop: 4, fontWeight: "700" },
  addBtn: { width: 48, height: 48, borderRadius: 17, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: THEME.green, borderRadius: 28, padding: 18, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.75 },
  heroTitle: { color: THEME.bg, fontSize: 27, fontWeight: "900", marginTop: 4 },
  heroSub: { color: THEME.bg, fontWeight: "800", opacity: 0.78, marginTop: 4 },
  heroIcon: { width: 58, height: 58, borderRadius: 22, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  searchBox: { height: 48, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 17, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 20, padding: 13 },
  statIcon: { width: 30, height: 30, borderRadius: 12, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  statLabel: { color: THEME.muted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  stockFilterList: { maxHeight: 40, marginBottom: 8 },
  filterChip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, justifyContent: "center", marginRight: 8 },
  filterChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  filterText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  filterTextActive: { color: THEME.bg },
  categoryList: { maxHeight: 40, marginBottom: 8 },
  categoryChip: { height: 35, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, justifyContent: "center", marginRight: 8 },
  categoryChipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  categoryText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  categoryTextActive: { color: THEME.bg },
  listContent: { paddingBottom: 110 },
  card: { flexDirection: "row", backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 24, padding: 13, marginBottom: 12, gap: 12 },
  imageBox: { width: 78, height: 78, borderRadius: 22, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { flex: 1, color: THEME.text, fontSize: 16, fontWeight: "900" },
  desc: { color: THEME.muted, fontWeight: "600", marginTop: 4, lineHeight: 18 },
  stockBadge: { backgroundColor: "rgba(34,197,94,0.13)", borderWidth: 1, borderColor: "rgba(34,197,94,0.35)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  outBadge: { backgroundColor: "rgba(239,68,68,0.13)", borderColor: "rgba(239,68,68,0.35)" },
  stockText: { color: THEME.green, fontSize: 10, fontWeight: "900" },
  outText: { color: THEME.danger },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  miniBadge: { backgroundColor: THEME.card2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  miniBadgeText: { color: THEME.text, fontSize: 10, fontWeight: "900" },
  yellowBadge: { backgroundColor: "rgba(246,195,67,0.15)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  yellowBadgeText: { color: THEME.yellow, fontSize: 10, fontWeight: "900" },
  greenBadge: { backgroundColor: "rgba(34,197,94,0.14)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  greenBadgeText: { color: THEME.green, fontSize: 10, fontWeight: "900" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  price: { color: THEME.green, fontSize: 18, fontWeight: "900" },
  switchWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  switchText: { color: THEME.muted, fontSize: 11, fontWeight: "800" },
  actions: { gap: 9 },
  iconBtn: { width: 36, height: 36, borderRadius: 14, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center" },
  emptyBox: { marginTop: 70, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 26, padding: 24, alignItems: "center" },
  emptyIcon: { width: 74, height: 74, borderRadius: 28, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 5, fontWeight: "700" },
  emptyBtn: { marginTop: 16, backgroundColor: THEME.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16 },
  emptyBtnText: { color: THEME.bg, fontWeight: "900" },
  fab: { position: "absolute", right: 18, bottom: 24, width: 60, height: 60, borderRadius: 22, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "92%", backgroundColor: THEME.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, borderWidth: 1, borderColor: THEME.border },
  modalHandle: { width: 48, height: 5, borderRadius: 99, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 18 },
  modalTitle: { color: THEME.text, fontSize: 23, fontWeight: "900", marginBottom: 14 },
  imagePickerBox: { borderWidth: 1, borderColor: THEME.border, borderStyle: "dashed", backgroundColor: "#0B100B", borderRadius: 20, padding: 16, alignItems: "center", marginBottom: 12 },
  imagePickerTitle: { color: THEME.text, fontWeight: "900", marginTop: 8 },
  imagePickerText: { color: THEME.muted, fontWeight: "700", marginTop: 3, fontSize: 12 },
  input: { backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, color: THEME.text, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, fontWeight: "800", marginBottom: 10 },
  twoCol: { flexDirection: "row", gap: 10 },
  toggleRow: { backgroundColor: "#0B100B", borderWidth: 1, borderColor: THEME.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel: { color: THEME.text, fontWeight: "900" },
  saveBtn: { height: 52, borderRadius: 17, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { color: THEME.bg, fontWeight: "900", fontSize: 15 },
  cancelBtn: { height: 50, borderRadius: 16, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", marginTop: 10 },
  cancelText: { color: THEME.text, fontWeight: "900" },
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