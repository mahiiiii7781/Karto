import React, { useCallback, useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import OnboardingNavigator from "./OnboardingNavigator";
import AuthNavigator from "./AuthNavigator";
import TabNavigator from "./TabNavigator";
import VendorNavigator from "./VendorNavigator";
import AdminNavigator from "./AdminNavigator";
import RiderNavigator from "./RiderNavigator";

import { useAuth } from "../context/AuthContext";

import SplashScreen from "@/screens/onboarding/SplashScreen";
import PermissionSetupScreen from "@/screens/onboarding/PermissionSetupScreen";

import CartScreen from "@/screens/main/cart/CartScreen";
import CheckoutScreen from "@/screens/main/checkout/CheckoutScreen";
import RestaurantDetailScreen from "@/screens/main/restaurant/RestaurantDetailScreen";
import MenuItemDetailScreen from "@/screens/main/restaurant/MenuItemDetailScreen";
import CategoryRestaurantsScreen from "@/screens/main/restaurant/CategoryRestaurantsScreen";
import SearchScreen from "@/screens/main/search/SearchScreen";
import CouponsScreen from "@/screens/main/coupons/CouponsScreen";
import OrderDetailScreen from "@/screens/main/order/OrderDetailScreen";
import NotificationsScreen from "@/screens/main/notifications/NotificationsScreen";
import HelpSupportScreen from "@/screens/support/HelpSupportScreen";

import RoleSelectionScreen from "@/screens/auth/RoleSelectionScreen";

const Stack = createNativeStackNavigator();

const BrowseScreens = () => (
  <>
    <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    <Stack.Screen name="MenuItemDetail" component={MenuItemDetailScreen} />
    <Stack.Screen name="CategoryRestaurants" component={CategoryRestaurantsScreen} />
    <Stack.Screen name="SearchScreen" component={SearchScreen} />
  </>
);

const ProtectedUserScreens = () => (
  <>
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Coupons" component={CouponsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </>
);

export default function AppNavigator() {
  const { user, loading } = useAuth();

  const [booting, setBooting] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [permissionPending, setPermissionPending] = useState(false);

  const checkAppState = useCallback(async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      const permissionSetupDone = await AsyncStorage.getItem("permissionSetupDone");
      const permissionSetupPending = await AsyncStorage.getItem(
        "permissionSetupPending"
      );

      const firstLaunch = hasLaunched !== "true";

      setIsFirstLaunch(firstLaunch);
      setPermissionPending(
        !firstLaunch &&
          permissionSetupDone !== "true" &&
          permissionSetupPending === "true"
      );
    } catch (error) {
      console.log("App boot state error:", error);
      setIsFirstLaunch(false);
      setPermissionPending(false);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem("hasLaunched", "true");
    await AsyncStorage.setItem("permissionSetupPending", "true");

    setIsFirstLaunch(false);
    setPermissionPending(true);
  };

  const handlePermissionDone = async () => {
    await AsyncStorage.setItem("hasLaunched", "true");
    await AsyncStorage.setItem("permissionSetupDone", "true");
    await AsyncStorage.removeItem("permissionSetupPending");

    setPermissionPending(false);
    setIsFirstLaunch(false);
  };

  const role = String(user?.role || "CUSTOMER").toUpperCase();

  if (booting || loading) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstLaunch ? (
        <Stack.Screen name="Onboarding">
          {props => (
            <OnboardingNavigator
              {...props}
              onDone={handleOnboardingDone}
            />
          )}
        </Stack.Screen>
      ) : permissionPending ? (
        <Stack.Screen name="PermissionSetup">
          {props => (
            <PermissionSetupScreen
              {...props}
              onDone={handlePermissionDone}
            />
          )}
        </Stack.Screen>
      ) : !user ? (
        <>
          <Stack.Screen name="UserApp" component={TabNavigator} />
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <BrowseScreens />
        </>
      ) : role === "ADMIN" ? (
        <>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="UserApp" component={TabNavigator} />
          <Stack.Screen name="VendorApp" component={VendorNavigator} />
          <Stack.Screen name="RiderApp" component={RiderNavigator} />
          <Stack.Screen name="AdminPanel" component={AdminNavigator} />
          <BrowseScreens />
          <ProtectedUserScreens />
        </>
      ) : role === "VENDOR" ? (
        <>
          <Stack.Screen name="VendorApp" component={VendorNavigator} />
          <BrowseScreens />
          <ProtectedUserScreens />
        </>
      ) : role === "RIDER" ? (
        <>
          <Stack.Screen name="RiderApp" component={RiderNavigator} />
          <BrowseScreens />
          <ProtectedUserScreens />
        </>
      ) : (
        <>
          <Stack.Screen name="UserApp" component={TabNavigator} />
          <BrowseScreens />
          <ProtectedUserScreens />
        </>
      )}
    </Stack.Navigator>
  );
}