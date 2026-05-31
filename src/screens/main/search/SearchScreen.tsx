import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import apiClient from "@/api/apiClient";

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
  danger: "#EF4444",
  black: "#050807",
};

const popularSearches = [
  "Pizza",
  "Burger",
  "Biryani",
  "Momos",
  "Grocery",
  "Medicine",
];

const getImage = (item: any) =>
  item?.imageUrl ||
  item?.image_url ||
  item?.restaurant?.imageUrl ||
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836";

export default function SearchScreen() {
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const hasResults = restaurants.length > 0 || items.length > 0;

  const search = async (textValue?: string) => {
    const finalQuery = (textValue ?? query).trim();

    if (!finalQuery) {
      setRestaurants([]);
      setItems([]);
      return;
    }

    try {
      setLoading(true);

      const res = await apiClient.get("search", {
        params: { q: finalQuery },
      });

      setRestaurants(res.data?.restaurants || res.data?.data?.restaurants || []);
      setItems(res.data?.items || res.data?.data?.items || []);
    } catch (error: any) {
      console.log("SEARCH ERROR:", error?.response?.data || error?.message);
      Alert.alert("Search Failed", "Could not search right now.");
    } finally {
      setLoading(false);
    }
  };

  const emptyText = useMemo(() => {
    if (!query.trim()) return "Search food, stores, grocery or medicines.";
    if (loading) return "Searching...";
    return "No results found. Try another keyword.";
  }, [query, loading]);

  const openRestaurant = (id: string) => {
    navigation.navigate("RestaurantDetail", { restaurantId: id });
  };

  const openItem = (item: any) => {
    navigation.navigate("MenuItemDetail", {
      itemId: item.id,
      restaurantId: item.restaurantId || item.restaurant?.id,
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={23} color={THEME.text} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color={THEME.green} />
          <TextInput
            value={query}
            onChangeText={text => {
              setQuery(text);
              if (!text.trim()) {
                setRestaurants([]);
                setItems([]);
              }
            }}
            onSubmitEditing={() => search()}
            placeholder="Search Karto..."
            placeholderTextColor={THEME.muted}
            style={styles.input}
            autoFocus
            returnKeyType="search"
          />

          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setRestaurants([]);
                setItems([]);
              }}
            >
              <Icon name="close-circle" size={20} color={THEME.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!query.trim() && (
        <View style={styles.section}>
          <Text style={styles.title}>Popular searches</Text>

          <View style={styles.chipWrap}>
            {popularSearches.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.chip}
                onPress={() => {
                  setQuery(item);
                  search(item);
                }}
              >
                <Icon name="trending-up-outline" size={15} color={THEME.green} />
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={styles.loaderText}>Finding best matches...</Text>
        </View>
      )}

      {!loading && !hasResults && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="search-outline" size={36} color={THEME.green} />
          </View>
          <Text style={styles.emptyTitle}>{emptyText}</Text>
        </View>
      )}

      {!loading && hasResults && (
        <FlatList
          data={[
            ...(restaurants.length ? [{ type: "header", title: "Stores" }] : []),
            ...restaurants.map(x => ({ type: "restaurant", data: x })),
            ...(items.length ? [{ type: "header", title: "Items" }] : []),
            ...items.map(x => ({ type: "item", data: x })),
          ]}
          keyExtractor={(row: any, index) =>
            `${row.type}-${row.data?.id || row.title || index}`
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => {
            if (item.type === "header") {
              return <Text style={styles.listTitle}>{item.title}</Text>;
            }

            if (item.type === "restaurant") {
              const rest = item.data;

              return (
                <TouchableOpacity
                  style={styles.resultCard}
                  onPress={() => openRestaurant(rest.id)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: getImage(rest) }} style={styles.resultImage} />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {rest.name || rest.restaurant_name || "Karto Store"}
                    </Text>

                    <Text style={styles.resultSub} numberOfLines={1}>
                      {rest.type || "Store"} • {rest.deliveryTime || rest.delivery_time || "25-35 min"}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.ratingPill}>
                        <Icon name="star" size={12} color={THEME.black} />
                        <Text style={styles.ratingText}>
                          {Number(rest.rating || 4).toFixed(1)}
                        </Text>
                      </View>

                      {rest.isPureVeg && <Text style={styles.vegText}>Pure Veg</Text>}
                    </View>
                  </View>

                  <Icon name="chevron-forward" size={20} color={THEME.muted} />
                </TouchableOpacity>
              );
            }

            const menuItem = item.data;

            return (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => openItem(menuItem)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: getImage(menuItem) }} style={styles.resultImage} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {menuItem.name || "Item"}
                  </Text>

                  <Text style={styles.resultSub} numberOfLines={1}>
                    {menuItem.restaurant?.name || "Karto Store"}
                  </Text>

                  <Text style={styles.price}>₹{Number(menuItem.price || 0).toFixed(0)}</Text>
                </View>

                <Icon name="add-circle" size={25} color={THEME.green} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: THEME.greenDark,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 18,
    backgroundColor: THEME.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: THEME.text,
    fontWeight: "800",
    fontSize: 15,
  },
  section: { padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 14,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 99,
    marginRight: 10,
    marginBottom: 10,
  },
  chipText: {
    marginLeft: 6,
    color: THEME.text,
    fontWeight: "900",
    fontSize: 13,
  },
  loader: {
    marginTop: 80,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    color: THEME.muted,
    fontWeight: "800",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 28,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    textAlign: "center",
    color: THEME.muted,
    fontWeight: "800",
    lineHeight: 21,
  },
  list: {
    padding: 16,
    paddingBottom: 34,
  },
  listTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: THEME.text,
    marginVertical: 12,
  },
  resultCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 2,
  },
  resultImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: THEME.soft,
    marginRight: 12,
  },
  resultName: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  resultSub: {
    color: THEME.muted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.yellow,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 99,
    marginRight: 8,
  },
  ratingText: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "900",
    color: THEME.black,
  },
  vegText: {
    color: THEME.green,
    fontWeight: "900",
    fontSize: 12,
  },
  price: {
    color: THEME.green,
    fontWeight: "900",
    marginTop: 7,
    fontSize: 14,
  },
});