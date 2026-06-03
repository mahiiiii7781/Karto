import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/Ionicons";

import { useAuth } from "@/context/AuthContext";

import HomeScreen from "../screens/main/home/HomeScreen";
import RestaurantDetailScreen from "../screens/main/restaurant/RestaurantDetailScreen";
import CategoryRestaurantsScreen from "../screens/main/restaurant/CategoryRestaurantsScreen";
import MenuItemDetailScreen from "../screens/main/restaurant/MenuItemDetailScreen";

import OrdersScreen from "../screens/main/order/OrdersScreen";
import WalletScreen from "../screens/main/wallet/WalletScreen";
import MessagesScreen from "../screens/main/message/MessagesScreen";

import ProfileScreen from "../screens/main/profile/ProfileScreen";
import EditProfileScreen from "../screens/main/profile/EditProfileScreen";
import AddressScreen from "../screens/main/profile/AddressScreen";
import FavoritesScreen from "../screens/main/profile/FavoritesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLORS = {
  bg: "#070A08",
  green: "#22C55E",
  muted: "#8A94A6",
  border: "#1E2A22",
};

const HomeStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    <Stack.Screen name="CategoryRestaurants" component={CategoryRestaurantsScreen} />
    <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
  </Stack.Navigator>
);

const ProfileStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Address" component={AddressScreen} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} />
  </Stack.Navigator>
);

export default function TabNavigator() {
  const { user } = useAuth();

  if (!user?.id) {
    return <HomeStackNavigator />;
  }

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
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "900",
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
            case "Wallet":
              iconName = focused ? "wallet" : "wallet-outline";
              break;
            case "Messages":
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}