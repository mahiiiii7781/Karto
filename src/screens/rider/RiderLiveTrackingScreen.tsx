import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Polyline,
} from "react-native-maps";
import Icon from "react-native-vector-icons/Ionicons";

import { riderService } from "@/services/api/riderApi";
import { liveLocationService } from "@/services/api/liveLocationService";
import { riderSocketService } from "@/services/socket/riderSocketService";

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

const fallbackRegion = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const getAddressText = (address: any) => {
  if (!address) return "Address not available";

  return (
    address.address ||
    address.addressLine ||
    address.fullAddress ||
    address.street ||
    address.landmark ||
    address.city ||
    "Address not available"
  );
};

const getVendor = (order: any) => order?.vendor || order?.restaurant || {};
const getCustomer = (order: any) => order?.customer || order?.user || {};

const getPickupAddress = (order: any) =>
  order?.pickupAddress || getVendor(order)?.address || "Pickup address not available";

const getDropAddress = (order: any) =>
  getAddressText(order?.deliveryAddress || order?.address);

const getLatLng = (obj: any) => {
  const lat =
    obj?.latitude ||
    obj?.lat ||
    obj?.location?.latitude ||
    obj?.location?.lat;

  const lng =
    obj?.longitude ||
    obj?.lng ||
    obj?.location?.longitude ||
    obj?.location?.lng;

  if (!lat || !lng) return null;

  return {
    latitude: Number(lat),
    longitude: Number(lng),
  };
};

