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
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { adminService } from "@/services/api/adminService";
import KartoMessageModal, { KartoMessageType } from "@/components/common/KartoMessageModal";

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

const emptyForm = {
  menuItemId: "",
  name: "",
  title: "",
  price: "",
  isRequired: false,
  isActive: true,
};

export default function AdminMenuCustomizationsScreen({ route, navigation }: any) {
  const routeMenuItemId = route?.params?.menuItemId || "";

  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(routeMenuItemId);
  const [customizations, setCustomizations] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<any>({
    visible: false,
    type: "info" as KartoMessageType,
    title: "",
    message: "",
  });

  const closeMsg = () => setMsg((p: any) => ({ ...p, visible: false, loading: false }));

  const showMsg = (
    type: KartoMessageType,
    title: string,
    message: string,
    primaryText = "Done",
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void
  ) => {
    setMsg({ visible: true, type, title, message, primaryText, onPrimary, secondaryText, onSecondary });
  };

  const load = useCallback(async () => {
    const itemRes = await adminService.getMenuItems({});

    if (itemRes.error) {
      showMsg("error", "Items Load Failed", itemRes.error.message || "Menu items load nahi hue.");
      setItems([]);
      setCustomizations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const menuItems = itemRes.data || [];
    setItems(menuItems);

    const selected = selectedItemId || routeMenuItemId || menuItems[0]?.id || "";
    if (!selectedItemId && selected) setSelectedItemId(selected);

    const selectedItem = menuItems.find((x: any) => x.id === selected);
    setCustomizations(selectedItem?.customizations || []);

    setLoading(false);
    setRefreshing(false);
  }, [selectedItemId, routeMenuItemId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedItem = useMemo(
    () => items.find((x) => x.id === selectedItemId),
    [items, selectedItemId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customizations;

    return customizations.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      String(c.price || "").includes(q)
    );
  }, [customizations, search]);

  const stats = useMemo(() => ({
    total: customizations.length,
    active: customizations.filter((c) => c.isActive !== false).length,
    inactive: customizations.filter((c) => c.isActive === false).length,
    required: customizations.filter((c) => c.isRequired === true || c.required === true).length,
  }), [customizations]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminMenuItems");
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
  };

  const openCreate = () => {
    if (!selectedItemId) {
      showMsg("warning", "Menu Item Required", "Pehle menu item select karo.");
      return;
    }

    setEditing(null);
    setForm({ ...emptyForm, menuItemId: selectedItemId });
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      menuItemId: item.menuItemId || selectedItemId,
      name: item.name || item.title || "",
      title: item.title || item.name || "",
      price: String(item.price || ""),
      isRequired: item.isRequired === true || item.required === true,
      isActive: item.isActive !== false,
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setSaving(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.menuItemId) {
      showMsg("warning", "Menu Item Required", "Menu item select karo.");
      return;
    }

    if (!form.name.trim() && !form.title.trim()) {
      showMsg("warning", "Required", "Customization name required hai.");
      return;
    }

    if (String(form.price).trim() !== "" && Number.isNaN(Number(form.price))) {
      showMsg("warning", "Invalid Price", "Price valid number hona chahiye.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim() || form.title.trim(),
      title: form.title.trim() || form.name.trim(),
      price: Number(form.price || 0),
      isRequired: form.isRequired,
      required: form.isRequired,
      isActive: form.isActive,
    };

    const res = editing
      ? await adminService.updateMenuItemCustomization(editing.id, payload)
      : await adminService.createMenuItemCustomization(form.menuItemId, payload);

    setSaving(false);

    if (res.error) {
      showMsg("error", "Save Failed", res.error.message || "Customization save nahi hua.");
      return;
    }

    closeModal();
    showMsg("success", editing ? "Customization Updated" : "Customization Created", "Customization saved successfully.", "Done", () => {
      closeMsg();
      load();
    });
  };

  const askDelete = (item: any) => {
    showMsg(
      "warning",
      "Delete Customization?",
      `${item.name || item.title || "This customization"} delete karna hai?`,
      "Delete",
      () => deleteCustomization(item.id),
      "Cancel",
      closeMsg
    );
  };

  const deleteCustomization = async (id: string) => {
    setMsg((p: any) => ({ ...p, loading: true }));

    const res = await adminService.deleteMenuItemCustomization(id);

    if (res.error) {
      setMsg({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message: res.error.message || "Customization delete nahi hua.",
        primaryText: "Okay",
      });
      return;
    }

    setMsg({
      visible: true,
      type: "success",
      title: "Customization Deleted",
      message: "Customization deleted successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMsg();
        load();
      },
    });
  };

  const toggleStatus = async (item: any) => {
    const res = await adminService.updateMenuItemCustomization(item.id, {
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
        <Text style={styles.loadingText}>Loading customizations...</Text>
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
                <Text style={styles.smallLabel}>MENU OPTIONS</Text>
                <Text style={styles.title}>Customizations</Text>
                <Text style={styles.subtitle}>Size, spice, required options and variants</Text>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>Selected Item</Text>
                <Text style={styles.heroTitle}>{selectedItem?.name || "Select Menu Item"}</Text>
                <Text style={styles.heroSub}>
                  {selectedItem?.restaurant?.name || "Vendor"} • ₹{Number(selectedItem?.price || 0).toFixed(2)}
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="options-outline" size={34} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.statGrid}>
              <MiniStat label="Options" value={stats.total} />
              <MiniStat label="Active" value={stats.active} green />
              <MiniStat label="Blocked" value={stats.inactive} danger />
              <MiniStat label="Required" value={stats.required} />
            </View>

            <Text style={styles.sectionTitle}>Menu Items</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, selectedItemId === item.id && styles.chipActive]}
                  onPress={() => setSelectedItemId(item.id)}
                >
                  <Text style={[styles.chipText, selectedItemId === item.id && styles.chipTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search customizations..."
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
              <Text style={styles.sectionTitleNoMargin}>Customization List</Text>
              <Text style={styles.sectionCount}>{filtered.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="options-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No customizations found</Text>
            <Text style={styles.emptyText}>Create options like Size Large, Less Spicy, Extra Sauce.</Text>

            <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Add Customization</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <CustomizationCard
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => askDelete(item)}
            onToggle={() => toggleStatus(item)}
          />
        )}
      />

      <CustomizationModal
        visible={modal}
        editing={editing}
        form={form}
        updateForm={updateForm}
        saving={saving}
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
      <Text style={[styles.miniValue, green && { color: THEME.green }, danger && { color: THEME.danger }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function CustomizationCard({ item, onEdit, onDelete, onToggle }: any) {
  const active = item.isActive !== false;
  const required = item.isRequired === true || item.required === true;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumbFallback}>
          <Icon name="options-outline" size={27} color={THEME.yellow} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name || item.title}</Text>
            <Text style={styles.price}>₹{Number(item.price || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Badge text={required ? "Required" : "Optional"} green={required} />
            <Badge text={active ? "Active" : "Blocked"} green={active} danger={!active} />
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Action icon="create-outline" text="Edit" onPress={onEdit} />
        <Action icon={active ? "ban-outline" : "checkmark-circle-outline"} text={active ? "Block" : "Active"} onPress={onToggle} outline />
        <Action icon="trash-outline" text="Delete" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function Badge({ text, green, danger }: any) {
  return (
    <View style={[styles.badge, green && styles.badgeGreen, danger && styles.badgeDanger]}>
      <Text style={[styles.badgeText, green && { color: THEME.green }, danger && { color: THEME.danger }]}>
        {text}
      </Text>
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
      <Text style={[styles.actionText, outline && styles.actionTextOutline, danger && styles.actionTextDanger]}>{text}</Text>
    </TouchableOpacity>
  );
}

function CustomizationModal({ visible, editing, form, updateForm, saving, onClose, onSave }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>MENU CUSTOMIZATION</Text>
              <Text style={styles.modalTitle}>{editing ? "Edit Customization" : "Create Customization"}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input
              label="Customization Name"
              icon="options-outline"
              value={form.name}
              onChangeText={(v: string) => {
                updateForm("name", v);
                updateForm("title", v);
              }}
              placeholder="Example: Size Large"
            />

            <Input
              label="Extra Price"
              icon="cash-outline"
              value={form.price}
              onChangeText={(v: string) => updateForm("price", v)}
              keyboardType="numeric"
              placeholder="Example: 50"
            />

            <TouchableOpacity
              style={[styles.statusToggle, form.isRequired && styles.statusToggleActive]}
              onPress={() => updateForm("isRequired", !form.isRequired)}
            >
              <Icon
                name={form.isRequired ? "alert-circle-outline" : "ellipse-outline"}
                size={20}
                color={form.isRequired ? "#000" : THEME.yellow}
              />
              <Text style={[styles.statusToggleText, form.isRequired && styles.statusToggleTextActive]}>
                {form.isRequired ? "Required Option" : "Optional Option"}
              </Text>
            </TouchableOpacity>

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
                {form.isActive ? "Active Customization" : "Blocked Customization"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Save Customization</Text>
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

function Input({ label, icon, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <Icon name={icon} size={20} color={THEME.yellow} />
        <TextInput {...props} placeholderTextColor={THEME.muted} style={styles.input} />
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
  chipScroll: { maxHeight: 48 },
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
  thumbFallback: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, color: THEME.text, fontSize: 17, fontWeight: "900" },
  price: { color: THEME.green, fontWeight: "900" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  badge: { borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeGreen: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  badgeDanger: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  badgeText: { color: THEME.muted, fontSize: 10, fontWeight: "900" },
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
  input: { flex: 1, color: THEME.text, fontWeight: "800" },
  statusToggle: { minHeight: 52, borderRadius: 18, backgroundColor: "#251010", borderWidth: 1, borderColor: "#6B1F1F", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 },
  statusToggleActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  statusToggleText: { color: THEME.danger, fontWeight: "900" },
  statusToggleTextActive: { color: "#000" },
  saveBtn: { height: 56, borderRadius: 20, backgroundColor: THEME.yellow, marginTop: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: THEME.muted, fontWeight: "900" },
});