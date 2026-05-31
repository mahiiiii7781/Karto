import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const THEME = {
  bg: "#080A08",
  card: "#121512",
  card2: "#181C18",
  yellow: "#FFD21F",
  green: "#20D65A",
  text: "#FFFFFF",
  muted: "#A7B0A7",
  border: "#263026",
  danger: "#FF4D4D",
  orange: "#FFB020",
};

export type KartoMessageType = "success" | "error" | "warning" | "info";

type Props = {
  visible: boolean;
  type?: KartoMessageType;
  title: string;
  message?: string;
  primaryText?: string;
  secondaryText?: string;
  loading?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
};

export default function KartoMessageModal({
  visible,
  type = "info",
  title,
  message,
  primaryText = "Done",
  secondaryText,
  loading = false,
  onPrimary,
  onSecondary,
  onClose,
}: Props) {
  const config = getConfig(type);

  const handlePrimary = () => {
    if (onPrimary) {
      onPrimary();
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Icon name={config.icon} size={36} color={config.color} />
          </View>

          <Text style={styles.title}>{title}</Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonRow}>
            {secondaryText ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondary || onClose}
                activeOpacity={0.86}
                disabled={loading}
              >
                <Text style={styles.secondaryText}>{secondaryText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: config.color }]}
              onPress={handlePrimary}
              activeOpacity={0.86}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={21} color="#000" />
                  <Text style={styles.primaryText}>{primaryText}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getConfig(type: KartoMessageType) {
  switch (type) {
    case "success":
      return {
        icon: "checkmark-circle-outline",
        color: THEME.green,
        bg: "#102517",
        border: "#1F6B35",
      };

    case "error":
      return {
        icon: "close-circle-outline",
        color: THEME.danger,
        bg: "#251010",
        border: "#6B1F1F",
      };

    case "warning":
      return {
        icon: "warning-outline",
        color: THEME.orange,
        bg: "#271D0A",
        border: "#6B4A12",
      };

    default:
      return {
        icon: "information-circle-outline",
        color: THEME.yellow,
        bg: "#1C190D",
        border: "#5D4D0B",
      };
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },

  iconBox: {
    width: 78,
    height: 78,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 18,
  },

  title: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  message: {
    color: THEME.muted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
  },

  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  primaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  primaryText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: "900",
  },
});