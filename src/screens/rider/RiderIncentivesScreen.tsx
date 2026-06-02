import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

export default function RiderIncentivesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [incentives, setIncentives] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getIncentives();
      setIncentives(res?.incentives || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load incentives");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading incentives...</Text>
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
          <Text style={styles.title}>Incentives</Text>
          <Text style={styles.sub}>Targets, bonuses and rider rewards</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={T.yellow}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        {incentives.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="ribbon-outline" size={54} color={T.yellow} />
            <Text style={styles.emptyTitle}>No incentives yet</Text>
            <Text style={styles.emptyText}>
              Admin assigned targets and bonuses will appear here.
            </Text>
          </View>
        ) : (
          incentives.map((item) => {
            const completed = Number(item.completedOrders || 0);
            const target = Number(item.targetOrders || 1);
            const percent = Math.min(100, Math.round((completed / target) * 100));

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.iconCircle}>
                    <Icon
                      name={item.isCompleted ? "trophy" : "rocket-outline"}
                      size={24}
                      color={T.yellow}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.title || "Rider Bonus"}</Text>
                    <Text style={styles.date}>
                      {new Date(item.startDate).toLocaleDateString()} -{" "}
                      {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>

                  <Text style={styles.amount}>{money(item.amount)}</Text>
                </View>

                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {completed}/{target} orders completed
                  </Text>
                  <Text style={styles.progressText}>{percent}%</Text>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>

                <View style={item.isCompleted ? styles.doneBadge : styles.liveBadge}>
                  <Text style={item.isCompleted ? styles.doneText : styles.liveText}>
                    {item.isCompleted ? "COMPLETED" : "ACTIVE TARGET"}
                  </Text>
                </View>
              </View>
            );
          })
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
  empty: {
    marginTop: 60,
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 32,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  emptyTitle: { color: T.text, fontWeight: "900", fontSize: 18, marginTop: 12 },
  emptyText: { color: T.muted, marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: T.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: T.text, fontWeight: "900", fontSize: 16 },
  date: { color: T.muted, marginTop: 4, fontSize: 12 },
  amount: { color: T.yellow, fontWeight: "900", fontSize: 18 },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  progressText: { color: T.muted, fontSize: 12, fontWeight: "800" },
  progressBar: {
    height: 10,
    backgroundColor: T.black,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 9,
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.green,
    borderRadius: 20,
  },
  liveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#2B2207",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 14,
  },
  liveText: { color: T.yellow, fontSize: 10, fontWeight: "900" },
  doneBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0D2C1A",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 14,
  },
  doneText: { color: T.green, fontSize: 10, fontWeight: "900" },
});