import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Sound from "react-native-sound";
import { SafeAreaView } from "react-native-safe-area-context";
import { riderApi } from "../../services/api/riderApi";

Sound.setCategory("Playback");

type OrderStatus = "NEW" | "ACCEPTED" | "PICKED" | "DELIVERED";

type RiderOrder = {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  distanceKm: number;
  earning: number;
  paymentMethod: "COD" | "ONLINE";
  amount: number;
  status: OrderStatus;
};

const THEME = {
  black: "#050807",
  black2: "#0B0F0A",
  card: "#101510",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#FFFFFF",
  muted: "#A7B0AA",
  border: "#2C382E",
  danger: "#EF4444",
};

export default function RiderHomeScreen() {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<RiderOrder | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const alarmRef = useRef<Sound | null>(null);

  useEffect(() => {
    alarmRef.current = new Sound("new_order.mp3", Sound.MAIN_BUNDLE, error => {
      if (error) console.log("Sound load error:", error);
    });

    fetchNewOrders();

    const interval = setInterval(fetchNewOrders, 8000);

    return () => {
      clearInterval(interval);
      alarmRef.current?.release();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const playAlarm = () => {
    alarmRef.current?.stop(() => {
      alarmRef.current?.play();
    });
  };

  const fetchNewOrders = async () => {
    try {
      const data = await riderApi.getNewOrders();

      if (data.success && Array.isArray(data.orders)) {
        if (data.orders.length > orders.length && !activeOrder) {
          playAlarm();
        }
        setOrders(data.orders);
      }
    } catch (e) {
      console.log("New orders error:", e);
    }
  };

  const openMap = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const acceptOrder = async (order: RiderOrder) => {
    setLoading(true);
    try {
      const data = await riderApi.acceptOrder(order.id);

      if (!data.success) {
        Alert.alert("Failed", data.message || "Could not accept order");
        return;
      }

      const updated = { ...order, status: "ACCEPTED" as OrderStatus };
      setActiveOrder(updated);
      setOrders(prev => prev.filter(x => x.id !== order.id));
      alarmRef.current?.stop();
    } finally {
      setLoading(false);
    }
  };

  const markPicked = async () => {
    if (!activeOrder) return;

    setLoading(true);
    try {
      const data = await riderApi.markPicked(activeOrder.id);

      if (!data.success) {
        Alert.alert("Failed", data.message || "Could not mark picked");
        return;
      }

      setActiveOrder({ ...activeOrder, status: "PICKED" });
    } finally {
      setLoading(false);
    }
  };

  const completeOrder = async () => {
    if (!activeOrder) return;

    setLoading(true);
    try {
      const data = await riderApi.completeOrder(activeOrder.id);

      if (!data.success) {
        Alert.alert("Failed", data.message || "Could not complete order");
        return;
      }

      Alert.alert("Delivered", "Order delivered successfully.");
      setActiveOrder(null);
      fetchNewOrders();
    } finally {
      setLoading(false);
    }
  };

  const renderNewOrder = ({ item }: { item: RiderOrder }) => (
    <Animated.View style={[styles.orderCard, { transform: [{ scale: pulse }] }]}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.orderNo}>#{item.orderNo}</Text>
          <Text style={styles.customer}>{item.customerName}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>NEW</Text>
        </View>
      </View>

      <View style={styles.locationBox}>
        <Icon name="storefront" size={20} color={THEME.green} />
        <Text style={styles.address}>{item.pickupAddress}</Text>
      </View>

      <View style={styles.locationBox}>
        <Icon name="location" size={20} color={THEME.yellow} />
        <Text style={styles.address}>{item.dropAddress}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.distanceKm} km</Text>
        <Text style={styles.meta}>Earning ₹{item.earning}</Text>
      </View>

      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(item)} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={THEME.black} />
        ) : (
          <>
            <Text style={styles.acceptText}>Accept Order</Text>
            <Icon name="checkmark-circle" size={20} color={THEME.black} />
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Karto Rider</Text>
          <Text style={styles.sub}>Professional delivery partner panel</Text>
        </View>

        <View style={styles.onlineBadge}>
          <View style={styles.dot} />
          <Text style={styles.onlineText}>ONLINE</Text>
        </View>
      </View>

      {activeOrder ? (
        <View style={styles.activeCard}>
          <Text style={styles.sectionTitle}>Active Delivery</Text>

          <Text style={styles.orderNo}>#{activeOrder.orderNo}</Text>
          <Text style={styles.customer}>{activeOrder.customerName}</Text>

          <TouchableOpacity
            style={styles.locationBox}
            onPress={() => openMap(activeOrder.pickupLat, activeOrder.pickupLng)}
          >
            <Icon name="storefront" size={20} color={THEME.green} />
            <Text style={styles.address}>{activeOrder.pickupAddress}</Text>
            <Icon name="navigate" size={18} color={THEME.green} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationBox}
            onPress={() => openMap(activeOrder.dropLat, activeOrder.dropLng)}
          >
            <Icon name="location" size={20} color={THEME.yellow} />
            <Text style={styles.address}>{activeOrder.dropAddress}</Text>
            <Icon name="navigate" size={18} color={THEME.yellow} />
          </TouchableOpacity>

          {activeOrder.status === "PICKED" && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentLabel}>Payment visible at delivery location</Text>
              <Text style={styles.paymentAmount}>₹{activeOrder.amount}</Text>
              <Text style={styles.paymentMethod}>{activeOrder.paymentMethod}</Text>
            </View>
          )}

          {activeOrder.status === "ACCEPTED" && (
            <TouchableOpacity style={styles.acceptBtn} onPress={markPicked} disabled={loading}>
              <Text style={styles.acceptText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {activeOrder.status === "PICKED" && (
            <TouchableOpacity style={styles.deliverBtn} onPress={completeOrder} disabled={loading}>
              <Text style={styles.acceptText}>Delivered Order</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>New Orders</Text>

          <FlatList
            data={orders}
            keyExtractor={item => item.id}
            renderItem={renderNewOrder}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Icon name="bicycle" size={56} color={THEME.yellow} />
                <Text style={styles.emptyTitle}>Waiting for orders</Text>
                <Text style={styles.emptySub}>Alarm will ring when a new order arrives.</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.black,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  appName: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
  },
  sub: {
    color: THEME.muted,
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102417",
    borderColor: THEME.green,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 6,
  },
  onlineText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 11,
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  orderCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 7,
  },
  activeCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNo: {
    color: THEME.yellow,
    fontSize: 18,
    fontWeight: "900",
  },
  customer: {
    color: THEME.text,
    fontSize: 16,
    marginTop: 4,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: THEME.yellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 11,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.black2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 13,
    marginTop: 12,
    gap: 10,
  },
  address: {
    color: THEME.text,
    flex: 1,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  meta: {
    color: THEME.muted,
    fontWeight: "700",
  },
  acceptBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  deliverBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
  paymentBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#2A2308",
    borderWidth: 1,
    borderColor: THEME.yellow,
  },
  paymentLabel: {
    color: THEME.muted,
    fontSize: 12,
  },
  paymentAmount: {
    color: THEME.yellow,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  paymentMethod: {
    color: THEME.text,
    fontWeight: "900",
    marginTop: 4,
  },
  emptyBox: {
    marginTop: 70,
    alignItems: "center",
    backgroundColor: THEME.card,
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
  },
  emptySub: {
    color: THEME.muted,
    marginTop: 6,
    textAlign: "center",
  },
});