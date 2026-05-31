import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminDashboardScreen from "@/screens/admin/AdminDashboardScreen";

/* Vendors */
import AdminVendorsScreen from "@/screens/admin/AdminVendorsScreen";
import AdminVendorCreateScreen from "@/screens/admin/AdminVendorCreateScreen";

/* Riders */
import AdminRidersScreen from "@/screens/admin/AdminRidersScreen";
import AdminRiderCreateScreen from "@/screens/admin/AdminRiderCreateScreen";

/* Orders */
import AdminOrdersScreen from "@/screens/admin/AdminOrdersScreen";
import AdminOrderDetailScreen from "@/screens/admin/AdminOrderDetailScreen";

/* Categories */
import AdminCategoriesScreen from "@/screens/admin/AdminCategoriesScreen";

/* Menu */
import AdminMenuScreen from "@/screens/admin/AdminMenuScreen";

/* Users */
import AdminUsersScreen from "@/screens/admin/AdminUsersScreen";

/* Analytics / Billing */
import AdminAnalyticsScreen from "@/screens/admin/AdminAnalyticsScreen";

/* NEW MODULES */
import AdminCitiesScreen from "@/screens/admin/AdminCitiesScreen";
 import AdminBillingScreen from "@/screens/admin/AdminBillingScreen";

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* Dashboard */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />

    {/* //  Cities */}
      <Stack.Screen
        name="AdminCities"
        component={AdminCitiesScreen}
      />

      {/* Categories */}
      <Stack.Screen
        name="AdminCategories"
        component={AdminCategoriesScreen}
      />

      {/* Vendors */}
      <Stack.Screen
        name="AdminVendors"
        component={AdminVendorsScreen}
      />

      <Stack.Screen
        name="AdminVendorCreate"
        component={AdminVendorCreateScreen}
      />

      {/* Riders */}
      <Stack.Screen
        name="AdminRiders"
        component={AdminRidersScreen}
      />

      <Stack.Screen
        name="AdminRiderCreate"
        component={AdminRiderCreateScreen}
      />

      {/* Orders */}
      <Stack.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
      />

      <Stack.Screen
        name="AdminOrderDetail"
        component={AdminOrderDetailScreen}
      />

      {/* Menu */}
      <Stack.Screen
        name="AdminMenu"
        component={AdminMenuScreen}
      />

      {/* Users */}
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
      />

      {/* Analytics */}
      <Stack.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
      />

      {/* Future Billing */}
      {/* */}
      <Stack.Screen
        name="AdminBilling"
        component={AdminBillingScreen}
      />
     
    </Stack.Navigator>
  );
}