import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  FlatList,
  StatusBar,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { restaurantService, MenuItem } from "@/services/api/restaurantService";
import {
  cartService,
  isDifferentRestaurantError,
  getCartErrorMessage,
} from "@/services/api/cartService";
import favoriteService from "@/services/api/favouriteService";

const THEME = {
  bg: "#F8FAF5",

  card: "#FFFFFF",
  card2: "#F1F5EC",
  surface: "#F7FAF2",

  // Karto Brand
  orange: "#FACC15",      // yellow
  orangeSoft: "#FEF9C3",  // light yellow

  blue: "#111827",        // black
  green: "#22C55E",
  yellow: "#FACC15",

  purple: "#8B5CF6",
  pink: "#EC4899",

  text: "#111827",
  muted: "#6B7280",

  border: "#DDE5D7",

  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#111827",
};

const NOTE_SUGGESTIONS = ["Less spicy", "No onion", "Extra fresh", "Pack separately"];

const getImage = (item: any) =>
  item?.image_url || item?.imageUrl || item?.image || item?.coverImage || item?.cover_image || null;

const num = (value: any) => Number(value || 0);

const money = (value: any) => `₹${Number(value || 0).toFixed(0)}`;

const normalizeMenuItemResponse = (data: any) =>
  data?.data?.menuItem ||
  data?.data?.menu_item ||
  data?.data?.item ||
  data?.data ||
  data?.menuItem ||
  data?.menu_item ||
  data?.item ||
  data ||
  null;

const normalizeFavoriteStatus = (data: any, fallback = false) =>
  Boolean(
    data?.isFavorite ??
      data?.is_favorite ??
      data?.data?.isFavorite ??
      data?.data?.is_favorite ??
      fallback
  );

const isAvailable = (item: any) =>
  item?.is_available !== false && item?.isAvailable !== false;

const isVeg = (item: any) =>
  item?.is_vegetarian === true ||
  item?.isVegetarian === true ||
  item?.isVeg === true ||
  item?.veg === true;

const getRestaurantName = (item: any) =>
  item?.restaurant?.restaurant_name ||
  item?.restaurant?.restaurantName ||
  item?.restaurant?.name ||
  "Karto Store";

const getPrepTime = (item: any) =>
  item?.prepTimeMin || item?.prep_time_min || item?.preparationTime || item?.preparation_time || 20;

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
    visibilityTime: 1900,
  });
};

