import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  card2: "#0D120F",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const safeDate = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

export default function RiderSupportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState("");
  const [toast, setToast] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getSupportTickets();

      if (res?.error) {
        setTickets([]);
        showToast(res?.error?.message || "Failed to load support");
        return;
      }

      setTickets(res?.data || []);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const createTicket = async () => {
    if (!subject.trim()) {
      showToast("Subject required");
      return;
    }

    if (!message.trim()) {
      showToast("Message required");
      return;
    }

    setSaving(true);

    try {
      const res = await riderService.createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        priority,
      });

      if (res?.error) {
        showToast(res?.error?.message || "Could not create ticket");
        return;
      }

      setSubject("");
      setMessage("");
      setPriority("MEDIUM");
      showToast("Support ticket created");
      loadData();
    } catch (e: any) {
      showToast(e?.message || "Could not create ticket");
    } finally {
      setSaving(false);
    }
  };

  const addReply = async (ticketId: string) => {
    const text = replyText[ticketId]?.trim();

    if (!text) {
      showToast("Reply message required");
      return;
    }

    setReplyingId(ticketId);

    try {
      const res = await riderService.addSupportMessage(ticketId, {
        message: text,
      });

      if (res?.error) {
        showToast(res?.error?.message || "Could not add reply");
        return;
      }

      setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
      showToast("Reply sent");
      loadData();
    } catch (e: any) {
      showToast(e?.message || "Could not add reply");
    } finally {
      setReplyingId("");
    }
  };

  const openTickets = tickets.filter((x) => x?.status !== "CLOSED").length;
  const closedTickets = tickets.filter((x) => x?.status === "CLOSED").length;

  const latestTicket = useMemo(() => tickets?.[0] || null, [tickets]);

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

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.sub}>Help, issues and delivery support</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Support Center</Text>
            <Text style={styles.heroTitle}>{openTickets} Open Tickets</Text>
            <Text style={styles.heroSub}>
              Closed {closedTickets} • Latest{" "}
              {latestTicket ? safeDate(latestTicket.createdAt) : "-"}
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="headset" size={30} color={T.black} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat icon="chatbubble-ellipses-outline" title="Total" value={tickets.length} />
          <MiniStat icon="time-outline" title="Open" value={openTickets} />
          <MiniStat icon="checkmark-done-outline" title="Closed" value={closedTickets} />
        </View>

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

          <View style={styles.priorityRow}>
            <PriorityChip
              title="LOW"
              active={priority === "LOW"}
              onPress={() => setPriority("LOW")}
            />
            <PriorityChip
              title="MEDIUM"
              active={priority === "MEDIUM"}
              onPress={() => setPriority("MEDIUM")}
            />
            <PriorityChip
              title="HIGH"
              active={priority === "HIGH"}
              onPress={() => setPriority("HIGH")}
            />
          </View>

          <TouchableOpacity
            disabled={saving}
            style={[styles.submitBtn, saving && styles.disabledBtn]}
            onPress={createTicket}
          >
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
          tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticket}>
              <View style={styles.ticketTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketTitle}>{ticket.subject}</Text>
                  <Text style={styles.date}>{safeDate(ticket.createdAt)}</Text>
                </View>

                <View
                  style={[
                    styles.status,
                    ticket.status === "CLOSED" && styles.closedStatus,
                    ticket.priority === "HIGH" && styles.highStatus,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      ticket.status === "CLOSED" && styles.closedText,
                    ]}
                  >
                    {ticket.status || "OPEN"}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketMsg}>{ticket.message || "No message"}</Text>

              <View style={styles.ticketMeta}>
                <Text style={styles.metaText}>Priority: {ticket.priority || "MEDIUM"}</Text>
                <Text style={styles.metaText}>
                  Replies: {ticket.messages?.length || 0}
                </Text>
              </View>

              {!!ticket.messages?.length && (
                <View style={styles.replyList}>
                  {ticket.messages.slice(-3).map((msg: any) => (
                    <View key={msg.id} style={styles.replyBubble}>
                      <Text style={styles.replySender}>
                        {msg.senderRole || "SUPPORT"} • {safeDate(msg.createdAt)}
                      </Text>
                      <Text style={styles.replyMsg}>{msg.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              {ticket.status !== "CLOSED" && (
                <View style={styles.replyBox}>
                  <TextInput
                    value={replyText[ticket.id] || ""}
                    onChangeText={(v) =>
                      setReplyText((prev) => ({ ...prev, [ticket.id]: v }))
                    }
                    placeholder="Add reply..."
                    placeholderTextColor={T.muted}
                    style={styles.replyInput}
                  />

                  <TouchableOpacity
                    disabled={replyingId === ticket.id}
                    style={styles.replyBtn}
                    onPress={() => addReply(ticket.id)}
                  >
                    {replyingId === ticket.id ? (
                      <ActivityIndicator color={T.black} size="small" />
                    ) : (
                      <Icon name="send" size={18} color={T.black} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PriorityChip({ title, active, onPress }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.priorityChip, active && styles.priorityActive]}
      onPress={onPress}
    >
      <Text style={[styles.priorityText, active && styles.priorityTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function MiniStat({ icon, title, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={19} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, padding: 18 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
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
  refreshBtn: {
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

  heroCard: {
    backgroundColor: T.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroLabel: { color: T.muted, fontSize: 13, fontWeight: "800" },
  heroTitle: { color: T.yellow, fontSize: 30, fontWeight: "900", marginTop: 4 },
  heroSub: { color: T.green, fontSize: 12, fontWeight: "800", marginTop: 5 },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  miniValue: { color: T.text, fontWeight: "900", fontSize: 17, marginTop: 8 },
  miniTitle: { color: T.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },

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

  priorityRow: { flexDirection: "row", gap: 9, marginBottom: 12 },
  priorityChip: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.black,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityActive: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  priorityText: { color: T.muted, fontSize: 11, fontWeight: "900" },
  priorityTextActive: { color: T.black },

  submitBtn: {
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledBtn: { opacity: 0.55 },
  submitText: { color: T.black, fontWeight: "900" },

  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },
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
  ticketTitle: { color: T.text, fontWeight: "900", flex: 1, fontSize: 15 },
  ticketMsg: { color: T.muted, marginTop: 8, lineHeight: 19 },
  date: { color: T.muted, marginTop: 4, fontSize: 11 },
  status: {
    backgroundColor: "#102A1B",
    borderColor: "#1F6B3B",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  highStatus: {
    borderColor: "#854D0E",
    backgroundColor: "#2B2207",
  },
  statusText: { color: T.green, fontSize: 10, fontWeight: "900" },
  closedStatus: {
    backgroundColor: "#111827",
    borderColor: "#374151",
  },
  closedText: {
    color: T.muted,
  },
  ticketMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  metaText: {
    color: T.yellow,
    fontSize: 11,
    fontWeight: "900",
  },
  replyList: {
    marginTop: 12,
    gap: 8,
  },
  replyBubble: {
    backgroundColor: T.black,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
  },
  replySender: {
    color: T.yellow,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
  },
  replyMsg: {
    color: T.text,
    fontSize: 12,
    lineHeight: 17,
  },
  replyBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: T.black,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    color: T.text,
    paddingHorizontal: 12,
    height: 44,
    fontWeight: "700",
  },
  replyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
});