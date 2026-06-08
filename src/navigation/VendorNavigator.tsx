import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VendorDashboardScreen from "@/screens/vendor/VendorDashboardScreen";
import VendorOrdersScreen from "@/screens/vendor/VendorOrdersScreen";
import VendorOrderDetailScreen from "@/screens/vendor/VendorDetailScreen";
import VendorPaymentsScreen from "@/screens/vendor/VendorPaymentsScreen";

import VendorAnalyticsScreen from "@/screens/vendor/VendorAnalyticsScreen";
import VendorCategoriesScreen from "@/screens/vendor/VendorCategoriesScreen";
import VendorSettingsScreen from "@/screens/vendor/VendorSettingsScreen";

/* Real vendor modules */
import VendorMenuScreen from "@/screens/vendor/VendorMenuScreen";
import VendorNotificationsScreen from "@/screens/vendor/VendorNotificationsScreen";

/* Keep only non-ready modules as placeholder */
import VendorPlaceholderScreen from "@/screens/vendor/VendorPlaceholderScreen";

export type VendorStackParamList = {
  VendorDashboard: undefined;
  VendorOrders: undefined;
  VendorOrderDetail: {
    order?: any;
    orderId?: string;
  };
  VendorPayments: undefined;
  VendorAnalytics: undefined;
  VendorCategories: undefined;
  VendorSettings: undefined;
  VendorMenu: undefined;
  VendorNotifications: undefined;

  VendorInventory: {
    title?: string;
  };
  VendorOffers: {
    title?: string;
  };
  VendorReviews: {
    title?: string;
  };
  VendorCustomers: {
    title?: string;
  };
  VendorReports: {
    title?: string;
  };
  VendorSupport: {
    title?: string;
  };
  VendorDelivery: {
    title?: string;
  };
};

const Stack = createNativeStackNavigator<VendorStackParamList>();

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
      <Stack.Screen
        name="VendorDashboard"
        component={VendorDashboardScreen}
      />

      <Stack.Screen
        name="VendorOrders"
        component={VendorOrdersScreen}
      />

      <Stack.Screen
        name="VendorOrderDetail"
        component={VendorOrderDetailScreen}
      />

      <Stack.Screen
        name="VendorMenu"
        component={VendorMenuScreen}
      />

      <Stack.Screen
        name="VendorCategories"
        component={VendorCategoriesScreen}
      />

      <Stack.Screen
        name="VendorPayments"
        component={VendorPaymentsScreen}
      />

      <Stack.Screen
        name="VendorAnalytics"
        component={VendorAnalyticsScreen}
      />

      <Stack.Screen
        name="VendorNotifications"
        component={VendorNotificationsScreen}
      />

      <Stack.Screen
        name="VendorSettings"
        component={VendorSettingsScreen}
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