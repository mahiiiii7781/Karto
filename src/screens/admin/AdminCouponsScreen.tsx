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
  orange: "#FFB020",
};

const DISCOUNT_TYPES = ["PERCENTAGE", "FLAT"];
const AUDIENCE = ["ALL", "CUSTOMER", "VENDOR", "RIDER"];

const emptyForm = {
  code: "",
  title: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  maxDiscount: "",
  minOrderAmount: "",
  usageLimit: "",
  userUsageLimit: "1",
  audience: "ALL",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

export default function AdminCouponsScreen({ navigation }: any) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
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
    const res = await adminService.getCoupons?.();

    if (!res || res.error) {
      showMsg(
        "warning",
        "Coupon API Missing",
        res?.error?.message || "Backend me coupon routes/service missing ho sakta hai."
      );
      setCoupons([]);
    } else {
      setCoupons(res.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return coupons.filter((c) => {
      const active = c.isActive !== false;
      const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;

      const matchFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && active && !expired) ||
        (filter === "INACTIVE" && !active) ||
        (filter === "EXPIRED" && expired);

      const matchSearch =
        !q ||
        c.code?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.audience?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [coupons, search, filter]);

  const stats = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter((c) => c.isActive !== false && !isExpired(c)).length,
      inactive: coupons.filter((c) => c.isActive === false).length,
      expired: coupons.filter(isExpired).length,
      used: coupons.reduce((sum, c) => sum + Number(c.usedCount || c.totalUsed || 0), 0),
    };
  }, [coupons]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const updateForm = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      code: generateCouponCode(),
    });
    setModal(true);
  };

  const openEdit = (coupon: any) => {
    setEditing(coupon);
    setForm({
      code: coupon.code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "PERCENTAGE",
      discountValue: String(coupon.discountValue || ""),
      maxDiscount: String(coupon.maxDiscount || ""),
      minOrderAmount: String(coupon.minOrderAmount || ""),
      usageLimit: String(coupon.usageLimit || ""),
      userUsageLimit: String(coupon.userUsageLimit || 1),
      audience: coupon.audience || "ALL",
      startsAt: formatDateInput(coupon.startsAt),
      expiresAt: formatDateInput(coupon.expiresAt),
      isActive: coupon.isActive !== false,
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setSaving(false);
    setForm(emptyForm);
  };

  const validate = () => {
    if (!form.code.trim()) return "Coupon code required hai.";
    if (!form.title.trim()) return "Coupon title required hai.";
    if (!form.discountValue || Number.isNaN(Number(form.discountValue))) {
      return "Discount value valid number hona chahiye.";
    }

    if (form.discountType === "PERCENTAGE" && Number(form.discountValue) > 100) {
      return "Percentage discount 100 se zyada nahi ho sakta.";
    }

    if (form.maxDiscount && Number.isNaN(Number(form.maxDiscount))) {
      return "Max discount valid number hona chahiye.";
    }

    if (form.minOrderAmount && Number.isNaN(Number(form.minOrderAmount))) {
      return "Min order amount valid number hona chahiye.";
    }

    return null;
  };

  const save = async () => {
    const error = validate();

    if (error) {
      showMsg("warning", "Please Check Details", error);
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      minOrderAmount: Number(form.minOrderAmount || 0),
      usageLimit: Number(form.usageLimit || 0),
      userUsageLimit: Number(form.userUsageLimit || 1),
      audience: form.audience,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };

    const res = editing
      ? await adminService.updateCoupon?.(editing.id, payload)
      : await adminService.createCoupon?.(payload);

    setSaving(false);

    if (!res || res.error) {
      showMsg(
        "error",
        "Coupon Save Failed",
        res?.error?.message || "Backend coupon route/service missing hai."
      );
      return;
    }

    closeModal();
    showMsg("success", editing ? "Coupon Updated" : "Coupon Created", "Coupon saved successfully.", "Done", () => {
      closeMsg();
      load();
    });
  };

  const askDelete = (coupon: any) => {
    showMsg(
      "warning",
      "Delete Coupon?",
      `${coupon.code || "This coupon"} delete/block karna hai?`,
      "Delete",
      () => deleteCoupon(coupon.id),
      "Cancel",
      closeMsg
    );
  };

  const deleteCoupon = async (id: string) => {
    setMsg((p: any) => ({ ...p, loading: true }));

    const res = await adminService.deleteCoupon?.(id);

    if (!res || res.error) {
      setMsg({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message: res?.error?.message || "Backend coupon delete route missing hai.",
        primaryText: "Okay",
      });
      return;
    }

    setMsg({
      visible: true,
      type: "success",
      title: "Coupon Deleted",
      message: "Coupon deleted/blocked successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMsg();
        load();
      },
    });
  };

  const toggleStatus = async (coupon: any) => {
    const res = await adminService.updateCoupon?.(coupon.id, {
      isActive: coupon.isActive === false,
    });

    if (!res || res.error) {
      showMsg("error", "Status Failed", res?.error?.message || "Coupon status route missing hai.");
      return;
    }

    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading coupons...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.yellow} colors={[THEME.yellow, THEME.green]} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                <Icon name="chevron-back" size={24} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>GROWTH CENTER</Text>
                <Text style={styles.title}>Coupons</Text>
                <Text style={styles.subtitle}>Generate discounts, offers and promo codes</Text>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>Coupon Usage</Text>
                <Text style={styles.heroTitle}>{stats.used}</Text>
                <Text style={styles.heroSub}>Total redeemed coupons</Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="ticket-outline" size={34} color={THEME.yellow} />
              </View>
            </View>

            <View style={styles.statGrid}>
              <MiniStat label="Coupons" value={stats.total} />
              <MiniStat label="Active" value={stats.active} green />
              <MiniStat label="Inactive" value={stats.inactive} danger />
              <MiniStat label="Expired" value={stats.expired} />
            </View>

            <View style={styles.filterRow}>
              {["ALL", "ACTIVE", "INACTIVE", "EXPIRED"].map((x) => (
                <TouchableOpacity
                  key={x}
                  style={[styles.chip, filter === x && styles.chipActive]}
                  onPress={() => setFilter(x)}
                >
                  <Text style={[styles.chipText, filter === x && styles.chipTextActive]}>
                    {formatLabel(x)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search coupon code, title..."
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
              <Text style={styles.sectionTitle}>Coupon List</Text>
              <Text style={styles.sectionCount}>{filtered.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="ticket-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No coupons found</Text>
            <Text style={styles.emptyText}>Create first coupon for customers, vendors or riders.</Text>

            <TouchableOpacity style={styles.emptyAddBtn} onPress={openCreate}>
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Create Coupon</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <CouponCard
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => askDelete(item)}
            onToggle={() => toggleStatus(item)}
          />
        )}
      />

      <CouponModal
        visible={modal}
        editing={editing}
        form={form}
        updateForm={updateForm}
        saving={saving}
        onClose={closeModal}
        onSave={save}
        onGenerate={() => updateForm("code", generateCouponCode())}
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

function CouponCard({ item, onEdit, onDelete, onToggle }: any) {
  const active = item.isActive !== false;
  const expired = isExpired(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.couponIcon}>
          <Icon name="ticket-outline" size={28} color={THEME.yellow} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.code}>{item.code}</Text>
            <Badge text={expired ? "Expired" : active ? "Active" : "Blocked"} green={active && !expired} danger={!active || expired} />
          </View>

          <Text style={styles.name} numberOfLines={1}>{item.title || "Coupon"}</Text>
          <Text style={styles.meta} numberOfLines={2}>{item.description || "No description"}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <Info label="Discount" value={item.discountType === "FLAT" ? `₹${item.discountValue}` : `${item.discountValue}%`} green />
        <Info label="Max" value={`₹${Number(item.maxDiscount || 0)}`} />
        <Info label="Min Order" value={`₹${Number(item.minOrderAmount || 0)}`} />
        <Info label="Used" value={item.usedCount || item.totalUsed || 0} />
      </View>

      <View style={styles.validBox}>
        <Text style={styles.validText}>
          {item.audience || "ALL"} • {item.expiresAt ? `Expires ${formatDate(item.expiresAt)}` : "No expiry"}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Action icon="create-outline" text="Edit" onPress={onEdit} />
        <Action icon={active ? "ban-outline" : "checkmark-circle-outline"} text={active ? "Block" : "Active"} onPress={onToggle} outline />
        <Action icon="trash-outline" text="Delete" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function CouponModal({ visible, editing, form, updateForm, saving, onClose, onSave, onGenerate }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>PROMO CODE</Text>
              <Text style={styles.modalTitle}>{editing ? "Edit Coupon" : "Create Coupon"}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.codeRow}>
              <View style={{ flex: 1 }}>
                <Input label="Coupon Code" icon="barcode-outline" value={form.code} onChangeText={(v: string) => updateForm("code", v.toUpperCase())} placeholder="KARTO50" />
              </View>

              <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                <Icon name="sparkles-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <Input label="Title" icon="ticket-outline" value={form.title} onChangeText={(v: string) => updateForm("title", v)} placeholder="Flat 50 off" />
            <Input label="Description" icon="document-text-outline" value={form.description} onChangeText={(v: string) => updateForm("description", v)} placeholder="Offer details" />

            <Text style={styles.inputLabel}>Discount Type</Text>
            <View style={styles.segmentRow}>
              {DISCOUNT_TYPES.map((x) => (
                <TouchableOpacity key={x} style={[styles.segment, form.discountType === x && styles.segmentActive]} onPress={() => updateForm("discountType", x)}>
                  <Text style={[styles.segmentText, form.discountType === x && styles.segmentTextActive]}>{formatLabel(x)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Discount Value" icon="cash-outline" value={form.discountValue} keyboardType="numeric" onChangeText={(v: string) => updateForm("discountValue", v)} placeholder="10 or 50" />
            <Input label="Max Discount" icon="wallet-outline" value={form.maxDiscount} keyboardType="numeric" onChangeText={(v: string) => updateForm("maxDiscount", v)} placeholder="100" />
            <Input label="Minimum Order Amount" icon="cart-outline" value={form.minOrderAmount} keyboardType="numeric" onChangeText={(v: string) => updateForm("minOrderAmount", v)} placeholder="199" />
            <Input label="Total Usage Limit" icon="repeat-outline" value={form.usageLimit} keyboardType="numeric" onChangeText={(v: string) => updateForm("usageLimit", v)} placeholder="1000" />
            <Input label="Per User Limit" icon="person-outline" value={form.userUsageLimit} keyboardType="numeric" onChangeText={(v: string) => updateForm("userUsageLimit", v)} placeholder="1" />

            <Text style={styles.inputLabel}>Audience</Text>
            <View style={styles.segmentRow}>
              {AUDIENCE.map((x) => (
                <TouchableOpacity key={x} style={[styles.segment, form.audience === x && styles.segmentActive]} onPress={() => updateForm("audience", x)}>
                  <Text style={[styles.segmentText, form.audience === x && styles.segmentTextActive]}>{formatLabel(x)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Start Date Optional" icon="calendar-outline" value={form.startsAt} onChangeText={(v: string) => updateForm("startsAt", v)} placeholder="YYYY-MM-DD" />
            <Input label="Expiry Date Optional" icon="calendar-number-outline" value={form.expiresAt} onChangeText={(v: string) => updateForm("expiresAt", v)} placeholder="YYYY-MM-DD" />

            <TouchableOpacity style={[styles.statusToggle, form.isActive && styles.statusToggleActive]} onPress={() => updateForm("isActive", !form.isActive)}>
              <Icon name={form.isActive ? "checkmark-circle-outline" : "ban-outline"} size={20} color={form.isActive ? "#000" : THEME.danger} />
              <Text style={[styles.statusToggleText, form.isActive && styles.statusToggleTextActive]}>
                {form.isActive ? "Active Coupon" : "Blocked Coupon"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.saveText}>Save Coupon</Text>
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

function MiniStat({ label, value, green, danger }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, green && { color: THEME.green }, danger && { color: THEME.danger }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function Badge({ text, green, danger }: any) {
  return (
    <View style={[styles.badge, green && styles.badgeGreen, danger && styles.badgeDanger]}>
      <Text style={[styles.badgeText, green && { color: THEME.green }, danger && { color: THEME.danger }]}>{text}</Text>
    </View>
  );
}

function Info({ label, value, green }: any) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={[styles.infoLabel, green && { color: THEME.green }]}>{label}</Text>
    </View>
  );
}

function Action({ icon, text, onPress, outline, danger }: any) {
  return (
    <TouchableOpacity style={[styles.actionBtn, outline && styles.actionOutline, danger && styles.actionDanger]} onPress={onPress}>
      <Icon name={icon} size={16} color={outline ? THEME.yellow : danger ? THEME.danger : "#000"} />
      <Text style={[styles.actionText, outline && styles.actionTextOutline, danger && styles.actionTextDanger]}>{text}</Text>
    </TouchableOpacity>
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

function isExpired(coupon: any) {
  return coupon.expiresAt ? new Date(coupon.expiresAt).getTime() < Date.now() : false;
}

function formatDate(value: any) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateInput(value: any) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateCouponCode() {
  return `KARTO${Math.floor(1000 + Math.random() * 9000)}`;
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
  heroTitle: { color: THEME.yellow, fontSize: 34, fontWeight: "900", marginTop: 5 },
  heroSub: { color: THEME.muted, fontSize: 12, fontWeight: "700", marginTop: 5 },
  heroIcon: { width: 64, height: 64, borderRadius: 23, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  miniStat: { width: "48.5%", backgroundColor: THEME.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.border },
  miniValue: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  miniLabel: { color: THEME.muted, fontSize: 10.5, fontWeight: "800", marginTop: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: { height: 38, borderWidth: 1, borderColor: THEME.border, borderRadius: 999, justifyContent: "center", paddingHorizontal: 14, backgroundColor: THEME.card },
  chipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  chipText: { color: THEME.muted, fontWeight: "900", fontSize: 11 },
  chipTextActive: { color: "#000" },
  searchBox: { marginTop: 17, height: 54, borderRadius: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, color: THEME.text, fontWeight: "800", fontSize: 14 },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: THEME.text, fontSize: 20, fontWeight: "900" },
  sectionCount: { color: THEME.yellow, fontWeight: "900" },
  emptyBox: { backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: THEME.border },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 7, lineHeight: 20, fontWeight: "700" },
  emptyAddBtn: { marginTop: 18, height: 48, paddingHorizontal: 18, borderRadius: 18, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  emptyAddText: { color: "#000", fontWeight: "900" },
  card: { backgroundColor: THEME.card, borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  couponIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#1C190D", borderWidth: 1, borderColor: "#5D4D0B", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { flex: 1, color: THEME.yellow, fontSize: 19, fontWeight: "900" },
  name: { color: THEME.text, fontSize: 15, fontWeight: "900", marginTop: 4 },
  meta: { color: THEME.muted, marginTop: 4, fontSize: 12, fontWeight: "700" },
  badge: { borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeGreen: { backgroundColor: "#102517", borderColor: "#1F6B35" },
  badgeDanger: { backgroundColor: "#251010", borderColor: "#6B1F1F" },
  badgeText: { color: THEME.muted, fontSize: 10, fontWeight: "900" },
  infoGrid: { flexDirection: "row", gap: 8, marginTop: 13 },
  infoBox: { flex: 1, backgroundColor: THEME.card2, borderRadius: 15, padding: 10, borderWidth: 1, borderColor: THEME.border },
  infoValue: { color: THEME.yellow, fontWeight: "900", fontSize: 12 },
  infoLabel: { color: THEME.muted, fontWeight: "800", fontSize: 10, marginTop: 4 },
  validBox: { backgroundColor: THEME.card2, borderRadius: 15, padding: 10, borderWidth: 1, borderColor: THEME.border, marginTop: 12 },
  validText: { color: THEME.muted, fontWeight: "800", fontSize: 11 },
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
  codeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  generateBtn: { width: 54, height: 54, borderRadius: 18, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", marginTop: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { color: THEME.text, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  inputBox: { minHeight: 55, borderRadius: 19, backgroundColor: THEME.input, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: THEME.text, fontWeight: "800" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  segment: { flex: 1, minHeight: 42, borderRadius: 15, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  segmentText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  segmentTextActive: { color: "#000" },
  statusToggle: { minHeight: 52, borderRadius: 18, backgroundColor: "#251010", borderWidth: 1, borderColor: "#6B1F1F", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 },
  statusToggleActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  statusToggleText: { color: THEME.danger, fontWeight: "900" },
  statusToggleTextActive: { color: "#000" },
  saveBtn: { height: 56, borderRadius: 20, backgroundColor: THEME.yellow, marginTop: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: THEME.muted, fontWeight: "900" },
});