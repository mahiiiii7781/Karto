import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type OnboardingStackParamList = {
  WelcomeScreen: undefined;
  Walk1: undefined;
  Walk2: undefined;
  Walk3: undefined;
};

type Props = NativeStackScreenProps<OnboardingStackParamList, "Walk2"> & {
  onDone?: () => void;
};

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  blue: "#38BDF8",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
};

export default function Walk2({ navigation }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const imageFloat = useRef(new Animated.Value(0)).current;

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

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(imageFloat, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(imageFloat, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [fade, imageFloat, scale, slide]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.topGlow} />
      <View style={styles.yellowGlow} />
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
          <Icon name="card" size={20} color={THEME.black} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.brandText}>Karto</Text>
          <Text style={styles.brandSub}>Fast checkout, trusted payments</Text>
        </View>

        <View style={styles.stepPill}>
          <Text style={styles.stepText}>2 / 3</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.imageCard,
          {
            opacity: fade,
            transform: [{ scale }, { translateY: imageFloat }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Icon name="shield-checkmark" size={15} color={THEME.black} />
          <Text style={styles.badgeText}>Secure Pay</Text>
        </View>

        <View style={styles.badgeYellow}>
          <Icon name="flash" size={14} color={THEME.black} />
          <Text style={styles.badgeYellowText}>Quick Checkout</Text>
        </View>

        <View style={styles.imageGlow} />

        <Image
          source={require("@/assets/images/onboarding/order.png")}
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
        <Text style={styles.kicker}>Simple • Secure • Quick</Text>

        <Text style={styles.title}>Easy Payment</Text>

        <Text style={styles.description}>
          Pay with cash on delivery or secure online checkout. Karto keeps every
          order simple, clear and effortless.
        </Text>

        <View style={styles.featureRow}>
          <Feature icon="cash-outline" text="COD" color={THEME.green} />
          <Feature icon="card-outline" text="Online" color={THEME.yellow} />
          <Feature icon="wallet-outline" text="Wallet" color={THEME.blue} />
        </View>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
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
          style={styles.button}
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Walk3")}
        >
          <Text style={styles.buttonText}>Next</Text>
          <Icon name="arrow-forward-circle" size={22} color={THEME.black} />
        </TouchableOpacity>

        <Text style={styles.footerText}>Checkout designed for speed and trust</Text>
      </Animated.View>
    </View>
  );
}

const Feature = ({
  icon,
  text,
  color,
}: {
  icon: string;
  text: string;
  color: string;
}) => (
  <View style={styles.featurePill}>
    <View style={[styles.featureIcon, { backgroundColor: `${color}22` }]}>
      <Icon name={icon as any} size={15} color={color} />
    </View>
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
    paddingTop: Platform.OS === "ios" ? 58 : 46,
    paddingBottom: Platform.OS === "ios" ? 38 : 30,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -110,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  yellowGlow: {
    position: "absolute",
    top: 188,
    right: -112,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(250,204,21,0.11)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -130,
    right: -100,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "rgba(56,189,248,0.10)",
  },
  brandRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
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
  brandSub: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  stepPill: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  stepText: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
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
    overflow: "hidden",
  },
  imageGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(56,189,248,0.10)",
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
    zIndex: 2,
  },
  badgeText: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "900",
  },
  badgeYellow: {
    position: "absolute",
    left: 18,
    bottom: 18,
    backgroundColor: THEME.yellow,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 2,
  },
  badgeYellowText: {
    color: THEME.black,
    fontSize: 11,
    fontWeight: "900",
  },
  image: {
    width: 274,
    height: 274,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 10,
  },
  kicker: {
    color: THEME.yellow,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 0.9,
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
    fontWeight: "700",
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
    gap: 6,
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
    fontSize: 11,
    fontWeight: "900",
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
