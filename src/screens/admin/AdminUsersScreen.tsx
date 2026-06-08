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
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
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

const ROLES = ["CUSTOMER", "VENDOR", "RIDER", "ADMIN"];
const FILTERS = ["ALL", ...ROLES];

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

export default function AdminUsersScreen({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "123456",
    role: "CUSTOMER",
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

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const loadUsers = useCallback(async () => {
    const { data, error } = await adminService.users();

    if (error) {
      showMessage("error", "Unable to Load Users", error.message || "Failed to load users.");
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      password: "123456",
      role: "CUSTOMER",
    });
  };

  const closeCreateModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Full name is required.";

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return "Phone number should contain 10 digits and start with 6, 7, 8 or 9.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (!form.role) return "Please select a user role.";

    return null;
  };

  const createUser = async () => {
    const validationMessage = validate();

    if (validationMessage) {
      showMessage("warning", "Please Check Details", validationMessage);
      return;
    }

    setCreating(true);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
    };

    const { error } = await adminService.createRoleUser(payload);

    setCreating(false);

    if (error) {
      showMessage("error", "User Creation Failed", error.message || "User create failed.");
      return;
    }

    closeCreateModal();

    showMessage(
      "success",
      "User Created Successfully",
      `${payload.role} account has been created and login access is ready.`,
      "Done",
      () => {
        closeMessage();
        loadUsers();
      }
    );
  };

  const askToggleStatus = (user: any) => {
    const active = user.isActive !== false;
    const willActivate = !active;

    showMessage(
      willActivate ? "success" : "warning",
      willActivate ? "Activate User?" : "Block User?",
      willActivate
        ? `${user.fullName || user.email || "This user"} will be allowed to access Karto again.`
        : `${user.fullName || user.email || "This user"} will not be able to access Karto.`,
      willActivate ? "Activate" : "Block",
      () => toggleStatus(user),
      "Cancel",
      closeMessage
    );
  };

  const toggleStatus = async (user: any) => {
    const active = user.isActive !== false;

    setMessage((prev) => ({ ...prev, loading: true }));

    const { error } = await adminService.updateUserStatus(user.id, !active);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Status Update Failed",
        message: error.message || "Failed to update user status.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "User Status Updated",
      message: active
        ? "User has been blocked successfully."
        : "User has been activated successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadUsers();
      },
    });
  };

  const openRoleModal = (user: any) => {
    setSelectedUser(user);
    setRoleModalVisible(true);
  };

  const closeRoleModal = () => {
    setSelectedUser(null);
    setRoleModalVisible(false);
  };

  const changeRole = async (role: string) => {
    if (!selectedUser) return;

    setRoleModalVisible(false);

    showMessage(
      "warning",
      "Change User Role?",
      `${selectedUser.fullName || selectedUser.email || "This user"} ka role ${formatRole(role)} karna hai?`,
      "Change",
      () => updateUserRole(selectedUser, role),
      "Cancel",
      closeMessage
    );
  };

  const updateUserRole = async (user: any, role: string) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const { error } = await adminService.updateUserRole(user.id, role);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Role Update Failed",
        message: error.message || "Failed to update user role.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "Role Updated",
      message: `User role updated to ${formatRole(role)}.`,
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadUsers();
      },
    });
  };

  const askDeleteUser = (user: any) => {
    showMessage(
      "warning",
      "Delete User?",
      `${user.fullName || user.email || "This user"} ko delete/block karna hai? Linked orders/vendors/riders hue to backend safe block karega.`,
      "Delete",
      () => deleteUser(user),
      "Cancel",
      closeMessage
    );
  };

  const deleteUser = async (user: any) => {
    setMessage((prev) => ({ ...prev, loading: true }));

    const { error } = await adminService.deleteUser(user.id);

    if (error) {
      setMessage({
        visible: true,
        type: "error",
        title: "Delete Failed",
        message: error.message || "Unable to delete user.",
        primaryText: "Okay",
      });
      return;
    }

    setMessage({
      visible: true,
      type: "success",
      title: "User Deleted",
      message: "User deleted/blocked successfully.",
      primaryText: "Done",
      onPrimary: () => {
        closeMessage();
        loadUsers();
      },
    });
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchRole = roleFilter === "ALL" || user.role === roleFilter;

      const matchSearch =
        !q ||
        user.fullName?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.phone?.toLowerCase().includes(q) ||
        user.role?.toLowerCase().includes(q);

      return matchRole && matchSearch;
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive !== false).length,
      blocked: users.filter((u) => u.isActive === false).length,
      customers: users.filter((u) => u.role === "CUSTOMER").length,
      vendors: users.filter((u) => u.role === "VENDOR").length,
      riders: users.filter((u) => u.role === "RIDER").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
    };
  }, [users]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <FlatList
        data={filteredUsers}
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
                <Text style={styles.smallLabel}>USER OPERATIONS</Text>
                <Text style={styles.title}>Users</Text>
                <Text style={styles.subtitle}>Manage customers, vendors, riders and admins</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.86}
              >
                <Icon name="add" size={27} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>Total Platform Users</Text>
                  <Text style={styles.summaryValue}>{stats.total}</Text>
                </View>

                <View style={styles.summaryIcon}>
                  <Icon name="people-outline" size={35} color={THEME.yellow} />
                </View>
              </View>

              <View style={styles.summaryStats}>
                <MiniStat label="Active" value={stats.active} green />
                <MiniStat label="Blocked" value={stats.blocked} danger />
                <MiniStat label="Admins" value={stats.admins} />
              </View>

              <View style={styles.roleStats}>
                <RoleStat label="Customers" value={stats.customers} />
                <RoleStat label="Vendors" value={stats.vendors} />
                <RoleStat label="Riders" value={stats.riders} />
              </View>
            </View>

            <View style={styles.quickRail}>
              <QuickAction
                icon="storefront-outline"
                label="Vendors"
                onPress={() => navigation.navigate("AdminVendors")}
              />
              <QuickAction
                icon="bicycle-outline"
                label="Riders"
                onPress={() => navigation.navigate("AdminRiders")}
              />
              <QuickAction
                icon="person-add-outline"
                label="Create"
                onPress={() => setModalVisible(true)}
              />
              <QuickAction
                icon="shield-checkmark-outline"
                label="Admins"
                onPress={() => setRoleFilter("ADMIN")}
              />
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={20} color={THEME.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, email, phone, role..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />

              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icon name="close-circle" size={21} color={THEME.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={styles.filterList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, roleFilter === item && styles.chipActive]}
                  onPress={() => setRoleFilter(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      roleFilter === item && styles.chipTextActive,
                    ]}
                  >
                    {formatRole(item)}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>User List</Text>
              <Text style={styles.sectionCount}>{filteredUsers.length} found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="people-outline" size={44} color={THEME.yellow} />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptyText}>
              Create users or adjust your search and filters.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.86}
            >
              <Icon name="add-circle-outline" size={21} color="#000" />
              <Text style={styles.emptyAddText}>Create User</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onToggleStatus={() => askToggleStatus(item)}
            onChangeRole={() => openRoleModal(item)}
            onDelete={() => askDeleteUser(item)}
          />
        )}
      />

      <CreateUserModal
        visible={modalVisible}
        form={form}
        creating={creating}
        updateForm={updateForm}
        onClose={closeCreateModal}
        onCreate={createUser}
      />

      <RoleChangeModal
        visible={roleModalVisible}
        user={selectedUser}
        onClose={closeRoleModal}
        onChangeRole={changeRole}
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

