import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { riderService } from "@/services/api/riderApi";

const T = {
  bg: "#070A08",
  card: "#101713",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

export default function RiderSupportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getSupportTickets();
      setTickets(res?.tickets || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load support");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTicket = async () => {
    if (!subject.trim()) return showToast("Subject required");

    setSaving(true);
    try {
      await riderService.createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        priority: "MEDIUM",
      });
      setSubject("");
      setMessage("");
      showToast("Support ticket created");
      loadData();
    } catch (e: any) {
      showToast(e?.message || "Could not create ticket");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator color={T.yellow} size="large" />
        <Text style={styles.loadingText}>Loading support...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="flash-outline" size={17} color={T.black} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.sub}>Help, issues and delivery support</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={T.yellow}
          />
        }
      >
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Create Ticket</Text>

          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Issue subject"
            placeholderTextColor={T.muted}
            style={styles.input}
          />

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue"
            placeholderTextColor={T.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity disabled={saving} style={styles.submitBtn} onPress={createTicket}>
            {saving ? (
              <ActivityIndicator color={T.black} />
            ) : (
              <>
                <Text style={styles.submitText}>Submit Ticket</Text>
                <Icon name="send" size={18} color={T.black} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>My Tickets</Text>

        {tickets.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="chatbubble-ellipses-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No tickets yet</Text>
            <Text style={styles.emptyText}>Create a ticket when you need help.</Text>
          </View>
        ) : (
          tickets.map((t) => (
            <View key={t.id} style={styles.ticket}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketTitle}>{t.subject}</Text>
                <View style={styles.status}>
                  <Text style={styles.statusText}>{t.status}</Text>
                </View>
              </View>
              <Text style={styles.ticketMsg}>{t.message || "No message"}</Text>
              <Text style={styles.date}>{new Date(t.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: { flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" },
  loadingText: { color: T.muted, marginTop: 12, fontWeight: "700" },
  toast: {
    position: "absolute",
    top: 44,
    left: 18,
    right: 18,
    zIndex: 99,
    backgroundColor: T.yellow,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: T.black, fontWeight: "900", flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: T.text, fontSize: 25, fontWeight: "900" },
  sub: { color: T.muted, marginTop: 3 },
  formCard: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardTitle: { color: T.text, fontSize: 18, fontWeight: "900", marginBottom: 12 },
  input: {
    backgroundColor: T.black,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    color: T.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontWeight: "700",
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  submitBtn: {
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: { color: T.black, fontWeight: "900" },
  section: { color: T.text, fontSize: 19, fontWeight: "900", marginTop: 24, marginBottom: 12 },
  empty: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: { color: T.text, fontWeight: "900", fontSize: 18, marginTop: 12 },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },
  ticket: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 12,
  },
  ticketTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  ticketTitle: { color: T.text, fontWeight: "900", flex: 1 },
  ticketMsg: { color: T.muted, marginTop: 8, lineHeight: 19 },
  date: { color: T.muted, marginTop: 10, fontSize: 11 },
  status: {
    backgroundColor: "#102A1B",
    borderColor: "#1F6B3B",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: { color: T.green, fontSize: 10, fontWeight: "900" },
});