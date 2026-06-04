import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import {
  walletService,
  WalletSummary,
  WalletTransaction,
} from "@/services/api/walletService";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  greenDark: "#16A34A",
  yellow: "#FACC15",
  orange: "#FB923C",
  blue: "#38BDF8",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
  danger: "#EF4444",
};

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const showToast = (
  type: "success" | "error" | "info",
  text1: string,
  text2?: string
) => {
  Toast.show({
    type,
    text1,
    text2,
    position: "bottom",
    visibilityTime: 1900,
  });
};

const normalizeList = (value: any): WalletTransaction[] => {
  const list =
    value?.data?.transactions ||
    value?.data?.data?.transactions ||
    value?.data?.data ||
    value?.data ||
    [];

  return Array.isArray(list) ? list : [];
};

const normalizeSummary = (value: any): WalletSummary | null => {
  return (
    value?.data?.summary ||
    value?.data?.wallet ||
    value?.data?.data?.summary ||
    value?.data?.data?.wallet ||
    value?.data?.data ||
    value?.data ||
    null
  );
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isGuest = !user?.id;

  const balance = useMemo(() => {
    return Number(
      summary?.availableBalance ??
        summary?.available_balance ??
        summary?.balance ??
        0
    );
  }, [summary]);

  const credits = Number(
    summary?.credits ??
      (summary as any)?.creditAmount ??
      (summary as any)?.credit_amount ??
      0
  );

  const refunds = Number(
    summary?.refunds ??
      (summary as any)?.refundAmount ??
      (summary as any)?.refund_amount ??
      0
  );

  const rewards = Number(
    summary?.rewards ??
      (summary as any)?.rewardPoints ??
      (summary as any)?.reward_points ??
      0
  );

  useFocusEffect(
    useCallback(() => {
      loadWallet(false);
    }, [user?.id])
  );

  const loadWallet = async (isRefresh = false) => {
    if (isGuest) {
      setSummary(null);
      setTransactions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (refreshing && isRefresh) return;

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const [summaryRes, txRes] = await Promise.allSettled([
        walletService.getWalletSummary(),
        walletService.getTransactions(),
      ]);

      if (summaryRes.status === "fulfilled" && !summaryRes.value?.error) {
        setSummary(normalizeSummary(summaryRes.value));
      } else {
        setSummary(null);
      }

      if (txRes.status === "fulfilled" && !txRes.value?.error) {
        setTransactions(normalizeList(txRes.value));
      } else {
        setTransactions([]);
      }

      if (isRefresh) {
        showToast("success", "Wallet refreshed", "Latest wallet details updated.");
      }
    } catch {
      setSummary(null);
      setTransactions([]);
      showToast("error", "Unable to load wallet", "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

    if (["DEBIT", "ORDER_PAYMENT", "PAYMENT"].includes(t)) {
      return "arrow-up-circle-outline";
    }

    if (["REFUND", "ORDER_REFUND"].includes(t)) {
      return "return-down-back-outline";
    }

    if (["REWARD", "CASHBACK", "BONUS"].includes(t)) {
      return "gift-outline";
    }

    return "arrow-down-circle-outline";
  };

  const isCredit = (type?: string) => {
    const t = String(type || "").toUpperCase();
    return ["CREDIT", "REFUND", "REWARD", "CASHBACK", "BONUS", "ORDER_REFUND"].includes(t);
  };

  const goToLogin = () => {
    navigation.navigate("Auth");
  };

  const goToOrders = () => {
    navigation.navigate("Orders");
  };

  const renderTransaction = (tx: WalletTransaction, index: number) => {
    const credit = isCredit(tx.type);
    const amount = Number(tx.amount || 0);
    const txTitle = tx.title || tx.type || "Wallet Transaction";
    const txSub =
      tx.description || formatDate(tx.createdAt || (tx as any).created_at);

    return (
      <View key={tx.id || String(index)} style={styles.txRow}>
        <View style={[styles.txIcon, credit ? styles.creditIcon : styles.debitIcon]}>
          <Icon
            name={getTxIcon(tx.type) as any}
            size={22}
            color={credit ? THEME.green : THEME.danger}
          />
        </View>

        <View style={styles.txContent}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {txTitle}
          </Text>
          <Text style={styles.txSub} numberOfLines={1}>
            {txSub}
          </Text>
        </View>

        <Text style={[styles.txAmount, !credit && styles.txDebit]}>
          {credit ? "+" : "-"}
          {money(amount)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>Login to view credits and refunds</Text>
          </View>
        </View>

        <View style={styles.guestBox}>
          <View style={styles.guestIcon}>
            <Icon name="wallet-outline" size={44} color={THEME.yellow} />
          </View>

          <Text style={styles.guestTitle}>Login required</Text>
          <Text style={styles.guestText}>
            Sign in to access wallet balance, refunds, credits and reward activity.
          </Text>

          <TouchableOpacity style={styles.loginBtn} onPress={goToLogin} activeOpacity={0.9}>
            <Text style={styles.loginText}>Login / Sign up</Text>
            <Icon name="arrow-forward" size={19} color={THEME.black} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.browseText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWallet(true)}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>Refunds, credits and rewards</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, refreshing && styles.disabled]}
            onPress={() => loadWallet(true)}
            disabled={refreshing}
            activeOpacity={0.85}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={THEME.black} />
            ) : (
              <Icon name="refresh" size={20} color={THEME.black} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceGlow} />

          <View style={styles.balanceTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletTag}>KARTO WALLET</Text>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balance}>{money(balance)}</Text>
              <Text style={styles.balanceSub}>
                Wallet balance can be used for future Karto orders.
              </Text>
            </View>

            <View style={styles.walletIcon}>
              <Icon name="wallet" size={35} color={THEME.black} />
            </View>
          </View>

          <View style={styles.balanceFooter}>
            <View style={styles.smallStat}>
              <View style={[styles.statIcon, { backgroundColor: "#102116" }]}>
                <Icon name="add-circle-outline" size={18} color={THEME.green} />
              </View>
              <Text style={styles.smallLabel}>Credits</Text>
              <Text style={styles.smallValue}>{money(credits)}</Text>
            </View>

            <View style={styles.smallStat}>
              <View style={[styles.statIcon, { backgroundColor: "#252109" }]}>
                <Icon name="return-down-back-outline" size={18} color={THEME.yellow} />
              </View>
              <Text style={styles.smallLabel}>Refunds</Text>
              <Text style={styles.smallValue}>{money(refunds)}</Text>
            </View>

            <View style={styles.smallStat}>
              <View style={[styles.statIcon, { backgroundColor: "#111827" }]}>
                <Icon name="gift-outline" size={18} color={THEME.blue} />
              </View>
              <Text style={styles.smallLabel}>Rewards</Text>
              <Text style={styles.smallValue}>{rewards.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Use Wallet</Text>

          <TouchableOpacity style={styles.row} onPress={goToOrders} activeOpacity={0.85}>
            <View style={styles.iconBox}>
              <Icon name="receipt-outline" size={21} color={THEME.green} />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Order Refunds</Text>
              <Text style={styles.rowSub}>Refunds from cancelled orders appear here</Text>
            </View>

            <Icon name="chevron-forward" size={20} color={THEME.muted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.iconBoxYellow}>
              <Icon name="card-outline" size={21} color={THEME.yellow} />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Online Payment</Text>
              <Text style={styles.rowSub}>Pay securely using UPI, cards or COD at checkout</Text>
            </View>

            <View style={styles.activePill}>
              <Text style={styles.activeText}>Checkout</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.txCount}>
              {transactions.length} txn{transactions.length === 1 ? "" : "s"}
            </Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Icon name="receipt-outline" size={42} color={THEME.yellow} />
              </View>

              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                Refunds, wallet credits and reward activity will appear here.
              </Text>
            </View>
          ) : (
            transactions.map(renderTransaction)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 34,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 17,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.65,
  },
  title: {
    color: THEME.text,
    fontSize: 29,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  balanceGlow: {
    position: "absolute",
    right: -56,
    top: -56,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(250,204,21,0.18)",
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletTag: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 9,
  },
  balanceLabel: {
    color: THEME.muted,
    fontWeight: "800",
  },
  balance: {
    color: THEME.green,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 7,
  },
  balanceSub: {
    color: THEME.muted,
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  walletIcon: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  balanceFooter: {
    flexDirection: "row",
    marginTop: 22,
    gap: 10,
  },
  smallStat: {
    flex: 1,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 11,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  smallLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  smallValue: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 4,
    fontSize: 13,
  },
  actionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
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
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBoxYellow: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
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
    lineHeight: 17,
    fontWeight: "700",
  },
  activePill: {
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  activeText: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 32,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 13,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    fontWeight: "700",
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  creditIcon: {
    backgroundColor: "#102116",
    borderColor: "#20462C",
  },
  debitIcon: {
    backgroundColor: "#1B0E0E",
    borderColor: "#3F1717",
  },
  txContent: {
    flex: 1,
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
    fontWeight: "700",
  },
  txAmount: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 10,
  },
  txDebit: {
    color: THEME.danger,
  },
  guestBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  guestIcon: {
    width: 106,
    height: 106,
    borderRadius: 38,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 18,
  },
  guestText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  loginBtn: {
    marginTop: 24,
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 15,
  },
  browseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  browseText: {
    color: THEME.yellow,
    fontWeight: "900",
  },
});
