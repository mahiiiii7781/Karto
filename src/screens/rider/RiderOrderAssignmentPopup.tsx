import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import Sound from "react-native-sound";
import { useNavigation } from "@react-navigation/native";

import apiClient from "@/api/apiClient";
import { riderService } from "@/services/api/riderApi";
import { useAuth } from "@/context/AuthContext";

const SOCKET_URL = apiClient.defaults.baseURL?.replace("/api", "") || "";

Sound.setCategory("Playback");

type RiderOrder = {
  id: string;
  orderNumber?: string;
  totalAmount?: number | string;
  deliveryFee?: number | string;
  distanceKm?: number | string;
  status?: string;
  paymentMethod?: string;
  restaurant?: any;
  vendor?: any;
  address?: any;
  deliveryAddress?: any;
  pickupAddress?: string;
  user?: any;
  customer?: any;
  items?: any[];
};

export default function RiderOrderAssignmentPopup() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const riderUser = user as any;
  const riderCityId =
    riderUser?.cityId || riderUser?.city?.id || riderUser?.rider?.cityId || null;

  const socketRef = useRef<Socket | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const slideAnim = useRef(new Animated.Value(400)).current;

  const [visible, setVisible] = useState(false);
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [riderOnline, setRiderOnline] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const startAlert = () => {
    Vibration.cancel();
    Vibration.vibrate([500, 700], true);

    soundRef.current?.stop();
    soundRef.current?.release();
    soundRef.current = null;

    soundRef.current = new Sound("new_order.mp3", Sound.MAIN_BUNDLE, (error) => {
      if (error) return;
      soundRef.current?.setNumberOfLoops(-1);
      soundRef.current?.play();
    });
  };

  const stopAlert = () => {
    Vibration.cancel();

    soundRef.current?.stop();
    soundRef.current?.release();
    soundRef.current = null;
  };

  const normalizeSocketOrder = (payload: any): RiderOrder | null => {
    if (!payload) return null;
    if (payload?.order?.id) return payload.order;
    if (payload?.data?.order?.id) return payload.data.order;
    if (payload?.id) return payload;
    return null;
  };

  const openPopup = (nextOrder: RiderOrder) => {
    if (!nextOrder?.id) return;

    setOrder(nextOrder);
    setVisible(true);
    setLoading(false);
    startAlert();

    socketRef.current?.emit("rider-order-popup-opened", {
      orderId: nextOrder.id,
      riderId: user?.id,
    });

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  };

  const closePopupAfterAcceptOnly = () => {
    stopAlert();

    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setOrder(null);
      setLoading(false);
    });
  };

  const getCustomerName = (o: RiderOrder | null) =>
    o?.customer?.name || o?.user?.fullName || "Customer";

  const getCustomerPhone = (o: RiderOrder | null) =>
    o?.customer?.phone || o?.user?.phone || "Phone not available";

  const getVendorName = (o: RiderOrder | null) =>
    o?.vendor?.name || o?.restaurant?.name || "Restaurant";

  const getVendorPhone = (o: RiderOrder | null) =>
    o?.vendor?.phone ||
    o?.restaurant?.phone ||
    o?.restaurant?.ownerMobileNo ||
    "Phone not available";

  const getPickupAddress = (o: RiderOrder | null) =>
    o?.pickupAddress ||
    o?.vendor?.address ||
    o?.restaurant?.address ||
    "Pickup address not available";

  const getDeliveryAddress = (o: RiderOrder | null) => {
    const a = o?.deliveryAddress || o?.address;
    return (
      a?.address ||
      a?.addressLine ||
      a?.landmark ||
      a?.city ||
      "Delivery address not available"
    );
  };

  const loadProfileStatus = useCallback(async () => {
    try {
      const res = await riderService.getProfile();
      setRiderOnline(Boolean(res?.data?.isOnline));
    } catch {
      setRiderOnline(false);
    }
  }, []);

  const checkCurrentAssignmentFallback = useCallback(async () => {
    try {
      if (!riderOnline || visible) return;

      const res = await riderService.getCurrentAssignment();
      if (res?.error) return;

      const nextOrder =
        res?.data?.order || res?.data?.data?.order || res?.data?.activeOrder;

      if (nextOrder?.id) openPopup(nextOrder);
    } catch {}
  }, [riderOnline, visible]);

  const connectSocket = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      if (!token || !user?.id || !SOCKET_URL) return;

      socketRef.current?.disconnect();

      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("joinRiderRoom", user.id);

        if (riderCityId) {
          socket.emit("joinRiderCity", riderCityId);
        }

        socket.emit("rider-online", {
          riderId: user.id,
          cityId: riderCityId,
        });
      });

      const orderHandler = (payload: any) => {
        const nextOrder = normalizeSocketOrder(payload);

        if (nextOrder?.id && riderOnline && !visible) {
          openPopup(nextOrder);
        }
      };

      socket.on("new-rider-order", orderHandler);
      socket.on("new-order-assignment", orderHandler);
      socket.on("NEW_RIDER_ORDER", orderHandler);
      socket.on("new-order", orderHandler);
      socket.on("rider-new-order", orderHandler);
      socket.on("order-assigned", orderHandler);
      socket.on("rider-order-assigned", orderHandler);
    } catch {}
  }, [riderOnline, user?.id, riderCityId, visible]);

  const handleAccept = async () => {
    if (!order?.id || loading) return;

    try {
      setLoading(true);

      const res = await riderService.acceptOrder(order.id);

      if (res?.error) {
        setLoading(false);
        showToast(res?.error?.message || "Unable to accept order");
        return;
      }

      const acceptedOrder = res?.data || order;

      socketRef.current?.emit("rider-accepted-order", {
        orderId: acceptedOrder.id,
        riderId: user?.id,
      });

      showToast("Order accepted successfully");
      closePopupAfterAcceptOnly();

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

    socketRef.current?.emit("rider-rejected-order", {
      orderId: order.id,
      riderId: user?.id,
    });

    showToast("Accept this order to continue");
  };

  useEffect(() => {
    loadProfileStatus();
  }, [loadProfileStatus]);

  useEffect(() => {
    connectSocket();

    return () => {
      stopAlert();

      socketRef.current?.off("new-rider-order");
      socketRef.current?.off("new-order-assignment");
      socketRef.current?.off("NEW_RIDER_ORDER");
      socketRef.current?.off("new-order");
      socketRef.current?.off("rider-new-order");
      socketRef.current?.off("order-assigned");
      socketRef.current?.off("rider-order-assigned");

      if (user?.id) {
        socketRef.current?.emit("rider-offline", {
          riderId: user.id,
          cityId: riderCityId,
        });
      }

      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connectSocket, user?.id, riderCityId]);

  useEffect(() => {
    const timer = setInterval(checkCurrentAssignmentFallback, 7000);
    return () => clearInterval(timer);
  }, [checkCurrentAssignmentFallback]);

  if (!order) return null;

  const itemCount = order?.items?.length || 0;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.label}>NEW DELIVERY REQUEST</Text>
              <Text style={styles.orderNo}>
                #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>

            <View style={styles.feeBadge}>
              <Text style={styles.feeText}>
                ₹{Number(order.deliveryFee || 0).toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.alertStrip}>
            <Text style={styles.alertText}>
              Sound & vibration active until order is accepted
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>Pickup</Text>
            <Text style={styles.mainText}>{getVendorName(order)}</Text>
            <Text style={styles.subText}>{getPickupAddress(order)}</Text>
            <Text style={styles.phoneText}>Vendor: {getVendorPhone(order)}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>Drop</Text>
            <Text style={styles.mainText}>{getCustomerName(order)}</Text>
            <Text style={styles.subText}>{getDeliveryAddress(order)}</Text>
            <Text style={styles.phoneText}>Customer: {getCustomerPhone(order)}</Text>
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
                {order.distanceKm ? `${Number(order.distanceKm).toFixed(1)} km` : "-"}
              </Text>
              <Text style={styles.summaryLabel}>Distance</Text>
            </View>
          </View>

          <View style={styles.paymentBox}>
            <Text style={styles.paymentText}>
              Payment: {order.paymentMethod || "COD"} • Status:{" "}
              {order.status || "READY_FOR_PICKUP"}
            </Text>
          </View>

          {!!toast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}

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
                <ActivityIndicator color="#050806" />
              ) : (
                <Text style={styles.acceptText}>Accept Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#070A08",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.38)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  orderNo: {
    color: "#F8FAFC",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 4,
  },
  feeBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  feeText: {
    color: "#050806",
    fontWeight: "900",
    fontSize: 18,
  },
  alertStrip: {
    backgroundColor: "#102015",
    borderColor: "#22C55E",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 14,
  },
  alertText: {
    color: "#D9F99D",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
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
    color: "#FACC15",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5,
  },
  mainText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  subText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  phoneText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#101713",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E2A22",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  paymentBox: {
    backgroundColor: "#101713",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E2A22",
    marginTop: 14,
  },
  paymentText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "800",
  },
  toast: {
    backgroundColor: "#1E2B16",
    borderColor: "#22C55E",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 16,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  acceptBtn: {
    backgroundColor: "#FACC15",
  },
  rejectText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  acceptText: {
    color: "#050806",
    fontSize: 15,
    fontWeight: "900",
  },
});