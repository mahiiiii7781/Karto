import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  walletService,
  WalletSummary,
  WalletTransaction,
} from "@/services/api/walletService";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#041008",
  danger: "#EF4444",
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWallet(false);
    }, [])
  );

  const loadWallet = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    const [summaryRes, txRes] = await Promise.all([
      walletService.getWalletSummary(),
      walletService.getTransactions(),
    ]);

    setSummary(summaryRes.data || null);
    setTransactions(Array.isArray(txRes.data) ? txRes.data : []);

    setLoading(false);
    setRefreshing(false);
  };

  const balance = useMemo(() => {
    return Number(
      summary?.availableBalance ??
        summary?.available_balance ??
        summary?.balance ??
        0
    );
  }, [summary]);

  const credits = Number(summary?.credits ?? 0);
  const refunds = Number(summary?.refunds ?? 0);
  const rewards = Number(summary?.rewards ?? 0);

  const formatDate = (date?: string) => {
    if (!date) return "Recently";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTxIcon = (type?: string) => {
    const t = String(type || "").toUpperCase();

    if (t === "DEBIT") return "arrow-up-circle-outline";
    if (t === "REFUND") return "return-down-back-outline";
    if (t === "REWARD") return "gift-outline";

    return "arrow-down-circle-outline";
  };

  const isCredit = (type?: string) => {
    const t = String(type || "").toUpperCase();
    return ["CREDIT", "REFUND", "REWARD"].includes(t);
  };

  const openAddMoney = () => {
    Alert.alert("Coming Soon", "Add money will be enabled after wallet payment setup.");
  };

  const openOnlinePayments = () => {
    Alert.alert("Available in Checkout", "You can pay online while placing an order.");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 34 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWallet(true)}
            tintColor={THEME.green}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.green} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>Manage refunds, credits and rewards</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadWallet(true)}>
            <Icon name="refresh" size={20} color={THEME.green} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balance}>₹{balance.toFixed(2)}</Text>
              <Text style={styles.balanceSub}>Use wallet money on future orders</Text>
            </View>

            <View style={styles.walletIcon}>
              <Icon name="wallet-outline" size={34} color={THEME.green} />
            </View>
          </View>

          <View style={styles.balanceFooter}>
            <View style={styles.smallStat}>
              <Text style={styles.smallLabel}>Credits</Text>
              <Text style={styles.smallValue}>₹{credits.toFixed(0)}</Text>
            </View>

            <View style={styles.smallStat}>
              <Text style={styles.smallLabel}>Refunds</Text>
              <Text style={styles.smallValue}>₹{refunds.toFixed(0)}</Text>
            </View>

            <View style={styles.smallStat}>
              <Text style={styles.smallLabel}>Rewards</Text>
              <Text style={styles.smallValue}>{rewards.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openAddMoney}>
            <View style={styles.actionIcon}>
              <Icon name="add-circle-outline" size={24} color={THEME.green} />
            </View>
            <Text style={styles.actionText}>Add Money</Text>
            <Text style={styles.actionSub}>Coming soon</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={openOnlinePayments}>
            <View style={styles.actionIcon}>
              <Icon name="card-outline" size={24} color={THEME.green} />
            </View>
            <Text style={styles.actionText}>Online Pay</Text>
            <Text style={styles.actionSub}>UPI/Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Payment Options</Text>

          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Icon name="cash-outline" size={21} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Cash on Delivery</Text>
              <Text style={styles.rowSub}>Pay when your order arrives</Text>
            </View>

            <View style={styles.activePill}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.row} onPress={openOnlinePayments}>
            <View style={styles.iconBox}>
              <Icon name="card-outline" size={21} color={THEME.green} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Cards, UPI & Wallets</Text>
              <Text style={styles.rowSub}>Pay securely through Razorpay checkout</Text>
            </View>

            <Icon name="chevron-forward" size={20} color={THEME.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.txCount}>{transactions.length} txns</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Icon name="receipt-outline" size={44} color={THEME.green} />
              </View>

              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                Refunds, credits and wallet usage will appear here.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const credit = isCredit(tx.type);
              const amount = Number(tx.amount || 0);

              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txIcon}>
                    <Icon
                      name={getTxIcon(tx.type) as any}
                      size={22}
                      color={credit ? THEME.green : THEME.danger}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      {tx.title || tx.type || "Wallet Transaction"}
                    </Text>
                    <Text style={styles.txSub}>
                      {tx.description || formatDate(tx.createdAt || tx.created_at)}
                    </Text>
                  </View>

                  <Text style={[styles.txAmount, !credit && styles.txDebit]}>
                    {credit ? "+" : "-"}₹{amount.toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },

  subtitle: {
    color: THEME.muted,
    marginTop: 4,
  },

  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  balanceLabel: { color: THEME.muted, fontWeight: "700" },

  balance: {
    color: THEME.green,
    fontSize: 39,
    fontWeight: "900",
    marginTop: 8,
  },

  balanceSub: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 12,
  },

  walletIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  balanceFooter: {
    flexDirection: "row",
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 10,
  },

  smallStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 11,
  },

  smallLabel: { color: THEME.muted, fontSize: 12 },

  smallValue: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 4,
  },

  actionRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },

  actionBtn: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 8,
  },

  actionSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 2,
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },

  txCount: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rowTitle: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
  },

  rowSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
  },

  activePill: {
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },

  activeText: {
    color: THEME.green,
    fontSize: 11,
    fontWeight: "900",
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },

  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingVertical: 13,
  },

  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  txTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 14,
  },

  txSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
  },

  txAmount: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 14,
  },

  txDebit: {
    color: THEME.danger,
  },
});