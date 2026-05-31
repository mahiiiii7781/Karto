import { Animated, StyleSheet } from "react-native";

export const KartoColors = {
  yellow: "#FACC15",
  yellowDark: "#EAB308",
  yellowSoft: "#FFF3B0",

  black: "#0B0B0B",
  black2: "#111111",
  card: "#151515",
  card2: "#1F1F1F",

  green: "#22C55E",
  greenDark: "#16A34A",
  greenSoft: "#DCFCE7",

  text: "#111111",
  white: "#FFFFFF",
  muted: "#5B5B5B",
  mutedWhite: "#BDBDBD",
  border: "#2A2A2A",

  danger: "#EF4444",
  success: "#22C55E",
};

export const KartoRadius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  round: 999,
};

export const KartoShadow = {
  premium: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  greenGlow: {
    shadowColor: KartoColors.green,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
};

export const kartoStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: KartoColors.yellow,
  },

  flex: {
    flex: 1,
  },

  screen: {
    flexGrow: 1,
    padding: 22,
    justifyContent: "center",
    backgroundColor: KartoColors.yellow,
  },

  center: {
    alignItems: "center",
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: KartoColors.black,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    ...KartoShadow.premium,
  },

  appName: {
    fontSize: 44,
    fontWeight: "900",
    color: KartoColors.black,
    letterSpacing: 1,
  },

  premiumText: {
    color: KartoColors.black,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 2,
    fontWeight: "900",
  },

  tagline: {
    color: KartoColors.muted,
    marginTop: 8,
    marginBottom: 24,
    fontSize: 15,
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: KartoColors.black,
    borderRadius: KartoRadius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: KartoColors.border,
    ...KartoShadow.card,
  },

  title: {
    color: KartoColors.white,
    fontSize: 26,
    fontWeight: "900",
  },

  subtitle: {
    color: KartoColors.mutedWhite,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },

  inputBox: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: KartoColors.card2,
    borderWidth: 1,
    borderColor: KartoColors.border,
    borderRadius: KartoRadius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    color: KartoColors.white,
    paddingHorizontal: 12,
    fontSize: 15,
  },

  primaryBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: KartoColors.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    ...KartoShadow.greenGlow,
  },

  primaryBtnText: {
    color: KartoColors.black,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.4,
  },

  secondaryBtn: {
    minHeight: 52,
    borderRadius: KartoRadius.md,
    borderWidth: 1,
    borderColor: KartoColors.border,
    backgroundColor: KartoColors.card2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  secondaryBtnText: {
    flex: 1,
    color: KartoColors.white,
    fontWeight: "800",
    marginLeft: 10,
  },

  disabled: {
    opacity: 0.6,
  },

  switchRow: {
    flexDirection: "row",
    backgroundColor: KartoColors.card2,
    borderRadius: KartoRadius.md,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: KartoColors.border,
  },

  switchBtn: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  switchBtnActive: {
    backgroundColor: KartoColors.green,
  },

  switchText: {
    color: KartoColors.mutedWhite,
    fontWeight: "800",
  },

  switchTextActive: {
    color: KartoColors.black,
    fontWeight: "900",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: KartoColors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: KartoRadius.round,
    borderWidth: 1,
    borderColor: KartoColors.yellowDark,
  },

  badgeText: {
    color: KartoColors.black,
    fontSize: 12,
    fontWeight: "900",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: KartoColors.border,
  },

  mutedText: {
    color: KartoColors.mutedWhite,
    fontSize: 12,
  },

  link: {
    color: KartoColors.yellow,
    fontWeight: "900",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    backgroundColor: KartoColors.card2,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: KartoColors.border,
  },

  infoText: {
    color: KartoColors.mutedWhite,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});

export const useKartoEntryAnimation = () => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(40);
  const scaleAnim = new Animated.Value(0.96);

  const start = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { fadeAnim, slideAnim, scaleAnim, start };
};