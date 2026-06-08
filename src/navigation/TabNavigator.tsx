import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/Ionicons";

import HomeScreen from "../screens/main/home/HomeScreen";
import RestaurantDetailScreen from "../screens/main/restaurant/RestaurantDetailScreen";
import CategoryRestaurantsScreen from "../screens/main/restaurant/CategoryRestaurantsScreen";
import MenuItemDetailScreen from "../screens/main/restaurant/MenuItemDetailScreen";

import OrdersScreen from "../screens/main/order/OrdersScreen";
import OrderDetailScreen from "../screens/main/order/OrderDetailScreen";

import ProfileScreen from "../screens/main/profile/ProfileScreen";
import EditProfileScreen from "../screens/main/profile/EditProfileScreen";
import AddressScreen from "../screens/main/profile/AddressScreen";
import FavoritesScreen from "../screens/main/profile/FavoritesScreen";
import WalletScreen from "../screens/main/wallet/WalletScreen";
import HelpSupportScreen from "../screens/support/HelpSupportScreen";
import NotificationsScreen from "../screens/main/notifications/NotificationsScreen";
import CouponsScreen from "../screens/main/coupons/CouponsScreen";

import CartScreen from "../screens/main/cart/CartScreen";
import CheckoutScreen from "../screens/main/checkout/CheckoutScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLORS = {
  bg: "#070A08",
  card: "#101713",
  green: "#22C55E",
  yellow: "#FACC15",
  muted: "#8A94A6",
  border: "#1E2A22",
  text: "#F8FAFC",
};

const screenOptions = {
  headerShown: false,
};

const HomeStackNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    <Stack.Screen
      name="CategoryRestaurants"
      component={CategoryRestaurantsScreen}
    />
    <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Coupons" component={CouponsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
  </Stack.Navigator>
);

const OrdersStackNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="OrdersHome" component={OrdersScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </Stack.Navigator>
);

const ProfileStackNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Address" component={AddressScreen} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} />
    <Stack.Screen name="Wallet" component={WalletScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Coupons" component={CouponsScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
  </Stack.Navigator>
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          height: Platform.OS === "ios" ? 82 : 66,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "900",
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = "home-outline";

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;

            case "Orders":
              iconName = focused ? "receipt" : "receipt-outline";
              break;

            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;

            default:
              iconName = "ellipse-outline";
          }

          return <Icon name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Home",
        }}
      />

      <Tab.Screen
        name="Orders"
        component={OrdersStackNavigator}
        options={{
          tabBarLabel: "Orders",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}