import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#041008",
};

export default function Walk3() {
  const [finishing, setFinishing] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, scale]);

  const handleFinishOnboarding = async () => {
    try {
      setFinishing(true);

      await AsyncStorage.setItem("hasLaunched", "true");
      await AsyncStorage.setItem("permissionSetupPending", "true");
    } catch {
      Alert.alert("Error", "Unable to finish onboarding. Please try again.");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <Animated.View
        style={[
          styles.brandRow,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <View style={styles.brandIcon}>
          <Icon name="bicycle" size={20} color={THEME.black} />
        </View>
        <Text style={styles.brandText}>Karto</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.imageCard,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Icon name="rocket" size={15} color={THEME.black} />
          <Text style={styles.badgeText}>Quick Delivery</Text>
        </View>

        <Image
          source={require("@/assets/images/onboarding/delivery.png")}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <Text style={styles.kicker}>Track • Relax • Enjoy</Text>

        <Text style={styles.title}>Fast Delivery</Text>

        <Text style={styles.description}>
          Get your food and daily essentials delivered quickly from nearby
          trusted stores with a smooth Karto experience.
        </Text>

        <View style={styles.featureRow}>
          <Feature icon="time-outline" text="Quick ETA" />
          <Feature icon="location-outline" text="Nearby" />
          <Feature icon="shield-checkmark-outline" text="Trusted" />
        </View>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.bottomArea,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, finishing && styles.disabledBtn]}
          activeOpacity={0.86}
          onPress={handleFinishOnboarding}
          disabled={finishing}
        >
          {finishing ? (
            <ActivityIndicator color={THEME.black} />
          ) : (
            <>
              <Text style={styles.buttonText}>Start Exploring</Text>
              <Icon name="arrow-forward-circle" size={22} color={THEME.black} />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>Welcome to a faster local market</Text>
      </Animated.View>
    </View>
  );
}

const Feature = ({ icon, text }: any) => (
  <View style={styles.featurePill}>
    <Icon name={icon} size={15} color={THEME.green} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 34,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -110,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#12351F",
    opacity: 0.55,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -130,
    left: -100,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "#0B2A18",
    opacity: 0.55,
  },
  brandRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  imageCard: {
    width: "100%",
    minHeight: 330,
    backgroundColor: THEME.card,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  badge: {
    position: "absolute",
    top: 18,
    right: 18,
    backgroundColor: THEME.green,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeText: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "900",
  },
  image: {
    width: 270,
    height: 270,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 10,
  },
  kicker: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 41,
    fontWeight: "900",
    color: THEME.text,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  featurePill: {
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featureText: {
    color: THEME.text,
    fontSize: 11,
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#26352B",
  },
  activeDot: {
    width: 28,
    backgroundColor: THEME.green,
  },
  bottomArea: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    backgroundColor: THEME.green,
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  buttonText: {
    color: THEME.black,
    fontSize: 17,
    textAlign: "center",
    fontWeight: "900",
  },
  footerText: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 14,
    fontWeight: "700",
  },
});