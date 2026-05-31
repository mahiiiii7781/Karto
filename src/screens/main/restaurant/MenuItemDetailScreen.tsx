import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useAuth } from "@/context/AuthContext";
import { requireLogin } from "@/utils/authGuard";
import {
  restaurantService,
  MenuItem,
  cartService,
} from "@/services/api/restaurantService";

const THEME = {
  bg: "#F7FFF9",
  card: "#FFFFFF",
  green: "#16A34A",
  greenDark: "#0B7A34",
  mint: "#DCFCE7",
  yellow: "#FACC15",
  text: "#101510",
  muted: "#6B7280",
  border: "#E5E7EB",
  soft: "#F1F5F9",
  black: "#050807",
  danger: "#EF4444",
};

const NOTE_SUGGESTIONS = ["Less spicy", "No onion", "Extra fresh", "Pack separately"];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836";

const getImage = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || FALLBACK_IMAGE;

const num = (value: any) => Number(value || 0);

const isAvailable = (item: any) =>
  item?.is_available !== false && item?.isAvailable !== false;

const isVeg = (item: any) =>
  item?.is_vegetarian === true ||
  item?.isVegetarian === true ||
  item?.isVeg === true;

export default function MenuItemDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { itemId, restaurantId } = route.params || {};
const { user } = useAuth();
  const [item, setItem] = useState<(MenuItem & any) | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isFav, setIsFav] = useState(false);

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedCustomizationIds, setSelectedCustomizationIds] = useState<string[]>([]);

  useEffect(() => {
    loadMenuItem();
    loadFavoriteStatus();
    saveRecentlyViewed();
  }, [itemId]);

  const addons = useMemo(() => {
    const data = item?.addons || [];
    return Array.isArray(data) ? data.filter((x: any) => x.isActive !== false) : [];
  }, [item]);

  const customizations = useMemo(() => {
    const data = item?.customizations || [];
    return Array.isArray(data) ? data.filter((x: any) => x.isActive !== false) : [];
  }, [item]);

  const reviews = useMemo(() => {
    const data = item?.reviews || [];
    return Array.isArray(data)
      ? data.filter((x: any) => x.isActive !== false).slice(0, 3)
      : [];
  }, [item]);

  const selectedAddons = useMemo(
    () => addons.filter((addon: any) => selectedAddonIds.includes(addon.id)),
    [addons, selectedAddonIds]
  );

  const selectedCustomizations = useMemo(
    () => customizations.filter((custom: any) => selectedCustomizationIds.includes(custom.id)),
    [customizations, selectedCustomizationIds]
  );

  const basePrice = num(item?.price);
  const addonsTotal = selectedAddons.reduce(
    (sum: number, addon: any) => sum + num(addon.price),
    0
  );
  const customizationTotal = selectedCustomizations.reduce(
    (sum: number, custom: any) => sum + num(custom.price),
    0
  );
  const unitPrice = basePrice + addonsTotal + customizationTotal;
  const totalPrice = unitPrice * quantity;
  const frequentlyBought = addons.slice(0, 4);

  const loadMenuItem = async () => {
    if (!itemId) {
      Alert.alert("Invalid Item", "Item id is missing.");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await restaurantService.getMenuItemById(itemId);
      if (error) throw error;

      if (!data) {
        Alert.alert("Not Found", "This item is not available.");
        navigation.goBack();
        return;
      }

      setItem(data as any);
    } catch (err) {
      console.error("Error fetching menu item:", err);
      Alert.alert("Error", "Could not load item.");
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteStatus = async () => {
    try {
      if (!itemId) return;
      const res = await restaurantService.isMenuItemFavorite(itemId);
      setIsFav(!!res.data);
    } catch {
      setIsFav(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (!itemId) return;
      const res: any = await restaurantService.toggleMenuItemFavorite(itemId);
      setIsFav(!!res?.data?.isFavorite);
    } catch {
      Alert.alert("Error", "Favorite update failed.");
    }
  };

  const saveRecentlyViewed = async () => {
    try {
      if (itemId) await restaurantService.saveRecentlyViewed(itemId);
    } catch {}
  };

  const toggleAddon = (id: string) => {
    if (adding) return;
    setSelectedAddonIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCustomization = (id: string, isRequired?: boolean) => {
    if (adding) return;

    setSelectedCustomizationIds(prev => {
      if (prev.includes(id)) {
        if (isRequired) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const validateRequiredCustomizations = () => {
    const required = customizations.filter((x: any) => x.isRequired);
    const missing = required.find(
      (x: any) => !selectedCustomizationIds.includes(x.id)
    );

    if (missing) {
      Alert.alert("Required", `Please select ${missing.title}`);
      return false;
    }

    return true;
  };

  const showAddedToast = (name: string) => {
    Toast.show({
      type: "success",
      text1: "Added to cart",
      text2: `${quantity}x ${name} added successfully`,
      position: "bottom",
      visibilityTime: 1800,
    });
  };

  const addSuggestion = (value: string) => {
    if (adding) return;
    const finalNote = note.trim() ? `${note.trim()}, ${value}` : value;
    if (finalNote.length <= 120) setNote(finalNote);
  };

  const addToCartPayload = async () => {
    return cartService.addToCart(
      item!.id,
      restaurantId,
      quantity,
      note.trim(),
      selectedCustomizationIds,
      selectedAddonIds
    );
  };

  const handleAddToCart = async () => {
    if (!requireLogin(user, navigation, "Please login to add items to cart.")) {
    return;
  }
    if (!item?.id) {
      Alert.alert("Invalid Item", "Please try again.");
      return;
    }

    if (!restaurantId) {
      Alert.alert("Invalid Store", "Restaurant/store id is missing.");
      return;
    }

    if (!isAvailable(item)) {
      Alert.alert("Unavailable", "This item is currently not available.");
      return;
    }

    if (!validateRequiredCustomizations()) return;

    if (!quantity || quantity < 1) {
      Alert.alert("Invalid Quantity", "Quantity must be at least 1.");
      return;
    }

    if (note.length > 120) {
      Alert.alert("Note Too Long", "Please keep note under 120 characters.");
      return;
    }

    setAdding(true);

    try {
      const res: any = await addToCartPayload();

      if (res?.error) {
        if (res.error === "DIFFERENT_RESTAURANT") {
          Alert.alert(
            "Different Store",
            "Your cart already contains items from another store. Clear cart and add this item?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Clear & Add",
                style: "destructive",
                onPress: async () => {
                  try {
                    setAdding(true);
                    const clearRes: any = await cartService.clearCart();

                    if (clearRes?.error) {
                      Alert.alert("Error", "Failed to clear cart.");
                      return;
                    }

                    const retryRes: any = await addToCartPayload();

                    if (retryRes?.error) {
                      Alert.alert("Error", "Could not add item.");
                      return;
                    }

                    showAddedToast(item.name);
                  } finally {
                    setAdding(false);
                  }
                },
              },
            ]
          );
          return;
        }

        Alert.alert("Error", "Could not add item to cart.");
        return;
      }

      showAddedToast(item.name);
    } catch (err) {
      console.error("Error adding to cart:", err);
      Alert.alert("Error", "Could not add item to cart.");
    } finally {
      setAdding(false);
    }
  };

  const renderAddon = (addon: any) => {
    const selected = selectedAddonIds.includes(addon.id);

    return (
      <TouchableOpacity
        key={addon.id}
        style={[styles.optionRow, selected && styles.optionSelected]}
        onPress={() => toggleAddon(addon.id)}
        activeOpacity={0.86}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.checkBox, selected && styles.checkBoxActive]}>
            {selected && <Icon name="checkmark" size={15} color="#fff" />}
          </View>

          {addon.imageUrl || addon.image_url ? (
            <Image
              source={{ uri: addon.imageUrl || addon.image_url }}
              style={styles.optionImg}
            />
          ) : (
            <View style={styles.optionIcon}>
              <Icon name="add-circle-outline" size={20} color={THEME.green} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>{addon.title}</Text>
            <Text style={styles.optionSub}>Recommended add-on</Text>
          </View>
        </View>

        <Text style={styles.optionPrice}>+₹{num(addon.price).toFixed(0)}</Text>
      </TouchableOpacity>
    );
  };

  const renderCustomization = (customization: any) => {
    const selected = selectedCustomizationIds.includes(customization.id);

    return (
      <TouchableOpacity
        key={customization.id}
        style={[styles.optionRow, selected && styles.optionSelected]}
        onPress={() => toggleCustomization(customization.id, customization.isRequired)}
        activeOpacity={0.86}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.radioBox, selected && styles.radioBoxActive]}>
            {selected && <View style={styles.radioInner} />}
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>{customization.title}</Text>

              {customization.isRequired && (
                <View style={styles.requiredPill}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>

            <Text style={styles.optionSub}>Customize your item</Text>
          </View>
        </View>

        <Text style={styles.optionPrice}>
          {num(customization.price) > 0
            ? `+₹${num(customization.price).toFixed(0)}`
            : "Free"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Icon name="fast-food-outline" size={34} color={THEME.green} />
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const available = isAvailable(item);
  const rating = Number(item.rating || 4.4);
  const totalReviews = Number(item.totalReviews || item.total_reviews || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: getImage(item) }} style={styles.image} />
            <View style={styles.imageGradient} />

            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Icon name="arrow-back" size={23} color={THEME.text} />
              </TouchableOpacity>

              <View style={styles.topRight}>
                <TouchableOpacity style={styles.circleBtn} activeOpacity={0.85}>
                  <Icon name="share-social-outline" size={22} color={THEME.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.circleBtn}
                  activeOpacity={0.85}
                  onPress={toggleFavorite}
                >
                  <Icon
                    name={isFav ? "heart" : "heart-outline"}
                    size={23}
                    color={isFav ? THEME.danger : THEME.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.imageBottomInfo}>
              <View style={styles.ratingBadge}>
                <Icon name="star" size={14} color={THEME.black} />
                <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
              </View>

              <View
                style={[
                  styles.availabilityBadge,
                  !available && styles.unavailableBadge,
                ]}
              >
                <View
                  style={[
                    styles.liveDot,
                    !available && { backgroundColor: THEME.danger },
                  ]}
                />

                <Text
                  style={[
                    styles.availabilityText,
                    !available && { color: THEME.danger },
                  ]}
                >
                  {available ? "Available now" : "Currently unavailable"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contentCard}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.vegRow}>
                  <View
                    style={[
                      styles.vegBox,
                      !isVeg(item) && { borderColor: THEME.danger },
                    ]}
                  >
                    <View
                      style={[
                        styles.vegDot,
                        !isVeg(item) && { backgroundColor: THEME.danger },
                      ]}
                    />
                  </View>

                  <Text style={styles.vegText}>{isVeg(item) ? "Veg" : "Non Veg"}</Text>

                  {(item.isPopular || item.is_popular || item.isBestSeller) && (
                    <View style={styles.bestSellerPill}>
                      <Icon name="flame" size={12} color={THEME.yellow} />
                      <Text style={styles.bestSellerText}>Best Seller</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.desc}>
                  {item.description || "Freshly prepared item from this store."}
                </Text>
              </View>

              <View style={styles.pricePill}>
                <Text style={styles.price}>₹{basePrice.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.trustRow}>
              <View style={styles.trustChip}>
                <Icon name="flash-outline" size={16} color={THEME.green} />
                <Text style={styles.trustText}>
                  {item.prepTimeMin || item.prep_time_min || 20} min prep
                </Text>
              </View>

              <View style={styles.trustChip}>
                <Icon name="shield-checkmark-outline" size={16} color={THEME.green} />
                <Text style={styles.trustText}>Quality checked</Text>
              </View>

              <View style={styles.trustChip}>
                <Icon name="leaf-outline" size={16} color={THEME.green} />
                <Text style={styles.trustText}>Fresh</Text>
              </View>
            </View>

            {(item.calories || item.servingInfo || item.spiceLevel !== undefined) && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nutrition & serving</Text>
                  <Text style={styles.sectionSub}>Helpful info before you order</Text>
                </View>

                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{item.calories || "--"}</Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>

                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {item.servingInfo || item.serving_info || "1 serve"}
                    </Text>
                    <Text style={styles.nutritionLabel}>Serving</Text>
                  </View>

                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {item.spiceLevel ?? item.spice_level ?? 0}/5
                    </Text>
                    <Text style={styles.nutritionLabel}>Spice</Text>
                  </View>
                </View>
              </View>
            )}

            {addons.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Recommended add-ons</Text>
                    <Text style={styles.sectionSub}>Make your order more complete</Text>
                  </View>

                  <Text style={styles.sectionAmount}>₹{addonsTotal.toFixed(0)}</Text>
                </View>

                {addons.map(renderAddon)}
              </View>
            )}

            {customizations.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Item customizations</Text>
                    <Text style={styles.sectionSub}>Choose your preferences</Text>
                  </View>

                  <Text style={styles.sectionAmount}>
                    ₹{customizationTotal.toFixed(0)}
                  </Text>
                </View>

                {customizations.map(renderCustomization)}
              </View>
            )}

            {frequentlyBought.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Frequently bought together</Text>
                  <Text style={styles.sectionSub}>Customers often add these</Text>
                </View>

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={frequentlyBought}
                  keyExtractor={(x: any) => x.id}
                  renderItem={({ item: addon }) => {
                    const selected = selectedAddonIds.includes(addon.id);

                    return (
                      <TouchableOpacity
                        style={[styles.comboCard, selected && styles.comboCardActive]}
                        activeOpacity={0.85}
                        onPress={() => toggleAddon(addon.id)}
                      >
                        <View style={styles.comboIcon}>
                          <Icon
                            name={selected ? "checkmark-circle" : "add-circle-outline"}
                            size={26}
                            color={THEME.green}
                          />
                        </View>

                        <Text style={styles.comboTitle} numberOfLines={1}>
                          {addon.title}
                        </Text>

                        <Text style={styles.comboPrice}>
                          +₹{num(addon.price).toFixed(0)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quantity</Text>
                <Text style={styles.sectionSub}>Choose how many you want</Text>
              </View>

              <View style={styles.quantityCard}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={adding || quantity <= 1}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="remove"
                    size={20}
                    color={quantity <= 1 ? THEME.muted : THEME.green}
                  />
                </TouchableOpacity>

                <View style={styles.qtyCenter}>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <Text style={styles.qtyLabel}>items</Text>
                </View>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(quantity + 1)}
                  disabled={adding}
                  activeOpacity={0.85}
                >
                  <Icon name="add" size={20} color={THEME.green} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.priceBreakdown}>
              <Text style={styles.breakTitle}>Price summary</Text>

              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Base price</Text>
                <Text style={styles.breakValue}>₹{basePrice.toFixed(0)}</Text>
              </View>

              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Add-ons</Text>
                <Text style={styles.breakValue}>₹{addonsTotal.toFixed(0)}</Text>
              </View>

              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Customizations</Text>
                <Text style={styles.breakValue}>₹{customizationTotal.toFixed(0)}</Text>
              </View>

              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Quantity</Text>
                <Text style={styles.breakValue}>x {quantity}</Text>
              </View>

              <View style={styles.breakDivider} />

              <View style={styles.breakRow}>
                <Text style={styles.breakTotalLabel}>Total</Text>
                <Text style={styles.breakTotalValue}>₹{totalPrice.toFixed(0)}</Text>
              </View>
            </View>

            {reviews.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Customer reviews</Text>
                    <Text style={styles.sectionSub}>
                      ⭐ {rating.toFixed(1)} from {totalReviews || reviews.length} reviews
                    </Text>
                  </View>

                  <Text style={styles.viewAllText}>View all</Text>
                </View>

                {reviews.map((review: any, index: number) => (
                  <View key={review.id || index} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewUser}>
                        {review.user?.fullName || "Karto User"}
                      </Text>

                      <Text style={styles.reviewRating}>⭐ {review.rating || 5}</Text>
                    </View>

                    <Text style={styles.reviewText} numberOfLines={2}>
                      {review.review || "Amazing taste and fresh packing."}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Special instructions</Text>
                <Text style={styles.sectionSub}>Optional note for store</Text>
              </View>

              <View style={styles.suggestionWrap}>
                {NOTE_SUGGESTIONS.map(suggestion => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => addSuggestion(suggestion)}
                    activeOpacity={0.85}
                  >
                    <Icon name="add-circle-outline" size={15} color={THEME.green} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.noteInput}
                placeholder="Example: Less spicy, no onion, pack separately..."
                placeholderTextColor={THEME.muted}
                value={note}
                onChangeText={setNote}
                editable={!adding}
                maxLength={120}
                multiline
              />

              <Text style={styles.noteCounter}>{note.length}/120</Text>
            </View>

            <View style={styles.infoBox}>
              <Icon name="information-circle-outline" size={20} color={THEME.green} />
              <Text style={styles.infoText}>
                Add-ons and customizations are included in final cart total.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.goToCartBtn}
              onPress={() => navigation.navigate("Cart")}
              activeOpacity={0.85}
            >
              <Icon name="bag-handle-outline" size={18} color={THEME.green} />
              <Text style={styles.goToCartText}>Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>Total</Text>
            <Text style={styles.bottomPrice}>₹{totalPrice.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addToCartBtn,
              (!available || adding) && { opacity: 0.65 },
            ]}
            onPress={handleAddToCart}
            disabled={adding || !available}
            activeOpacity={0.9}
          >
            {adding ? (
              <ActivityIndicator color={THEME.black} />
            ) : (
              <>
                <Icon name="cart" size={19} color={THEME.black} />
                <Text style={styles.addToCartText}>
                  {available ? "Add to Cart" : "Unavailable"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.bg,
  },
  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  imageWrapper: {
    position: "relative",
    height: 330,
    backgroundColor: THEME.soft,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.soft,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  topBar: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRight: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  imageBottomInfo: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingBadge: {
    backgroundColor: THEME.yellow,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingBadgeText: {
    marginLeft: 5,
    color: THEME.black,
    fontWeight: "900",
    fontSize: 13,
  },
  availabilityBadge: {
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  unavailableBadge: { backgroundColor: "#FEE2E2" },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 7,
  },
  availabilityText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },
  contentCard: {
    marginTop: -18,
    backgroundColor: THEME.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  vegRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  vegBox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.green,
  },
  vegText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  bestSellerPill: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  bestSellerText: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 10,
    marginLeft: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.text,
    letterSpacing: -0.4,
  },
  desc: {
    fontSize: 14,
    color: THEME.muted,
    lineHeight: 21,
    marginTop: 8,
    paddingRight: 10,
  },
  pricePill: {
    backgroundColor: THEME.green,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    marginLeft: 10,
  },
  price: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "900",
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
  },
  trustChip: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
    elevation: 1,
  },
  trustText: {
    marginLeft: 5,
    color: THEME.text,
    fontWeight: "800",
    fontSize: 12,
  },
  sectionBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 2,
  },
  sectionHeader: { marginBottom: 14 },
  sectionHeaderRow: {
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: {
    color: THEME.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionSub: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionAmount: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 15,
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
  },
  nutritionValue: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 15,
  },
  nutritionLabel: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 11,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.bg,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: THEME.green,
    backgroundColor: "#F0FDF4",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: THEME.card,
  },
  checkBoxActive: {
    backgroundColor: THEME.green,
    borderColor: THEME.green,
  },
  radioBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: THEME.card,
  },
  radioBoxActive: {
    borderColor: THEME.green,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.green,
  },
  optionImg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: THEME.soft,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: THEME.mint,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  optionTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: "900",
  },
  optionSub: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  requiredPill: {
    marginLeft: 7,
    backgroundColor: THEME.yellow,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  requiredText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 9,
  },
  optionPrice: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 10,
  },
  comboCard: {
    width: 126,
    backgroundColor: THEME.bg,
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  comboCardActive: {
    borderColor: THEME.green,
    backgroundColor: "#F0FDF4",
  },
  comboIcon: {
    marginBottom: 8,
  },
  comboTitle: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
  },
  comboPrice: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
  },
  quantityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.bg,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.mint,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnDisabled: {
    backgroundColor: THEME.soft,
  },
  qtyCenter: {
    alignItems: "center",
  },
  qtyText: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.text,
  },
  qtyLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  priceBreakdown: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 2,
  },
  breakTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 10,
  },
  breakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  breakLabel: {
    color: THEME.muted,
    fontWeight: "800",
  },
  breakValue: {
    color: THEME.text,
    fontWeight: "900",
  },
  breakDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginTop: 12,
  },
  breakTotalLabel: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },
  breakTotalValue: {
    color: THEME.green,
    fontSize: 17,
    fontWeight: "900",
  },
  reviewCard: {
    backgroundColor: THEME.bg,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewUser: {
    color: THEME.text,
    fontWeight: "900",
  },
  reviewRating: {
    color: THEME.yellow,
    fontWeight: "900",
  },
  reviewText: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 18,
  },
  viewAllText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 13,
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  suggestionChip: {
    backgroundColor: THEME.mint,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    marginLeft: 5,
    color: THEME.greenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  noteInput: {
    backgroundColor: THEME.bg,
    borderRadius: 18,
    padding: 14,
    minHeight: 86,
    marginBottom: 6,
    fontSize: 15,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
    textAlignVertical: "top",
    fontWeight: "700",
  },
  noteCounter: {
    color: THEME.muted,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: THEME.mint,
    borderRadius: 18,
    padding: 13,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: THEME.greenDark,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  goToCartBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: THEME.green,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: THEME.card,
  },
  goToCartText: {
    color: THEME.green,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7,
  },
  bottomBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 10,
  },
  bottomLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  bottomPrice: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  addToCartBtn: {
    backgroundColor: THEME.yellow,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 168,
  },
  addToCartText: {
    color: THEME.black,
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },
});
