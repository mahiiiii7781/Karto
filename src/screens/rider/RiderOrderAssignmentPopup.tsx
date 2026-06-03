import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { useNavigation } from "@react-navigation/native";

import { riderService } from "@/services/api/riderApi";
import { useAuth } from "@/context/AuthContext";

const SOCKET_URL = "https://karto-backend-kor1.onrender.com";

type RiderOrder = {
  id: string;
  orderNumber?: string;
  totalAmount?: number | string;
  deliveryFee?: number | string;
  status?: string;
  restaurant?: {
    name?: string;
    address?: string;
  };
  address?: {
    addressLine?: string;
    landmark?: string;
    city?: string;
  };
  user?: {
    fullName?: string;
    phone?: string;
  };
  items?: any[];
};

export default function RiderOrderAssignmentPopup() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const [visible, setVisible] = useState(false);
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [riderOnline, setRiderOnline] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const openPopup = (nextOrder: RiderOrder) => {
    if (!nextOrder?.id) return;

    setOrder(nextOrder);
    setVisible(true);

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  };

  const closePopup = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setOrder(null);
      setLoading(false);
    });
  };

  const normalizeSocketOrder = (payload: any): RiderOrder | null => {
    if (!payload) return null;

    if (payload?.order?.id) return payload.order;
    if (payload?.id) return payload;

    return null;
  };

  const loadProfileStatus = useCallback(async () => {
    try {
      const res = await riderService.getProfile();
      setRiderOnline(Boolean(res?.rider?.isOnline));
    } catch {
      setRiderOnline(false);
    }
  }, []);

  const checkNewOrdersFallback = useCallback(async () => {
    try {
      if (!riderOnline) return;

      const res = await riderService.getNewOrders();
      const firstOrder = res?.orders?.[0];

      if (firstOrder?.id && !visible) {
        openPopup(firstOrder);
      }
    } catch {
      // silent fallback
    }
  }, [riderOnline, visible]);

  const connectSocket = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      if (!token || !user?.id) return;

      socketRef.current?.disconnect();

      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        auth: {
          token,
        },
        query: {
          token,
          userId: user.id,
          role: "RIDER",
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-rider-room", user.id);
        socket.emit("joinRiderRoom", user.id);
        socket.emit("join-room", `rider-${user.id}`);
      });

      socket.on("new-order", (payload: any) => {
        const nextOrder = normalizeSocketOrder(payload);
        if (nextOrder && riderOnline) openPopup(nextOrder);
      });

      socket.on("rider-new-order", (payload: any) => {
        const nextOrder = normalizeSocketOrder(payload);
        if (nextOrder && riderOnline) openPopup(nextOrder);
      });

      socket.on("order-assigned", (payload: any) => {
        const nextOrder = normalizeSocketOrder(payload);
        if (nextOrder && riderOnline) openPopup(nextOrder);
      });

      socket.on("rider-order-assigned", (payload: any) => {
        const nextOrder = normalizeSocketOrder(payload);
        if (nextOrder && riderOnline) openPopup(nextOrder);
      });

      socket.on("disconnect", () => {});
    } catch {
      // socket fallback handled by polling
    }
  }, [riderOnline, user?.id]);

  const handleAccept = async () => {
    if (!order?.id || loading) return;

    try {
      setLoading(true);

      const res = await riderService.acceptOrder(order.id);
      const acceptedOrder = res?.order || order;

      showToast("Order accepted successfully");
      closePopup();

      setTimeout(() => {
        navigation.navigate("RiderOrderDetail", {
          orderId: acceptedOrder.id,
          order: acceptedOrder,
        });
      }, 300);
    } catch (error: any) {
      setLoading(false);
      showToast(error?.message || "Unable to accept order");
    }
  };

  const handleReject = async () => {
    if (!order?.id || loading) return;

    try {
      setLoading(true);
      await riderService.rejectOrder(order.id);
      showToast("Order rejected");
      closePopup();
    } catch (error: any) {
      setLoading(false);
      showToast(error?.message || "Unable to reject order");
    }
  };

  useEffect(() => {
    loadProfileStatus();
  }, [loadProfileStatus]);

  useEffect(() => {
    connectSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connectSocket]);

  useEffect(() => {
    const timer = setInterval(() => {
      checkNewOrdersFallback();
    }, 12000);

    return () => clearInterval(timer);
  }, [checkNewOrdersFallback]);

  if (!order) {
    return null;
  }

  const itemCount = order?.items?.length || 0;

  return (
    <>
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.topRow}>
              <View>
                <Text style={styles.label}>NEW DELIVERY</Text>
                <Text style={styles.orderNo}>
                  #{order.orderNumber || order.id.slice(0, 8)}
                </Text>
              </View>

              <View style={styles.feeBadge}>
                <Text style={styles.feeText}>
                  ₹{Number(order.deliveryFee || 0).toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>Pickup</Text>
              <Text style={styles.mainText}>
                {order.restaurant?.name || "Restaurant"}
              </Text>
              <Text style={styles.subText}>
                {order.restaurant?.address || "Pickup address not available"}
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>Drop</Text>
              <Text style={styles.mainText}>
                {order.user?.fullName || "Customer"}
              </Text>
              <Text style={styles.subText}>
                {order.address?.addressLine ||
                  order.address?.landmark ||
                  "Delivery address not available"}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{itemCount}</Text>
                <Text style={styles.summaryLabel}>Items</Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>
                  ₹{Number(order.totalAmount || 0).toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>Order</Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>
                  {order.status || "READY"}
                </Text>
                <Text style={styles.summaryLabel}>Status</Text>
              </View>
            </View>

            {toast ? (
              <View style={styles.toast}>
                <Text style={styles.toastText}>{toast}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.btn, styles.rejectBtn]}
                onPress={handleReject}
                disabled={loading}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.btn, styles.acceptBtn]}
                onPress={handleAccept}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#101010" />
                ) : (
                  <Text style={styles.acceptText}>Accept Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#101010",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(193,157,35,0.45)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#8BE05F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  orderNo: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  feeBadge: {
    backgroundColor: "#C1FF3D",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  feeText: {
    color: "#101010",
    fontWeight: "900",
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 18,
  },
  infoBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#C19D23",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },
  mainText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  subText: {
    color: "#BDBDBD",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#181818",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#8A8A8A",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  toast: {
    backgroundColor: "#1E2B16",
    borderColor: "#8BE05F",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 16,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#1B1B1B",
    borderWidth: 1,
    borderColor: "#333333",
  },
  acceptBtn: {
    backgroundColor: "#C1FF3D",
  },
  rejectText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  acceptText: {
    color: "#101010",
    fontSize: 15,
    fontWeight: "900",
  },
});