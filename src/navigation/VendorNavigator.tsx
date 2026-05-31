import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VendorDashboardScreen from "@/screens/vendor/VendorDashboardScreen";
import VendorOrdersScreen from "@/screens/vendor/VendorOrdersScreen";
import VendorOrderDetailScreen from "@/screens/vendor/VendorDetailScreen";
import VendorPaymentsScreen from "@/screens/vendor/VendorPaymentsScreen";

import VendorAnalyticsScreen from "@/screens/vendor/VendorAnalyticsScreen";
import VendorCategoriesScreen from "@/screens/vendor/VendorCategoriesScreen";
import VendorSettingsScreen from "@/screens/vendor/VendorSettingsScreen";

import VendorPlaceholderScreen from "@/screens/vendor/VendorPlaceholderScreen";

const Stack = createNativeStackNavigator();

export default function VendorNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="VendorDashboard"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "#070A07",
        },
      }}
    >
      {/* =========================
          DASHBOARD
      ========================= */}
      <Stack.Screen
        name="VendorDashboard"
        component={VendorDashboardScreen}
      />

      {/* =========================
          ORDERS
      ========================= */}
      <Stack.Screen
        name="VendorOrders"
        component={VendorOrdersScreen}
      />

      <Stack.Screen
        name="VendorOrderDetail"
        component={VendorOrderDetailScreen}
      />

      {/* =========================
          PAYMENTS
      ========================= */}
      <Stack.Screen
        name="VendorPayments"
        component={VendorPaymentsScreen}
      />

      {/* =========================
          ANALYTICS
      ========================= */}
      <Stack.Screen
        name="VendorAnalytics"
        component={VendorAnalyticsScreen}
      />

      {/* =========================
          CATEGORIES
      ========================= */}
      <Stack.Screen
        name="VendorCategories"
        component={VendorCategoriesScreen}
      />

      {/* =========================
          SETTINGS
      ========================= */}
      <Stack.Screen
        name="VendorSettings"
        component={VendorSettingsScreen}
      />

      {/* =========================
          COMING SOON MODULES
      ========================= */}

      <Stack.Screen
        name="VendorMenu"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Menu Management",
        }}
      />

      <Stack.Screen
        name="VendorInventory"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Inventory Management",
        }}
      />

      <Stack.Screen
        name="VendorOffers"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Offers & Coupons",
        }}
      />

      <Stack.Screen
        name="VendorReviews"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Ratings & Reviews",
        }}
      />

      <Stack.Screen
        name="VendorCustomers"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Customer Insights",
        }}
      />

      <Stack.Screen
        name="VendorReports"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Sales Reports & GST Invoices",
        }}
      />

      <Stack.Screen
        name="VendorSupport"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Support & Helpdesk",
        }}
      />

      <Stack.Screen
        name="VendorDelivery"
        component={VendorPlaceholderScreen}
        initialParams={{
          title: "Delivery Configuration",
        }}
      />
    </Stack.Navigator>
  );
}