function QuickAction({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.86}>
      <Icon name={icon} size={21} color={THEME.yellow} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

function RoleStat({ label, value }: any) {
  return (
    <View style={styles.roleStat}>
      <Text style={styles.roleStatValue}>{value}</Text>
      <Text style={styles.roleStatLabel}>{label}</Text>
    </View>
  );
}

function UserCard({ user, onToggleStatus, onChangeRole, onDelete }: any) {
  const active = user.isActive !== false;

  return (
    <View style={styles.card}>
      <View style={styles.userTop}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{getInitials(user.fullName || user.email)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user.fullName || "User"}
            </Text>

            <RoleBadge role={user.role} />
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {user.email || "No email"}
          </Text>

          <Text style={styles.meta} numberOfLines={1}>
            {user.phone || "No phone"}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <StatusBadge active={active} />
        <View style={styles.userIdPill}>
          <Text style={styles.userIdText}>ID: {user.id?.slice(0, 8) || "-"}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.statusAction, active ? styles.blockBtn : styles.activateBtn]}
          onPress={onToggleStatus}
          activeOpacity={0.86}
        >
          <Icon
            name={active ? "ban-outline" : "checkmark-circle-outline"}
            size={18}
            color={active ? THEME.danger : "#000"}
          />
          <Text style={[styles.statusActionText, active ? styles.blockText : styles.activateText]}>
            {active ? "Block" : "Activate"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleBtn} onPress={onChangeRole} activeOpacity={0.86}>
          <Icon name="swap-horizontal-outline" size={18} color="#000" />
          <Text style={styles.roleBtnText}>Role</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.86}>
          <Icon name="trash-outline" size={18} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RoleBadge({ role }: any) {
  const config = getRoleConfig(role);

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.roleBadgeText, { color: config.color }]}>
        {formatRole(role)}
      </Text>
    </View>
  );
}

