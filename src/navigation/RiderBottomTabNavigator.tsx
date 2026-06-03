import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";

import RiderDashboardScreen from "@/screens/rider/RiderDashboardScreen";
import RiderActiveOrdersScreen from "@/screens/rider/RiderActiveOrdersScreen";
import RiderEarningsScreen from "@/screens/rider/RiderEarningsScreen";
import RiderLeaderboardScreen from "@/screens/rider/RiderLeaderboardScreen";
import RiderProfileScreen from "@/screens/rider/RiderProfileScreen";

import RiderOrderAssignmentPopup from "@/screens/rider/RiderOrderAssignmentPopup";

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: "#070A08",
  card: "#101713",
  yellow: "#FACC15",
  green: "#22C55E",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
};

export default function RiderBottomTabNavigator() {
  return (
    <>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: COLORS.yellow,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarStyle: {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            height: 74,
            borderRadius: 22,
            backgroundColor: COLORS.card,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: COLORS.border,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontWeight: "800",
            fontSize: 11,
            marginBottom: 8,
          },
          tabBarIcon: ({ color, focused }) => {
            let icon = "home-outline";

            switch (route.name) {
              case "Dashboard":
                icon = focused ? "grid" : "grid-outline";
                break;
              case "Orders":
                icon = focused ? "bicycle" : "bicycle-outline";
                break;
              case "Earnings":
                icon = focused ? "wallet" : "wallet-outline";
                break;
              case "Leaderboard":
                icon = focused ? "trophy" : "trophy-outline";
                break;
              case "Profile":
                icon = focused ? "person" : "person-outline";
                break;
            }

            return <Icon name={icon} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={RiderDashboardScreen} />
        <Tab.Screen name="Orders" component={RiderActiveOrdersScreen} />
        <Tab.Screen name="Earnings" component={RiderEarningsScreen} />
        <Tab.Screen name="Leaderboard" component={RiderLeaderboardScreen} />
        <Tab.Screen name="Profile" component={RiderProfileScreen} />
      </Tab.Navigator>

      <RiderOrderAssignmentPopup />
    </>
  );
}