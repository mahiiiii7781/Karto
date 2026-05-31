import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

type RootStackParamList = {
  Walk1: undefined;
};

const THEME = {
  green: "#22C55E",
  text: "#F3F4F6",
  muted: "#D1D5DB",
  black: "#041008",
};

export default function WelcomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

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
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={require("@/assets/images/onboarding/welcomebg.jpg")}
      style={styles.bg}
    >
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
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
            Order food, groceries, daily essentials and much more from nearby
            trusted stores in your city.
          </Text>

          <View style={styles.features}>
            <Feature text="Fast Delivery" icon="flash" />
            <Feature text="Trusted Stores" icon="shield-checkmark" />
            <Feature text="Live Tracking" icon="location" />
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Walk1")}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Icon
              name="arrow-forward-circle"
              size={24}
              color={THEME.black}
            />
          </TouchableOpacity>

          <Text style={styles.bottomText}>
            Your city's premium delivery experience
          </Text>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const Feature = ({ icon, text }: any) => (
  <View style={styles.featurePill}>
    <Icon name={icon} size={15} color="#22C55E" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.58)",
  },

  content: {
    paddingHorizontal: 26,
    paddingBottom: 55,
  },

  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  brand: {
    color: "#22C55E",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  title: {
    color: "#F3F4F6",
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 48,
  },

  subtitle: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
  },

  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },

  featurePill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  featureText: {
    color: "#F3F4F6",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  button: {
    backgroundColor: "#22C55E",
    marginTop: 30,
    borderRadius: 20,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonText: {
    color: "#041008",
    fontSize: 17,
    fontWeight: "900",
  },

  bottomText: {
    color: "#D1D5DB",
    textAlign: "center",
    marginTop: 18,
    fontSize: 12,
    fontWeight: "600",
  },
});