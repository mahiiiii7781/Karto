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
  Modal,
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
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  surface: "#F9FAFC",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  green: "#22C55E",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#050807",
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
    value?.transactions ||
    value ||
    [];

  return Array.isArray(list) ? list : [];
};

const normalizeSummary = (value: any): WalletSummary | null => {
  const data =
    value?.data?.summary ||
    value?.data?.wallet ||
    value?.data?.data?.summary ||
    value?.data?.data?.wallet ||
    value?.data?.data ||
    value?.data ||
    value?.summary ||
    value?.wallet ||
    value ||
    null;

  if (!data || Array.isArray(data)) return null;
  return data;
};

const getDate = (date?: string) => {
  if (!date) return "Recently";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeType = (type?: string) => String(type || "CREDIT").toUpperCase();

const isCreditType = (type?: string) => {
  const t = normalizeType(type);

  return [
    "CREDIT",
    "REFUND",
    "REWARD",
    "CASHBACK",
    "BONUS",
    "ORDER_REFUND",
    "WALLET_CREDIT",
    "ADJUSTMENT_CREDIT",
  ].includes(t);
};

const getTxIcon = (type?: string) => {
  const t = normalizeType(type);

  if (["DEBIT", "ORDER_PAYMENT", "PAYMENT", "WALLET_DEBIT"].includes(t)) {
    return "arrow-up-circle-outline";
  }

  if (["REFUND", "ORDER_REFUND"].includes(t)) {
    return "return-down-back-outline";
  }

  if (["REWARD", "CASHBACK", "BONUS"].includes(t)) {
    return "gift-outline";
  }

  if (t.includes("COUPON")) return "pricetag-outline";

  return "arrow-down-circle-outline";
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [txModal, setTxModal] = useState<WalletTransaction | null>(null);

  const isGuest = !user?.id;

  const balance = useMemo(() => {
    return Number(
      summary?.availableBalance ??
        summary?.available_balance ??
        summary?.balance ??
        (summary as any)?.walletBalance ??
        (summary as any)?.wallet_balance ??
        0
    );
  }, [summary]);

  const credits = Number(
    summary?.credits ??
      (summary as any)?.creditAmount ??
      (summary as any)?.credit_amount ??
      (summary as any)?.totalCredits ??
      (summary as any)?.total_credits ??
      0
  );

  const debits = Number(
    (summary as any)?.debits ??
      (summary as any)?.debitAmount ??
      (summary as any)?.debit_amount ??
      (summary as any)?.totalDebits ??
      (summary as any)?.total_debits ??
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

  const creditTxCount = useMemo(
    () => transactions.filter(tx => isCreditType(tx.type)).length,
    [transactions]
  );

  const debitTxCount = useMemo(
    () => transactions.filter(tx => !isCreditType(tx.type)).length,
    [transactions]
  );

  const lastUpdated = useMemo(() => {
    const latest =
      (summary as any)?.updatedAt ||
      (summary as any)?.updated_at ||
      transactions?.[0]?.createdAt ||
      (transactions?.[0] as any)?.created_at;

    return latest ? getDate(latest) : "Just now";
  }, [summary, transactions]);

  const loadWallet = useCallback(
    async (isRefresh = false) => {
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
    },
    [isGuest, refreshing]
  );

  useFocusEffect(
    useCallback(() => {
      loadWallet(false);
    }, [loadWallet])
  );

  const goToLogin = () => {
    navigation.navigate("Auth");
  };

  const goToOrders = () => {
    navigation.navigate("Orders");
  };

  const goToCoupons = () => {
    navigation.navigate("Coupons");
  };

  const goToSupport = () => {
    navigation.navigate("HelpSupport");
  };

  const getTxTitle = (tx: WalletTransaction) => {
    const rawTitle =
      tx.title ||
      (tx as any).name ||
      (tx as any).transactionTitle ||
      (tx as any).transaction_title ||
      tx.type ||
      "Wallet Transaction";

    return String(rawTitle).replaceAll("_", " ");
  };

  const getTxDescription = (tx: WalletTransaction) => {
    return (
      tx.description ||
      (tx as any).note ||
      (tx as any).message ||
      getDate(tx.createdAt || (tx as any).created_at)
    );
  };

  const getTxAmount = (tx: WalletTransaction) => {
    return Number(tx.amount ?? (tx as any).value ?? 0);
  };

  const renderTransaction = (tx: WalletTransaction, index: number) => {
    const credit = isCreditType(tx.type);
    const amount = getTxAmount(tx);
    const txId = tx.id || String(index);

    return (
      <TouchableOpacity
        key={txId}
        style={styles.txRow}
        activeOpacity={0.86}
        onPress={() => setTxModal(tx)}
      >
        <View style={[styles.txIcon, credit ? styles.creditIcon : styles.debitIcon]}>
          <Icon
            name={getTxIcon(tx.type) as any}
            size={22}
            color={credit ? THEME.green : THEME.danger}
          />
        </View>

        <View style={styles.txContent}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {getTxTitle(tx)}
          </Text>
          <Text style={styles.txSub} numberOfLines={1}>
            {getTxDescription(tx)}
          </Text>
        </View>

        <View style={styles.txRight}>
          <Text style={[styles.txAmount, !credit && styles.txDebit]}>
            {credit ? "+" : "-"}
            {money(amount)}
          </Text>
          <Text style={styles.txDate}>
            {getDate(tx.createdAt || (tx as any).created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.screen}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.blue} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Wallet</Text>
            <Text style={styles.subtitle}>Login to view credits and refunds</Text>
          </View>
        </View>

        <View style={styles.guestBox}>
          <View style={styles.guestIcon}>
            <Icon name="wallet-outline" size={48} color={THEME.orange} />
          </View>

          <Text style={styles.guestTitle}>Login required</Text>
          <Text style={styles.guestText}>
            Sign in to access wallet balance, refunds, credits and reward activity.
          </Text>

          <TouchableOpacity style={styles.loginBtn} onPress={goToLogin} activeOpacity={0.9}>
            <Text style={styles.loginText}>Login / Sign up</Text>
            <Icon name="arrow-forward" size={19} color={THEME.white} />
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
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWallet(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.blue} />
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
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Icon name="refresh" size={20} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceGlowOne} />
          <View style={styles.balanceGlowTwo} />

          <View style={styles.balanceTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletTag}>KARTO WALLET</Text>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balance}>{money(balance)}</Text>
              <Text style={styles.balanceSub}>
                Wallet balance can be used for future Karto orders.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.walletIcon}
              activeOpacity={0.86}
              onPress={() => setInfoModalVisible(true)}
            >
              <Icon name="wallet" size={35} color={THEME.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceFooter}>
            <SmallStat
              icon="add-circle-outline"
              label="Credits"
              value={money(credits)}
              color={THEME.green}
            />
            <SmallStat
              icon="remove-circle-outline"
              label="Debits"
              value={money(debits)}
              color={THEME.danger}
            />
            <SmallStat
              icon="return-down-back-outline"
              label="Refunds"
              value={money(refunds)}
              color={THEME.yellow}
            />
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="receipt-outline" label="Orders" color={THEME.orange} onPress={goToOrders} />
          <QuickAction icon="pricetag-outline" label="Coupons" color={THEME.yellow} onPress={goToCoupons} />
          <QuickAction icon="headset-outline" label="Support" color={THEME.green} onPress={goToSupport} />
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="arrow-down-circle-outline"
            label="Credit Txn"
            value={String(creditTxCount)}
            color={THEME.green}
          />
          <SummaryCard
            icon="arrow-up-circle-outline"
            label="Debit Txn"
            value={String(debitTxCount)}
            color={THEME.danger}
          />
          <SummaryCard
            icon="gift-outline"
            label="Rewards"
            value={String(rewards.toFixed(0))}
            color={THEME.purple}
          />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Use Wallet</Text>

          <TouchableOpacity style={styles.row} onPress={goToOrders} activeOpacity={0.85}>
            <View style={styles.iconBox}>
              <Icon name="receipt-outline" size={21} color={THEME.orange} />
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
              <Text style={styles.rowSub}>UPI, cards, wallets and COD are handled at checkout</Text>
            </View>

            <View style={styles.activePill}>
              <Text style={styles.activeText}>Checkout</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rowLast} onPress={() => setInfoModalVisible(true)}>
            <View style={styles.iconBoxBlue}>
              <Icon name="information-circle-outline" size={21} color={THEME.blue} />
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Wallet Rules</Text>
              <Text style={styles.rowSub}>How credits, refunds and rewards work</Text>
            </View>

            <Icon name="chevron-forward" size={20} color={THEME.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitleNoMargin}>Recent Activity</Text>
              <Text style={styles.updatedText}>Updated {lastUpdated}</Text>
            </View>

            <Text style={styles.txCount}>
              {transactions.length} txn{transactions.length === 1 ? "" : "s"}
            </Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Icon name="receipt-outline" size={42} color={THEME.orange} />
              </View>

              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>
                Refunds, wallet credits and reward activity will appear here.
              </Text>

              <TouchableOpacity style={styles.emptyBtn} onPress={goToOrders} activeOpacity={0.9}>
                <Text style={styles.emptyBtnText}>View Orders</Text>
                <Icon name="arrow-forward" size={17} color={THEME.white} />
              </TouchableOpacity>
            </View>
          ) : (
            transactions.map(renderTransaction)
          )}
        </View>
      </ScrollView>

      <WalletInfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
      />

      <TransactionModal tx={txModal} onClose={() => setTxModal(null)} />
    </View>
  );
}

