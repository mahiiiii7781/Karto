import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  green: "#22C55E",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#041008",
};

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity,
            transform: [{ scale }, { translateY: slide }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Icon name="bag-handle" size={48} color={THEME.black} />
        </View>

        <Text style={styles.logoText}>Karto</Text>
        <Text style={styles.tagline}>Fast local delivery for your city</Text>
      </Animated.View>

      <View style={styles.bottomBox}>
        <ActivityIndicator size="small" color={THEME.green} />
        <Text style={styles.loadingText}>Setting up your experience...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  logoWrap: {
    alignItems: "center",
  },

  logoCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#102417",
  },

  logoText: {
    color: THEME.text,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 18,
    letterSpacing: 0.5,
  },

  tagline: {
    color: THEME.muted,
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
  },

  bottomBox: {
    position: "absolute",
    bottom: 58,
    alignItems: "center",
  },

  loadingText: {
    color: THEME.muted,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },
});