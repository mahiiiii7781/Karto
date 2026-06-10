import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Switch,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import apiClient from "@/api/apiClient";
import {
  vendorService,
  VendorCategory,
  VendorMenuItem,
  VendorRestaurant,
} from "@/services/api/vendorService";

const THEME = {
  bg: "#070A07",
  card: "#111711",
  card2: "#182018",
  surface: "#101610",
  yellow: "#F6C343",
  green: "#22C55E",
  greenSoft: "#102116",
  orange: "#FB923C",
  blue: "#38BDF8",
  purple: "#A78BFA",
  text: "#F8FAFC",
  muted: "#A7B0A5",
  border: "#273027",
  danger: "#EF4444",
  black: "#050807",
  white: "#FFFFFF",
};

type FilterType = "All" | "Live" | "Out" | "Veg" | "Non Veg" | "Best Sellers";

type MenuForm = {
  name: string;
  price: string;
  description: string;
  prepTimeMin: string;
  categoryId: string;
  restaurantId: string;
  imageUrl: string | null;
  localImageUri: string | null;
  isVeg: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isAvailable: boolean;
};

const FILTERS: FilterType[] = ["All", "Live", "Out", "Veg", "Non Veg", "Best Sellers"];

const defaultForm: MenuForm = {
  name: "",
  price: "",
  description: "",
  prepTimeMin: "20",
  categoryId: "",
  restaurantId: "",
  imageUrl: null,
  localImageUri: null,
  isVeg: true,
  isPopular: false,
  isBestSeller: false,
  isAvailable: true,
};

const priceText = (value: any) => `₹${Number(value || 0).toFixed(0)}`;
const cleanNumber = (value: string) => value.replace(/[^0-9.]/g, "");
const cleanInteger = (value: string) => value.replace(/[^0-9]/g, "");

const showErrorText = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  error?.raw?.message ||
  fallback;

const unwrapArray = (value: any) => {
  const data =
    value?.data?.data?.items ||
    value?.data?.data?.menuItems ||
    value?.data?.items ||
    value?.data?.menuItems ||
    value?.data?.categories ||
    value?.data?.vendorCategories ||
    value?.data?.restaurants ||
    value?.items ||
    value?.menuItems ||
    value?.categories ||
    value?.restaurants ||
    value?.data ||
    value ||
    [];

  return Array.isArray(data) ? data : [];
};

const unwrapSavedItem = (value: any) =>
  value?.data?.data?.item ||
  value?.data?.data?.menuItem ||
  value?.data?.item ||
  value?.data?.menuItem ||
  value?.data?.data ||
  value?.data ||
  value?.item ||
  value?.menuItem ||
  value ||
  null;

const uploadUrlFromResponse = (res: any) =>
  res?.data?.imageUrl ||
  res?.data?.image_url ||
  res?.data?.url ||
  res?.data?.secure_url ||
  res?.data?.data?.imageUrl ||
  res?.data?.data?.image_url ||
  res?.data?.data?.url ||
  res?.data?.data?.secure_url ||
  res?.data?.file?.url ||
  res?.data?.file?.secure_url ||
  res?.data?.result?.url ||
  res?.data?.result?.secure_url ||
  null;

const imageUri = (item: any) =>
  item?.imageUrl || item?.image_url || item?.image || item?.photoUrl || item?.photo_url || null;

const normalizeCategory = (item: any): VendorCategory => ({
  ...item,
  id: String(item?.id || ""),
  name: item?.name || item?.category_name || item?.title || "Category",
  imageUrl: item?.imageUrl || item?.image_url || null,
  image_url: item?.image_url || item?.imageUrl || null,
  isActive: item?.isActive ?? item?.is_active ?? true,
  is_active: item?.is_active ?? item?.isActive ?? true,
});

const normalizeRestaurant = (item: any): VendorRestaurant => ({
  ...item,
  id: String(item?.id || ""),
  name: item?.name || item?.restaurant_name || item?.restaurantName || "Restaurant",
  restaurant_name: item?.restaurant_name || item?.restaurantName || item?.name || "Restaurant",
});

const normalizeMenuItem = (item: any): VendorMenuItem => {
  const categoryId =
    item?.categoryId ||
    item?.category_id ||
    item?.vendorCategoryId ||
    item?.vendor_category_id ||
    item?.category?.id ||
    item?.vendorCategory?.id ||
    null;

  const restaurantId = item?.restaurantId || item?.restaurant_id || item?.restaurant?.id || null;

  const veg =
    item?.isVeg ??
    item?.is_veg ??
    item?.isVegetarian ??
    item?.is_vegetarian ??
    true;

  return {
    ...item,
    id: String(item?.id || ""),
    name: item?.name || "Untitled item",
    description: item?.description || null,
    price: item?.price || 0,
    imageUrl: imageUri(item),
    image_url: imageUri(item),
    categoryId,
    category_id: categoryId,
    vendorCategoryId: categoryId,
    vendor_category_id: categoryId,
    restaurantId,
    restaurant_id: restaurantId,
    prepTimeMin: item?.prepTimeMin ?? item?.prep_time_min ?? 20,
    prep_time_min: item?.prep_time_min ?? item?.prepTimeMin ?? 20,
    isVeg: Boolean(veg),
    is_veg: Boolean(veg),
    isVegetarian: Boolean(veg),
    is_vegetarian: Boolean(veg),
    isPopular: item?.isPopular ?? item?.is_popular ?? false,
    is_popular: item?.is_popular ?? item?.isPopular ?? false,
    isBestSeller: item?.isBestSeller ?? item?.is_best_seller ?? false,
    is_best_seller: item?.is_best_seller ?? item?.isBestSeller ?? false,
    isAvailable: item?.isAvailable ?? item?.is_available ?? true,
    is_available: item?.is_available ?? item?.isAvailable ?? true,
  } as VendorMenuItem;
};

