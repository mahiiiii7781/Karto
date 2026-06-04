import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

type RootStackParamList = {
  Walk1: undefined;
};

const THEME = {
  bg: "#070A08",
  card: "#101713",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#F8FAFC",
  muted: "#D1D5DB",
  black: "#050807",
};

export default function WelcomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale, slide]);

  return (
    <ImageBackground
      source={require("@/assets/images/onboarding/welcomebg.jpg")}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.overlay}>
        <View style={styles.topShade} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fade,
              transform: [{ translateY: slide }, { scale }],
            },
          ]}
        >
          <View style={styles.logoWrap}>
            <Icon name="bag-handle" size={34} color={THEME.black} />
          </View>

          <Text style={styles.brand}>Karto</Text>

          <Text style={styles.title}>
            Fast Delivery{"\n"}Right To Your Door
          </Text>

          <Text style={styles.subtitle}>
            Order food, groceries and daily essentials from nearby trusted stores
            with a smooth local delivery experience.
          </Text>

          <View style={styles.features}>
            <Feature text="Fast Delivery" icon="flash" color={THEME.green} />
            <Feature text="Trusted Stores" icon="shield-checkmark" color={THEME.yellow} />
            <Feature text="Live Tracking" icon="location" color={THEME.green} />
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("Walk1")}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Icon name="arrow-forward-circle" size={24} color={THEME.black} />
          </TouchableOpacity>

          <Text style={styles.bottomText}>
            Your city&apos;s premium delivery experience
          </Text>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const Feature = ({ icon, text, color }: any) => (
  <View style={styles.featurePill}>
    <View style={[styles.featureIcon, { backgroundColor: `${color}24` }]}>
      <Icon name={icon} size={15} color={color} />
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  topShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,10,8,0.18)",
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: Platform.OS === "ios" ? 58 : 48,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.12)",
  },
  brand: {
    color: THEME.yellow,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  title: {
    color: THEME.text,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 49,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: THEME.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
    fontWeight: "700",
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },
  featurePill: {
    backgroundColor: "rgba(16,23,19,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  button: {
    backgroundColor: THEME.green,
    marginTop: 30,
    borderRadius: 22,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: THEME.black,
    fontSize: 17,
    fontWeight: "900",
  },
  bottomText: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 18,
    fontSize: 12,
    fontWeight: "700",
  },
});
