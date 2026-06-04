import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
};

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1700,
        useNativeDriver: true,
      })
    ).start();
  }, [opacity, pulse, ring, scale, slide]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.42],
  });

  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.45, 0.12, 0],
  });

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity,
            transform: [{ scale }, { translateY: slide }],
          },
        ]}
      >
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.logoRing,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />

          <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulse }] }]}>
            <Icon name="bag-handle" size={48} color={THEME.black} />
          </Animated.View>
        </View>

        <Text style={styles.logoText}>Karto</Text>

        <View style={styles.brandLine}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>Fast local delivery</Text>
          <View style={styles.brandDotYellow} />
        </View>

        <Text style={styles.tagline}>Food • Grocery • Stores • More</Text>
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
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(34,197,94,0.13)",
    top: Platform.OS === "ios" ? 92 : 70,
    right: -90,
  },
  glowTwo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(250,204,21,0.12)",
    bottom: 90,
    left: -95,
  },
  logoWrap: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  logoStage: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRing: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: THEME.green,
  },
  logoCircle: {
    width: 108,
    height: 108,
    borderRadius: 38,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#102116",
  },
  logoText: {
    color: THEME.text,
    fontSize: 46,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: 0.3,
  },
  brandLine: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.green,
    marginRight: 8,
  },
  brandDotYellow: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.yellow,
    marginLeft: 8,
  },
  brandText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tagline: {
    color: THEME.muted,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  bottomBox: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 62 : 48,
    alignItems: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },
});