const openMapAddress = (address: string) => {
  if (!address) return;
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`
  );
};

const callPhone = (phone?: string) => {
  if (!phone) {
    Alert.alert("Phone unavailable", "Phone number is not available.");
    return;
  }

  Linking.openURL(`tel:${phone}`);
};

export default function RiderLiveTrackingScreen({ route, navigation }: any) {
  const mapRef = useRef<MapView | null>(null);

  const orderId = route?.params?.orderId;
  const initialOrder = route?.params?.order;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState<any>(initialOrder || null);
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [tracking, setTracking] = useState(false);

  const vendor = getVendor(order);
  const customer = getCustomer(order);

  const pickupLocation = useMemo(() => {
    return (
      getLatLng(order?.pickupLocation) ||
      getLatLng(order?.restaurant) ||
      getLatLng(order?.vendor)
    );
  }, [order]);

  const dropLocation = useMemo(() => {
    return (
      getLatLng(order?.deliveryLocation) ||
      getLatLng(order?.deliveryAddress) ||
      getLatLng(order?.address)
    );
  }, [order]);

  const mapRegion = useMemo(() => {
    if (riderLocation) {
      return {
        ...riderLocation,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    if (pickupLocation) {
      return {
        ...pickupLocation,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    if (dropLocation) {
      return {
        ...dropLocation,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    return fallbackRegion;
  }, [riderLocation, pickupLocation, dropLocation]);

  const routeLine = useMemo(() => {
    const points = [];

    if (pickupLocation) points.push(pickupLocation);
    if (riderLocation) points.push(riderLocation);
    if (dropLocation) points.push(dropLocation);

    return points;
  }, [pickupLocation, riderLocation, dropLocation]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const fitMap = useCallback(() => {
    const points = routeLine.filter(Boolean);

    if (points.length >= 2) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: {
            top: 110,
            right: 60,
            bottom: 360,
            left: 60,
          },
          animated: true,
        });
      }, 400);
    }
  }, [routeLine]);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      showToast("Order id missing");
      return;
    }

    try {
      const res = await riderService.getOrderDetail(orderId);

      if (res?.error) {
        showToast(res?.error?.message || "Order load failed");
        setOrder(initialOrder || null);
        return;
      }

      setOrder(res?.data || initialOrder || null);
    } catch (e: any) {
      showToast(e?.message || "Order load failed");
    } finally {
      setLoading(false);
    }
  }, [orderId, initialOrder]);

  const startTracking = useCallback(() => {
    if (!orderId) return;

    liveLocationService.start({
      orderId,
      onLocation: (location: any) => {
        setRiderLocation(location);
        setTracking(true);

        riderSocketService.sendLocation(
          orderId,
          location.latitude,
          location.longitude
        );

        riderService.updateLocation(
          orderId,
          location.latitude,
          location.longitude
        );
      },
      onError: (msg: string) => {
        showToast(msg);
      },
    });

    setTracking(true);
  }, [orderId]);

  const stopTracking = useCallback(() => {
    liveLocationService.stop();
    setTracking(false);
  }, []);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (orderId) {
      riderSocketService.joinOrder(orderId);
    }

    return () => {
      if (orderId) {
        riderSocketService.leaveOrder(orderId);
      }
    };
  }, [orderId]);

  useEffect(() => {
    riderSocketService.listenLocationUpdates((payload: any) => {
      const location = payload?.location || payload;

      if (location?.latitude && location?.longitude) {
        setRiderLocation({
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        });
      }
    });

    return () => {
      riderSocketService.removeLocationListener();
    };
  }, []);

  useEffect(() => {
    if (["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order?.status)) {
      startTracking();
    }

    if (order?.status === "DELIVERED" || order?.status === "CANCELLED") {
      stopTracking();
    }
  }, [order?.status, startTracking, stopTracking]);

  useEffect(() => {
    fitMap();
  }, [fitMap]);

  const refreshOrder = async () => {
    setLoading(true);
    await loadOrder();
  };

  const markPicked = async () => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.markPicked(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Mark picked failed");
        return;
      }

      showToast("Order marked as picked");
      setOrder(res?.data || order);
      startTracking();
      loadOrder();
    } catch (e: any) {
      showToast(e?.message || "Mark picked failed");
    } finally {
      setBusy(false);
    }
  };

  const startDelivery = async () => {
    if (!order?.id || busy) return;

    setBusy(true);

    try {
      const res = await riderService.startDelivery(order.id);

      if (res?.error) {
        showToast(res?.error?.message || "Start delivery failed");
        return;
      }

      showToast("Delivery started");
      setOrder(res?.data || order);
      startTracking();
      loadOrder();
    } catch (e: any) {
      showToast(e?.message || "Start delivery failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = () => {
    if (!order?.id) return;

    navigation?.navigate?.("RiderOrderDetail", {
      orderId: order.id,
      order,
      openOtp: true,
    });
  };

  const nextAction = () => {
    if (order?.status === "ASSIGNED_TO_RIDER") return markPicked();
    if (order?.status === "PICKED_UP") return startDelivery();
    if (order?.status === "OUT_FOR_DELIVERY") return verifyOtp();

    navigation?.navigate?.("RiderOrderDetail", {
      orderId: order?.id,
      order,
    });
  };

  const actionLabel = () => {
    if (order?.status === "ASSIGNED_TO_RIDER") return "Mark Picked Up";
    if (order?.status === "PICKED_UP") return "Start Delivery";
    if (order?.status === "OUT_FOR_DELIVERY") return "Verify Customer OTP";
    return "Open Details";
  };

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ActivityIndicator size="large" color={T.yellow} />
        <Text style={styles.loadingText}>Opening live tracking...</Text>
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

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup"
            description={vendor?.name || "Restaurant"}
          >
            <View style={styles.pickupMarker}>
              <Icon name="storefront" size={18} color={T.black} />
            </View>
          </Marker>
        )}

        {dropLocation && (
          <Marker
            coordinate={dropLocation}
            title="Drop"
            description={getDropAddress(order)}
          >
            <View style={styles.dropMarker}>
              <Icon name="location" size={18} color={T.black} />
            </View>
          </Marker>
        )}

        {riderLocation && (
          <Marker
            coordinate={riderLocation}
            title="You"
            description="Live rider location"
          >
            <View style={styles.riderMarker}>
              <Icon name="bicycle" size={20} color={T.black} />
            </View>
          </Marker>
        )}

        {routeLine.length >= 2 && (
          <Polyline
            coordinates={routeLine}
            strokeWidth={5}
            strokeColor={T.yellow}
          />
        )}
      </MapView>

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.goBack?.()}>
          <Icon name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>

        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle}>Live Delivery</Text>
          <Text style={styles.topSub}>
            #{order?.orderNumber || order?.id?.slice(0, 8) || "ORDER"}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={refreshOrder}>
          <Icon name="refresh" size={21} color={T.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.dragLine} />

        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>
              {String(order?.status || "TRACKING").replaceAll("_", " ")}
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              { borderColor: tracking ? T.green : T.border },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                { backgroundColor: tracking ? T.green : T.muted },
              ]}
            />
            <Text style={styles.liveText}>{tracking ? "LIVE" : "READY"}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.routePoint}>
            <View style={styles.smallIcon}>
              <Icon name="storefront-outline" size={17} color={T.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointLabel}>Pickup</Text>
              <Text style={styles.pointText} numberOfLines={1}>
                {vendor?.name || getPickupAddress(order)}
              </Text>
            </View>
          </View>

          <View style={styles.verticalLine} />

          <View style={styles.routePoint}>
            <View style={styles.smallIconGreen}>
              <Icon name="location-outline" size={17} color={T.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointLabel}>Drop</Text>
              <Text style={styles.pointText} numberOfLines={1}>
                {getDropAddress(order)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <MiniStat
            title="Earning"
            value={money(order?.deliveryFee)}
            icon="cash-outline"
          />
          <MiniStat
            title="Payment"
            value={order?.paymentMethod || "COD"}
            icon="card-outline"
          />
          <MiniStat
            title="Items"
            value={order?.items?.length || 0}
            icon="bag-outline"
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => callPhone(customer?.phone)}
          >
            <Icon name="call-outline" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => callPhone(vendor?.phone || vendor?.ownerMobileNo)}
          >
            <Icon name="storefront-outline" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Vendor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openMapAddress(getDropAddress(order))}
          >
            <Icon name="navigate-outline" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openMapAddress(getPickupAddress(order))}
          >
            <Icon name="storefront" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={startTracking}>
            <Icon name="radio-outline" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Track</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation?.navigate?.("RiderOrderDetail", {
                orderId: order?.id,
                order,
              })
            }
          >
            <Icon name="document-text-outline" size={20} color={T.yellow} />
            <Text style={styles.actionText}>Details</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.completeBtn}
          onPress={nextAction}
          activeOpacity={0.9}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={T.black} />
          ) : (
            <>
              <Text style={styles.completeText}>{actionLabel()}</Text>
              <Icon name="checkmark-circle" size={20} color={T.black} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MiniStat({ title, value, icon }: any) {
  return (
    <View style={styles.miniStat}>
      <Icon name={icon} size={18} color={T.yellow} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  map: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: T.muted,
    marginTop: 12,
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    top: 88,
    left: 18,
    right: 18,
    zIndex: 100,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: {
    color: T.black,
    fontWeight: "900",
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 18,
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleBox: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topTitle: {
    color: T.text,
    fontWeight: "900",
    fontSize: 15,
  },
  topSub: {
    color: T.muted,
    fontSize: 12,
    marginTop: 2,
  },
  pickupMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: T.black,
  },
  dropMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: T.black,
  },
  riderMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: T.yellow,
  },
  bottomSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: T.card,
    borderRadius: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  dragLine: {
    width: 42,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: T.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  statusValue: {
    color: T.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  liveBadge: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    color: T.text,
    fontSize: 12,
    fontWeight: "900",
  },
  infoCard: {
    marginTop: 14,
    backgroundColor: T.card2,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2B2207",
    alignItems: "center",
    justifyContent: "center",
  },
  smallIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.green,
    alignItems: "center",
    justifyContent: "center",
  },
  pointLabel: {
    color: T.yellow,
    fontSize: 11,
    fontWeight: "900",
  },
  pointText: {
    color: T.text,
    marginTop: 3,
    fontWeight: "800",
  },
  verticalLine: {
    width: 1,
    height: 20,
    backgroundColor: T.border,
    marginLeft: 18,
    marginVertical: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  miniStat: {
    flex: 1,
    backgroundColor: T.black,
    borderRadius: 18,
    padding: 11,
    borderWidth: 1,
    borderColor: T.border,
  },
  miniValue: {
    color: T.text,
    fontWeight: "900",
    marginTop: 7,
  },
  miniTitle: {
    color: T.muted,
    fontSize: 11,
    marginTop: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 17,
    backgroundColor: T.black,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionText: {
    color: T.text,
    fontWeight: "900",
    fontSize: 12,
  },
  completeBtn: {
    marginTop: 12,
    backgroundColor: T.yellow,
    borderRadius: 18,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  completeText: {
    color: T.black,
    fontSize: 15,
    fontWeight: "900",
  },
});