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
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
  danger: "#EF4444",
};

const DELIVERY_FEE = 25;
const PLATFORM_FEE = 5;
const FREE_DELIVERY_ABOVE = 299;

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
          showToast("error", "Unable to load cart", "Please try again.");
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
        showToast("error", "Unable to clear cart", "Please try again.");
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
        showToast("error", "Unable to remove item", "Please try again.");
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
        showToast("error", "Unable to update quantity", "Please try again.");
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
    item.menu_item?.name || item.menuItem?.name || "Cart Item";

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
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Icon name="fast-food" size={28} color={THEME.yellow} />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.titleRowInside}>
            <Text style={styles.title} numberOfLines={1}>
              {getItemName(item)}
            </Text>

            <TouchableOpacity
              disabled={disabled}
              onPress={() => removeItem(item.id)}
              style={styles.trashBtn}
              activeOpacity={0.85}
            >
              {disabled ? (
                <ActivityIndicator size="small" color={THEME.green} />
              ) : (
                <Icon name="trash-outline" size={18} color={THEME.danger} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.storeText} numberOfLines={1}>
            {getRestaurantName(item)}
          </Text>

          {!!item.note && (
            <View style={styles.noteBox}>
              <Icon name="reader-outline" size={13} color={THEME.yellow} />
              <Text style={styles.noteText} numberOfLines={1}>
                {item.note}
              </Text>
            </View>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, disabled && styles.disabledBtn]}
                disabled={disabled}
                onPress={() => updateQuantity(item, Number(item.quantity) - 1)}
                activeOpacity={0.85}
              >
                <Icon name="remove" size={16} color={THEME.green} />
              </TouchableOpacity>

              <Text style={styles.qtyText}>{Number(item.quantity || 0)}</Text>

              <TouchableOpacity
                style={[styles.qtyBtn, disabled && styles.disabledBtn]}
                disabled={disabled}
                onPress={() => updateQuantity(item, Number(item.quantity) + 1)}
                activeOpacity={0.85}
              >
                <Icon name="add" size={16} color={THEME.green} />
              </TouchableOpacity>
            </View>

            <View style={styles.priceBox}>
              <Text style={styles.itemPrice}>₹{lineTotal.toFixed(2)}</Text>
              <Text style={styles.singlePrice}>
                ₹{Number(item.price || 0).toFixed(0)} each
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Preparing your cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.85}
        >
          <Icon name="chevron-back" size={24} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.heading}>Your Cart</Text>
          <Text style={styles.subHeading}>
            {itemCount > 0
              ? `${itemCount} item${itemCount > 1 ? "s" : ""} ready`
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
            <Icon name="trash" size={18} color={THEME.black} />
          </TouchableOpacity>
        )}
      </View>

      {items.length > 0 && (
        <View style={styles.offerStrip}>
          <Icon name="flash" size={18} color={THEME.yellow} />
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
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon
                name={isGuest ? "person-circle-outline" : "cart-outline"}
                size={54}
                color={THEME.yellow}
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
              <Icon name="arrow-forward" size={18} color={THEME.black} />
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
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={deliveryFee === 0 ? styles.freeText : styles.billValue}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
              </Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Platform Fee</Text>
              <Text style={styles.billValue}>₹{PLATFORM_FEE.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.billRowLast}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.checkoutBtn}
            onPress={goToCheckout}
          >
            <View>
              <Text style={styles.checkoutSmall}>Payable</Text>
              <Text style={styles.checkoutAmount}>₹{grandTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.checkoutRight}>
              <Text style={styles.checkoutText}>Checkout</Text>
              <Icon name="arrow-forward-circle" size={22} color={THEME.black} />
            </View>
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
                  <ActivityIndicator color={THEME.black} />
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
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
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
    marginBottom: 14,
  },
  headerTextBox: {
    flex: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 25,
    fontWeight: "900",
    color: THEME.text,
  },
  subHeading: {
    color: THEME.muted,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
  },
  clearBtn: {
    backgroundColor: THEME.green,
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  offerStrip: {
    backgroundColor: "#252109",
    borderColor: "#57470A",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  offerText: {
    flex: 1,
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 13,
  },
  cartBox: {
    flexDirection: "row",
    marginBottom: 14,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  image: {
    width: 92,
    height: 104,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: THEME.card2,
  },
  imageFallback: {
    width: 92,
    height: 104,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  titleRowInside: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: THEME.text,
    marginRight: 8,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: "#1D1111",
    borderWidth: 1,
    borderColor: "#3A1919",
    justifyContent: "center",
    alignItems: "center",
  },
  storeText: {
    fontSize: 13,
    marginTop: 5,
    color: THEME.muted,
    fontWeight: "700",
  },
  noteBox: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  noteText: {
    flex: 1,
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: "800",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 3,
  },
  qtyBtn: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  qtyText: {
    color: THEME.text,
    fontWeight: "900",
    marginHorizontal: 13,
  },
  priceBox: {
    alignItems: "flex-end",
  },
  itemPrice: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 16,
  },
  singlePrice: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 245,
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 26,
  },
  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 36,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: THEME.text,
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
    backgroundColor: THEME.green,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exploreText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryText: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 22,
  },
  billCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 12,
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
    color: THEME.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  billValue: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "800",
  },
  freeText: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 5,
  },
  totalLabel: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  totalValue: {
    color: THEME.green,
    fontSize: 18,
    fontWeight: "900",
  },
  checkoutBtn: {
    backgroundColor: THEME.green,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkoutSmall: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "800",
  },
  checkoutAmount: {
    color: THEME.black,
    fontSize: 19,
    fontWeight: "900",
  },
  checkoutRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkoutText: {
    color: THEME.black,
    fontSize: 17,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 22,
  },
  confirmBox: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#1D1111",
    borderWidth: 1,
    borderColor: "#3A1919",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: THEME.text,
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
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelText: {
    color: THEME.text,
    fontWeight: "900",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: THEME.green,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmBtnText: {
    color: THEME.black,
    fontWeight: "900",
  },
});