function StatusBadge({ active }: any) {
  return (
    <View style={[styles.statusBadge, active ? styles.activeBadge : styles.blockedBadge]}>
      <Icon
        name={active ? "checkmark-circle-outline" : "close-circle-outline"}
        size={14}
        color={active ? THEME.green : THEME.danger}
      />
      <Text style={[styles.statusBadgeText, active ? styles.activeText : styles.blockedText]}>
        {active ? "Active" : "Blocked"}
      </Text>
    </View>
  );
}

function CreateUserModal({
  visible,
  form,
  creating,
  updateForm,
  onClose,
  onCreate,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>CREATE ACCESS</Text>
              <Text style={styles.modalTitle}>Create Role User</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FormInput
              label="Full Name"
              icon="person-outline"
              value={form.fullName}
              onChangeText={(v: string) => updateForm("fullName", v)}
              placeholder="Example: Aman Kumar"
            />

            <FormInput
              label="Email"
              icon="mail-outline"
              value={form.email}
              onChangeText={(v: string) => updateForm("email", v)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="user@karto.in"
            />

            <FormInput
              label="Phone"
              icon="call-outline"
              value={form.phone}
              onChangeText={(v: string) => updateForm("phone", v)}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Example: 9876543210"
            />

            <FormInput
              label="Password"
              icon="lock-closed-outline"
              value={form.password}
              onChangeText={(v: string) => updateForm("password", v)}
              secureTextEntry
              placeholder="Minimum 6 characters"
            />

            <Text style={styles.inputLabel}>Role</Text>

            <View style={styles.roleRow}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleChip, form.role === role && styles.roleChipActive]}
                  onPress={() => updateForm("role", role)}
                >
                  <Icon
                    name={getRoleConfig(role).icon}
                    size={17}
                    color={form.role === role ? "#000" : THEME.yellow}
                  />
                  <Text
                    style={[
                      styles.roleChipText,
                      form.role === role && styles.roleChipTextActive,
                    ]}
                  >
                    {formatRole(role)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.7 }]}
              onPress={onCreate}
              disabled={creating}
              activeOpacity={0.86}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={22} color="#000" />
                  <Text style={styles.createText}>Create User</Text>
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

