import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const T = {
  yellow: "#FACC15",
  green: "#22C55E",
  bg: "#070A08",
  card: "#101713",
  text: "#F8FAFC",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#030504",
};

const money = (v: any) => `₹${Number(v || 0).toFixed(0)}`;

export default function NewOrderPopup({
  visible,
  order,
  onAccept,
  onReject,
}: any) {
  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.top}>
            <View style={styles.iconCircle}>
              <Icon
                name="flash"
                size={28}
                color={T.yellow}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                New Delivery Request
              </Text>

              <Text style={styles.sub}>
                Order #{order.orderNumber}
              </Text>
            </View>
          </View>

          <View style={styles.info}>
            <Row
              icon="storefront-outline"
              value={
                order.restaurant?.name ||
                "Karto Store"
              }
            />

            <Row
              icon="location-outline"
              value={
                order.address?.address ||
                "Customer Location"
              }
            />

            <Row
              icon="cash-outline"
              value={money(order.deliveryFee)}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={onReject}
            >
              <Text style={styles.rejectText}>
                Reject
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>
                Accept Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ icon, value }: any) {
  return (
    <View style={styles.row}>
      <Icon
        name={icon}
        size={17}
        color={T.green}
      />
      <Text
        style={styles.rowText}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  card: {
    backgroundColor: T.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    borderTopWidth: 1,
    borderColor: T.border,
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: T.black,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: T.text,
    fontSize: 20,
    fontWeight: "900",
  },

  sub: {
    color: T.muted,
    marginTop: 4,
  },

  info: {
    marginTop: 20,
    gap: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  rowText: {
    flex: 1,
    color: T.text,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  rejectText: {
    color: "#DC2626",
    fontWeight: "900",
  },

  acceptBtn: {
    flex: 1.4,
    backgroundColor: T.yellow,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  acceptText: {
    color: T.black,
    fontWeight: "900",
  },
});