const itemCategoryId = (item: any) =>
  item?.categoryId || item?.category_id || item?.vendorCategoryId || item?.vendor_category_id || item?.category?.id || item?.vendorCategory?.id || "";

const itemRestaurantId = (item: any) =>
  item?.restaurantId || item?.restaurant_id || item?.restaurant?.id || "";

const itemCategoryTitle = (item: any, categories: VendorCategory[]) => {
  const direct =
    item?.vendorCategory?.name ||
    item?.category?.name ||
    item?.categoryName ||
    item?.category_name ||
    (typeof item?.category === "string" ? item.category : "");

  if (direct) return String(direct);

  const category = categories.find((x) => String(x.id) === String(itemCategoryId(item)));
  return category?.name || "Menu";
};

const boolVeg = (item: any) =>
  Boolean(item?.isVeg ?? item?.is_veg ?? item?.isVegetarian ?? item?.is_vegetarian ?? true);

const boolAvailable = (item: any) =>
  Boolean(item?.isAvailable ?? item?.is_available ?? true);

const boolBest = (item: any) =>
  Boolean(item?.isBestSeller ?? item?.is_best_seller ?? item?.isPopular ?? item?.is_popular ?? false);

export default function VendorMenuScreen() {
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<VendorMenuItem[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VendorMenuItem | null>(null);
  const [form, setForm] = useState<MenuForm>(defaultForm);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [activeCategory, setActiveCategory] = useState("All");
  const [toast, setToast] = useState("");
  const [imageKey, setImageKey] = useState(Date.now());

  const toastMsg = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const patchForm = (patch: Partial<MenuForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const defaultRestaurantId = useMemo(() => String(restaurants?.[0]?.id || ""), [restaurants]);
  const defaultCategoryId = useMemo(() => String(categories?.[0]?.id || ""), [categories]);

  const loadMenu = useCallback(
    async (silent = false) => {
      try {
        silent ? setRefreshing(true) : setLoading(true);

        const [menuRes, categoryRes, restaurantRes] = await Promise.allSettled([
          vendorService.getMenuItems(),
          vendorService.getCategories(),
          vendorService.getRestaurants(),
        ]);

        if (menuRes.status === "fulfilled" && !menuRes.value.error) {
          setItems(unwrapArray(menuRes.value.data).map(normalizeMenuItem).filter((x) => x.id));
        } else {
          const err = menuRes.status === "fulfilled" ? menuRes.value.error : menuRes.reason;
          toastMsg(showErrorText(err, "Failed to load menu"));
          setItems([]);
        }

        if (categoryRes.status === "fulfilled" && !categoryRes.value.error) {
          setCategories(
            unwrapArray(categoryRes.value.data)
              .map(normalizeCategory)
              .filter((x) => x.id && x.isActive !== false)
          );
        }

        if (restaurantRes.status === "fulfilled" && !restaurantRes.value.error) {
          setRestaurants(unwrapArray(restaurantRes.value.data).map(normalizeRestaurant).filter((x) => x.id));
        }
      } catch (error: any) {
        toastMsg(showErrorText(error, "Failed to load menu"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toastMsg]
  );

  useEffect(() => {
    loadMenu(false);

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loadMenu]);

  useEffect(() => {
    if (!formVisible) return;

    setForm((prev) => ({
      ...prev,
      restaurantId: prev.restaurantId || defaultRestaurantId,
      categoryId: prev.categoryId || defaultCategoryId,
    }));
  }, [formVisible, defaultRestaurantId, defaultCategoryId]);

  const stats = useMemo(
    () => ({
      total: items.length,
      live: items.filter(boolAvailable).length,
      out: items.filter((x) => !boolAvailable(x)).length,
      best: items.filter(boolBest).length,
    }),
    [items]
  );

  const categoryTabs = useMemo(() => {
    const map = new Map<string, string>();

    categories.forEach((cat) => {
      if (cat.name) map.set(String(cat.name).toLowerCase(), cat.name);
    });

    items.forEach((item) => {
      const title = itemCategoryTitle(item, categories);
      if (title) map.set(String(title).toLowerCase(), title);
    });

    return ["All", ...Array.from(map.values())];
  }, [items, categories]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const category = itemCategoryTitle(item, categories);
      const available = boolAvailable(item);
      const veg = boolVeg(item);
      const best = boolBest(item);

      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q);

      const matchFilter =
        activeFilter === "All" ||
        (activeFilter === "Live" && available) ||
        (activeFilter === "Out" && !available) ||
        (activeFilter === "Veg" && veg) ||
        (activeFilter === "Non Veg" && !veg) ||
        (activeFilter === "Best Sellers" && best);

      const matchCategory = activeCategory === "All" || category === activeCategory;

      return matchSearch && matchFilter && matchCategory;
    });
  }, [items, categories, search, activeFilter, activeCategory]);

  const resetForm = () => {
    setSelectedItem(null);
    setForm({
      ...defaultForm,
      categoryId: defaultCategoryId,
      restaurantId: defaultRestaurantId,
    });
  };

  const openAdd = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEdit = (item: VendorMenuItem) => {
    setSelectedItem(item);
    setForm({
      name: item.name || "",
      price: String(item.price || ""),
      description: item.description || "",
      prepTimeMin: String((item as any).prepTimeMin || (item as any).prep_time_min || 20),
      categoryId: String(itemCategoryId(item) || defaultCategoryId),
      restaurantId: String(itemRestaurantId(item) || defaultRestaurantId),
      imageUrl: imageUri(item),
      localImageUri: null,
      isVeg: boolVeg(item),
      isPopular: Boolean((item as any).isPopular ?? (item as any).is_popular ?? false),
      isBestSeller: boolBest(item),
      isAvailable: boolAvailable(item),
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    if (saving || uploading) return;
    setFormVisible(false);
    resetForm();
  };

  const validateForm = () => {
    const price = Number(form.price);
    const prepTime = Number(form.prepTimeMin || 20);

    if (!form.name.trim()) {
      toastMsg("Item name required");
      return false;
    }

    if (!price || price <= 0) {
      toastMsg("Valid price required");
      return false;
    }

    if (!prepTime || prepTime < 1 || prepTime > 180) {
      toastMsg("Prep time must be 1 to 180 minutes");
      return false;
    }

    if (!form.categoryId && !defaultCategoryId) {
      toastMsg("Please create/select a category first");
      return false;
    }

    if (!form.restaurantId && !defaultRestaurantId) {
      toastMsg("Restaurant not found for this vendor. Refresh vendor profile first.");
      return false;
    }

    return true;
  };

  const uploadImage = async (asset: any) => {
    if (!asset?.uri) return null;

    setUploading(true);
    patchForm({ localImageUri: asset.uri });

    try {
      const file: any = {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `karto-menu-${Date.now()}.${asset.type?.includes("png") ? "png" : "jpg"}`,
      };

      const fd = new FormData();
      fd.append("folder", "menu");
      fd.append("image", file);

      let res: any;

      try {
        res = await apiClient.post("/upload/image", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (firstError: any) {
        console.log("/upload/image failed:", firstError?.response?.data || firstError?.message);
        res = await apiClient.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const url = uploadUrlFromResponse(res);

      if (!url) {
        toastMsg("Image URL not found from upload response");
        return null;
      }

      patchForm({ imageUrl: url, localImageUri: asset.uri });
      setImageKey(Date.now());
      toastMsg("Image updated");
      return url;
    } catch (error: any) {
      toastMsg(showErrorText(error, "Image upload failed"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const pickGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      selectionLimit: 1,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      toastMsg(result.errorMessage || "Gallery error");
      return;
    }

    await uploadImage(result.assets?.[0]);
  };

  const pickCamera = async () => {
    const result = await launchCamera({
      mediaType: "photo",
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
      cameraType: "back",
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      toastMsg(result.errorMessage || "Camera error");
      return;
    }

    await uploadImage(result.assets?.[0]);
  };

  const showImagePicker = () => {
    Alert.alert("Menu Image", "Choose image source", [
      { text: "Camera", onPress: pickCamera },
      { text: "Gallery", onPress: pickGallery },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => patchForm({ imageUrl: null, localImageUri: null }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const buildPayload = () => {
    const categoryId = form.categoryId || defaultCategoryId || undefined;
    const restaurantId = form.restaurantId || defaultRestaurantId || undefined;
    const prep = Number(form.prepTimeMin || 20);
    const veg = Boolean(form.isVeg);
    const best = Boolean(form.isBestSeller);
    const popular = Boolean(form.isPopular || form.isBestSeller);
    const available = Boolean(form.isAvailable);

    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      imageUrl: form.imageUrl || null,
      image_url: form.imageUrl || null,

      prepTimeMin: prep,
      prep_time_min: prep,

      categoryId,
      category_id: categoryId,
      vendorCategoryId: categoryId,
      vendor_category_id: categoryId,

      restaurantId,
      restaurant_id: restaurantId,

      isVeg: veg,
      is_veg: veg,
      isVegetarian: veg,
      is_vegetarian: veg,

      isPopular: popular,
      is_popular: popular,
      isBestSeller: best,
      is_best_seller: best,
      isAvailable: available,
      is_available: available,
    };
  };

  const saveDirect = async (payload: any, id?: string) => {
    const res = id
      ? await apiClient.patch(`/vendor/menu/${id}`, payload)
      : await apiClient.post("/vendor/menu", payload);

    return unwrapSavedItem(res);
  };

  const saveItem = async () => {
    if (saving || uploading) return;
    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = buildPayload();
      let savedRaw: any = null;

      const result = selectedItem?.id
        ? await vendorService.updateMenuItem(String(selectedItem.id), payload)
        : await vendorService.createMenuItem(payload);

      if (!result.error && result.data) {
        savedRaw = result.data;
      } else {
        console.log("vendorService menu save failed:", result.error);
      }

      if (!savedRaw) {
        savedRaw = await saveDirect(payload, selectedItem?.id);
      }

      const saved = normalizeMenuItem({
        ...(selectedItem || {}),
        ...payload,
        ...unwrapSavedItem(savedRaw),
        id: unwrapSavedItem(savedRaw)?.id || selectedItem?.id,
      });

      if (selectedItem?.id) {
        setItems((prev) => prev.map((row) => (row.id === selectedItem.id ? saved : row)));
      } else if (saved.id) {
        setItems((prev) => [saved, ...prev]);
      }

      setFormVisible(false);
      resetForm();
      setImageKey(Date.now());
      toastMsg(selectedItem ? "Menu item updated" : "Menu item saved");
      await loadMenu(true);
    } catch (error: any) {
      console.log("MENU SAVE ERROR:", error?.response?.data || error?.message);
      toastMsg(showErrorText(error, "Menu save failed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: VendorMenuItem) => {
    if (togglingId) return;

    const oldValue = boolAvailable(item);
    const nextValue = !oldValue;

    setTogglingId(item.id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? ({ ...row, isAvailable: nextValue, is_available: nextValue } as VendorMenuItem)
          : row
      )
    );

    try {
      const { error } = await vendorService.toggleMenuItemAvailability(item.id, nextValue);

      if (error) {
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? ({ ...row, isAvailable: oldValue, is_available: oldValue } as VendorMenuItem)
              : row
          )
        );
        toastMsg(error.message || "Stock update failed");
        return;
      }

      toastMsg(nextValue ? "Item is live" : "Item is out of stock");
    } catch (error: any) {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? ({ ...row, isAvailable: oldValue, is_available: oldValue } as VendorMenuItem)
            : row
        )
      );
      toastMsg(showErrorText(error, "Stock update failed"));
    } finally {
      setTogglingId(null);
    }
  };

  const askDelete = (item: VendorMenuItem) => {
    setSelectedItem(item);
    setDeleteVisible(true);
  };

  const deleteItem = async () => {
    if (!selectedItem?.id || deletingId) return;

    setDeletingId(selectedItem.id);

    try {
      const { error } = await vendorService.deleteMenuItem(selectedItem.id);

      if (error) {
        toastMsg(error.message || "Delete failed");
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== selectedItem.id));
      setDeleteVisible(false);
      setSelectedItem(null);
      toastMsg("Menu item deleted");
    } catch (error: any) {
      toastMsg(showErrorText(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const renderImage = (item: any, style: any) => {
    const uri = imageUri(item);

    if (uri) {
      return <Image source={{ uri: `${uri}${String(uri).includes("?") ? "&" : "?"}v=${imageKey}` }} style={style} />;
    }

    return (
      <View style={[style, styles.imageFallback]}>
        <Icon name="fast-food-outline" size={30} color={THEME.yellow} />
      </View>
    );
  };

  const renderBestSeller = ({ item }: { item: VendorMenuItem }) => (
    <TouchableOpacity style={styles.bestCard} activeOpacity={0.9} onPress={() => openEdit(item)}>
      <View style={styles.bestImageWrap}>
        {renderImage(item, styles.bestImage)}
        <View style={styles.flameBadge}>
          <Icon name="flame" size={13} color={THEME.white} />
        </View>
      </View>

      <Text style={styles.bestName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.bestDesc} numberOfLines={1}>{item.description || "Freshly prepared"}</Text>

      <View style={styles.bestFooter}>
        <Text style={styles.bestPrice}>{priceText(item.price)}</Text>
        <TouchableOpacity style={styles.bestEditBtn} onPress={() => openEdit(item)}>
          <Icon name="create-outline" size={15} color={THEME.black} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: VendorMenuItem; index: number }) => {
    const unavailable = !boolAvailable(item);
    const veg = boolVeg(item);
    const best = boolBest(item);

    return (
      <TouchableOpacity
        style={[styles.itemCard, unavailable && styles.itemCardDisabled]}
        activeOpacity={0.92}
        onPress={() => openEdit(item)}
      >
        <View style={styles.itemInfo}>
          <View style={styles.itemTopRow}>
            <View style={[styles.vegBox, !veg && { borderColor: THEME.danger }]}>
              <View style={[styles.vegDot, !veg && { backgroundColor: THEME.danger }]} />
            </View>

            {best && (
              <View style={styles.bestPill}>
                <Icon name="flame" size={12} color={THEME.white} />
                <Text style={styles.bestPillText}>Best Seller</Text>
              </View>
            )}

            <View style={[styles.livePill, unavailable && styles.outPill]}>
              <Text style={[styles.liveText, unavailable && styles.outText]}>
                {unavailable ? "OUT" : "LIVE"}
              </Text>
            </View>
          </View>

          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description || "Fresh, tasty and carefully packed."}</Text>

          <View style={styles.itemMetaRow}>
            <Text style={styles.itemPrice}>{priceText(item.price)}</Text>
            <Text style={styles.itemCategory}>{itemCategoryTitle(item, categories)}</Text>
          </View>

          <View style={styles.itemActions}>
            <TouchableOpacity style={styles.smallAction} onPress={() => openEdit(item)}>
              <Icon name="create-outline" size={15} color={THEME.blue} />
              <Text style={[styles.smallActionText, { color: THEME.blue }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallAction}
              disabled={togglingId === item.id}
              onPress={() => toggleAvailability(item)}
            >
              {togglingId === item.id ? (
                <ActivityIndicator size="small" color={THEME.green} />
              ) : (
                <>
                  <Icon name={unavailable ? "checkmark-circle-outline" : "close-circle-outline"} size={15} color={THEME.green} />
                  <Text style={styles.smallActionText}>{unavailable ? "Make Live" : "Stock Out"}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemImageBox}>
          {renderImage(item, styles.itemImage)}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => askDelete(item)}>
            <Icon name="trash-outline" size={18} color={THEME.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Loading vendor menu...</Text>
      </View>
    );
  }

  const bestItems = items.filter(boolBest).slice(0, 8);

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      {!!toast && (
        <View style={styles.toast}>
          <Icon name="checkmark-circle" size={18} color={THEME.green} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.green}
            colors={[THEME.green]}
            onRefresh={() => loadMenu(true)}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroPattern} />
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTag}>VENDOR PANEL</Text>
                  <Text style={styles.heroTitle}>Manage Menu</Text>
                  <Text style={styles.heroSub}>Add items, photos, price and stock in one place.</Text>
                </View>

                <TouchableOpacity style={styles.heroAddBtn} onPress={openAdd} activeOpacity={0.9}>
                  <Icon name="add" size={26} color={THEME.black} />
                </TouchableOpacity>
              </View>

              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Icon name="fast-food-outline" size={16} color={THEME.green} />
                  <Text style={styles.heroChipText}>{stats.total} Items</Text>
                </View>
                <View style={styles.heroChip}>
                  <Icon name="checkmark-circle-outline" size={16} color={THEME.green} />
                  <Text style={styles.heroChipText}>{stats.live} Live</Text>
                </View>
                <View style={styles.heroChip}>
                  <Icon name="flame-outline" size={16} color={THEME.yellow} />
                  <Text style={styles.heroChipText}>{stats.best} Best</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoTopRow}>
                <View>
                  <Text style={styles.infoLabel}>Menu Health</Text>
                  <Text style={styles.infoTitle}>{stats.live}/{stats.total} Live</Text>
                </View>
                <View style={styles.infoIcon}>
                  <Icon name="restaurant-outline" size={26} color={THEME.black} />
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaBox}>
                  <Icon name="checkmark-done-outline" size={18} color={THEME.green} />
                  <Text style={styles.metaValue}>{stats.live}</Text>
                  <Text style={styles.metaLabel}>Available</Text>
                </View>
                <View style={styles.metaBox}>
                  <Icon name="close-circle-outline" size={18} color={THEME.danger} />
                  <Text style={styles.metaValue}>{stats.out}</Text>
                  <Text style={styles.metaLabel}>Out Stock</Text>
                </View>
                <View style={styles.metaBox}>
                  <Icon name="folder-open-outline" size={18} color={THEME.yellow} />
                  <Text style={styles.metaValue}>{categories.length}</Text>
                  <Text style={styles.metaLabel}>Categories</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchBox}>
              <Icon name="search-outline" size={19} color={THEME.green} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search dishes, category..."
                placeholderTextColor={THEME.muted}
                style={styles.searchInput}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch("")}> 
                  <Icon name="close-circle" size={19} color={THEME.muted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categoryTabs.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {bestItems.length > 0 && (
              <View style={styles.bestSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Best Sellers</Text>
                    <Text style={styles.sectionSub}>Same restaurant detail style, vendor theme</Text>
                  </View>
                </View>

                <FlatList
                  horizontal
                  data={bestItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBestSeller}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 18 }}
                />
              </View>
            )}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>All Menu Items</Text>
                <Text style={styles.sectionSub}>{filteredItems.length} items found</Text>
              </View>
              <TouchableOpacity style={styles.miniAddBtn} onPress={openAdd}>
                <Icon name="add" size={18} color={THEME.black} />
                <Text style={styles.miniAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Icon name="restaurant-outline" size={42} color={THEME.yellow} />
            </View>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptyText}>Try another filter or add your first item.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Add Menu Item</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.content}
      />

      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardBox}>
            <View style={styles.formSheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>{selectedItem ? "Update Menu Item" : "Add Menu Item"}</Text>
                  <Text style={styles.formSub}>Photo, price, category and stock</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={closeForm}>
                  <Icon name="close" size={22} color={THEME.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
                <TouchableOpacity style={styles.imagePicker} onPress={showImagePicker} activeOpacity={0.9}>
                  {form.localImageUri || form.imageUrl ? (
                    <Image
                      source={{ uri: form.localImageUri || `${form.imageUrl}${String(form.imageUrl).includes("?") ? "&" : "?"}v=${imageKey}` }}
                      style={styles.formImage}
                    />
                  ) : (
                    <View style={styles.formImageFallback}>
                      <Icon name="camera-outline" size={34} color={THEME.yellow} />
                      <Text style={styles.formImageText}>Add item photo</Text>
                    </View>
                  )}

                  <View style={styles.imageEditBadge}>
                    {uploading ? <ActivityIndicator color={THEME.black} /> : <Icon name="camera" size={18} color={THEME.black} />}
                  </View>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Item Name</Text>
                <View style={styles.inputBox}>
                  <Icon name="fast-food-outline" size={19} color={THEME.green} />
                  <TextInput
                    value={form.name}
                    onChangeText={(name) => patchForm({ name })}
                    placeholder="Paneer Pizza, Burger..."
                    placeholderTextColor={THEME.muted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <View style={styles.inputBox}>
                      <Text style={styles.rupee}>₹</Text>
                      <TextInput
                        value={form.price}
                        onChangeText={(price) => patchForm({ price: cleanNumber(price) })}
                        keyboardType="decimal-pad"
                        placeholder="99"
                        placeholderTextColor={THEME.muted}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Prep Time</Text>
                    <View style={styles.inputBox}>
                      <Icon name="time-outline" size={19} color={THEME.orange} />
                      <TextInput
                        value={form.prepTimeMin}
                        onChangeText={(prepTimeMin) => patchForm({ prepTimeMin: cleanInteger(prepTimeMin) })}
                        keyboardType="number-pad"
                        placeholder="20"
                        placeholderTextColor={THEME.muted}
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  value={form.description}
                  onChangeText={(description) => patchForm({ description })}
                  placeholder="Short tasty description"
                  placeholderTextColor={THEME.muted}
                  style={styles.textArea}
                  multiline
                />

                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChipRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.formChip, form.categoryId === cat.id && styles.formChipActive]}
                      onPress={() => patchForm({ categoryId: cat.id })}
                    >
                      <Text style={[styles.formChipText, form.categoryId === cat.id && styles.formChipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {restaurants.length > 1 && (
                  <>
                    <Text style={styles.inputLabel}>Restaurant</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChipRow}>
                      {restaurants.map((rest) => (
                        <TouchableOpacity
                          key={rest.id}
                          style={[styles.formChip, form.restaurantId === rest.id && styles.formChipActive]}
                          onPress={() => patchForm({ restaurantId: rest.id })}
                        >
                          <Text style={[styles.formChipText, form.restaurantId === rest.id && styles.formChipTextActive]}>{rest.restaurant_name || rest.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.switchCard}>
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchTitle}>Veg Item</Text>
                      <Text style={styles.switchSub}>Green veg indicator</Text>
                    </View>
                    <Switch value={form.isVeg} onValueChange={(isVeg) => patchForm({ isVeg })} thumbColor={form.isVeg ? THEME.green : THEME.muted} />
                  </View>

                  <View style={styles.switchLine} />

                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchTitle}>Best Seller</Text>
                      <Text style={styles.switchSub}>Show in highlighted row</Text>
                    </View>
                    <Switch
                      value={form.isBestSeller}
                      onValueChange={(isBestSeller) => patchForm({ isBestSeller, isPopular: isBestSeller || form.isPopular })}
                      thumbColor={form.isBestSeller ? THEME.yellow : THEME.muted}
                    />
                  </View>

                  <View style={styles.switchLine} />

                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchTitle}>Available Now</Text>
                      <Text style={styles.switchSub}>Customers can order this item</Text>
                    </View>
                    <Switch value={form.isAvailable} onValueChange={(isAvailable) => patchForm({ isAvailable })} thumbColor={form.isAvailable ? THEME.green : THEME.danger} />
                  </View>
                </View>

                <TouchableOpacity style={[styles.saveBtn, (saving || uploading) && styles.disabled]} disabled={saving || uploading} onPress={saveItem}>
                  {saving ? (
                    <ActivityIndicator color={THEME.black} />
                  ) : (
                    <>
                      <Text style={styles.saveBtnText}>{selectedItem ? "Update Item" : "Save Item"}</Text>
                      <Icon name="checkmark-circle" size={21} color={THEME.black} />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteBox}>
            <View style={styles.deleteIconBox}>
              <Icon name="trash-outline" size={32} color={THEME.danger} />
            </View>
            <Text style={styles.deleteTitle}>Delete menu item?</Text>
            <Text style={styles.deleteText}>This item will be removed from your vendor menu.</Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.keepBtn} disabled={!!deletingId} onPress={() => setDeleteVisible(false)}>
                <Text style={styles.keepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} disabled={!!deletingId} onPress={deleteItem}>
                {deletingId ? <ActivityIndicator color={THEME.black} /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 18, paddingBottom: 40 },
  loadingScreen: { flex: 1, backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center" },
  loadingLogo: { width: 76, height: 76, borderRadius: 26, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  loadingLogoText: { color: THEME.yellow, fontSize: 39, fontWeight: "900" },
  loadingText: { color: THEME.muted, marginTop: 12, fontWeight: "800" },
  toast: { position: "absolute", top: Platform.OS === "ios" ? 54 : 28, left: 18, right: 18, zIndex: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  toastText: { color: THEME.text, fontWeight: "900", flex: 1 },

  hero: { minHeight: 210, borderRadius: 30, padding: 18, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, overflow: "hidden", marginTop: Platform.OS === "ios" ? 34 : 8, marginBottom: 16 },
  heroPattern: { position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: "#20462C" },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroTag: { color: THEME.green, fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 5 },
  heroSub: { color: THEME.muted, fontSize: 14, lineHeight: 20, fontWeight: "700", marginTop: 8, maxWidth: "78%" },
  heroAddBtn: { width: 54, height: 54, borderRadius: 20, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center" },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 30 },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  heroChipText: { color: THEME.text, fontSize: 12, fontWeight: "900" },

  infoCard: { backgroundColor: THEME.card, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 14 },
  infoTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: THEME.muted, fontSize: 12, fontWeight: "900" },
  infoTitle: { color: THEME.text, fontSize: 24, fontWeight: "900", marginTop: 3 },
  infoIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: THEME.yellow, alignItems: "center", justifyContent: "center" },
  metaGrid: { flexDirection: "row", gap: 10, marginTop: 15 },
  metaBox: { flex: 1, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, borderRadius: 18, padding: 12 },
  metaValue: { color: THEME.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  metaLabel: { color: THEME.muted, fontSize: 11, fontWeight: "800", marginTop: 2 },

  searchBox: { height: 56, borderRadius: 18, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9, marginBottom: 12 },
  searchInput: { flex: 1, color: THEME.text, fontSize: 15, fontWeight: "800" },
  filterRow: { gap: 9, paddingBottom: 12 },
  filterChip: { height: 40, paddingHorizontal: 15, borderRadius: 99, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  filterText: { color: THEME.muted, fontWeight: "900" },
  filterTextActive: { color: THEME.black },
  categoryRow: { gap: 9, paddingBottom: 16 },
  categoryChip: { height: 38, paddingHorizontal: 14, borderRadius: 99, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  categoryChipActive: { borderColor: THEME.yellow, backgroundColor: "#252109" },
  categoryText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
  categoryTextActive: { color: THEME.yellow },

  bestSection: { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 2 },
  sectionTitle: { color: THEME.text, fontSize: 19, fontWeight: "900" },
  sectionSub: { color: THEME.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  miniAddBtn: { backgroundColor: THEME.green, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  miniAddText: { color: THEME.black, fontWeight: "900" },

  bestCard: { width: 170, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 22, padding: 10, marginRight: 12 },
  bestImageWrap: { width: "100%", height: 106, borderRadius: 18, overflow: "hidden", backgroundColor: THEME.card2 },
  bestImage: { width: "100%", height: "100%", borderRadius: 18 },
  flameBadge: { position: "absolute", right: 8, top: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: THEME.orange, alignItems: "center", justifyContent: "center" },
  bestName: { color: THEME.text, fontSize: 15, fontWeight: "900", marginTop: 10 },
  bestDesc: { color: THEME.muted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  bestFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  bestPrice: { color: THEME.yellow, fontSize: 16, fontWeight: "900" },
  bestEditBtn: { width: 30, height: 30, borderRadius: 12, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center" },

  itemCard: { flexDirection: "row", backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 24, padding: 14, marginBottom: 13, gap: 12 },
  itemCardDisabled: { opacity: 0.7 },
  itemInfo: { flex: 1 },
  itemTopRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginBottom: 8 },
  vegBox: { width: 17, height: 17, borderWidth: 1.5, borderColor: THEME.green, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.green },
  bestPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: THEME.orange, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  bestPillText: { color: THEME.white, fontSize: 10, fontWeight: "900" },
  livePill: { backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: "#20462C", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  outPill: { backgroundColor: "#1B0E0E", borderColor: "#3F1717" },
  liveText: { color: THEME.green, fontSize: 10, fontWeight: "900" },
  outText: { color: THEME.danger },
  itemName: { color: THEME.text, fontSize: 17, fontWeight: "900", lineHeight: 22 },
  itemDesc: { color: THEME.muted, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 5 },
  itemMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 },
  itemPrice: { color: THEME.yellow, fontSize: 18, fontWeight: "900" },
  itemCategory: { color: THEME.muted, fontSize: 12, fontWeight: "900", backgroundColor: THEME.card2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  itemActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallAction: { minHeight: 34, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  smallActionText: { color: THEME.green, fontSize: 12, fontWeight: "900" },
  itemImageBox: { width: 112, alignItems: "center" },
  itemImage: { width: 112, height: 112, borderRadius: 20, backgroundColor: THEME.card2 },
  imageFallback: { alignItems: "center", justifyContent: "center", backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border },
  deleteBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#1B0E0E", borderWidth: 1, borderColor: "#3F1717", alignItems: "center", justifyContent: "center", marginTop: 10 },

  emptyBox: { alignItems: "center", padding: 28, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 26, marginTop: 12 },
  emptyIcon: { width: 82, height: 82, borderRadius: 28, backgroundColor: THEME.card2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.border },
  emptyTitle: { color: THEME.text, fontSize: 20, fontWeight: "900", marginTop: 14 },
  emptyText: { color: THEME.muted, textAlign: "center", fontWeight: "700", marginTop: 6 },
  emptyBtn: { marginTop: 18, backgroundColor: THEME.green, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  emptyBtnText: { color: THEME.black, fontWeight: "900" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  keyboardBox: { flex: 1, justifyContent: "flex-end" },
  formSheet: { maxHeight: "92%", backgroundColor: THEME.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: THEME.border, padding: 18 },
  sheetHandle: { width: 48, height: 5, borderRadius: 99, backgroundColor: THEME.border, alignSelf: "center", marginBottom: 14 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  formTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  formSub: { color: THEME.muted, fontWeight: "700", marginTop: 3 },
  closeBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  imagePicker: { height: 185, borderRadius: 24, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, overflow: "hidden", marginBottom: 16 },
  formImage: { width: "100%", height: "100%" },
  formImageFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: THEME.card2 },
  formImageText: { color: THEME.muted, fontWeight: "900", marginTop: 8 },
  imageEditBadge: { position: "absolute", right: 14, bottom: 14, width: 44, height: 44, borderRadius: 17, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center" },
  inputLabel: { color: THEME.text, fontSize: 13, fontWeight: "900", marginBottom: 7, marginTop: 2 },
  inputBox: { minHeight: 56, borderRadius: 17, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, marginBottom: 12, gap: 9 },
  input: { flex: 1, color: THEME.text, fontSize: 15, fontWeight: "800" },
  rupee: { color: THEME.yellow, fontSize: 18, fontWeight: "900" },
  twoCol: { flexDirection: "row", gap: 10 },
  textArea: { minHeight: 90, borderRadius: 17, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, color: THEME.text, padding: 14, textAlignVertical: "top", fontWeight: "800", marginBottom: 12 },
  formChipRow: { gap: 9, paddingBottom: 12 },
  formChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 99, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  formChipActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  formChipText: { color: THEME.muted, fontWeight: "900" },
  formChipTextActive: { color: THEME.black },
  switchCard: { backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, borderRadius: 22, padding: 14, marginBottom: 14 },
  switchRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  switchTitle: { color: THEME.text, fontWeight: "900", fontSize: 15 },
  switchSub: { color: THEME.muted, fontWeight: "700", fontSize: 12, marginTop: 3 },
  switchLine: { height: 1, backgroundColor: THEME.border, marginVertical: 8 },
  saveBtn: { height: 58, borderRadius: 19, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveBtnText: { color: THEME.black, fontSize: 16, fontWeight: "900" },
  disabled: { opacity: 0.65 },

  deleteOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 22 },
  deleteBox: { backgroundColor: THEME.card, borderRadius: 28, borderWidth: 1, borderColor: THEME.border, padding: 22, alignItems: "center" },
  deleteIconBox: { width: 70, height: 70, borderRadius: 26, backgroundColor: "#1B0E0E", borderWidth: 1, borderColor: "#3F1717", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  deleteTitle: { color: THEME.text, fontSize: 22, fontWeight: "900" },
  deleteText: { color: THEME.muted, fontWeight: "700", textAlign: "center", lineHeight: 20, marginTop: 7 },
  deleteActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  keepBtn: { flex: 1, height: 52, borderRadius: 17, backgroundColor: THEME.card2, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  keepText: { color: THEME.text, fontWeight: "900" },
  confirmDeleteBtn: { flex: 1, height: 52, borderRadius: 17, backgroundColor: THEME.green, alignItems: "center", justifyContent: "center" },
  confirmDeleteText: { color: THEME.black, fontWeight: "900" },
});
