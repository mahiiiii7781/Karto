import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { cartService, CartItem } from "@/services/api/cartService";
import { useAuth } from "@/context/AuthContext";
import { requireLogin } from "@/utils/authGuard";
const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  greenDark: "#12351F",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  danger: "#EF4444",
  yellow: "#FACC15",
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

 useFocusEffect(
  React.useCallback(() => {
    if (!requireLogin(user, navigation, "Please login to view your cart.")) {
      navigation.goBack();
      return;
    }

    loadCartItems();
  }, [user])
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

  const loadCartItems = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const { data, error } = await cartService.getCartItems();

      if (error) {
        Alert.alert("Error", "Failed to load cart items");
        setItems([]);
        return;
      }

      setItems(data || []);
    } catch (err) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearCart = () => {
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Clear",
        style: "destructive",
        onPress: async () => {
          const { error } = await cartService.clearCart();

          if (error) {
            Alert.alert("Error", "Failed to clear cart");
            return;
          }

          setItems([]);
        },
      },
    ]);
  };

  const removeItem = async (itemId: string) => {
    setUpdatingId(itemId);

    const { error } = await cartService.removeFromCart(itemId);

    setUpdatingId(null);

    if (error) {
      Alert.alert("Error", "Failed to remove item");
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) {
      removeItem(item.id);
      return;
    }

    setUpdatingId(item.id);

    const { error } = await cartService.updateCartItem(item.id, nextQty);

    setUpdatingId(null);

    if (error) {
      Alert.alert("Error", "Failed to update quantity");
      return;
    }

    setItems((prev) =>
      prev.map((x) =>
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
  };

  const getItemImage = (item: CartItem) =>
    item.menu_item?.image_url ||
    item.menu_item?.imageUrl ||
    item.menuItem?.image_url ||
    item.menuItem?.imageUrl ||
    item.restaurant?.image_url ||
    item.restaurant?.imageUrl ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";

  const getItemName = (item: CartItem) =>
    item.menu_item?.name || item.menuItem?.name || "Item";

  const getRestaurantName = (item: CartItem) =>
    item.restaurant?.restaurant_name || item.restaurant?.name || "Karto Store";

  const renderItem = ({ item }: { item: CartItem }) => {
    const disabled = updatingId === item.id;
    const lineTotal =
      Number(item.total_price ?? item.totalPrice ?? 0) ||
      Number(item.price || 0) * Number(item.quantity || 0);

    return (
      <View style={styles.cartBox}>
        <Image source={{ uri: getItemImage(item) }} style={styles.image} />

        <View style={styles.cardContent}>
          <View style={styles.titleRowInside}>
            <Text style={styles.title} numberOfLines={1}>
              {getItemName(item)}
            </Text>

            <TouchableOpacity
              disabled={disabled}
              onPress={() => removeItem(item.id)}
              style={styles.trashBtn}
            >
              {disabled ? (
                <ActivityIndicator size="small" color={THEME.green} />
              ) : (
                <Icon name="trash-outline" size={19} color={THEME.danger} />
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
              >
                <Icon name="remove" size={16} color={THEME.green} />
              </TouchableOpacity>

              <Text style={styles.qtyText}>{item.quantity}</Text>

              <TouchableOpacity
                style={[styles.qtyBtn, disabled && styles.disabledBtn]}
                disabled={disabled}
                onPress={() => updateQuantity(item, Number(item.quantity) + 1)}
              >
                <Icon name="add" size={16} color={THEME.green} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "flex-end" }}>
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
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Preparing your cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="chevron-back" size={24} color={THEME.green} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Your Cart</Text>
          <Text style={styles.subHeading}>
            {itemCount > 0 ? `${itemCount} items ready for checkout` : "Cart is empty"}
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
            <Icon name="trash" size={18} color="#041008" />
          </TouchableOpacity>
        )}
      </View>

      {items.length > 0 && (
        <View style={styles.offerStrip}>
          <Icon name="flash" size={18} color={THEME.yellow} />
          <Text style={styles.offerText}>
            {remainingForFreeDelivery > 0
              ? `Add ₹${remainingForFreeDelivery.toFixed(0)} more for free delivery`
              : "Free delivery unlocked!"}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCartItems(true)}
            tintColor={THEME.green}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="cart-outline" size={54} color={THEME.green} />
            </View>

            <Text style={styles.emptyTitle}>Your cart feels lonely</Text>
            <Text style={styles.emptyText}>
              Add tasty food or products from nearby stores and continue checkout.
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.exploreText}>Explore Stores</Text>
              <Icon name="arrow-forward" size={18} color="#041008" />
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={
          items.length === 0
            ? { flex: 1, justifyContent: "center" }
            : { paddingBottom: 245 }
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

            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.checkoutBtn}
            onPress={() =>
              navigation.navigate("Checkout", {
                subtotal,
                deliveryFee,
                platformFee: PLATFORM_FEE,
                total: grandTotal,
                items,
              })
            }
          >
            <View>
              <Text style={styles.checkoutSmall}>Payable</Text>
              <Text style={styles.checkoutAmount}>₹{grandTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.checkoutRight}>
              <Text style={styles.checkoutText}>Checkout</Text>
              <Icon name="arrow-forward-circle" size={22} color="#041008" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: THEME.bg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },

  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "700",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  },

  clearBtn: {
    backgroundColor: THEME.green,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  offerStrip: {
    backgroundColor: "#141B0E",
    borderColor: "#453A10",
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
    fontWeight: "800",
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
    borderRadius: 16,
    backgroundColor: "#1D1111",
    justifyContent: "center",
    alignItems: "center",
  },

  storeText: {
    fontSize: 13,
    marginTop: 5,
    color: THEME.muted,
    fontWeight: "600",
  },

  noteBox: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#17170B",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },

  noteText: {
    flex: 1,
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: "700",
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
    backgroundColor: "#07110B",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 14,
    padding: 3,
  },

  qtyBtn: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: THEME.greenDark,
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

  itemPrice: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 16,
  },

  singlePrice: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 2,
  },

  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 26,
  },

  emptyIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
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
    color: "#041008",
    fontWeight: "900",
    fontSize: 15,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#08100C",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    padding: 16,
    paddingBottom: 26,
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
    color: "#05210E",
    fontSize: 11,
    fontWeight: "800",
  },

  checkoutAmount: {
    color: "#041008",
    fontSize: 19,
    fontWeight: "900",
  },

  checkoutRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  checkoutText: {
    color: "#041008",
    fontSize: 17,
    fontWeight: "900",
  },
});