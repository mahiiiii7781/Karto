import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";

import apiClient from "@/api/apiClient";
import { cartService, CartItem } from "@/services/api/cartService";
import { orderService } from "@/services/api/orderService";
import { useAuth } from "@/context/AuthContext";
import { requireLogin } from "@/utils/authGuard";
const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  black: "#041008",
};

const DEFAULT_DELIVERY_FEE = 25;
const PLATFORM_FEE = 5;
const FREE_DELIVERY_ABOVE = 299;

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const params = route.params || {};

  const [cartItems, setCartItems] = useState<CartItem[]>(params.items || []);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [customerNote, setCustomerNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const total = Number(item.total_price ?? item.totalPrice ?? 0);
      const fallback = Number(item.price || 0) * Number(item.quantity || 0);
      return sum + (total || fallback);
    }, 0);
  }, [cartItems]);

  const deliveryFee =
    subtotal >= FREE_DELIVERY_ABOVE
      ? 0
      : Number(params.deliveryFee ?? DEFAULT_DELIVERY_FEE);

  const platformFee = Number(params.platformFee ?? PLATFORM_FEE);
  const total = subtotal + deliveryFee + platformFee;

  const normalizeAddresses = (res: any) => {
    const list =
      res?.data?.data ||
      res?.data?.addresses ||
      res?.data?.address ||
      res?.data ||
      [];

    return Array.isArray(list) ? list : [];
  };

  const loadCheckout = async () => {
    try {
      setLoading(true);

      const [cartRes, addressRes] = await Promise.all([
        cartService.getCartItems(),
        apiClient.get("/address"),
      ]);

      const items = cartRes.data || [];
      const savedAddresses = normalizeAddresses(addressRes);

      setCartItems(items);
      setAddresses(savedAddresses);

      setSelectedAddress((prev: any) => {
        if (prev?.id) {
          const exists = savedAddresses.find((x: any) => x.id === prev.id);
          if (exists) return exists;
        }

        return (
          savedAddresses.find((x: any) => x.isDefault || x.is_default) ||
          savedAddresses[0] ||
          null
        );
      });

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error: any) {
      console.log("CHECKOUT LOAD ERROR:", error?.response?.data || error?.message);
      Alert.alert("Error", "Failed to load checkout details.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCheckout();
    }, [])
  );

  const goToAddress = (address?: any) => {
    navigation.navigate("UserApp", {
      screen: "Profile",
      params: {
        screen: "Address",
        params: {
          editAddress: address || null,
          editAddressId: address?.id || null,
          fromCheckout: true,
        },
      },
    });
  };

  const validateOrder = () => {
    if (!cartItems.length) {
      Alert.alert("Cart Empty", "Please add items before placing order.");
      return false;
    }

    if (!addresses.length) {
      Alert.alert("Address Required", "Please add delivery address first.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add Address", onPress: () => goToAddress() },
      ]);
      return false;
    }

    if (!selectedAddress?.id) {
      Alert.alert("Address Required", "Please select delivery address.");
      return false;
    }

    if (subtotal <= 0) {
      Alert.alert("Invalid Cart", "Cart amount is invalid.");
      return false;
    }

    return true;
  };

  const placeCodOrder = async () => {
    const { data, error } = await orderService.createOrder({
      addressId: selectedAddress.id,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      customerNote: customerNote.trim() || null,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const placeOnlineOrder = async () => {
    const { data: createdOrder, error } = await orderService.createOrder({
      addressId: selectedAddress.id,
      paymentMethod: "ONLINE",
      paymentStatus: "PENDING",
      customerNote: customerNote.trim() || null,
    });

    if (error || !createdOrder?.id) {
      throw error || new Error("Karto order creation failed");
    }

    const razorOrderRes = await apiClient.post("/payments/create-order", {
      orderId: createdOrder.id,
    });

    const options = {
      description: "Karto Order Payment",
      currency: "INR",
      key: razorOrderRes.data?.key,
      amount: razorOrderRes.data?.amount,
      name: "Karto",
      order_id: razorOrderRes.data?.razorpayOrderId,
      prefill: {
        email: user?.email || "",
        contact: user?.phone || "",
        name: user?.fullName || "Karto User",
      },
      theme: { color: THEME.green },
    };

    const paymentData = await RazorpayCheckout.open(options);

    await apiClient.post("/payments/verify", {
      kartoOrderId: createdOrder.id,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    });

    return createdOrder;
  };

  const placeOrder = async () => {
    if (!validateOrder()) return;

    try {
      setPlacing(true);

      const order =
        paymentMethod === "COD"
          ? await placeCodOrder()
          : await placeOnlineOrder();

      await cartService.clearCart();

      Alert.alert("Order Placed 🎉", "Your order has been placed successfully.", [
        {
          text: "View Orders",
          onPress: () =>
            navigation.navigate("UserApp", {
              screen: "Orders",
              params: { orderId: order?.id },
            }),
        },
      ]);
    } catch (error: any) {
      console.log("ORDER ERROR:", error?.response?.data || error?.message || error);

      Alert.alert(
        "Order Failed",
        error?.message ||
          error?.response?.data?.message ||
          "Failed to place order."
      );
    } finally {
      setPlacing(false);
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await cartService.removeFromCart(itemId);

    if (error) {
      Alert.alert("Error", "Failed to remove item.");
      return;
    }

    setCartItems((prev) => prev.filter((x) => x.id !== itemId));
  };

  const getItemName = (item: CartItem) =>
    item.menuItem?.name || item.menu_item?.name || item.itemName || "Item";

  const getItemTotal = (item: CartItem) =>
    Number(item.totalPrice ?? item.total_price ?? 0) ||
    Number(item.price || 0) * Number(item.quantity || 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Preparing checkout...</Text>
      </View>
    );
  }

  if (!cartItems.length) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Icon name="cart-outline" size={60} color={THEME.green} />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Add items before checkout.</Text>

        <TouchableOpacity style={styles.greenBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.greenBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 145 }}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.green} />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSub}>Confirm address and payment</Text>
          </View>
        </View>

        <View style={styles.offerStrip}>
          <Icon name="shield-checkmark" size={18} color={THEME.green} />
          <Text style={styles.offerText}>
            Secure checkout • Fast delivery • Easy cancellation
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity onPress={() => goToAddress()}>
            <Text style={styles.linkText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <TouchableOpacity style={styles.emptyAddressCard} onPress={() => goToAddress()}>
            <Icon name="location-outline" size={38} color={THEME.green} />
            <Text style={styles.emptyAddressTitle}>No address added</Text>
            <Text style={styles.emptyAddressSub}>Tap here to add delivery address</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {addresses.map((addr) => {
              const active = selectedAddress?.id === addr.id;

              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressCard, active && styles.addressCardActive]}
                  onPress={() => setSelectedAddress(addr)}
                  activeOpacity={0.85}
                >
                  <View style={styles.addressTop}>
                    <Icon
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={active ? THEME.green : THEME.muted}
                    />

                    <TouchableOpacity onPress={() => goToAddress(addr)}>
                      <Icon name="create-outline" size={21} color={THEME.green} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.addressLabel}>
                    {addr.label || addr.type || "Address"}
                  </Text>

                  <Text style={styles.addressText} numberOfLines={3}>
                    {addr.address ||
                      addr.fullAddress ||
                      `${addr.houseNo || ""} ${addr.street || ""}`}
                  </Text>

                  {!!addr.landmark && (
                    <Text style={styles.landmark} numberOfLines={1}>
                      Landmark: {addr.landmark}
                    </Text>
                  )}

                  {!!addr.city && <Text style={styles.cityText}>{addr.city}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.sectionTitleSolo}>Order Items</Text>

        <View style={styles.card}>
          {cartItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index === cartItems.length - 1 && { borderBottomWidth: 0, marginBottom: 0 },
              ]}
            >
              <View style={styles.foodIcon}>
                <Icon name="fast-food-outline" size={24} color={THEME.green} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {getItemName(item)}
                </Text>
                <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                <Text style={styles.itemPrice}>
                  ₹{getItemTotal(item).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitleSolo}>Payment Method</Text>

        <View style={styles.paymentWrapper}>
          <PaymentOption
            active={paymentMethod === "COD"}
            icon="cash-outline"
            title="Cash on Delivery"
            subtitle="Pay when order arrives"
            onPress={() => setPaymentMethod("COD")}
          />

          <PaymentOption
            active={paymentMethod === "ONLINE"}
            icon="card-outline"
            title="Online Payment"
            subtitle="UPI / Card / Wallet with Razorpay"
            onPress={() => setPaymentMethod("ONLINE")}
          />
        </View>

        <Text style={styles.sectionTitleSolo}>Delivery Instructions</Text>

        <TextInput
          style={styles.noteInput}
          value={customerNote}
          onChangeText={setCustomerNote}
          placeholder="Any instruction for restaurant or rider?"
          placeholderTextColor={THEME.muted}
          multiline
          maxLength={200}
        />

        <Text style={styles.sectionTitleSolo}>Bill Details</Text>

        <View style={styles.card}>
          <BillRow label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
          <BillRow
            label="Delivery Fee"
            value={deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
            green={deliveryFee === 0}
          />
          <BillRow label="Platform Fee" value={`₹${platformFee.toFixed(2)}`} />
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={`₹${total.toFixed(2)}`} bold />
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total Payable</Text>
          <Text style={styles.footerTotal}>₹{total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.placeBtn, placing && { opacity: 0.65 }]}
          onPress={placeOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color={THEME.black} />
          ) : (
            <>
              <Text style={styles.placeText}>
                {paymentMethod === "COD" ? "Place Order" : "Pay & Place"}
              </Text>
              <Icon name="arrow-forward-circle" size={22} color={THEME.black} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PaymentOption = ({ active, icon, title, subtitle, onPress }: any) => (
  <TouchableOpacity
    style={[styles.paymentCard, active && styles.paymentCardActive]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.rowCenter}>
      <View style={[styles.paymentIcon, active && styles.paymentIconActive]}>
        <Icon name={icon} size={22} color={THEME.green} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.paymentTitle}>{title}</Text>
        <Text style={styles.paymentSub}>{subtitle}</Text>
      </View>
    </View>

    <Icon
      name={active ? "radio-button-on" : "radio-button-off"}
      size={23}
      color={active ? THEME.green : THEME.muted}
    />
  </TouchableOpacity>
);

