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
  yellow: "#F6C343",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  warning: "#F59E0B",
};

type SettlementStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | string;

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
  };
  restaurant?: {
    id?: string;
    name?: string;
    restaurant_name?: string;
  };
};

const money = (value: any) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "₹0.00";
  }

  return `₹${number.toFixed(2)}`;
};

const numberValue = (value: any) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getSettlementId = (item: SettlementItem, index: number) => {
  return (
    item.id ||
    item.orderId ||
    item.order_id ||
    item.order?.id ||
    `settlement-${index}`
  );
};

const getOrderNumber = (item: SettlementItem) => {
  return (
    item.order?.orderNumber ||
    item.order?.order_number ||
    item.orderId?.slice?.(0, 8) ||
    item.order_id?.slice?.(0, 8) ||
    "Settlement"
  );
};

const getRestaurantName = (item: SettlementItem) => {
  return item.restaurant?.name || item.restaurant?.restaurant_name || "";
};

const getCreatedDate = (item: SettlementItem) => {
  const rawDate = item.createdAt || item.created_at || item.paidAt || item.paid_at;

  if (!rawDate) {
    return "-";
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getGrossAmount = (item: SettlementItem) => {
  return numberValue(item.grossAmount ?? item.gross_amount ?? item.amount);
};

const getCommissionAmount = (item: SettlementItem) => {
  return numberValue(
    item.commissionAmount ??
      item.commission_amount ??
      item.platformFee ??
      item.platform_fee
  );
};

const getNetAmount = (item: SettlementItem) => {
  const explicitNet = item.netAmount ?? item.net_amount;

  if (explicitNet !== undefined && explicitNet !== null) {
    return numberValue(explicitNet);
  }

  return Math.max(getGrossAmount(item) - getCommissionAmount(item), 0);
};

export default function VendorPaymentsScreen() {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [payments, setPayments] = useState<VendorPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState("");
  const [errorText, setErrorText] = useState("");

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast(msg);

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 2200);
  }, []);

  const loadPayments = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      setErrorText("");

      const { data, error } = await vendorService.getPayments();

      if (!mountedRef.current) {
        return;
      }

      if (error) {
        const message = error?.message || "Failed to load payments";
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

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [loadPayments]);

  const settlements = useMemo(() => {
    const raw = payments?.settlements;

    if (!Array.isArray(raw)) {
      return [] as SettlementItem[];
    }

    return raw as SettlementItem[];
  }, [payments]);

  const summary = useMemo(() => {
    const settlementGross = settlements.reduce((sum, item) => {
      return sum + getGrossAmount(item);
    }, 0);

    const settlementFee = settlements.reduce((sum, item) => {
      return sum + getCommissionAmount(item);
    }, 0);

    const settlementNet = settlements.reduce((sum, item) => {
      return sum + getNetAmount(item);
    }, 0);

    const gross = numberValue(payments?.grossEarnings) || settlementGross;
    const fee = numberValue(payments?.platformFee) || settlementFee;
    const net = numberValue(payments?.netPayable) || settlementNet;

    const pending =
      numberValue(payments?.pendingAmount) ||
      settlements
        .filter((item) => String(item.status || "PENDING").toUpperCase() === "PENDING")
        .reduce((sum, item) => sum + getNetAmount(item), 0);

    const paid =
      numberValue(payments?.paidAmount) ||
      settlements
        .filter((item) => String(item.status || "").toUpperCase() === "PAID")
        .reduce((sum, item) => sum + getNetAmount(item), 0);

    const commissionPercent = gross > 0 ? (fee / gross) * 100 : 0;

    return {
      gross,
      fee,
      net,
      pending,
      paid,
      commissionPercent,
    };
  }, [payments, settlements]);

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
        data={settlements}
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
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Vendor Panel</Text>
                <Text style={styles.title}>Payments</Text>
                <Text style={styles.subtitle}>
                  Track payouts, commission and settlements.
                </Text>
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
                <Text style={styles.heroSub}>
                  Pending {money(summary.pending)} • Paid {money(summary.paid)}
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Icon name="wallet-outline" size={30} color={THEME.bg} />
              </View>
            </View>

            <View style={styles.grid}>
              <MiniCard
                icon="cash-outline"
                title="Gross Earnings"
                value={money(summary.gross)}
              />

              <MiniCard
                icon="trending-down-outline"
                title="Platform Fee"
                value={money(summary.fee)}
              />

              <MiniCard
                icon="hourglass-outline"
                title="Pending"
                value={money(summary.pending)}
              />

              <MiniCard
                icon="checkmark-done-outline"
                title="Paid"
                value={money(summary.paid)}
              />
            </View>

            <View style={styles.commissionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Commission Health</Text>
                <Text style={styles.sectionSub}>
                  Platform fee is {summary.commissionPercent.toFixed(1)}% of gross
                  earnings.
                </Text>
              </View>

              <View style={styles.percentCircle}>
                <Text style={styles.percentText}>
                  {summary.commissionPercent.toFixed(0)}%
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Icon name="bulb-outline" size={22} color={THEME.yellow} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Payout Tip</Text>
                <Text style={styles.tipText}>
                  Delivered orders generate settlements. Pending amount will move to
                  paid after admin payout.
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Settlement History</Text>
              <Text style={styles.countText}>{settlements.length} records</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="card-outline" size={34} color={THEME.yellow} />
            </View>

            <Text style={styles.emptyTitle}>No settlements yet</Text>

            <Text style={styles.emptyText}>
              Payments will appear after delivered orders are settled.
            </Text>

            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.85}
              onPress={refreshPayments}
            >
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

function MiniCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniIcon}>
        <Icon name={icon} size={18} color={THEME.bg} />
      </View>

      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

function SettlementCard({ item }: { item: SettlementItem }) {
  const status = String(item.status || "PENDING").toUpperCase();
  const orderNumber = getOrderNumber(item);
  const date = getCreatedDate(item);
  const restaurantName = getRestaurantName(item);

  const gross = getGrossAmount(item);
  const fee = getCommissionAmount(item);
  const net = getNetAmount(item);

  const isPaid = status === "PAID";
  const isFailed = status === "FAILED" || status === "CANCELLED";

  return (
    <View style={styles.settlementCard}>
      <View style={styles.settlementIcon}>
        <Icon
          name={isPaid ? "checkmark-done" : isFailed ? "close-circle" : "time-outline"}
          size={20}
          color={isPaid ? THEME.green : isFailed ? THEME.danger : THEME.yellow}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.orderTitle}>#{orderNumber}</Text>

        <Text style={styles.orderDate}>{date}</Text>

        {!!restaurantName && (
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        )}

        <View style={styles.amountRow}>
          <Text style={styles.amountText}>Gross {money(gross)}</Text>
          <Text style={styles.amountText}>Fee {money(fee)}</Text>
        </View>
      </View>

      <View style={styles.rightBlock}>
        <Text style={styles.netAmount}>{money(net)}</Text>

        <View
          style={[
            styles.statusBadge,
            isPaid && styles.paidBadge,
            isFailed && styles.failedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isPaid && styles.paidText,
              isFailed && styles.failedText,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
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
  toastText: {
    color: THEME.text,
    fontWeight: "900",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  kicker: {
    color: THEME.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: THEME.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
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
  errorTitle: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  errorText: {
    color: THEME.text,
    marginTop: 4,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: THEME.green,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: THEME.bg,
    fontWeight: "900",
    opacity: 0.75,
  },
  heroValue: {
    color: THEME.bg,
    fontSize: 36,
    fontWeight: "900",
    marginTop: 6,
  },
  heroSub: {
    color: THEME.bg,
    fontWeight: "800",
    opacity: 0.78,
    marginTop: 4,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 23,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniCard: {
    width: "48.5%",
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  miniIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  miniValue: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 18,
  },
  miniTitle: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  commissionCard: {
    marginTop: 14,
    backgroundColor: "#0B100B",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentCircle: {
    width: 70,
    height: 70,
    borderRadius: 28,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  percentText: {
    color: THEME.bg,
    fontSize: 22,
    fontWeight: "900",
  },
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
  tipTitle: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  tipText: {
    color: THEME.text,
    marginTop: 4,
    fontWeight: "700",
    lineHeight: 20,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSub: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
    maxWidth: 230,
  },
  countText: {
    color: THEME.green,
    fontWeight: "900",
  },
  emptyBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 28,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 5,
    fontWeight: "700",
  },
  emptyBtn: {
    marginTop: 16,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: {
    color: THEME.bg,
    fontWeight: "900",
  },
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
  settlementIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  orderTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  orderDate: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  restaurantName: {
    color: THEME.yellow,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  amountRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  amountText: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  rightBlock: {
    alignItems: "flex-end",
    maxWidth: 110,
  },
  netAmount: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 15,
  },
  statusBadge: {
    marginTop: 7,
    backgroundColor: "rgba(246,195,67,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,195,67,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  failedBadge: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  statusText: {
    color: THEME.yellow,
    fontSize: 10,
    fontWeight: "900",
  },
  paidText: {
    color: THEME.green,
  },
  failedText: {
    color: THEME.danger,
  },
});
