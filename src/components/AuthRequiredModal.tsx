// src/components/AuthRequiredModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  bg: "rgba(7,17,11,0.56)",
  card: "#FFFFFF",
  card2: "#F4FBF6",
  green: "#16A34A",
  yellow: "#FACC15",
  yellow2: "#FFF7CC",
  text: "#101713",
  muted: "#647067",
  border: "#DDE7DE",
  black: "#07110B",
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
};

export default function AuthRequiredModal({
  visible,
  title = "Login required",
  message = "Please login to use cart, orders, profile and checkout.",
  onClose,
}: Props) {
  const navigation = useNavigation<any>();

  const goToLogin = () => {
    onClose();

    let nav: any = navigation;

    while (nav?.getParent?.()) {
      const parent = nav.getParent();
      if (!parent) break;
      nav = parent;
    }

    nav.navigate("Auth", {
      screen: "LoginScreen",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconBox}>
            <Icon name="lock-closed-outline" size={32} color={THEME.yellow} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={goToLogin}
            activeOpacity={0.9}
          >
            <Text style={styles.loginText}>Login / Sign up</Text>
            <Icon name="arrow-forward" size={20} color={THEME.card} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={styles.browseText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    padding: 22,
  },
  box: {
    backgroundColor: THEME.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 22,
    alignItems: "center",
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: THEME.yellow2,
    borderWidth: 1,
    borderColor: "#F4DE7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: THEME.text,
    fontSize: 23,
    fontWeight: "900",
  },
  message: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "700",
  },
  loginBtn: {
    marginTop: 22,
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loginText: {
    color: THEME.card,
    fontSize: 16,
    fontWeight: "900",
  },
  browseBtn: {
    marginTop: 12,
    width: "100%",
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: {
    color: THEME.text,
    fontWeight: "900",
  },
});