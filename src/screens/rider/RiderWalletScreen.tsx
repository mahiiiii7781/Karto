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

export default function RiderWalletScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const [wallet, setWallet] = useState<any>({});
  const [coupons, setCoupons] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadData = useCallback(async () => {
    try {
      const [walletRes, couponsRes] = await Promise.all([
        riderService.getWallet(),
        riderService.getCoupons(),
      ]);

      setWallet(walletRes?.wallet || {});
      setCoupons(couponsRes?.coupons || []);
    } catch (e: any) {
      showToast(e?.message || "Failed to load wallet");
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
        <Text style={styles.loadingText}>Opening rider wallet...</Text>
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
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.sub}>Earnings, balance and rewards</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.yellow} />
        }
      >
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <Text style={styles.balance}>{money(wallet?.balance)}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Icon name="wallet" size={30} color={T.black} />
            </View>
          </View>

          <View style={styles.walletStats}>
            <WalletStat label="Today Earn" value={money(wallet?.todayEarn)} />
            <WalletStat label="Total Earn" value={money(wallet?.totalEarn)} />
          </View>
        </View>

        <Text style={styles.section}>Reward Coupons</Text>

        {coupons.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="gift-outline" size={50} color={T.yellow} />
            <Text style={styles.emptyTitle}>No coupons yet</Text>
            <Text style={styles.emptyText}>Complete deliveries to unlock rider coupons.</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <Icon name="ticket-outline" size={28} color={T.yellow} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.couponTitle}>{coupon.title || "Rider Reward"}</Text>
                <Text style={styles.couponMsg}>{coupon.message || "Delivery reward unlocked"}</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{coupon.code}</Text>
                </View>
              </View>

              <Text style={styles.couponAmount}>{money(coupon.amount)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletStat({ label, value }: any) {
  return (
    <View style={styles.walletStat}>
      <Text style={styles.walletStatLabel}>{label}</Text>
      <Text style={styles.walletStatValue}>{value}</Text>
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

  walletCard: {
    backgroundColor: T.yellow,
    borderRadius: 32,
    padding: 20,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: { color: T.black, fontWeight: "900", opacity: 0.72 },
  balance: { color: T.black, fontSize: 44, fontWeight: "900", marginTop: 8 },
  walletIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletStats: { flexDirection: "row", gap: 12, marginTop: 22 },
  walletStat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 18,
    padding: 13,
  },
  walletStatLabel: { color: T.black, fontSize: 12, fontWeight: "800", opacity: 0.72 },
  walletStatValue: { color: T.black, fontSize: 18, fontWeight: "900", marginTop: 5 },

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

  couponCard: {
    backgroundColor: T.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  couponLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  couponTitle: { color: T.text, fontWeight: "900", fontSize: 15 },
  couponMsg: { color: T.muted, fontSize: 12, marginTop: 4 },
  codeBox: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: T.black,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.border,
  },
  codeText: { color: T.yellow, fontSize: 11, fontWeight: "900" },
  couponAmount: { color: T.green, fontWeight: "900", fontSize: 16 },
});