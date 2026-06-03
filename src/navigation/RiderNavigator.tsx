import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RiderBottomTabNavigator from "./RiderBottomTabNavigator";

import RiderOrderDetailScreen from "@/screens/rider/RiderOrderDetailScreen";
import RiderWalletScreen from "@/screens/rider/RiderWalletScreen";
import RiderDeliveryHistoryScreen from "@/screens/rider/RiderDeliveryHistoryScreen";
import RiderKycScreen from "@/screens/rider/RiderKycScreen";
import RiderSupportScreen from "@/screens/rider/RiderSupportScreen";
import RiderIncentivesScreen from "@/screens/rider/RiderIncentivesScreen";
import RiderLiveTrackingScreen from "@/screens/rider/RiderLiveTrackingScreen";
import RiderAnalyticsScreen from "@/screens/rider/RiderAnalyticsScreen";

const Stack = createNativeStackNavigator();

export default function RiderNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RiderHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="RiderHome" component={RiderBottomTabNavigator} />
      <Stack.Screen name="RiderOrderDetail" component={RiderOrderDetailScreen} />
      <Stack.Screen name="RiderWallet" component={RiderWalletScreen} />
      <Stack.Screen name="RiderDeliveryHistory" component={RiderDeliveryHistoryScreen} />
      <Stack.Screen name="RiderKyc" component={RiderKycScreen} />
      <Stack.Screen name="RiderSupport" component={RiderSupportScreen} />
      <Stack.Screen name="RiderIncentives" component={RiderIncentivesScreen} />
      <Stack.Screen name="RiderLiveTracking" component={RiderLiveTrackingScreen} />
      <Stack.Screen name="RiderAnalytics" component={RiderAnalyticsScreen} />
    </Stack.Navigator>
  );
}