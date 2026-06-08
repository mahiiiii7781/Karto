import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Animated,
  StatusBar,
  Platform,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { cartService, CartItem } from "@/services/api/cartService";
import { orderService } from "@/services/api/orderService";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  surface: "#F9FAFC",
  green: "#22C55E",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  danger: "#EF4444",
  black: "#050807",
  white: "#FFFFFF",
};

const DEFAULT_CGST_RATE = 2.5;
const DEFAULT_SGST_RATE = 2.5;

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

type PaymentMethod = "COD" | "ONLINE" | "WALLET";

type BillSummary = {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  cgst: number;
  sgst: number;
  cgstRate: number;
  sgstRate: number;
  taxTotal: number;
  total: number;
};

const getOrderFromResponse = (value: any) => {
  return (
    value?.order ||
    value?.data?.order ||
    value?.data?.data?.order ||
    value?.data ||
    value
  );
};

const normalizeAddressText = (addr: any) => {
  if (!addr) return "Saved delivery address";

  const address = String(
    addr.address || addr.addressLine || addr.fullAddress || addr.full_address || ""
  ).trim();

  const landmark = String(addr.landmark || "").trim();
  const city = String(addr.city || addr.district || "").trim();
  const state = String(addr.state || addr.stateName || addr.state_name || "").trim();
  const pincode = String(addr.pincode || addr.pinCode || addr.pin_code || "").trim();

  const main = [address, landmark].filter(Boolean).join(", ");
  const tail = [city, state].filter(Boolean).join(", ");

  if (main && tail && pincode) return `${main}, ${tail} - ${pincode}`;
  if (main && tail) return `${main}, ${tail}`;
  if (main && pincode) return `${main} - ${pincode}`;
  if (main) return main;
  if (tail && pincode) return `${tail} - ${pincode}`;

  return "Saved delivery address";
};

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const params = route.params || {};
  const isGuest = !user?.id;

  const [cartItems, setCartItems] = useState<CartItem[]>(
    Array.isArray(params.items) ? params.items : []
  );
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const [customerNote, setCustomerNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [pricing, setPricing] = useState<any>(params.pricing || null);

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [refreshingBill, setRefreshingBill] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

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
      visibilityTime: 2300,
    });
  };

  const requireAuth = (message = "Please sign in to continue.") => {
    if (!isGuest) return true;

    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  const localSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const total = Number(item.total_price ?? item.totalPrice ?? 0);
      const fallback = Number(item.price || 0) * Number(item.quantity || 0);
      return sum + (total || fallback);
    }, 0);
  }, [cartItems]);

  const bill: BillSummary = useMemo(() => {
    const subtotal = Number(
      pricing?.subtotal ??
        pricing?.cartValue ??
        pricing?.cart_value ??
        params.subtotal ??
        localSubtotal
    );

    const deliveryFee = Number(
      pricing?.deliveryFee ?? pricing?.delivery_fee ?? params.deliveryFee ?? 0
    );

    const platformFee = Number(
      pricing?.platformFee ?? pricing?.platform_fee ?? params.platformFee ?? 0
    );

    const discount = Number(
      pricing?.discount ?? pricing?.discountAmount ?? pricing?.discount_amount ?? 0
    );

    const cgstRate = Number(
      pricing?.tax?.cgstRate ??
        pricing?.tax?.cgst_rate ??
        pricing?.cgstRate ??
        pricing?.cgst_rate ??
        DEFAULT_CGST_RATE
    );

    const sgstRate = Number(
      pricing?.tax?.sgstRate ??
        pricing?.tax?.sgst_rate ??
        pricing?.sgstRate ??
        pricing?.sgst_rate ??
        DEFAULT_SGST_RATE
    );

    const cgst = Number(
      pricing?.tax?.cgst ??
        pricing?.cgst ??
        pricing?.cgstAmount ??
        pricing?.cgst_amount ??
        (subtotal * cgstRate) / 100
    );

    const sgst = Number(
      pricing?.tax?.sgst ??
        pricing?.sgst ??
        pricing?.sgstAmount ??
        pricing?.sgst_amount ??
        (subtotal * sgstRate) / 100
    );

    const taxTotal = Number(
      pricing?.tax?.total ??
        pricing?.taxTotal ??
        pricing?.tax_total ??
        pricing?.taxAmount ??
        pricing?.tax_amount ??
        cgst + sgst
    );

    const total = Number(
      pricing?.grandTotal ??
        pricing?.totalAmount ??
        pricing?.total_amount ??
        params.total ??
        subtotal + deliveryFee + platformFee + taxTotal - discount
    );

    return {
      subtotal,
      deliveryFee,
      platformFee,
      discount,
      cgst,
      sgst,
      cgstRate,
      sgstRate,
      taxTotal,
      total,
    };
  }, [pricing, params, localSubtotal]);

  const itemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cartItems]);

  const normalizeAddresses = (res: any) => {
    const list =
      res?.data?.data ||
      res?.data?.addresses ||
      res?.data?.address ||
      res?.data ||
      [];

    return Array.isArray(list) ? list : [];
  };

  const normalizePricing = (res: any) => {
    return (
      res?.data?.pricing ||
      res?.data?.data?.pricing ||
      res?.data?.bill ||
      res?.data?.summary ||
      null
    );
  };

  const startIntroAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(14);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadCheckout = useCallback(async () => {
    if (isGuest) {
      setCartItems([]);
      setAddresses([]);
      setSelectedAddress(null);
      setLoading(false);
      startIntroAnimation();
      return;
    }

    try {
      setLoading(true);

      const [cartRes, addressRes, pricingRes] = await Promise.allSettled([
        cartService.getCartItems(),
        apiClient.get("/address"),
        apiClient.get("/cart/pricing"),
      ]);

      if (cartRes.status === "fulfilled") {
        const items = cartRes.value.data || [];
        setCartItems(Array.isArray(items) ? items : []);
      } else {
        setCartItems([]);
        showToast("error", "Unable to load cart", "Please try again.");
      }

      if (addressRes.status === "fulfilled") {
        const savedAddresses = normalizeAddresses(addressRes.value);
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
      } else {
        setAddresses([]);
        setSelectedAddress(null);
      }

      if (pricingRes.status === "fulfilled") {
        const nextPricing = normalizePricing(pricingRes.value);
        if (nextPricing) setPricing(nextPricing);
      }

      startIntroAnimation();
    } catch {
      showToast("error", "Unable to load checkout", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      loadCheckout();
    }, [loadCheckout])
  );

  const goToHome = () => {
    navigation.navigate("UserApp", { screen: "Home" });
  };

  const goToAddress = (address?: any) => {
    if (!requireAuth("Please sign in to add a delivery address.")) return;

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
    if (!requireAuth("Please sign in to place your order.")) return false;

    if (!cartItems.length) {
      showToast("info", "Cart is empty", "Please add items before checkout.");
      return false;
    }

    if (!addresses.length) {
      showToast("info", "Address required", "Please add a delivery address first.");
      goToAddress();
      return false;
    }

    if (!selectedAddress?.id) {
      showToast("info", "Address required", "Please select a delivery address.");
      return false;
    }

    if (bill.subtotal <= 0 || bill.total <= 0) {
      showToast("error", "Invalid cart", "Your cart amount is invalid.");
      return false;
    }

    return true;
  };

  const createOrderPayload = (method: PaymentMethod) => ({
    addressId: selectedAddress.id,
    paymentMethod: method,
    customerNote: customerNote.trim() || null,
    couponCode: (appliedCouponCode || couponCode).trim() || null,
  });

  const clearCartSilently = async () => {
    try {
      await cartService.clearCart();
    } catch {}
  };

  const placeCodOrder = async () => {
    const { data, error } = await orderService.createOrder(createOrderPayload("COD"));

    if (error) throw error;

    const order = getOrderFromResponse(data);

    if (!order?.id) {
      throw new Error("Order created but response format is invalid.");
    }

    return order;
  };

  const cancelCreatedOnlineOrder = async (orderId?: string, reason?: string) => {
    if (!orderId) return;

    try {
      await orderService.cancelOrder(
        orderId,
        reason || "Online payment was not completed"
      );
    } catch {
      // non-critical cleanup
    }
  };

  const placeOnlineOrder = async () => {
    let createdOrder: any = null;

    try {
      const { data, error } = await orderService.createOrder(
        createOrderPayload("ONLINE")
      );

      if (error) throw error;

      createdOrder = getOrderFromResponse(data);

      if (!createdOrder?.id) {
        throw new Error("Order created but response format is invalid.");
      }

      const payRes = await orderService.createPaymentOrder(createdOrder.id);

      if (payRes.error || !payRes.data) {
        await cancelCreatedOnlineOrder(
          createdOrder.id,
          "Online payment setup failed"
        );

        throw payRes.error || new Error("Payment setup failed.");
      }

      const razorData = payRes.data;

      const options = {
        description: "Karto Order Payment",
        currency: razorData.currency || "INR",
        key: razorData.key,
        amount: razorData.amount,
        name: "Karto",
        order_id: razorData.razorpayOrderId,
        prefill: {
          email: user?.email || "",
          contact: (user as any)?.phone || "",
          name: (user as any)?.fullName || (user as any)?.name || "Karto User",
        },
        theme: { color: THEME.orange },
      };

      const paymentData = await RazorpayCheckout.open(options);

      if (
        !paymentData?.razorpay_order_id ||
        !paymentData?.razorpay_payment_id ||
        !paymentData?.razorpay_signature
      ) {
        await cancelCreatedOnlineOrder(
          createdOrder.id,
          "Online payment verification details missing"
        );

        throw new Error("Payment verification details are missing.");
      }

      const verifyRes = await orderService.verifyPayment({
        kartoOrderId: createdOrder.id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      if (verifyRes.error) {
        await cancelCreatedOnlineOrder(
          createdOrder.id,
          "Online payment verification failed"
        );

        throw verifyRes.error;
      }

      return verifyRes.data || createdOrder;
    } catch (error: any) {
      const isCancelled =
        error?.code === 0 ||
        String(error?.description || error?.message || "")
          .toLowerCase()
          .includes("cancel");

      if (createdOrder?.id) {
        await cancelCreatedOnlineOrder(
          createdOrder.id,
          isCancelled
            ? "Online payment cancelled by customer"
            : "Online payment failed"
        );
      }

      throw error;
    }
  };

  const placeOrder = async () => {
    if (!validateOrder() || placing) return;

    try {
      setPlacing(true);

      const order =
        paymentMethod === "COD" ? await placeCodOrder() : await placeOnlineOrder();

      await clearCartSilently();

      showToast(
        "success",
        "Order placed successfully",
        paymentMethod === "ONLINE"
          ? "Payment received and your order is confirmed."
          : "Your order has been confirmed."
      );

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "UserApp",
            params: {
              screen: "Orders",
              params: {
                screen: "OrderDetail",
                params: { orderId: order?.id },
              },
            },
          },
        ],
      });
    } catch (error: any) {
      const isCancelled =
        error?.code === 0 ||
        String(error?.description || error?.message || "")
          .toLowerCase()
          .includes("cancel");

      const msg =
        error?.description ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to place your order. Please try again.";

      showToast(
        isCancelled ? "info" : "error",
        isCancelled
          ? "Payment cancelled"
          : paymentMethod === "ONLINE"
          ? "Payment or order failed"
          : "Order failed",
        msg
      );
    } finally {
      setPlacing(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!itemId || placing) return;
    if (!requireAuth("Please sign in to manage your cart.")) return;

    try {
      const { error } = await cartService.removeFromCart(itemId);

      if (error) {
        showToast("error", "Unable to remove item", error?.message || "Please try again.");
        return;
      }

      setCartItems(prev => prev.filter(x => x.id !== itemId));
      showToast("success", "Item removed");
      setTimeout(() => loadCheckout(), 250);
    } catch {
      showToast("error", "Unable to remove item", "Please try again.");
    }
  };

  const refreshPricing = async () => {
    if (refreshingBill) return;
    if (!requireAuth("Please sign in to refresh your bill.")) return;

    try {
      setRefreshingBill(true);
      const activeCoupon = (appliedCouponCode || couponCode).trim();

      const res = await apiClient.get("/cart/pricing", {
        params: activeCoupon ? { couponCode: activeCoupon } : undefined,
      });

      const nextPricing = normalizePricing(res);
      if (nextPricing) setPricing(nextPricing);
      showToast("success", "Bill refreshed", "Latest bill updated.");
    } catch {
      showToast("error", "Unable to refresh bill", "Please try again.");
    } finally {
      setRefreshingBill(false);
    }
  };

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      showToast("info", "Coupon code required", "Please enter a coupon code first.");
      return;
    }

    if (couponApplying || placing) return;

    try {
      setCouponApplying(true);

      const res = await apiClient.get("/cart/pricing", {
        params: { couponCode: code },
      });

      const nextPricing = normalizePricing(res);

      if (!nextPricing) {
        showToast("error", "Coupon failed", "Unable to validate coupon.");
        return;
      }

      const nextDiscount = Number(
        nextPricing?.discount ??
          nextPricing?.discountAmount ??
          nextPricing?.discount_amount ??
          0
      );

      setPricing(nextPricing);
      setAppliedCouponCode(code);
      setCouponCode(code);

      showToast(
        nextDiscount > 0 ? "success" : "info",
        nextDiscount > 0 ? "Coupon applied" : "Coupon checked",
        nextDiscount > 0
          ? `${code} saved ${money(nextDiscount)}`
          : "Coupon will be checked again while placing order."
      );
    } catch (error: any) {
      setAppliedCouponCode("");

      showToast(
        "error",
        "Invalid coupon",
        error?.response?.data?.message ||
          error?.message ||
          "This coupon cannot be applied."
      );
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = async () => {
    if (couponApplying || placing) return;

    try {
      setCouponApplying(true);
      setAppliedCouponCode("");
      setCouponCode("");

      const res = await apiClient.get("/cart/pricing");
      const nextPricing = normalizePricing(res);
      if (nextPricing) setPricing(nextPricing);

      showToast("success", "Coupon removed", "Bill updated successfully.");
    } catch {
      showToast("error", "Unable to remove coupon", "Please try again.");
    } finally {
      setCouponApplying(false);
    }
  };

  const getItemName = (item: CartItem) =>
    item.menuItem?.name || item.menu_item?.name || item.itemName || "Item";

  const getItemTotal = (item: CartItem) =>
    Number(item.totalPrice ?? item.total_price ?? 0) ||
    Number(item.price || 0) * Number(item.quantity || 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Preparing secure checkout...</Text>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

        <View style={styles.emptyIcon}>
          <Icon name="lock-closed-outline" size={56} color={THEME.orange} />
        </View>

        <Text style={styles.emptyTitle}>Login to checkout</Text>
        <Text style={styles.emptySub}>
          Continue browsing as guest or sign in to place your order securely.
        </Text>

        <TouchableOpacity
          style={styles.orangeBtn}
          onPress={() => navigation.navigate("Auth")}
          activeOpacity={0.9}
        >
          <Text style={styles.orangeBtnText}>Login / Signup</Text>
          <Icon name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={goToHome} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cartItems.length) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

        <View style={styles.emptyIcon}>
          <Icon name="cart-outline" size={60} color={THEME.orange} />
        </View>

        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Add items from nearby stores before checkout.</Text>

        <TouchableOpacity style={styles.orangeBtn} onPress={goToHome} activeOpacity={0.9}>
          <Text style={styles.orangeBtnText}>Explore Stores</Text>
          <Icon name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={THEME.blue} />
          </TouchableOpacity>

          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSub}>
              {itemCount} item{itemCount > 1 ? "s" : ""} • Secure checkout
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, refreshingBill && { opacity: 0.7 }]}
            onPress={refreshPricing}
            disabled={refreshingBill}
          >
            {refreshingBill ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <Icon name="refresh" size={19} color={THEME.white} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTag}>KARTO CHECKOUT</Text>
            <Text style={styles.heroTitle}>Almost there!</Text>
            <Text style={styles.heroSub}>Confirm address, payment and bill details.</Text>
          </View>

          <View style={styles.heroIcon}>
            <Icon name="shield-checkmark-outline" size={34} color={THEME.white} />
          </View>
        </View>

        <View style={styles.offerStrip}>
          <Icon name="checkmark-circle" size={18} color={THEME.orange} />
          <Text style={styles.offerText}>Verified bill • Fresh packing • Fast support</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity onPress={() => goToAddress()}>
            <Text style={styles.linkText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <TouchableOpacity style={styles.emptyAddressCard} onPress={() => goToAddress()}>
            <Icon name="location-outline" size={38} color={THEME.orange} />
            <Text style={styles.emptyAddressTitle}>No address added</Text>
            <Text style={styles.emptyAddressSub}>Tap here to add your delivery address.</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.addressList}
          >
            {addresses.map((addr, index) => {
              const active = selectedAddress?.id === addr.id;

              return (
                <TouchableOpacity
                  key={addr.id || String(index)}
                  style={[styles.addressCard, active && styles.addressCardActive]}
                  onPress={() => setSelectedAddress(addr)}
                  activeOpacity={0.85}
                >
                  <View style={styles.addressTop}>
                    <Icon
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={active ? THEME.orange : THEME.muted}
                    />

                    <TouchableOpacity onPress={() => goToAddress(addr)}>
                      <Icon name="create-outline" size={21} color={THEME.orange} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.addressLabel}>
                    {addr.label || addr.type || "Address"}
                  </Text>

                  <Text style={styles.addressText} numberOfLines={3}>
                    {normalizeAddressText(addr)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.sectionTitleSolo}>Order Items</Text>

        <View style={styles.card}>
          {cartItems.map((item, index) => (
            <View
              key={item.id || String(index)}
              style={[
                styles.itemRow,
                index === cartItems.length - 1 && styles.lastItemRow,
              ]}
            >
              <View style={styles.foodIcon}>
                <Icon name="fast-food-outline" size={24} color={THEME.orange} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {getItemName(item)}
                </Text>
                <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
                <Text style={styles.itemPrice}>{money(getItemTotal(item))}</Text>
              </View>

              <TouchableOpacity onPress={() => removeItem(item.id)} disabled={placing}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitleSolo}>Apply Coupon</Text>

        <View style={styles.couponCard}>
          <View style={styles.couponIcon}>
            <Icon name="pricetag-outline" size={21} color={THEME.white} />
          </View>

          <TextInput
            value={couponCode}
            onChangeText={text => setCouponCode(text.toUpperCase())}
            placeholder="Enter coupon code"
            placeholderTextColor={THEME.muted}
            autoCapitalize="characters"
            style={styles.couponInput}
          />

          {appliedCouponCode ? (
            <TouchableOpacity
              style={styles.removeCouponBtn}
              onPress={removeCoupon}
              disabled={couponApplying || placing}
            >
              {couponApplying ? (
                <ActivityIndicator size="small" color={THEME.white} />
              ) : (
                <Text style={styles.applyCouponText}>Remove</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.applyCouponBtn}
              onPress={applyCoupon}
              disabled={couponApplying || placing}
            >
              {couponApplying ? (
                <ActivityIndicator size="small" color={THEME.white} />
              ) : (
                <Text style={styles.applyCouponText}>Apply</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitleSolo}>Payment Method</Text>

        <View style={styles.paymentWrapper}>
          <PaymentOption
            active={paymentMethod === "COD"}
            icon="cash-outline"
            title="Cash on Delivery"
            subtitle="Pay when your order arrives"
            badge="Available"
            onPress={() => setPaymentMethod("COD")}
          />

          <PaymentOption
            active={paymentMethod === "ONLINE"}
            icon="card-outline"
            title="Online Payment"
            subtitle="UPI, cards, wallets and net banking"
            badge="Razorpay Test"
            onPress={() => setPaymentMethod("ONLINE")}
          />
        </View>

        {paymentMethod === "ONLINE" ? (
          <InfoBox
            icon="lock-closed-outline"
            color="orange"
            text="Payment is processed securely with Razorpay test mode and confirmed after verification."
          />
        ) : (
          <InfoBox
            icon="cash-outline"
            color="blue"
            text="Please keep the payable amount ready at delivery."
          />
        )}

        <Text style={styles.sectionTitleSolo}>Delivery Instructions</Text>

        <TextInput
          style={styles.noteInput}
          value={customerNote}
          onChangeText={setCustomerNote}
          placeholder="Any instruction for store or rider?"
          placeholderTextColor={THEME.muted}
          multiline
          maxLength={200}
        />
        <Text style={styles.noteCounter}>{customerNote.length}/200</Text>

        <View style={styles.billHeader}>
          <Text style={styles.sectionTitle}>Bill Details</Text>

          <TouchableOpacity onPress={() => setBillModalVisible(true)}>
            <Text style={styles.linkText}>View Full Bill</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <BillRow label="Cart Value" value={money(bill.subtotal)} />
          <BillRow label="Delivery Fee" value={money(bill.deliveryFee)} />
          <BillRow label="Platform Fee" value={money(bill.platformFee)} />

          {bill.discount > 0 && (
            <BillRow label="Discount" value={`- ${money(bill.discount)}`} green />
          )}

          <View style={styles.taxRow}>
            <View style={styles.taxLeft}>
              <Text style={styles.billLabel}>Tax</Text>
              <TouchableOpacity onPress={() => setTaxModalVisible(true)}>
                <Icon name="information-circle-outline" size={17} color={THEME.orange} />
              </TouchableOpacity>
            </View>

            <Text style={styles.billValue}>{money(bill.taxTotal)}</Text>
          </View>

          <View style={styles.divider} />

          <BillRow label="Total Amount" value={money(bill.total)} bold />
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>
            {paymentMethod === "ONLINE"
              ? "Pay Online"
              : paymentMethod === "WALLET"
              ? "Pay using Wallet"
              : "Pay on Delivery"}
          </Text>
          <Text style={styles.footerTotal}>{money(bill.total)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.placeBtn, placing && styles.disabledPlaceBtn]}
          onPress={placeOrder}
          disabled={placing}
          activeOpacity={0.9}
        >
          {placing ? (
            <ActivityIndicator color={THEME.white} />
          ) : (
            <>
              <Text style={styles.placeText}>
                {paymentMethod === "COD" ? "Place Order" : "Pay Securely"}
              </Text>
              <Icon name="arrow-forward-circle" size={22} color={THEME.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <TaxModal
        visible={taxModalVisible}
        onClose={() => setTaxModalVisible(false)}
        bill={bill}
      />

      <BillModal
        visible={billModalVisible}
        onClose={() => setBillModalVisible(false)}
        bill={bill}
      />
    </View>
  );
}

const InfoBox = ({ icon, color, text }: any) => {
  const isOrange = color === "orange";

  return (
    <View style={isOrange ? styles.paymentInfoBox : styles.codInfoBox}>
      <Icon
        name={icon}
        size={18}
        color={isOrange ? THEME.orange : THEME.blue}
      />
      <Text style={isOrange ? styles.paymentInfoText : styles.codInfoText}>{text}</Text>
    </View>
  );
};

const PaymentOption = ({ active, icon, title, subtitle, badge, onPress }: any) => (
  <TouchableOpacity
    style={[styles.paymentCard, active && styles.paymentCardActive]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.rowCenter}>
      <View style={[styles.paymentIcon, active && styles.paymentIconActive]}>
        <Icon name={icon} size={22} color={active ? THEME.white : THEME.orange} />
      </View>

      <View style={styles.paymentTextBox}>
        <View style={styles.paymentTitleRow}>
          <Text style={styles.paymentTitle}>{title}</Text>
          {!!badge && <Text style={styles.paymentBadge}>{badge}</Text>}
        </View>

        <Text style={styles.paymentSub}>{subtitle}</Text>
      </View>
    </View>

    <Icon
      name={active ? "radio-button-on" : "radio-button-off"}
      size={23}
      color={active ? THEME.orange : THEME.muted}
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

const TaxModal = ({ visible, onClose, bill }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.taxModal}>
        <View style={styles.taxIconBox}>
          <Icon name="receipt-outline" size={30} color={THEME.orange} />
        </View>

        <Text style={styles.taxTitle}>Tax Details</Text>
        <Text style={styles.taxSub}>CGST and SGST are calculated on your cart value.</Text>

        <View style={styles.taxBreakBox}>
          <BillRow
            label={`CGST (${Number(bill.cgstRate || 0).toFixed(2)}%)`}
            value={money(bill.cgst)}
          />
          <BillRow
            label={`SGST (${Number(bill.sgstRate || 0).toFixed(2)}%)`}
            value={money(bill.sgst)}
          />
          <View style={styles.divider} />
          <BillRow label="Total Tax" value={money(bill.taxTotal)} bold />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const BillModal = ({ visible, onClose, bill }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.taxModal}>
        <View style={styles.taxIconBox}>
          <Icon name="document-text-outline" size={30} color={THEME.orange} />
        </View>

        <Text style={styles.taxTitle}>Complete Bill</Text>
        <Text style={styles.taxSub}>Final payable amount includes all charges.</Text>

        <View style={styles.taxBreakBox}>
          <BillRow label="Cart Value" value={money(bill.subtotal)} />
          <BillRow label="Delivery Fee" value={money(bill.deliveryFee)} />
          <BillRow label="Platform Fee" value={money(bill.platformFee)} />
          <BillRow label="CGST" value={money(bill.cgst)} />
          <BillRow label="SGST" value={money(bill.sgst)} />
          <BillRow label="Total Tax" value={money(bill.taxTotal)} />
          {bill.discount > 0 && (
            <BillRow label="Discount" value={`- ${money(bill.discount)}`} green />
          )}
          <View style={styles.divider} />
          <BillRow label="Total Amount" value={money(bill.total)} bold />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
  emptyIcon: {
    width: 106,
    height: 106,
    borderRadius: 36,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 16,
  },
  emptySub: {
    color: THEME.muted,
    marginTop: 6,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  orangeBtn: {
    backgroundColor: THEME.orange,
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  orangeBtnText: {
    color: THEME.white,
    fontWeight: "900",
  },
  secondaryBtn: {
    marginTop: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: THEME.orange,
    fontWeight: "900",
  },
  scrollContent: {
    paddingBottom: 170,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextBox: {
    flex: 1,
  },
  iconBtn: {
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
  headerTitle: {
    color: THEME.blue,
    fontSize: 27,
    fontWeight: "900",
  },
  headerSub: {
    color: THEME.muted,
    marginTop: 2,
    fontWeight: "700",
  },
  heroBanner: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  heroContent: {
    flex: 1,
  },
  heroTag: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  heroSub: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: "700",
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  offerStrip: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: THEME.orangeSoft,
    borderColor: "#FFD6C8",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  offerText: {
    flex: 1,
    color: THEME.orange,
    fontWeight: "900",
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
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionTitleSolo: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  billHeader: {
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    color: THEME.orange,
    fontWeight: "900",
  },
  emptyAddressCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    ...shadow,
  },
  emptyAddressTitle: {
    color: THEME.blue,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyAddressSub: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
  },
  addressList: {
    paddingHorizontal: 20,
  },
  addressCard: {
    width: 260,
    minHeight: 145,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 15,
    marginRight: 12,
    ...shadow,
  },
  addressCardActive: {
    borderColor: THEME.orange,
    backgroundColor: THEME.orangeSoft,
  },
  addressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  addressLabel: {
    color: THEME.orange,
    fontSize: 16,
    fontWeight: "900",
  },
  addressText: {
    color: THEME.blue,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 15,
    ...shadow,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  lastItemRow: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  foodIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
  },
  itemQty: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },
  itemPrice: {
    color: THEME.orange,
    marginTop: 4,
    fontWeight: "900",
  },
  removeText: {
    color: THEME.danger,
    fontWeight: "900",
    fontSize: 12,
  },
  couponCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  couponIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  couponInput: {
    flex: 1,
    color: THEME.blue,
    fontWeight: "800",
    paddingVertical: 8,
  },
  applyCouponBtn: {
    backgroundColor: THEME.orange,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
  },
  removeCouponBtn: {
    backgroundColor: THEME.danger,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
  },
  applyCouponText: {
    color: THEME.white,
    fontWeight: "900",
  },
  paymentWrapper: {
    marginHorizontal: 20,
    gap: 12,
  },
  paymentCard: {
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadow,
  },
  paymentCardActive: {
    borderColor: THEME.orange,
    backgroundColor: THEME.orangeSoft,
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
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconActive: {
    backgroundColor: THEME.orange,
  },
  paymentTextBox: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  paymentTitle: {
    color: THEME.blue,
    fontWeight: "900",
  },
  paymentBadge: {
    color: THEME.white,
    backgroundColor: THEME.orange,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    fontSize: 9,
    fontWeight: "900",
  },
  paymentSub: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },
  paymentInfoBox: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: THEME.orangeSoft,
    borderWidth: 1,
    borderColor: "#FFD6C8",
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  paymentInfoText: {
    flex: 1,
    color: THEME.orange,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  codInfoBox: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    ...shadow,
  },
  codInfoText: {
    flex: 1,
    color: THEME.blue,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  noteInput: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    color: THEME.blue,
    borderRadius: 18,
    padding: 14,
    minHeight: 90,
    textAlignVertical: "top",
    fontWeight: "700",
    ...shadow,
  },
  noteCounter: {
    color: THEME.muted,
    textAlign: "right",
    marginHorizontal: 22,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  taxLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billLabel: {
    color: THEME.muted,
    fontWeight: "800",
  },
  billValue: {
    color: THEME.blue,
    fontWeight: "900",
  },
  billBold: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 16,
  },
  billTotal: {
    color: THEME.orange,
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
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadow,
  },
  footerLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  footerTotal: {
    color: THEME.orange,
    fontWeight: "900",
    fontSize: 22,
  },
  placeBtn: {
    backgroundColor: THEME.orange,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 146,
    justifyContent: "center",
    ...shadow,
  },
  disabledPlaceBtn: {
    opacity: 0.65,
  },
  placeText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  taxModal: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  taxIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  taxTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
  },
  taxSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  taxBreakBox: {
    alignSelf: "stretch",
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
  },
  modalBtn: {
    marginTop: 18,
    backgroundColor: THEME.orange,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
  },
  modalBtnText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
