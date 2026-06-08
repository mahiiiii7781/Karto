import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { cartService, CartItem } from "@/services/api/cartService";
import { useAuth } from "@/context/AuthContext";

const THEME = {
  bg: "#F5F6FA",
  card: "#FFFFFF",
  card2: "#EEF2F7",
  green: "#22C55E",
  orange: "#FF4D18",
  orangeSoft: "#FFF0EA",
  blue: "#0D4563",
  text: "#123047",
  muted: "#748494",
  border: "#E4E8EF",
  black: "#050807",
  danger: "#EF4444",
  white: "#FFFFFF",
};

const DELIVERY_FEE = 25;
const PLATFORM_FEE = 5;
const FREE_DELIVERY_ABOVE = 299;

const money = (value: any) => `₹${Number(value || 0).toFixed(2)}`;

const getCustomizationText = (item: any) => {
  const raw = item?.customizationJson || item?.customization_json;
  if (!raw) return "Regular";

  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (Array.isArray(value)) {
      const names = value
        .map((x: any) => x?.name || x?.title || x?.label || x)
        .filter(Boolean);
      return names.length ? names.join(", ") : "Custom";
    }

    if (typeof value === "object") {
      const names = Object.values(value)
        .map((x: any) => (typeof x === "object" ? x?.name || x?.title || x?.label : x))
        .filter(Boolean);
      return names.length ? names.join(", ") : "Custom";
    }

    return String(value);
  } catch {
    return "Custom";
  }
};

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [clearing, setClearing] = useState(false);

  const isGuest = !user?.id;

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
      visibilityTime: 1800,
    });
  };

  const requireAuth = (message = "Please sign in to continue.") => {
    if (!isGuest) return true;

    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  const loadCartItems = useCallback(
    async (isRefresh = false) => {
      if (isGuest) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const { data, error } = await cartService.getCartItems();

        if (error) {
          setItems([]);
          showToast("error", "Unable to load cart", error?.message || "Please try again.");
          return;
        }

        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
        showToast("error", "Something went wrong", "Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isGuest]
  );

  useFocusEffect(
    useCallback(() => {
      loadCartItems(false);
    }, [loadCartItems])
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const total = Number(item.total_price ?? item.totalPrice ?? 0);
        const fallback = Number(item.price || 0) * Number(item.quantity || 0);
        return sum + (total || fallback);
      }, 0),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee + PLATFORM_FEE;
  const remainingForFreeDelivery = Math.max(FREE_DELIVERY_ABOVE - subtotal, 0);

  const confirmClearCart = () => {
    if (items.length === 0) return;
    setClearModalVisible(true);
  };

  const clearCart = async () => {
    if (!requireAuth("Please sign in to manage your cart.")) return;

    try {
      setClearing(true);

      const { error } = await cartService.clearCart();

      if (error) {
        showToast("error", "Unable to clear cart", error?.message || "Please try again.");
        return;
      }

      setItems([]);
      setClearModalVisible(false);
      showToast("success", "Cart cleared", "All items removed.");
    } catch {
      showToast("error", "Unable to clear cart", "Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!itemId || updatingId) return;
    if (!requireAuth("Please sign in to manage your cart.")) return;

    setUpdatingId(itemId);

    try {
      const { error } = await cartService.removeFromCart(itemId);

      if (error) {
        showToast("error", "Unable to remove item", error?.message || "Please try again.");
        return;
      }

      setItems(prev => prev.filter(i => i.id !== itemId));
      showToast("success", "Item removed");
    } catch {
      showToast("error", "Unable to remove item", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateQuantity = async (item: CartItem, nextQty: number) => {
    if (!item?.id || updatingId) return;
    if (!requireAuth("Please sign in to manage your cart.")) return;

    if (nextQty < 1) {
      await removeItem(item.id);
      return;
    }

    setUpdatingId(item.id);

    try {
      const { error } = await cartService.updateCartItem(item.id, nextQty);

      if (error) {
        showToast("error", "Unable to update quantity", error?.message || "Please try again.");
        return;
      }

      setItems(prev =>
        prev.map(x =>
          x.id === item.id
            ? {
                ...x,
                quantity: nextQty,
                total_price: Number(x.price || 0) * nextQty,
                totalPrice: Number(x.price || 0) * nextQty,
              }
            : x
        )
      );
    } catch {
      showToast("error", "Unable to update quantity", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getItemImage = (item: CartItem) =>
    item.menu_item?.image_url ||
    item.menu_item?.imageUrl ||
    item.menuItem?.image_url ||
    item.menuItem?.imageUrl ||
    item.restaurant?.image_url ||
    item.restaurant?.imageUrl ||
    "";

  const getItemName = (item: CartItem) =>
    item.itemName ||
    item.menu_item?.name ||
    item.menuItem?.name ||
    "Cart Item";

  const getRestaurantName = (item: CartItem) =>
    item.restaurant?.restaurant_name || item.restaurant?.name || "Karto Store";

  const goToHome = () => {
    navigation.navigate("UserApp", { screen: "Home" });
  };

  const goToCheckout = () => {
    if (!requireAuth("Please sign in to continue checkout.")) return;

    if (items.length === 0) {
      showToast("info", "Cart is empty", "Please add items before checkout.");
      return;
    }

    navigation.navigate("Checkout", {
      subtotal,
      deliveryFee,
      platformFee: PLATFORM_FEE,
      total: grandTotal,
      items,
    });
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const disabled = updatingId === item.id;
    const imageUri = getItemImage(item);
    const lineTotal =
      Number(item.total_price ?? item.totalPrice ?? 0) ||
      Number(item.price || 0) * Number(item.quantity || 0);

    return (
      <View style={styles.cartBox}>
        <View style={styles.itemMain}>
          <View style={styles.itemInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {getItemName(item)}
            </Text>
            <Text style={styles.storeText} numberOfLines={1}>
              {getRestaurantName(item)}
            </Text>
          </View>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Icon name="fast-food" size={28} color={THEME.orange} />
            </View>
          )}
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Text style={styles.optionLabel}>Size</Text>
            <Text style={styles.optionValue} numberOfLines={1}>
              {getCustomizationText(item)}
            </Text>
            <Icon name="chevron-down" size={14} color={THEME.orange} />
          </View>

          <Text style={styles.priceText}>{money(lineTotal)}</Text>

          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, disabled && styles.disabledBtn]}
              disabled={disabled}
              onPress={() => updateQuantity(item, Number(item.quantity) - 1)}
              activeOpacity={0.85}
            >
              <Icon name="remove" size={14} color={THEME.white} />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{Number(item.quantity || 0)}</Text>

            <TouchableOpacity
              style={[styles.qtyBtn, disabled && styles.disabledBtn]}
              disabled={disabled}
              onPress={() => updateQuantity(item, Number(item.quantity) + 1)}
              activeOpacity={0.85}
            >
              <Icon name="add" size={14} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </View>

        {!!item.note && (
          <View style={styles.noteBox}>
            <Icon name="reader-outline" size={13} color={THEME.orange} />
            <Text style={styles.noteText} numberOfLines={1}>
              {item.note}
            </Text>
          </View>
        )}

        <TouchableOpacity
          disabled={disabled}
          onPress={() => removeItem(item.id)}
          style={styles.removeLine}
          activeOpacity={0.85}
        >
          {disabled ? (
            <ActivityIndicator size="small" color={THEME.orange} />
          ) : (
            <>
              <Icon name="trash-outline" size={14} color={THEME.danger} />
              <Text style={styles.removeText}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Preparing your cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.blue} />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.heading}>My Cart</Text>
          <Text style={styles.subHeading}>
            {itemCount > 0
              ? `${itemCount} item${itemCount > 1 ? "s" : ""} added`
              : isGuest
              ? "Login to sync your cart"
              : "Your cart is empty"}
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            onPress={confirmClearCart}
            style={styles.clearBtn}
            activeOpacity={0.85}
          >
            <Icon name="trash-outline" size={18} color={THEME.orange} />
          </TouchableOpacity>
        )}
      </View>

      {items.length > 0 && (
        <View style={styles.offerStrip}>
          <Icon name="flash" size={18} color={THEME.orange} />
          <Text style={styles.offerText}>
            {remainingForFreeDelivery > 0
              ? `Add ₹${remainingForFreeDelivery.toFixed(0)} more for free delivery`
              : "Free delivery unlocked"}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item, index) => item?.id || String(index)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCartItems(true)}
            tintColor={THEME.orange}
            colors={[THEME.orange]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={isGuest ? "person-circle-outline" : "cart-outline"}
                size={54}
                color={THEME.orange}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {isGuest ? "Guest cart is empty" : "Your cart is empty"}
            </Text>

            <Text style={styles.emptyText}>
              {isGuest
                ? "Login to save items, checkout faster, and track orders."
                : "Add fresh picks from nearby stores and checkout in seconds."}
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={isGuest ? () => navigation.navigate("Auth") : goToHome}
              activeOpacity={0.9}
            >
              <Text style={styles.exploreText}>
                {isGuest ? "Login / Signup" : "Explore Stores"}
              </Text>
              <Icon name="arrow-forward" size={18} color={THEME.white} />
            </TouchableOpacity>

            {isGuest && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={goToHome}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryText}>Continue as Guest</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={
          items.length === 0 ? styles.emptyListContent : styles.listContent
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <Text style={styles.billHeaderText}>Bill Details</Text>
              <Text style={styles.billHeaderAmount}>{money(grandTotal)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Sub Total</Text>
              <Text style={styles.billValue}>{money(subtotal)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Charge</Text>
              <Text style={deliveryFee === 0 ? styles.freeText : styles.billValue}>
                {deliveryFee === 0 ? "FREE" : money(deliveryFee)}
              </Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Platform Fee</Text>
              <Text style={styles.billValue}>{money(PLATFORM_FEE)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.billRowLast}>
              <Text style={styles.totalLabel}>Amount Payable</Text>
              <Text style={styles.totalValue}>{money(grandTotal)}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.checkoutBtn}
            onPress={goToCheckout}
          >
            <Text style={styles.checkoutText}>Proceed To Checkout</Text>
            <Icon name="arrow-forward-circle" size={22} color={THEME.white} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={clearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIcon}>
              <Icon name="trash-outline" size={28} color={THEME.danger} />
            </View>

            <Text style={styles.confirmTitle}>Clear cart?</Text>
            <Text style={styles.confirmText}>
              This will remove all items from your cart.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setClearModalVisible(false)}
                disabled={clearing}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={clearCart}
                disabled={clearing}
                activeOpacity={0.85}
              >
                {clearing ? (
                  <ActivityIndicator color={THEME.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Clear Cart</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const shadow = {
  shadowColor: "#CBD5E1",
  shadowOpacity: 0.45,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    backgroundColor: THEME.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    ...shadow,
  },
  loadingLogoText: {
    color: THEME.orange,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerTextBox: {
    flex: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
  },
  heading: {
    fontSize: 23,
    fontWeight: "900",
    color: THEME.blue,
  },
  subHeading: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
  },
  clearBtn: {
    backgroundColor: THEME.white,
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  offerStrip: {
    backgroundColor: THEME.orangeSoft,
    borderColor: "#FFD6C8",
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  offerText: {
    flex: 1,
    color: THEME.orange,
    fontWeight: "900",
    fontSize: 13,
  },
  cartBox: {
    marginBottom: 13,
    backgroundColor: THEME.white,
    borderRadius: 17,
    overflow: "hidden",
    ...shadow,
  },
  itemMain: {
    minHeight: 94,
    flexDirection: "row",
    padding: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: THEME.blue,
  },
  storeText: {
    fontSize: 12,
    marginTop: 5,
    color: THEME.muted,
    fontWeight: "800",
  },
  image: {
    width: 112,
    height: 78,
    borderRadius: 15,
    backgroundColor: THEME.card2,
  },
  imageFallback: {
    width: 112,
    height: 78,
    borderRadius: 15,
    backgroundColor: THEME.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRow: {
    height: 42,
    backgroundColor: THEME.card2,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  optionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionLabel: {
    color: THEME.blue,
    fontSize: 11,
    fontWeight: "900",
  },
  optionValue: {
    color: THEME.orange,
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 90,
  },
  priceText: {
    color: THEME.blue,
    fontSize: 13,
    fontWeight: "900",
    marginRight: 12,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: THEME.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  qtyText: {
    color: THEME.blue,
    fontWeight: "900",
    marginHorizontal: 9,
    fontSize: 13,
  },
  noteBox: {
    marginHorizontal: 12,
    marginTop: 9,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.orangeSoft,
    borderWidth: 1,
    borderColor: "#FFD6C8",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  noteText: {
    flex: 1,
    color: THEME.orange,
    fontSize: 12,
    fontWeight: "800",
  },
  removeLine: {
    alignSelf: "flex-start",
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  removeText: {
    color: THEME.danger,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 230,
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 26,
  },
  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 36,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  emptyTitle: {
    color: THEME.blue,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 18,
  },
  emptyText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
  exploreBtn: {
    marginTop: 22,
    backgroundColor: THEME.orange,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exploreText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryText: {
    color: THEME.orange,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.bg,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 22,
  },
  billCard: {
    backgroundColor: THEME.white,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    ...shadow,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billHeaderText: {
    color: THEME.blue,
    fontSize: 15,
    fontWeight: "900",
  },
  billHeaderAmount: {
    color: THEME.blue,
    fontSize: 15,
    fontWeight: "900",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  billRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  billLabel: {
    color: THEME.blue,
    fontSize: 13,
    fontWeight: "800",
  },
  billValue: {
    color: THEME.blue,
    fontSize: 13,
    fontWeight: "900",
  },
  freeText: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 8,
  },
  totalLabel: {
    color: THEME.orange,
    fontSize: 15,
    fontWeight: "900",
  },
  totalValue: {
    color: THEME.orange,
    fontSize: 16,
    fontWeight: "900",
  },
  checkoutBtn: {
    backgroundColor: THEME.orange,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    ...shadow,
  },
  checkoutText: {
    color: THEME.white,
    fontSize: 17,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
  },
  confirmText: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: THEME.card2,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  cancelText: {
    color: THEME.blue,
    fontWeight: "900",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: THEME.orange,
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  confirmBtnText: {
    color: THEME.white,
    fontWeight: "900",
  },
});
