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

export default function RiderEarningsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [total, setTotal] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [earnings, setEarnings] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getTodayEarnings();
      setTotal(Number(res?.total || 0));
      setTotalOrders(Number(res?.totalOrders || 0));
      setEarnings(res?.earnings || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load earnings");
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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
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
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.sub}>Today’s delivery income</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Today Earned</Text>
          <Text style={styles.heroAmount}>{money(total)}</Text>

          <View style={styles.heroBottom}>
            <MiniStat icon="cube-outline" label="Orders" value={totalOrders} />
            <MiniStat icon="trending-up-outline" label="Avg/order" value={money(totalOrders ? total / totalOrders : 0)} />
          </View>
        </View>

        <Text style={styles.section}>Earning Timeline</Text>

        {earnings.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="cash-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>Complete deliveries to see earnings here.</Text>
          </View>
        ) : (
          earnings.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon name="checkmark-done-outline" size={21} color={T.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.note || "Delivery earning"}</Text>
                <Text style={styles.rowSub}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>

              <Text style={styles.amount}>{money(item.amount)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ icon, label, value }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={18} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 14,
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

  hero: {
    backgroundColor: T.card,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  heroLabel: { color: T.yellow, fontWeight: "900", fontSize: 13 },
  heroAmount: { color: T.text, fontSize: 44, fontWeight: "900", marginTop: 8 },
  heroBottom: { flexDirection: "row", gap: 12, marginTop: 18 },

  miniStat: {
    flex: 1,
    backgroundColor: T.black,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
  },
  miniValue: { color: T.text, fontWeight: "900", fontSize: 16, marginTop: 6 },
  miniLabel: { color: T.muted, fontSize: 12, marginTop: 3 },

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

  row: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0D2C1A",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: T.text, fontWeight: "900" },
  rowSub: { color: T.muted, fontSize: 12, marginTop: 4 },
  amount: { color: T.yellow, fontWeight: "900", fontSize: 16 },
});