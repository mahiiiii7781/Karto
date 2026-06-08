import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { vendorService, VendorPayments } from "@/services/api/vendorService";

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  card3: "#0B100B",
  yellow: "#F6C343",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  warning: "#F59E0B",
};

type SettlementStatus = "ALL" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | string;
type FilterStatus = "ALL" | "PENDING" | "PAID" | "FAILED";

type SettlementItem = {
  id?: string;
  orderId?: string;
  order_id?: string;
  grossAmount?: number | string;
  gross_amount?: number | string;
  commissionAmount?: number | string;
  commission_amount?: number | string;
  platformFee?: number | string;
  platform_fee?: number | string;
  netAmount?: number | string;
  net_amount?: number | string;
  amount?: number | string;
  status?: SettlementStatus;
  createdAt?: string;
  created_at?: string;
  paidAt?: string;
  paid_at?: string;
  order?: {
    id?: string;
    orderNumber?: string;
    order_number?: string;
    totalAmount?: number | string;
    total_amount?: number | string;
    createdAt?: string;
    created_at?: string;
  };
  restaurant?: {
    id?: string;
    name?: string;
    restaurant_name?: string;
  };
};

const FILTERS: { key: FilterStatus; label: string; icon: string }[] = [
  { key: "ALL", label: "All", icon: "layers-outline" },
  { key: "PENDING", label: "Pending", icon: "hourglass-outline" },
  { key: "PAID", label: "Paid", icon: "checkmark-done-outline" },
  { key: "FAILED", label: "Failed", icon: "alert-circle-outline" },
];

const money = (value: any) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "₹0.00";
  return `₹${number.toFixed(2)}`;
};

const compactMoney = (value: any) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "₹0";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

const numberValue = (value: any) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getStatus = (item: SettlementItem) =>
  String(item.status || "PENDING").toUpperCase();

const getSettlementId = (item: SettlementItem, index: number) =>
  item.id || item.orderId || item.order_id || item.order?.id || `settlement-${index}`;

const getOrderNumber = (item: SettlementItem) =>
  item.order?.orderNumber ||
  item.order?.order_number ||
  item.orderId?.slice?.(0, 8) ||
  item.order_id?.slice?.(0, 8) ||
  item.order?.id?.slice?.(0, 8) ||
  "Settlement";

const getRestaurantName = (item: SettlementItem) =>
  item.restaurant?.name || item.restaurant?.restaurant_name || "Karto Store";

const getCreatedDate = (item: SettlementItem) => {
  const rawDate =
    item.paidAt || item.paid_at || item.createdAt || item.created_at || item.order?.createdAt || item.order?.created_at;

  if (!rawDate) return "-";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCreatedTime = (item: SettlementItem) => {
  const rawDate = item.paidAt || item.paid_at || item.createdAt || item.created_at;
  if (!rawDate) return "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getGrossAmount = (item: SettlementItem) =>
  numberValue(item.grossAmount ?? item.gross_amount ?? item.amount ?? item.order?.totalAmount ?? item.order?.total_amount);

const getCommissionAmount = (item: SettlementItem) =>
  numberValue(item.commissionAmount ?? item.commission_amount ?? item.platformFee ?? item.platform_fee);

const getNetAmount = (item: SettlementItem) => {
  const explicitNet = item.netAmount ?? item.net_amount;
  if (explicitNet !== undefined && explicitNet !== null) return numberValue(explicitNet);
  return Math.max(getGrossAmount(item) - getCommissionAmount(item), 0);
};

const statusMeta = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === "PAID") {
    return { label: "Paid", icon: "checkmark-done", color: THEME.green, bg: "rgba(34,197,94,0.12)" };
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return { label: normalized === "CANCELLED" ? "Cancelled" : "Failed", icon: "close-circle", color: THEME.danger, bg: "rgba(239,68,68,0.12)" };
  }
  return { label: "Pending", icon: "time-outline", color: THEME.yellow, bg: "rgba(246,195,67,0.12)" };
};