function RoleChangeModal({ visible, user, onClose, onChangeRole }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBoxSmall}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>CHANGE ROLE</Text>
              <Text style={styles.modalTitle}>{user?.fullName || user?.email || "User"}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={23} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.roleRow}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, user?.role === role && styles.roleChipActive]}
                onPress={() => onChangeRole(role)}
              >
                <Icon
                  name={getRoleConfig(role).icon}
                  size={17}
                  color={user?.role === role ? "#000" : THEME.yellow}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    user?.role === role && styles.roleChipTextActive,
                  ]}
                >
                  {formatRole(role)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FormInput({ label, icon, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputBox}>
        <Icon name={icon} size={20} color={THEME.yellow} />
        <TextInput
          {...props}
          placeholderTextColor={THEME.muted}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function getInitials(value: string) {
  if (!value) return "U";

  const parts = value.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatRole(role: string) {
  if (!role) return "-";
  if (role === "ALL") return "All";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function getRoleConfig(role: string) {
  switch (role) {
    case "ADMIN":
      return {
        color: THEME.yellow,
        bg: "#1C190D",
        border: "#5D4D0B",
        icon: "shield-checkmark-outline",
      };
    case "VENDOR":
      return {
        color: THEME.green,
        bg: "#102517",
        border: "#1F6B35",
        icon: "storefront-outline",
      };
    case "RIDER":
      return {
        color: "#6EE7FF",
        bg: "#0A1D23",
        border: "#155E75",
        icon: "bicycle-outline",
      };
    default:
      return {
        color: THEME.orange,
        bg: "#271D0A",
        border: "#6B4A12",
        icon: "person-outline",
      };
  }
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
  summaryStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  miniStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
  },
  miniLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 3,
  },
  roleStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  roleStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  roleStatValue: {
    color: THEME.green,
    fontSize: 18,
    fontWeight: "900",
  },
  roleStatLabel: {
    color: THEME.muted,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 3,
  },
  quickRail: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  quickItem: {
    flex: 1,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
  },
  quickText: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
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
  filterList: {
    maxHeight: 48,
    marginTop: 15,
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
  sectionCount: {
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
  userTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: THEME.yellow,
    fontSize: 17,
    fontWeight: "900",
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
    fontWeight: "800",
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  statusBadge: {
    flex: 1,
    minHeight: 35,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activeBadge: {
    backgroundColor: "#102517",
    borderColor: "#1F6B35",
  },
  blockedBadge: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  activeText: {
    color: THEME.green,
  },
  blockedText: {
    color: THEME.danger,
  },
  userIdPill: {
    flex: 1,
    minHeight: 35,
    borderRadius: 14,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  userIdText: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statusAction: {
    flex: 1,
    height: 45,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    borderWidth: 1,
  },
  blockBtn: {
    backgroundColor: "#251010",
    borderColor: "#6B1F1F",
  },
  activateBtn: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  statusActionText: {
    fontWeight: "900",
    fontSize: 13,
  },
  blockText: {
    color: THEME.danger,
  },
  activateText: {
    color: "#000",
  },
  roleBtn: {
    flex: 1,
    height: 45,
    borderRadius: 17,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  roleBtnText: {
    color: "#000",
    fontWeight: "900",
  },
  deleteBtn: {
    width: 48,
    height: 45,
    borderRadius: 17,
    backgroundColor: "#251010",
    borderWidth: 1,
    borderColor: "#6B1F1F",
    alignItems: "center",
    justifyContent: "center",
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
  modalBoxSmall: {
    maxHeight: "75%",
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
  input: {
    flex: 1,
    color: THEME.text,
    fontWeight: "800",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 16,
  },
  roleChip: {
    width: "48%",
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  roleChipActive: {
    backgroundColor: THEME.yellow,
    borderColor: THEME.yellow,
  },
  roleChipText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 12,
  },
  roleChipTextActive: {
    color: "#000",
  },
  createBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: THEME.yellow,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  createText: {
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