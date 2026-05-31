import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "react-native";
import Toast from "react-native-toast-message";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";

const THEME = {
  bg: "#FACC15",
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />

      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>

      <Toast />
    </AuthProvider>
  );
}