export default function VendorPaymentsScreen({ navigation }: any) {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [payments, setPayments] = useState<VendorPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [toast, setToast] = useState("");
  const [errorText, setErrorText] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const loadPayments = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      setErrorText("");

      const { data, error } = await vendorService.getPayments();
      if (!mountedRef.current) return;

      if (error) {
        const message = error.message || "Failed to load payments";
        setErrorText(message);
        showToast(message);
      } else {
        setPayments(data);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [showToast]
  );

  useEffect(() => {
    mountedRef.current = true;
    loadPayments(true);

    return () => {
      mountedRef.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loadPayments]);

  const settlements = useMemo(() => {
    const raw = payments?.settlements;
    return Array.isArray(raw) ? (raw as SettlementItem[]) : [];
  }, [payments]);

  const summary = useMemo(() => {
    const settlementGross = settlements.reduce((sum, item) => sum + getGrossAmount(item), 0);
    const settlementFee = settlements.reduce((sum, item) => sum + getCommissionAmount(item), 0);
    const settlementNet = settlements.reduce((sum, item) => sum + getNetAmount(item), 0);

    const gross = numberValue(payments?.grossEarnings) || settlementGross;
    const fee = numberValue(payments?.platformFee) || settlementFee;
    const net = numberValue(payments?.netPayable) || settlementNet;

    const pending =
      numberValue(payments?.pendingAmount) ||
      settlements
        .filter((item) => getStatus(item) === "PENDING")
        .reduce((sum, item) => sum + getNetAmount(item), 0);

    const paid =
      numberValue(payments?.paidAmount) ||
      settlements
        .filter((item) => getStatus(item) === "PAID")
        .reduce((sum, item) => sum + getNetAmount(item), 0);

    const failed = settlements
      .filter((item) => ["FAILED", "CANCELLED"].includes(getStatus(item)))
      .reduce((sum, item) => sum + getNetAmount(item), 0);

    const commissionPercent = gross > 0 ? (fee / gross) * 100 : 0;
    const paidPercent = net > 0 ? Math.min(100, (paid / net) * 100) : 0;

    return {
      gross,
      fee,
      net,
      pending,
      paid,
      failed,
      commissionPercent,
      paidPercent,
      totalSettlements: settlements.length,
      pendingCount: settlements.filter((x) => getStatus(x) === "PENDING").length,
      paidCount: settlements.filter((x) => getStatus(x) === "PAID").length,
      failedCount: settlements.filter((x) => ["FAILED", "CANCELLED"].includes(getStatus(x))).length,
    };
  }, [payments, settlements]);

  const filteredSettlements = useMemo(() => {
    if (filter === "ALL") return settlements;
    if (filter === "FAILED") {
      return settlements.filter((item) => ["FAILED", "CANCELLED"].includes(getStatus(item)));
    }
    return settlements.filter((item) => getStatus(item) === filter);
  }, [filter, settlements]);

  const nextPayoutText = useMemo(() => {
    if (summary.pending <= 0) return "No pending payout";
    return `${money(summary.pending)} awaiting admin payout`;
  }, [summary.pending]);

  const refreshPayments = () => {
    setRefreshing(true);
    loadPayments(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.green} size="large" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <View style={styles.toast}>
          <Icon
            name={errorText ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={errorText ? THEME.yellow : THEME.green}
          />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <FlatList
        data={filteredSettlements}
        keyExtractor={(item, index) => getSettlementId(item, index)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={refreshPayments}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.85}
                onPress={() => navigation?.goBack?.()}
              >
                <Icon name="arrow-back" size={21} color={THEME.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Vendor Panel</Text>
                <Text style={styles.title}>Payments</Text>
                <Text style={styles.subtitle}>Track payouts, commission and settlements.</Text>
              </View>

              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.85}
                disabled={refreshing}
                onPress={refreshPayments}
              >
                {refreshing ? (
                  <ActivityIndicator color={THEME.bg} size="small" />
                ) : (
                  <Icon name="refresh" size={20} color={THEME.bg} />
                )}
              </TouchableOpacity>
            </View>

            {!!errorText && (
              <View style={styles.errorCard}>
                <Icon name="warning-outline" size={22} color={THEME.yellow} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Could not refresh payments</Text>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              </View>
            )}

            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Net Payable</Text>
                <Text style={styles.heroValue}>{money(summary.net)}</Text>
                <Text style={styles.heroSub}>{nextPayoutText}</Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="wallet-outline" size={30} color={THEME.bg} />
              </View>
            </View>

            <View style={styles.payoutCard}>
              <View style={styles.payoutTop}>
                <View>
                  <Text style={styles.payoutTitle}>Payout Progress</Text>
                  <Text style={styles.payoutSub}>{summary.paidPercent.toFixed(0)}% paid from net payable</Text>
                </View>
                <Text style={styles.payoutAmount}>{compactMoney(summary.paid)}</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${summary.paidPercent}%` }]} />
              </View>

              <View style={styles.payoutLegend}>
                <LegendDot color={THEME.green} text={`Paid ${money(summary.paid)}`} />
                <LegendDot color={THEME.yellow} text={`Pending ${money(summary.pending)}`} />
              </View>
            </View>

            <View style={styles.grid}>
              <MiniCard icon="cash-outline" title="Gross Earnings" value={money(summary.gross)} />
              <MiniCard icon="trending-down-outline" title="Platform Fee" value={money(summary.fee)} />
              <MiniCard icon="hourglass-outline" title="Pending" value={money(summary.pending)} highlight="yellow" />
              <MiniCard icon="checkmark-done-outline" title="Paid" value={money(summary.paid)} highlight="green" />
            </View>

            <View style={styles.statusGrid}>
              <StatusPill title="Total" value={summary.totalSettlements} icon="receipt-outline" />
              <StatusPill title="Pending" value={summary.pendingCount} icon="time-outline" color={THEME.yellow} />
              <StatusPill title="Paid" value={summary.paidCount} icon="checkmark-outline" color={THEME.green} />
              <StatusPill title="Failed" value={summary.failedCount} icon="close-outline" color={THEME.danger} />
            </View>

            <View style={styles.commissionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Commission Health</Text>
                <Text style={styles.sectionSub}>
                  Platform fee is {summary.commissionPercent.toFixed(1)}% of gross earnings.
                </Text>
              </View>

              <View style={styles.percentCircle}>
                <Text style={styles.percentText}>{summary.commissionPercent.toFixed(0)}%</Text>
                <Text style={styles.percentSub}>Fee</Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Icon name="bulb-outline" size={22} color={THEME.yellow} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Payout Tip</Text>
                <Text style={styles.tipText}>
                  Delivered orders generate settlements. Pending amount moves to paid after admin payout.
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Settlement History</Text>
                <Text style={styles.sectionSubSmall}>Filter records by payout status.</Text>
              </View>
              <Text style={styles.countText}>{filteredSettlements.length} records</Text>
            </View>

            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              style={styles.filterList}
              renderItem={({ item }) => {
                const active = filter === item.key;
                return (
                  <TouchableOpacity
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setFilter(item.key)}
                  >
                    <Icon name={item.icon} size={15} color={active ? THEME.bg : THEME.muted} />
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="card-outline" size={34} color={THEME.yellow} />
            </View>

            <Text style={styles.emptyTitle}>No settlements found</Text>
            <Text style={styles.emptyText}>
              {filter === "ALL"
                ? "Payments will appear after delivered orders are settled."
                : `No ${filter.toLowerCase()} settlement records.`}
            </Text>

            <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={refreshPayments}>
              <Text style={styles.emptyBtnText}>Refresh Payments</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => <SettlementCard item={item} />}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

function LegendDot({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

function MiniCard({ icon, title, value, highlight }: { icon: string; title: string; value: string; highlight?: "green" | "yellow" }) {
  const color = highlight === "green" ? THEME.green : highlight === "yellow" ? THEME.yellow : THEME.text;

  return (
    <View style={styles.miniCard}>
      <View style={styles.miniIcon}>
        <Icon name={icon} size={18} color={THEME.bg} />
      </View>
      <Text style={[styles.miniValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

function StatusPill({ title, value, icon, color = THEME.text }: { title: string; value: number; icon: string; color?: string }) {
  return (
    <View style={styles.statusPill}>
      <Icon name={icon} size={15} color={color} />
      <Text style={styles.statusPillValue}>{value}</Text>
      <Text style={styles.statusPillText}>{title}</Text>
    </View>
  );
}

function SettlementCard({ item }: { item: SettlementItem }) {
  const status = getStatus(item);
  const orderNumber = getOrderNumber(item);
  const date = getCreatedDate(item);
  const time = getCreatedTime(item);
  const restaurantName = getRestaurantName(item);
  const gross = getGrossAmount(item);
  const fee = getCommissionAmount(item);
  const net = getNetAmount(item);
  const meta = statusMeta(status);

  return (
    <View style={styles.settlementCard}>
      <View style={[styles.settlementIcon, { backgroundColor: meta.bg }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.settlementTopLine}>
          <Text style={styles.orderTitle}>#{orderNumber}</Text>
          <Text style={styles.orderDate}>{date}{time ? ` • ${time}` : ""}</Text>
        </View>

        {!!restaurantName && <Text style={styles.restaurantName}>{restaurantName}</Text>}

        <View style={styles.amountRow}>
          <AmountChip label="Gross" value={money(gross)} />
          <AmountChip label="Fee" value={money(fee)} danger />
        </View>
      </View>

      <View style={styles.rightBlock}>
        <Text style={styles.netAmount}>{money(net)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    </View>
  );
}

function AmountChip({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.amountChip}>
      <Text style={styles.amountChipLabel}>{label}</Text>
      <Text style={[styles.amountChipValue, danger && { color: THEME.danger }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  toast: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: "#101A10",
    borderWidth: 1,
    borderColor: THEME.yellow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 16, gap: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { color: THEME.green, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 2 },
  subtitle: { color: THEME.muted, fontWeight: "700", marginTop: 4 },
  refreshBtn: { width: 48, height: 48, borderRadius: 17, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  errorCard: {
    backgroundColor: "rgba(246,195,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.28)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    gap: 10,
  },
  errorTitle: { color: THEME.yellow, fontWeight: "900" },
  errorText: { color: THEME.text, marginTop: 4, fontWeight: "700" },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: { color: THEME.bg, fontWeight: "900", opacity: 0.75 },
  heroValue: { color: THEME.bg, fontSize: 35, fontWeight: "900", marginTop: 6 },
  heroSub: { color: THEME.bg, fontWeight: "800", opacity: 0.78, marginTop: 4 },
  heroIcon: { width: 60, height: 60, borderRadius: 23, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  payoutCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
  },
  payoutTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  payoutTitle: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  payoutSub: { color: THEME.muted, fontWeight: "700", marginTop: 4 },
  payoutAmount: { color: THEME.green, fontSize: 20, fontWeight: "900" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: THEME.card2, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: THEME.green },
  payoutLegend: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 99 },
  legendText: { color: THEME.muted, fontSize: 12, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  miniCard: { width: "48.5%", backgroundColor: THEME.card, borderRadius: 22, padding: 15, borderWidth: 1, borderColor: THEME.border },
  miniIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  miniValue: { color: THEME.text, fontWeight: "900", fontSize: 18 },
  miniTitle: { color: THEME.muted, fontSize: 12, marginTop: 4, fontWeight: "700" },
  statusGrid: { flexDirection: "row", gap: 8, marginTop: 14 },
  statusPill: {
    flex: 1,
    backgroundColor: THEME.card3,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    paddingVertical: 11,
    alignItems: "center",
  },
  statusPillValue: { color: THEME.text, fontWeight: "900", marginTop: 5 },
  statusPillText: { color: THEME.muted, fontSize: 10, fontWeight: "800", marginTop: 2 },
  commissionCard: {
    marginTop: 14,
    backgroundColor: THEME.card3,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentCircle: { width: 74, height: 74, borderRadius: 28, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  percentText: { color: THEME.bg, fontSize: 22, fontWeight: "900" },
  percentSub: { color: THEME.bg, fontSize: 10, fontWeight: "900", opacity: 0.75 },
  tipCard: {
    marginTop: 14,
    backgroundColor: "rgba(246,195,67,0.08)",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.3)",
    flexDirection: "row",
    gap: 12,
  },
  tipTitle: { color: THEME.yellow, fontWeight: "900" },
  tipText: { color: THEME.text, marginTop: 4, fontWeight: "700", lineHeight: 20 },
  sectionHeader: { marginTop: 22, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  sectionSub: { color: THEME.muted, marginTop: 5, fontWeight: "700", maxWidth: 230 },
  sectionSubSmall: { color: THEME.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
  countText: { color: THEME.green, fontWeight: "900" },
  filterList: { maxHeight: 42, marginBottom: 12 },
  filterChip: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChipActive: { backgroundColor: THEME.yellow, borderColor: THEME.yellow },
  filterText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  filterTextActive: { color: THEME.bg },
  emptyBox: { backgroundColor: THEME.card, borderRadius: 24, borderWidth: 1, borderColor: THEME.border, padding: 24, alignItems: "center" },
  emptyIcon: { width: 74, height: 74, borderRadius: 28, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: THEME.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: THEME.muted, textAlign: "center", marginTop: 5, fontWeight: "700" },
  emptyBtn: { marginTop: 16, height: 46, paddingHorizontal: 18, borderRadius: 16, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { color: THEME.bg, fontWeight: "900" },
  settlementCard: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    gap: 12,
  },
  settlementIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  settlementTopLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  orderTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  orderDate: { color: THEME.muted, fontSize: 11, fontWeight: "700" },
  restaurantName: { color: THEME.yellow, marginTop: 4, fontSize: 12, fontWeight: "800" },
  amountRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  amountChip: { backgroundColor: THEME.card2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, flexDirection: "row", gap: 5 },
  amountChipLabel: { color: THEME.muted, fontSize: 10, fontWeight: "800" },
  amountChipValue: { color: THEME.text, fontSize: 10, fontWeight: "900" },
  rightBlock: { alignItems: "flex-end", maxWidth: 116 },
  netAmount: { color: THEME.green, fontWeight: "900", fontSize: 15 },
  statusBadge: { marginTop: 7, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "900" },
});
