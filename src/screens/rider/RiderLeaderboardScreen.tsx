import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  card2: "#0D120F",
  black: "#030504",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

const medalIcon = (rank: number) => {
  if (rank === 1) return "trophy";
  if (rank === 2) return "medal-outline";
  if (rank === 3) return "ribbon-outline";
  return "person";
};

const getRankLabel = (rank: number) => {
  if (rank === 1) return "Champion";
  if (rank === 2) return "Runner Up";
  if (rank === 3) return "Top Performer";
  return "Delivery Partner";
};

export default function RiderLeaderboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [leaders, setLeaders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({});
  const [wallet, setWallet] = useState<any>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const [leaderRes, profileRes, analyticsRes, walletRes] = await Promise.all([
        riderService.getLeaderboard(),
        riderService.getProfile(),
        riderService.getAnalytics(),
        riderService.getWallet(),
      ]);

      if (leaderRes?.error) {
        setLeaders([]);
        showToast(leaderRes?.error?.message || "Failed to load leaderboard");
        return;
      }

      setLeaders(leaderRes?.data || []);
      setProfile(profileRes?.data || null);
      setAnalytics(analyticsRes?.data || {});
      setWallet(walletRes?.data?.wallet || walletRes?.data || {});
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

  const topThree = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const myRank = useMemo(() => {
    return leaders.find((x) => x?.rider?.id === profile?.id) || null;
  }, [leaders, profile]);

  const totalToday = leaders.reduce(
    (sum, item) => sum + Number(item?.todayEarn || 0),
    0
  );

  const totalAllTime = leaders.reduce(
    (sum, item) => sum + Number(item?.totalEarn || 0),
    0
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
        >
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.sub}>Top performing Karto riders</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
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
            <Text style={styles.emptyText}>
              Complete deliveries to enter leaderboard.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Your Rank</Text>
                <Text style={styles.heroRank}>
                  {myRank ? `#${myRank.rank}` : "#-"}
                </Text>
                <Text style={styles.heroSub}>
                  Today {money(wallet?.todayEarn || analytics?.todayEarnings)} •
                  Total {money(wallet?.totalEarn || analytics?.totalEarnings)}
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="trophy" size={30} color={T.black} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <MiniStat
                icon="people-outline"
                title="Riders"
                value={leaders.length}
              />
              <MiniStat
                icon="cash-outline"
                title="Today Pool"
                value={money(totalToday)}
              />
              <MiniStat
                icon="trending-up-outline"
                title="Total Pool"
                value={money(totalAllTime)}
              />
            </View>

            <Text style={styles.section}>Top 3 Riders</Text>

            <View style={styles.podium}>
              {topThree.map((item) => {
                const isMe = item?.rider?.id === profile?.id;

                return (
                  <View
                    key={item.rank}
                    style={[
                      styles.podiumCard,
                      item.rank === 1 && styles.firstPodium,
                      isMe && styles.meCard,
                    ]}
                  >
                    <View
                      style={[
                        styles.rankCircle,
                        item.rank === 1 && styles.firstRankCircle,
                      ]}
                    >
                      <Icon
                        name={medalIcon(item.rank)}
                        size={21}
                        color={T.black}
                      />
                      <Text style={styles.rankText}>#{item.rank}</Text>
                    </View>

                    <Text style={styles.podiumName} numberOfLines={1}>
                      {item.rider?.fullName || "Rider"}
                    </Text>

                    <Text style={styles.podiumRole}>
                      {getRankLabel(item.rank)}
                    </Text>

                    <Text style={styles.podiumEarn}>{money(item.totalEarn)}</Text>
                    <Text style={styles.podiumToday}>
                      Today {money(item.todayEarn)}
                    </Text>

                    {isMe && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youText}>YOU</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.section}>All Riders</Text>

            {rest.length === 0 && leaders.length <= 3
              ? leaders.map((item) => (
                  <LeaderRow
                    key={item.rank}
                    item={item}
                    isMe={item?.rider?.id === profile?.id}
                  />
                ))
              : rest.map((item) => (
                  <LeaderRow
                    key={item.rank}
                    item={item}
                    isMe={item?.rider?.id === profile?.id}
                  />
                ))}
          </>
        )}

        <View style={{ height: 34 }} />
      </ScrollView>
    </SafeAreaView>
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

function LeaderRow({ item, isMe }: any) {
  return (
    <View style={[styles.row, isMe && styles.meRow]}>
      <View style={[styles.smallRank, isMe && styles.meRank]}>
        <Text style={[styles.smallRankText, isMe && styles.meRankText]}>
          {item.rank}
        </Text>
      </View>

      <View style={styles.avatar}>
        <Icon name="person" size={21} color={T.yellow} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.rider?.fullName || "Karto Rider"}
        </Text>
        <Text style={styles.vehicle}>
          {item.rider?.vehicleType ||
            item.rider?.vehicleNo ||
            "Delivery Partner"}
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
  heroLabel: {
    color: T.muted,
    fontWeight: "800",
    fontSize: 13,
  },
  heroRank: {
    color: T.yellow,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSub: {
    color: T.green,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 24,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  miniStat: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  miniValue: {
    color: T.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 8,
  },
  miniTitle: {
    color: T.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },

  podium: { flexDirection: "row", gap: 10 },
  podiumCard: {
    flex: 1,
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    minHeight: 176,
  },
  firstPodium: {
    borderColor: T.yellow,
    backgroundColor: "#151407",
  },
  meCard: {
    borderColor: T.green,
  },
  rankCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  firstRankCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  rankText: { color: T.black, fontWeight: "900", fontSize: 12, marginTop: 1 },
  podiumName: {
    color: T.text,
    fontWeight: "900",
    marginTop: 12,
    maxWidth: 90,
  },
  podiumRole: {
    color: T.muted,
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
  },
  podiumEarn: { color: T.green, fontWeight: "900", marginTop: 7 },
  podiumToday: { color: T.muted, fontSize: 10, marginTop: 3 },

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
  meRow: {
    borderColor: T.green,
    backgroundColor: "#0C1510",
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
  meRank: {
    backgroundColor: T.yellow,
    borderColor: T.yellow,
  },
  smallRankText: { color: T.yellow, fontWeight: "900" },
  meRankText: { color: T.black },
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
  youBadge: {
    backgroundColor: T.green,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },
  youText: { color: T.black, fontSize: 10, fontWeight: "900" },
});