const BillRow = ({ label, value, bold, green }: any) => (
  <View style={styles.billRow}>
    <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
    <Text style={[styles.billValue, bold && styles.billTotal, green && styles.freeText]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },

  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },

  emptyIcon: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 16,
  },

  emptySub: {
    color: THEME.muted,
    marginTop: 6,
  },

  greenBtn: {
    backgroundColor: THEME.green,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
  },

  greenBtnText: {
    color: THEME.black,
    fontWeight: "900",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: THEME.text,
    fontSize: 27,
    fontWeight: "900",
  },

  headerSub: {
    color: THEME.muted,
    marginTop: 2,
  },

  offerStrip: {
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: "#07150D",
    borderColor: "#173923",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  offerText: {
    flex: 1,
    color: THEME.green,
    fontWeight: "800",
    fontSize: 13,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionTitleSolo: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 20,
  },

  linkText: {
    color: THEME.green,
    fontWeight: "900",
  },

  emptyAddressCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
  },

  emptyAddressTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyAddressSub: {
    color: THEME.muted,
    marginTop: 5,
  },

  addressCard: {
    width: 260,
    minHeight: 155,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 22,
    padding: 15,
    marginRight: 12,
  },

  addressCardActive: {
    borderColor: THEME.green,
    backgroundColor: "#07150D",
  },

  addressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  addressLabel: {
    color: THEME.green,
    fontSize: 16,
    fontWeight: "900",
  },

  addressText: {
    color: THEME.text,
    marginTop: 6,
    lineHeight: 19,
  },

  landmark: {
    color: THEME.green,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },

  cityText: {
    color: THEME.muted,
    marginTop: 5,
    fontSize: 12,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },

  foodIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  itemName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },

  itemQty: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
  },

  itemPrice: {
    color: THEME.green,
    marginTop: 4,
    fontWeight: "900",
  },

  removeText: {
    color: THEME.danger,
    fontWeight: "900",
    fontSize: 12,
  },

  paymentWrapper: {
    marginHorizontal: 20,
    gap: 12,
  },

  paymentCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  paymentCardActive: {
    borderColor: THEME.green,
    backgroundColor: "#07150D",
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#07110B",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIconActive: {
    backgroundColor: "#12351F",
  },

  paymentTitle: {
    color: THEME.text,
    fontWeight: "900",
  },

  paymentSub: {
    color: THEME.muted,
    marginTop: 2,
    fontSize: 12,
  },

  noteInput: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    color: THEME.text,
    borderRadius: 20,
    padding: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: THEME.border,
    textAlignVertical: "top",
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  billLabel: {
    color: THEME.muted,
  },

  billValue: {
    color: THEME.text,
    fontWeight: "800",
  },

  billBold: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 16,
  },

  billTotal: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 18,
  },

  freeText: {
    color: THEME.green,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 8,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    padding: 16,
    paddingBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerLabel: {
    color: THEME.muted,
    fontSize: 12,
  },

  footerTotal: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 22,
  },

  placeBtn: {
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  placeText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
});