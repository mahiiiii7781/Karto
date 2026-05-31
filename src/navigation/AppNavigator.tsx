import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import OnboardingNavigator from "./OnboardingNavigator";
import AuthNavigator from "./AuthNavigator";
import TabNavigator from "./TabNavigator";
import VendorNavigator from "./VendorNavigator";
import AdminNavigator from "./AdminNavigator";

import { useAuth } from "../context/AuthContext";

import SplashScreen from "@/screens/onboarding/SplashScreen";
import PermissionSetupScreen from "@/screens/onboarding/PermissionSetupScreen";

import CartScreen from "@/screens/main/cart/CartScreen";
import CheckoutScreen from "@/screens/main/checkout/CheckoutScreen";
import RiderDashboardScreen from "@/screens/rider/RiderDashboardScreen";
import RestaurantDetailScreen from "@/screens/main/restaurant/RestaurantDetailScreen";
import MenuItemDetailScreen from "@/screens/main/restaurant/MenuItemDetailScreen";
import CategoryRestaurantsScreen from "@/screens/main/restaurant/CategoryRestaurantsScreen";
import SearchScreen from "@/screens/main/search/SearchScreen";
import CouponsScreen from "@/screens/main/coupons/CouponsScreen";
import OrderDetailScreen from "@/screens/main/order/OrderDetailScreen";
import NotificationsScreen from "@/screens/main/notifications/NotificationsScreen";
import HelpSupportScreen from "@/screens/support/HelpSupportScreen";

const Stack = createNativeStackNavigator();

const renderCommonUserScreens = () => (
  <>
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
    <Stack.Screen name="CategoryRestaurants" component={CategoryRestaurantsScreen} />
    <Stack.Screen name="SearchScreen" component={SearchScreen} />
    <Stack.Screen name="Coupons" component={CouponsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </>
);

export default function AppNavigator() {
  const { user } = useAuth();

  const [booting, setBooting] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [permissionPending, setPermissionPending] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      const permissionSetupDone = await AsyncStorage.getItem("permissionSetupDone");
      const permissionSetupPending = await AsyncStorage.getItem("permissionSetupPending");

      setIsFirstLaunch(hasLaunched !== "true");

      setPermissionPending(
        hasLaunched === "true" &&
          permissionSetupDone !== "true" &&
          permissionSetupPending === "true"
      );
    } catch {
      setIsFirstLaunch(false);
      setPermissionPending(false);
    } finally {
      setBooting(false);
    }
  };

  const handlePermissionDone = async () => {
    await AsyncStorage.setItem("permissionSetupDone", "true");
    await AsyncStorage.removeItem("permissionSetupPending");

    setPermissionPending(false);
    setIsFirstLaunch(false);
  };

  if (booting) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstLaunch ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : permissionPending ? (
        <Stack.Screen name="PermissionSetup">
          {(props) => (
            <PermissionSetupScreen
              {...props}
              route={{
                ...props.route,
                params: {
                  ...(props.route.params || {}),
                  onDone: handlePermissionDone,
                },
              }}
            />
          )}
        </Stack.Screen>
      ) : !user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user.role === "ADMIN" ? (
        <>
          <Stack.Screen name="AdminPanel" component={AdminNavigator} />
          <Stack.Screen name="UserApp" component={TabNavigator} />
          <Stack.Screen name="VendorApp" component={VendorNavigator} />
          <Stack.Screen name="RiderApp" component={RiderDashboardScreen} />
          {renderCommonUserScreens()}
        </>
      ) : user.role === "VENDOR" ? (
        <>
          <Stack.Screen name="VendorApp" component={VendorNavigator} />
          {renderCommonUserScreens()}
        </>
      ) : user.role === "RIDER" ? (
        <>
          <Stack.Screen name="RiderApp" component={RiderDashboardScreen} />
          {renderCommonUserScreens()}
        </>
      ) : (
        <>
          <Stack.Screen name="UserApp" component={TabNavigator} />
          {renderCommonUserScreens()}
        </>
      )}
    </Stack.Navigator>
  );
}