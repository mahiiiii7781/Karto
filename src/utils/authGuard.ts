import { Alert } from "react-native";

export const requireLogin = (
  user: any,
  navigation: any,
  message = "Please login to continue."
) => {
  if (user) return true;

  Alert.alert("Login Required", message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Login",
      onPress: () => navigation.navigate("Auth"),
    },
  ]);

  return false;
};