const SmallStat = ({ icon, label, value, color }: any) => (
  <View style={styles.smallStat}>
    <View style={[styles.statIcon, { backgroundColor: `${color}16` }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={styles.smallLabel}>{label}</Text>
    <Text style={styles.smallValue}>{value}</Text>
  </View>
);

const QuickAction = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.86}>
    <View style={[styles.quickIcon, { backgroundColor: `${color}16` }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

const SummaryCard = ({ icon, label, value, color }: any) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIcon, { backgroundColor: `${color}16` }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const WalletInfoModal = ({ visible, onClose }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <View style={styles.modalIcon}>
          <Icon name="wallet-outline" size={32} color={THEME.orange} />
        </View>

        <Text style={styles.modalTitle}>Wallet Rules</Text>
        <Text style={styles.modalSub}>
          Karto wallet keeps your refunds, credits and rewards safely in one place.
        </Text>

        <View style={styles.rulesBox}>
          <InfoLine icon="return-down-back-outline" text="Refunds from eligible cancelled orders are credited here." />
          <InfoLine icon="gift-outline" text="Rewards and cashback may be added as wallet credits." />
          <InfoLine icon="cart-outline" text="Wallet balance can be used in checkout when wallet payment is enabled." />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const TransactionModal = ({ tx, onClose }: any) => {
  if (!tx) return null;

  const credit = isCreditType(tx.type);
  const amount = Number(tx.amount ?? tx.value ?? 0);

  return (
    <Modal visible={!!tx} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={[styles.modalIcon, { backgroundColor: credit ? "#EAFBF1" : "#FFF1F1" }]}>
            <Icon
              name={getTxIcon(tx.type) as any}
              size={32}
              color={credit ? THEME.green : THEME.danger}
            />
          </View>

          <Text style={styles.modalTitle}>
            {String(tx.title || tx.type || "Wallet Transaction").replaceAll("_", " ")}
          </Text>

          <Text style={[styles.txModalAmount, !credit && { color: THEME.danger }]}>
            {credit ? "+" : "-"}
            {money(amount)}
          </Text>

          <View style={styles.rulesBox}>
            <InfoLine icon="calendar-outline" text={getDate(tx.createdAt || tx.created_at)} />
            <InfoLine icon="reader-outline" text={tx.description || tx.note || "Wallet activity"} />
            <InfoLine icon="shield-checkmark-outline" text={`Type: ${String(tx.type || "CREDIT").replaceAll("_", " ")}`} />
          </View>

          <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const InfoLine = ({ icon, text }: any) => (
  <View style={styles.infoLine}>
    <View style={styles.infoLineIcon}>
      <Icon name={icon} size={18} color={THEME.orange} />
    </View>
    <Text style={styles.infoLineText}>{text}</Text>
  </View>
);

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
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
    borderRadius: 16,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  disabled: {
    opacity: 0.65,
  },
  title: {
    color: THEME.blue,
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
    overflow: "hidden",
    ...shadow,
  },
  balanceGlowOne: {
    position: "absolute",
    right: -56,
    top: -56,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,77,24,0.12)",
  },
  balanceGlowTwo: {
    position: "absolute",
    left: -60,
    bottom: -65,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(34,197,94,0.10)",
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletTag: {
    color: THEME.orange,
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
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
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
    backgroundColor: THEME.surface,
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
  },
  smallLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  smallValue: {
    color: THEME.blue,
    fontWeight: "900",
    marginTop: 4,
    fontSize: 13,
  },
  quickRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: {
    color: THEME.blue,
    marginTop: 7,
    fontWeight: "900",
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    ...shadow,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    color: THEME.blue,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 7,
  },
  summaryLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
    textAlign: "center",
  },
  actionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    ...shadow,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 15,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionTitleNoMargin: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
  },
  updatedText: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  txCount: {
    color: THEME.orange,
    fontSize: 12,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  rowLast: {
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
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBoxYellow: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFF7E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBoxBlue: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#E9F5FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orangeSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  activeText: {
    color: THEME.orange,
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
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.blue,
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
  emptyBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  emptyBtnText: {
    color: THEME.white,
    fontWeight: "900",
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  creditIcon: {
    backgroundColor: "#EAFBF1",
  },
  debitIcon: {
    backgroundColor: "#FFF1F1",
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "capitalize",
  },
  txSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  txRight: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  txAmount: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 14,
  },
  txDebit: {
    color: THEME.danger,
  },
  txDate: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
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
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  guestTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  loginText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 15,
  },
  browseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  browseText: {
    color: THEME.orange,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  modalIcon: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "capitalize",
  },
  modalSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  rulesBox: {
    alignSelf: "stretch",
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    gap: 12,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLineIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLineText: {
    flex: 1,
    color: THEME.blue,
    fontWeight: "800",
    lineHeight: 18,
  },
  modalBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  modalBtnText: {
    color: THEME.white,
    fontWeight: "900",
  },
  txModalAmount: {
    color: THEME.green,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 10,
  },
});
