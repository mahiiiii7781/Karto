import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
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

const targets = [
  { label: "All", value: "ALL", icon: "megaphone-outline" },
  { label: "Customers", value: "ROLE", role: "CUSTOMER", icon: "people-outline" },
  { label: "Vendors", value: "ROLE", role: "VENDOR", icon: "storefront-outline" },
  { label: "Riders", value: "ROLE", role: "RIDER", icon: "bicycle-outline" },
];

const quickTemplates = [
  {
    title: "Darjeeling, tea? ☕",
    body: "Jee is silent 😮‍💨",
    type: "OFFER",
  },
  {
    title: "Hungry ho kya? 🍔",
    body: "Fresh food is waiting near you.",
    type: "OFFER",
  },
  {
    title: "Karto se order karo 💚",
    body: "Fast delivery, fresh stores, local trusted vendors.",
    type: "OFFER",
  },
];

export default function AdminNotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTarget, setSelectedTarget] = useState<any>(targets[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("OFFER");
  const [sending, setSending] = useState(false);

  const [msg, setMsg] = useState<any>({
    visible: false,
    type: "info" as KartoMessageType,
    title: "",
    message: "",
  });

  useEffect(() => {
    load();
  }, []);

  const showMsg = (type: KartoMessageType, title: string, message: string) => {
    setMsg({ visible: true, type, title, message, primaryText: "Done" });
  };

  const closeMsg = () => setMsg((p: any) => ({ ...p, visible: false }));

  const load = async () => {
    const res = await adminService.getNotifications();

    if (res.error) {
      showMsg("error", "Load Failed", res.error.message || "Notifications load nahi hui.");
      setNotifications([]);
    } else {
      setNotifications(res.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate("AdminDashboard");
  };

  const applyTemplate = (item: any) => {
    setTitle(item.title);
    setBody(item.body);
    setType(item.type || "OFFER");
  };

  const send = async () => {
    if (!title.trim()) {
      showMsg("warning", "Title Required", "Notification title required hai.");
      return;
    }

    if (!body.trim()) {
      showMsg("warning", "Message Required", "Notification message required hai.");
      return;
    }

    setSending(true);

    const payload: any = {
      title: title.trim(),
      body: body.trim(),
      type,
      target: selectedTarget.value,
    };

    if (selectedTarget.role) payload.role = selectedTarget.role;

    const res = await adminService.sendNotification(payload);

    setSending(false);

    if (res.error) {
      showMsg("error", "Send Failed", res.error.message || "Notification send nahi hui.");
      return;
    }

    showMsg(
      "success",
      "Notification Sent",
      `Sent: ${res.data?.sent ?? 0}, Failed: ${res.data?.failed ?? 0}, Users: ${res.data?.totalUsers ?? 0}`
    );

    setTitle("");
    setBody("");
    load();
  };

  const preview = useMemo(
    () => ({
      app: "Karto",
      title: title.trim() || "Darjeeling, tea? ☕",
      body: body.trim() || "Jee is silent 😮‍💨",
    }),
    [title, body]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <ActivityIndicator color={THEME.yellow} size="large" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>MARKETING CENTER</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Send Zomato-style push messages</Text>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("AdminDashboard")}>
            <Icon name="home-outline" size={21} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.previewOuter}>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>K</Text>
              </View>
              <Text style={styles.previewApp}>{preview.app} · Now</Text>
            </View>

            <Text style={styles.previewTitle}>{preview.title}</Text>
            <Text style={styles.previewBody}>{preview.body}</Text>
          </View>

          <View style={styles.replyBox}>
            <Text style={styles.replyText}>Reply</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="flash-outline" size={20} color={THEME.yellow} />
            </View>
            <Text style={styles.sectionTitle}>Quick Templates</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickTemplates.map((item, index) => (
              <TouchableOpacity key={index} style={styles.templateChip} onPress={() => applyTemplate(item)}>
                <Text style={styles.templateTitle}>{item.title}</Text>
                <Text style={styles.templateBody} numberOfLines={1}>
                  {item.body}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="radio-outline" size={20} color={THEME.yellow} />
            </View>
            <Text style={styles.sectionTitle}>Target Audience</Text>
          </View>

          <View style={styles.targetGrid}>
            {targets.map((item) => {
              const active =
                selectedTarget.value === item.value &&
                selectedTarget.role === item.role;

              return (
                <TouchableOpacity
                  key={`${item.value}-${item.role || "ALL"}`}
                  style={[styles.targetCard, active && styles.targetActive]}
                  onPress={() => setSelectedTarget(item)}
                >
                  <Icon name={item.icon as any} size={24} color={active ? "#000" : THEME.yellow} />
                  <Text style={[styles.targetText, active && styles.targetTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="create-outline" size={20} color={THEME.yellow} />
            </View>
            <Text style={styles.sectionTitle}>Create Notification</Text>
          </View>

          <Input
            label="Title"
            icon="text-outline"
            value={title}
            onChangeText={setTitle}
            placeholder="Darjeeling, tea? ☕"
          />

          <Input
            label="Message"
            icon="chatbubble-ellipses-outline"
            value={body}
            onChangeText={setBody}
            placeholder="Jee is silent 😮‍💨"
            multiline
          />

          <View style={styles.typeRow}>
            {["OFFER", "SYSTEM", "ORDER", "WALLET"].map((x) => (
              <TouchableOpacity
                key={x}
                style={[styles.typeChip, type === x && styles.typeChipActive]}
                onPress={() => setType(x)}
              >
                <Text style={[styles.typeText, type === x && styles.typeTextActive]}>{x}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.7 }]}
            onPress={send}
            disabled={sending}
            activeOpacity={0.86}
          >
            {sending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Icon name="paper-plane-outline" size={22} color="#000" />
                <Text style={styles.sendText}>Send Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon name="time-outline" size={20} color={THEME.yellow} />
            </View>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="notifications-off-outline" size={34} color={THEME.yellow} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Admin sent notifications will appear here.</Text>
            </View>
          ) : (
            notifications.slice(0, 30).map((item) => (
              <View key={item.id} style={styles.notificationCard}>
                <View style={styles.notificationIcon}>
                  <Icon name="notifications-outline" size={22} color={THEME.yellow} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  <Text style={styles.notificationMeta}>
                    {item.user?.role || "USER"} • {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <KartoMessageModal
        visible={msg.visible}
        type={msg.type}
        title={msg.title}
        message={msg.message}
        primaryText={msg.primaryText}
        onClose={closeMsg}
        onPrimary={closeMsg}
      />
    </View>
  );
}

function Input({ label, icon, multiline, ...props }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
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
  container: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16 },
  center: { flex: 1, backgroundColor: THEME.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },

  header: { flexDirection: "row", gap: 12, alignItems: "center", paddingTop: 22, paddingBottom: 16 },
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
  subtitle: { color: THEME.muted, marginTop: 3, fontWeight: "700", fontSize: 12 },

  previewOuter: {
    backgroundColor: "#EF334E",
    borderRadius: 24,
    padding: 10,
    flexDirection: "row",
    marginBottom: 16,
  },
  previewCard: {
    flex: 1,
    backgroundColor: "#242424",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  previewTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#000", fontWeight: "900", fontSize: 13 },
  previewApp: { color: "#AFAFAF", fontSize: 15, fontWeight: "800" },
  previewTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", marginTop: 10 },
  previewBody: { color: "#FFFFFF", fontSize: 18, marginTop: 4 },
  replyBox: { width: 96, alignItems: "center", justifyContent: "center" },
  replyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  section: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "900" },

  templateChip: {
    width: 210,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 13,
    marginRight: 10,
  },
  templateTitle: { color: THEME.text, fontWeight: "900", fontSize: 14 },
  templateBody: { color: THEME.muted, marginTop: 5, fontWeight: "700" },

  targetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  targetCard: {
    width: "48%",
    backgroundColor: THEME.input,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    gap: 8,
  },
  targetActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  targetText: { color: THEME.muted, fontWeight: "900" },
  targetTextActive: { color: "#000" },

  inputGroup: { marginBottom: 13 },
  label: { color: THEME.text, fontWeight: "900", marginBottom: 8, fontSize: 13 },
  inputBox: {
    minHeight: 55,
    backgroundColor: THEME.input,
    borderRadius: 19,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, color: THEME.text, fontWeight: "800" },
  textAreaBox: { minHeight: 105, alignItems: "flex-start", paddingTop: 14 },
  textArea: { minHeight: 82, textAlignVertical: "top" },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  typeChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  typeText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  typeTextActive: { color: "#000" },

  sendBtn: {
    backgroundColor: THEME.yellow,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sendText: { color: "#000", fontWeight: "900", fontSize: 16 },

  emptyBox: {
    backgroundColor: THEME.input,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    alignItems: "center",
  },
  emptyTitle: { color: THEME.text, fontWeight: "900", fontSize: 16, marginTop: 8 },
  emptyText: { color: THEME.muted, fontWeight: "700", marginTop: 5, textAlign: "center" },

  notificationCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: THEME.input,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#1C190D",
    borderWidth: 1,
    borderColor: "#5D4D0B",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: { color: THEME.text, fontWeight: "900", fontSize: 14 },
  notificationBody: { color: THEME.muted, fontWeight: "700", marginTop: 4 },
  notificationMeta: { color: THEME.green, fontWeight: "800", fontSize: 11, marginTop: 6 },
});