export default function MenuItemDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const initialItem = route.params?.item || route.params?.menuItem || null;
  const itemId = route.params?.itemId || route.params?.menuItemId || initialItem?.id;
  const routeRestaurantId =
    route.params?.restaurantId || route.params?.restaurant?.id || initialItem?.restaurantId;

  const [item, setItem] = useState<(MenuItem & any) | null>(initialItem);
  const [loading, setLoading] = useState(!initialItem);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedCustomizationIds, setSelectedCustomizationIds] = useState<string[]>([]);
  const [priceModalVisible, setPriceModalVisible] = useState(false);

  const requireAuth = (message = "Please sign in to continue.") => {
    if (user?.id) return true;

    showToast("info", "Login required", message);
    navigation.navigate("Auth");
    return false;
  };

  useEffect(() => {
    loadMenuItem();
  }, [itemId]);

  useEffect(() => {
    if (user?.id && itemId) {
      loadFavoriteStatus();
      saveRecentlyViewed();
    } else {
      setIsFav(false);
    }
  }, [itemId, user?.id]);

  const addons = useMemo(() => {
    const data = item?.addons || [];
    return Array.isArray(data)
      ? data.filter((x: any) => x.isActive !== false && x.is_active !== false)
      : [];
  }, [item]);

  const customizations = useMemo(() => {
    const data = item?.customizations || [];
    return Array.isArray(data)
      ? data.filter((x: any) => x.isActive !== false && x.is_active !== false)
      : [];
  }, [item]);

  const reviews = useMemo(() => {
    const data = item?.reviews || [];
    return Array.isArray(data)
      ? data.filter((x: any) => x.isActive !== false && x.is_active !== false).slice(0, 3)
      : [];
  }, [item]);

  const selectedAddons = useMemo(
    () => addons.filter((addon: any) => selectedAddonIds.includes(addon.id)),
    [addons, selectedAddonIds]
  );

  const selectedCustomizations = useMemo(
    () =>
      customizations.filter((custom: any) =>
        selectedCustomizationIds.includes(custom.id)
      ),
    [customizations, selectedCustomizationIds]
  );

  const basePrice = num(item?.price);
  const discountPrice =
    item?.discountPrice !== undefined || item?.discount_price !== undefined
      ? num(item?.discountPrice ?? item?.discount_price)
      : 0;

  const finalBasePrice = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;

  const addonsTotal = selectedAddons.reduce(
    (sum: number, addon: any) => sum + num(addon.price),
    0
  );

  const customizationTotal = selectedCustomizations.reduce(
    (sum: number, custom: any) => sum + num(custom.price),
    0
  );

  const unitPrice = finalBasePrice + addonsTotal + customizationTotal;
  const totalPrice = unitPrice * quantity;
  const savedAmount = discountPrice > 0 && discountPrice < basePrice ? (basePrice - discountPrice) * quantity : 0;
  const frequentlyBought = addons.slice(0, 4);

  const effectiveRestaurantId =
    routeRestaurantId ||
    item?.restaurantId ||
    item?.restaurant_id ||
    item?.restaurant?.id ||
    item?.vendorId ||
    item?.vendor_id ||
    "";

  const loadMenuItem = async () => {
    if (!itemId) {
      setLoading(false);
      showToast("error", "Item unavailable", "Item details are missing.");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await restaurantService.getMenuItemById(itemId);
      const nextItem = normalizeMenuItemResponse(data);

      if (error || !nextItem) {
        if (!initialItem) {
          showToast("error", "Item unavailable", "This item is currently unavailable.");
          navigation.goBack();
        }
        return;
      }

      setItem(nextItem as any);
    } catch {
      if (!initialItem) {
        showToast("error", "Unable to load item", "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteStatus = async () => {
    if (!itemId || !user?.id) return;

    try {
      const { data } = await favoriteService.isItemFavorite(itemId);
      setIsFav(normalizeFavoriteStatus(data, false));
    } catch {
      setIsFav(false);
    }
  };

  const toggleFavorite = async () => {
    if (!requireAuth("Please sign in to save favorite items.")) return;
    if (!itemId || favLoading) return;

    try {
      setFavLoading(true);

      const { data, error } = await favoriteService.toggleItemFavorite(itemId);

      if (error) {
        showToast("error", "Unable to update favorite", error?.message || "Please try again.");
        return;
      }

      const next = normalizeFavoriteStatus(data, !isFav);
      setIsFav(next);

      showToast(
        "success",
        next ? "Added to favorites" : "Removed from favorites",
        item?.name || "Item updated successfully."
      );
    } catch {
      showToast("error", "Unable to update favorite", "Please try again.");
    } finally {
      setFavLoading(false);
    }
  };

  const saveRecentlyViewed = async () => {
    try {
      if (itemId && user?.id) {
        await restaurantService.saveRecentlyViewed(itemId);
      }
    } catch {
      // non-critical
    }
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
    const required = customizations.filter((x: any) => x.isRequired || x.is_required);
    const missing = required.find((x: any) => !selectedCustomizationIds.includes(x.id));

    if (missing) {
      showToast(
        "info",
        "Selection required",
        `Please select ${missing.title || missing.name || "required option"} to continue.`
      );
      return false;
    }

    return true;
  };

  const addSuggestion = (value: string) => {
    if (adding) return;

    const finalNote = note.trim() ? `${note.trim()}, ${value}` : value;

    if (finalNote.length <= 120) {
      setNote(finalNote);
    } else {
      showToast("info", "Note limit reached", "Please keep your note under 120 characters.");
    }
  };

  const handleAddToCart = async () => {
    if (!requireAuth("Please sign in to add items to your cart.")) return;

    if (!item?.id) {
      showToast("error", "Invalid item", "Please try again.");
      return;
    }

    if (!effectiveRestaurantId) {
      showToast("error", "Store unavailable", "Store details are missing.");
      return;
    }

    if (!isAvailable(item)) {
      showToast("info", "Item unavailable", "This item is currently unavailable.");
      return;
    }

    if (!validateRequiredCustomizations()) return;

    if (!quantity || quantity < 1) {
      showToast("info", "Invalid quantity", "Quantity must be at least 1.");
      return;
    }

    if (note.length > 120) {
      showToast("info", "Note too long", "Please keep your note under 120 characters.");
      return;
    }

    setAdding(true);

    try {
      const res = await cartService.addToCart({
        menuItemId: item.id,
        restaurantId: effectiveRestaurantId,
        quantity,
        note: note.trim() || null,
        customizationIds: selectedCustomizationIds,
        addonIds: selectedAddonIds,
      });

      if (res.error) {
        const message = getCartErrorMessage(res.error);

        showToast(
          isDifferentRestaurantError(res.error) ? "info" : "error",
          message.title,
          message.message
        );
        return;
      }

      showToast(
        "success",
        "Added to cart",
        `${quantity}x ${item.name || "Item"} has been added.`
      );
    } catch {
      showToast("error", "Unable to add item", "Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const openCart = () => {
    if (!requireAuth("Please sign in to view your cart.")) return;
    navigation.navigate("Cart", { userId: user?.id });
  };

  const renderHeroImage = () => {
    const uri = getImage(item);

    if (uri) {
      return <Image source={{ uri }} style={styles.image} />;
    }

    return (
      <View style={[styles.image, styles.imagePlaceholder]}>
        <Icon name="fast-food-outline" size={62} color={THEME.orange} />
        <Text style={styles.imagePlaceholderText}>Karto Item</Text>
      </View>
    );
  };

  const renderAddon = (addon: any) => {
    const selected = selectedAddonIds.includes(addon.id);
    const addonImg = addon.imageUrl || addon.image_url || null;

    return (
      <TouchableOpacity
        key={addon.id}
        style={[styles.optionRow, selected && styles.optionSelected]}
        onPress={() => toggleAddon(addon.id)}
        activeOpacity={0.86}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.checkBox, selected && styles.checkBoxActive]}>
            {selected && <Icon name="checkmark" size={15} color={THEME.white} />}
          </View>

          {addonImg ? (
            <Image source={{ uri: addonImg }} style={styles.optionImg} />
          ) : (
            <View style={styles.optionIcon}>
              <Icon name="add-circle-outline" size={20} color={THEME.orange} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>{addon.title || addon.name || "Add-on"}</Text>
            <Text style={styles.optionSub}>Recommended add-on</Text>
          </View>
        </View>

        <Text style={styles.optionPrice}>+{money(addon.price)}</Text>
      </TouchableOpacity>
    );
  };

  const renderCustomization = (customization: any) => {
    const selected = selectedCustomizationIds.includes(customization.id);
    const required = customization.isRequired || customization.is_required;

    return (
      <TouchableOpacity
        key={customization.id}
        style={[styles.optionRow, selected && styles.optionSelected]}
        onPress={() => toggleCustomization(customization.id, required)}
        activeOpacity={0.86}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.radioBox, selected && styles.radioBoxActive]}>
            {selected && <View style={styles.radioInner} />}
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>
                {customization.title || customization.name || "Customization"}
              </Text>

              {required && (
                <View style={styles.requiredPill}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>

            <Text style={styles.optionSub}>Customize your item</Text>
          </View>
        </View>

        <Text style={styles.optionPrice}>
          {num(customization.price) > 0 ? `+${money(customization.price)}` : "Free"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />
        <View style={styles.loadingLogo}>
          <Icon name="fast-food-outline" size={34} color={THEME.orange} />
        </View>
        <ActivityIndicator size="large" color={THEME.orange} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  const available = isAvailable(item);
  const rating = Number(item.rating || 4.4);
  const totalReviews = Number(item.totalReviews || item.total_reviews || 0);
  const soldCount = Number((item as any).soldCount || (item as any).sold_count || 0);
  const prepTime = getPrepTime(item);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={THEME.bg} barStyle="dark-content" />

      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 158 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageWrapper}>
            {renderHeroImage()}
            <View style={styles.imageGradient} />

            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Icon name="chevron-back" size={23} color={THEME.blue} />
              </TouchableOpacity>

              <View style={styles.topRight}>
                <TouchableOpacity
                  style={styles.circleBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    showToast("info", "Sharing coming soon", "This feature will be available soon.")
                  }
                >
                  <Icon name="share-social-outline" size={22} color={THEME.blue} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.circleBtn}
                  activeOpacity={0.85}
                  onPress={toggleFavorite}
                  disabled={favLoading}
                >
                  {favLoading ? (
                    <ActivityIndicator size="small" color={THEME.orange} />
                  ) : (
                    <Icon
                      name={isFav ? "heart" : "heart-outline"}
                      size={23}
                      color={isFav ? THEME.danger : THEME.blue}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.imageBottomInfo}>
              <View style={styles.ratingBadge}>
                <Icon name="star" size={14} color={THEME.white} />
                <Text style={styles.ratingBadgeText}>{rating.toFixed(1)}</Text>
              </View>

              <View style={[styles.availabilityBadge, !available && styles.unavailableBadge]}>
                <View style={[styles.liveDot, !available && { backgroundColor: THEME.danger }]} />
                <Text style={[styles.availabilityText, !available && { color: THEME.danger }]}>
                  {available ? "Available now" : "Currently unavailable"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contentCard}>
            <View style={styles.restaurantMiniCard}>
              <View style={styles.storeIcon}>
                <Icon name="storefront-outline" size={22} color={THEME.orange} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.storeLabel}>From</Text>
                <Text style={styles.storeName} numberOfLines={1}>
                  {getRestaurantName(item)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.storeViewBtn}
                onPress={() => {
                  if (effectiveRestaurantId) {
                    navigation.navigate("RestaurantDetail", {
                      restaurantId: effectiveRestaurantId,
                      restaurant: item?.restaurant,
                    });
                  }
                }}
              >
                <Text style={styles.storeViewText}>View</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroStatsBanner}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>⭐ {rating.toFixed(1)}</Text>
                <Text style={styles.heroStatLabel}>Rating</Text>
              </View>

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {soldCount > 0 ? `${soldCount}+` : "Fresh"}
                </Text>
                <Text style={styles.heroStatLabel}>Orders</Text>
              </View>

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{prepTime} min</Text>
                <Text style={styles.heroStatLabel}>Prep time</Text>
              </View>
            </View>

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.vegRow}>
                  <View style={[styles.vegBox, !isVeg(item) && { borderColor: THEME.danger }]}>
                    <View style={[styles.vegDot, !isVeg(item) && { backgroundColor: THEME.danger }]} />
                  </View>

                  <Text style={styles.vegText}>
                    {isVeg(item) ? "Vegetarian" : "Non vegetarian"}
                  </Text>

                  {(item.isPopular || item.is_popular || item.isBestSeller || item.is_best_seller) && (
                    <View style={styles.bestSellerPill}>
                      <Icon name="flame" size={12} color={THEME.white} />
                      <Text style={styles.bestSellerText}>Best Seller</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.title}>{item.name || "Menu Item"}</Text>
                <Text style={styles.desc}>
                  {item.description || "Freshly prepared item from this store."}
                </Text>
              </View>

              <View style={styles.pricePill}>
                <Text style={styles.price}>{money(finalBasePrice)}</Text>
                {savedAmount > 0 && <Text style={styles.cutPrice}>{money(basePrice)}</Text>}
              </View>
            </View>

            <View style={styles.offerBanner}>
              <Icon name="gift-outline" size={20} color={THEME.white} />
              <Text style={styles.offerText}>
                {savedAmount > 0
                  ? `You save ${money(savedAmount)} on this item.`
                  : "Eligible for restaurant offers at checkout."}
              </Text>
            </View>

            <View style={styles.trustRow}>
              <TrustChip icon="flash-outline" text="Fast preparation" color={THEME.green} />
              <TrustChip icon="shield-checkmark-outline" text="Quality checked" color={THEME.orange} />
              <TrustChip icon="cube-outline" text="Safe packing" color={THEME.blue} />
            </View>

            {(item.calories || item.servingInfo || item.serving_info || item.spiceLevel !== undefined || item.spice_level !== undefined) && (
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

                  <Text style={styles.sectionAmount}>{money(addonsTotal)}</Text>
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

                  <Text style={styles.sectionAmount}>{money(customizationTotal)}</Text>
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
                  keyExtractor={(x: any, index) => x?.id?.toString() || String(index)}
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
                            color={selected ? THEME.orange : THEME.green}
                          />
                        </View>

                        <Text style={styles.comboTitle} numberOfLines={1}>
                          {addon.title || addon.name || "Add-on"}
                        </Text>

                        <Text style={styles.comboPrice}>+{money(addon.price)}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quantity</Text>
                <Text style={styles.sectionSub}>Estimated total updates live</Text>
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
                    color={quantity <= 1 ? THEME.muted : THEME.orange}
                  />
                </TouchableOpacity>

                <View style={styles.qtyCenter}>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <Text style={styles.qtyLabel}>{quantity === 1 ? "item" : "items"}</Text>
                </View>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(quantity + 1)}
                  disabled={adding}
                  activeOpacity={0.85}
                >
                  <Icon name="add" size={20} color={THEME.orange} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.priceBreakdown}
              activeOpacity={0.9}
              onPress={() => setPriceModalVisible(true)}
            >
              <View style={styles.breakHeader}>
                <Text style={styles.breakTitle}>Price summary</Text>
                <Icon name="information-circle-outline" size={19} color={THEME.orange} />
              </View>

              <PriceRow label="Base price" value={money(finalBasePrice)} />
              <PriceRow label="Add-ons" value={money(addonsTotal)} />
              <PriceRow label="Customizations" value={money(customizationTotal)} />
              <PriceRow label="Quantity" value={`x ${quantity}`} />

              <View style={styles.breakDivider} />

              <PriceRow label="Total" value={`₹${totalPrice.toFixed(2)}`} total />
            </TouchableOpacity>

            {reviews.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Customer reviews</Text>
                    <Text style={styles.sectionSub}>
                      ⭐ {rating.toFixed(1)} from {totalReviews || reviews.length} reviews
                    </Text>
                  </View>
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
                <Text style={styles.sectionSub}>Optional note for the store</Text>
              </View>

              <View style={styles.suggestionWrap}>
                {NOTE_SUGGESTIONS.map(suggestion => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => addSuggestion(suggestion)}
                    activeOpacity={0.85}
                  >
                    <Icon name="add-circle-outline" size={15} color={THEME.orange} />
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
              <Icon name="information-circle-outline" size={20} color={THEME.orange} />
              <Text style={styles.infoText}>
                Add-ons and customizations are included in the final cart total.
              </Text>
            </View>

            <TouchableOpacity style={styles.goToCartBtn} onPress={openCart} activeOpacity={0.85}>
              <Icon name="bag-handle-outline" size={18} color={THEME.orange} />
              <Text style={styles.goToCartText}>Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>{quantity} item{quantity > 1 ? "s" : ""}</Text>
            <Text style={styles.bottomPrice}>₹{totalPrice.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.addToCartBtn, (!available || adding) && { opacity: 0.65 }]}
            onPress={handleAddToCart}
            disabled={adding || !available}
            activeOpacity={0.9}
          >
            {adding ? (
              <ActivityIndicator color={THEME.white} />
            ) : (
              <>
                <Icon name="cart" size={19} color={THEME.white} />
                <Text style={styles.addToCartText}>
                  {available ? "Add to Cart" : "Unavailable"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <PriceModal
          visible={priceModalVisible}
          onClose={() => setPriceModalVisible(false)}
          basePrice={finalBasePrice}
          addonsTotal={addonsTotal}
          customizationTotal={customizationTotal}
          quantity={quantity}
          totalPrice={totalPrice}
          savedAmount={savedAmount}
        />
      </View>
    </SafeAreaView>
  );
}

const TrustChip = ({ icon, text, color }: any) => (
  <View style={styles.trustChip}>
    <Icon name={icon} size={16} color={color} />
    <Text style={styles.trustText}>{text}</Text>
  </View>
);

const PriceRow = ({ label, value, total }: any) => (
  <View style={styles.breakRow}>
    <Text style={[styles.breakLabel, total && styles.breakTotalLabel]}>{label}</Text>
    <Text style={[styles.breakValue, total && styles.breakTotalValue]}>{value}</Text>
  </View>
);

const PriceModal = ({
  visible,
  onClose,
  basePrice,
  addonsTotal,
  customizationTotal,
  quantity,
  totalPrice,
  savedAmount,
}: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <View style={styles.modalIcon}>
          <Icon name="receipt-outline" size={31} color={THEME.orange} />
        </View>

        <Text style={styles.modalTitle}>Price Breakdown</Text>
        <Text style={styles.modalSub}>Final amount includes your selected add-ons and quantity.</Text>

        <View style={styles.modalBillBox}>
          <PriceRow label="Base price" value={money(basePrice)} />
          <PriceRow label="Add-ons" value={money(addonsTotal)} />
          <PriceRow label="Customizations" value={money(customizationTotal)} />
          <PriceRow label="Quantity" value={`x ${quantity}`} />

          {savedAmount > 0 && <PriceRow label="Savings" value={`-${money(savedAmount)}`} />}

          <View style={styles.breakDivider} />
          <PriceRow label="Final total" value={`₹${totalPrice.toFixed(2)}`} total />
        </View>

        <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
          <Text style={styles.modalBtnText}>Got it</Text>
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
    ...shadow,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  imageWrapper: {
    position: "relative",
    height: 342,
    backgroundColor: THEME.card2,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.card2,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: THEME.muted,
    marginTop: 8,
    fontWeight: "800",
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 16 : 16,
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
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    ...shadow,
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
    backgroundColor: THEME.green,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingBadgeText: {
    marginLeft: 5,
    color: THEME.white,
    fontWeight: "900",
    fontSize: 13,
  },
  availabilityBadge: {
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },
  unavailableBadge: {
    backgroundColor: "#FFF1F1",
  },
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
    marginTop: -20,
    backgroundColor: THEME.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  restaurantMiniCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    ...shadow,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  storeLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  storeName: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 15,
    marginTop: 2,
  },
  storeViewBtn: {
    backgroundColor: THEME.orange,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 13,
  },
  storeViewText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 12,
  },
  heroStatsBanner: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 13,
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
    ...shadow,
  },
  heroStat: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: "center",
  },
  heroStatValue: {
    color: THEME.blue,
    fontWeight: "900",
    fontSize: 13,
  },
  heroStatLabel: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  vegRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    flexWrap: "wrap",
  },
  vegBox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    backgroundColor: THEME.white,
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
    backgroundColor: THEME.orange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  bestSellerText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 10,
    marginLeft: 4,
  },
  title: {
    fontSize: 27,
    fontWeight: "900",
    color: THEME.blue,
    letterSpacing: -0.4,
  },
  desc: {
    fontSize: 14,
    color: THEME.muted,
    lineHeight: 21,
    marginTop: 8,
    paddingRight: 10,
    fontWeight: "700",
  },
  pricePill: {
    backgroundColor: THEME.orangeSoft,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    marginLeft: 10,
    alignItems: "center",
  },
  price: {
    fontSize: 17,
    color: THEME.orange,
    fontWeight: "900",
  },
  cutPrice: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 11,
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  offerBanner: {
    backgroundColor: THEME.orange,
    borderRadius: 18,
    padding: 13,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  offerText: {
    color: THEME.white,
    fontWeight: "900",
    marginLeft: 8,
    flex: 1,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
  },
  trustChip: {
    backgroundColor: THEME.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
    ...shadow,
  },
  trustText: {
    marginLeft: 5,
    color: THEME.blue,
    fontWeight: "800",
    fontSize: 12,
  },
  sectionBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    marginTop: 16,
    ...shadow,
  },
  sectionHeader: { marginBottom: 14 },
  sectionHeaderRow: {
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: {
    color: THEME.blue,
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
    color: THEME.orange,
    fontWeight: "900",
    fontSize: 15,
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 12,
  },
  nutritionValue: {
    color: THEME.orange,
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
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: THEME.orange,
    backgroundColor: THEME.orangeSoft,
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
    backgroundColor: THEME.orange,
    borderColor: THEME.orange,
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
    borderColor: THEME.orange,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.orange,
  },
  optionImg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: THEME.card,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  optionTitle: {
    color: THEME.blue,
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
    backgroundColor: THEME.orange,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  requiredText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 9,
  },
  optionPrice: {
    color: THEME.orange,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 10,
  },
  comboCard: {
    width: 126,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  comboCardActive: {
    borderColor: THEME.orange,
    backgroundColor: THEME.orangeSoft,
  },
  comboIcon: {
    marginBottom: 8,
  },
  comboTitle: {
    color: THEME.blue,
    fontSize: 13,
    fontWeight: "900",
  },
  comboPrice: {
    color: THEME.orange,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
  },
  quantityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.45,
  },
  qtyCenter: {
    alignItems: "center",
  },
  qtyText: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.blue,
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
    ...shadow,
  },
  breakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakTitle: {
    color: THEME.blue,
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
    color: THEME.blue,
    fontWeight: "900",
  },
  breakDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginTop: 12,
  },
  breakTotalLabel: {
    color: THEME.blue,
    fontSize: 16,
    fontWeight: "900",
  },
  breakTotalValue: {
    color: THEME.orange,
    fontSize: 17,
    fontWeight: "900",
  },
  reviewCard: {
    backgroundColor: THEME.surface,
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
    color: THEME.blue,
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
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  suggestionChip: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
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
    color: THEME.blue,
    fontSize: 12,
    fontWeight: "900",
  },
  noteInput: {
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    minHeight: 86,
    marginBottom: 6,
    fontSize: 15,
    color: THEME.blue,
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
    backgroundColor: THEME.orangeSoft,
    borderRadius: 18,
    padding: 13,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: THEME.orange,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  goToCartBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: THEME.orange,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: THEME.card,
  },
  goToCartText: {
    color: THEME.orange,
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
    ...shadow,
  },
  bottomLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  bottomPrice: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  addToCartBtn: {
    backgroundColor: THEME.orange,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 168,
  },
  addToCartText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalBox: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: THEME.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: THEME.blue,
    fontSize: 22,
    fontWeight: "900",
  },
  modalSub: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
    fontWeight: "700",
  },
  modalBillBox: {
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
