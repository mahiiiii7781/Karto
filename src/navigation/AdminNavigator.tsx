import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminDashboardScreen from "@/screens/admin/AdminDashboardScreen";

/* Vendors */
import AdminVendorsScreen from "@/screens/admin/AdminVendorsScreen";
import AdminVendorCreateScreen from "@/screens/admin/AdminVendorCreateScreen";
import AdminVendorCategoriesScreen from "@/screens/admin/AdminVendorCategoriesScreen";
import AdminVendorSubCategoriesScreen from "@/screens/admin/AdminVendorSubCategoriesScreen";

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
import AdminMenuAddonsScreen from "@/screens/admin/AdminMenuAddonsScreen";
import AdminMenuCustomizationsScreen from "@/screens/admin/AdminMenuCustomizationsScreen";

/* Users */
import AdminUsersScreen from "@/screens/admin/AdminUsersScreen";

/* Analytics / Billing */
import AdminAnalyticsScreen from "@/screens/admin/AdminAnalyticsScreen";
import AdminBillingScreen from "@/screens/admin/AdminBillingScreen";

/* Modules */
import AdminCitiesScreen from "@/screens/admin/AdminCitiesScreen";
import AdminCouponsScreen from "@/screens/admin/AdminCouponsScreen";
import AdminProfileScreen from "@/screens/admin/AdminProfileScreen";
import AdminNotificationsScreen from "@/screens/admin/AdminNotificationsScreen";

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
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />

      <Stack.Screen name="AdminCities" component={AdminCitiesScreen} />

      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />

      <Stack.Screen name="AdminVendors" component={AdminVendorsScreen} />
      <Stack.Screen name="AdminVendorCreate" component={AdminVendorCreateScreen} />
      <Stack.Screen name="AdminVendorCategories" component={AdminVendorCategoriesScreen} />
      <Stack.Screen name="AdminVendorSubCategories" component={AdminVendorSubCategoriesScreen} />

      <Stack.Screen name="AdminRiders" component={AdminRidersScreen} />
      <Stack.Screen name="AdminRiderCreate" component={AdminRiderCreateScreen} />

      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} />

      <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
      <Stack.Screen name="AdminMenuAddons" component={AdminMenuAddonsScreen} />
      <Stack.Screen name="AdminMenuCustomizations" component={AdminMenuCustomizationsScreen} />

      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />

      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminBilling" component={AdminBillingScreen} />

      <Stack.Screen name="AdminCoupons" component={AdminCouponsScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
    </Stack.Navigator>
  );
}