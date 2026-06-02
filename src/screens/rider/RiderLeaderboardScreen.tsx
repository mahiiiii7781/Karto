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

export default function RiderLeaderboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [leaders, setLeaders] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await riderService.getLeaderboard();
      setLeaders(res?.leaderboard || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load leaderboard");
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
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </SafeAreaView>
    );
  }

  const topThree = leaders.slice(0, 3);
  const rest = leaders.slice(3);

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
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.sub}>Top performing Karto riders</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        {leaders.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="trophy-outline" size={54} color={T.yellow} />
            <Text style={styles.emptyTitle}>No ranking yet</Text>
            <Text style={styles.emptyText}>Complete deliveries to enter leaderboard.</Text>
          </View>
        ) : (
          <>
            <View style={styles.podium}>
              {topThree.map((item) => (
                <View key={item.rank} style={styles.podiumCard}>
                  <View style={styles.rankCircle}>
                    <Text style={styles.rankText}>#{item.rank}</Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {item.rider?.fullName || "Rider"}
                  </Text>
                  <Text style={styles.podiumEarn}>{money(item.totalEarn)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>All Riders</Text>

            {rest.length === 0 && leaders.length <= 3 ? (
              leaders.map((item) => <LeaderRow key={item.rank} item={item} />)
            ) : (
              rest.map((item) => <LeaderRow key={item.rank} item={item} />)
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LeaderRow({ item }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.smallRank}>
        <Text style={styles.smallRankText}>{item.rank}</Text>
      </View>

      <View style={styles.avatar}>
        <Icon name="person" size={21} color={T.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.rider?.fullName || "Karto Rider"}
        </Text>
        <Text style={styles.vehicle}>
          {item.rider?.vehicleType || "Delivery Partner"}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.earn}>{money(item.totalEarn)}</Text>
        <Text style={styles.today}>Today {money(item.todayEarn)}</Text>
      </View>
    </View>
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

  podium: { flexDirection: "row", gap: 10 },
  podiumCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  rankCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: T.black, fontWeight: "900", fontSize: 15 },
  podiumName: { color: T.text, fontWeight: "900", marginTop: 12, maxWidth: 90 },
  podiumEarn: { color: T.green, fontWeight: "900", marginTop: 5 },

  section: {
    color: T.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  row: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  smallRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  smallRankText: { color: T.yellow, fontWeight: "900" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: T.text, fontWeight: "900" },
  vehicle: { color: T.muted, fontSize: 12, marginTop: 4 },
  earn: { color: T.yellow, fontWeight: "900" },
  today: { color: T.muted, fontSize: 11, marginTop: 3 },
});