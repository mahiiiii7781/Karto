// src/screens/auth/LoginScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";

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

type LoginType = "email" | "phone";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signInFromStorage } = useAuth();

  const [loginType, setLoginType] = useState<LoginType>("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string
  ) => {
    Toast.show({ type, text1, text2, position: "bottom", visibilityTime: 1900 });
  };

  const switchLoginType = (type: LoginType) => {
    setLoginType(type);
    setOtp("");
    setOtpSent(false);
  };

  const continueBrowsing = async () => {
    await AsyncStorage.setItem("hasLaunched", "true");

    showToast("info", "Continue browsing", "You can login later for cart and orders.");

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "UserApp" as never }],
      });
    }
  };

  const cleanPhone = phone.replace(/\D/g, "");

  const validateBeforeOtp = () => {
    if (loginType === "email") {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        showToast("info", "Email required", "Please enter your email address.");
        return false;
      }

      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        showToast("info", "Invalid email", "Please enter a valid email address.");
        return false;
      }
    }

    if (loginType === "phone") {
      if (!cleanPhone) {
        showToast("info", "Phone required", "Please enter your phone number.");
        return false;
      }

      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        showToast("info", "Invalid phone", "Enter a valid 10 digit Indian phone number.");
        return false;
      }
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (!validateBeforeOtp()) return;

    setLoading(true);

    try {
      const payload =
        loginType === "email"
          ? { email: email.trim().toLowerCase() }
          : { phone: `+91${cleanPhone}` };

      const res = await apiClient.post("/auth/send-otp", payload);

      if (res?.data?.success === false) {
        showToast("error", "OTP failed", res?.data?.message || "Unable to send OTP.");
        return;
      }

      setOtpSent(true);

      showToast(
        "success",
        "OTP sent",
        loginType === "email"
          ? "Please check your email inbox."
          : "Please check your phone messages."
      );
    } catch (error: any) {
      showToast(
        "error",
        "OTP failed",
        error?.response?.data?.message || "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showToast("info", "OTP required", "Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const payload =
        loginType === "email"
          ? { email: email.trim().toLowerCase(), otp: otp.trim() }
          : { phone: `+91${cleanPhone}`, otp: otp.trim() };

      const res = await apiClient.post("/auth/verify-otp", payload);
      const data = res?.data;

      if (!data?.success) {
        showToast("error", "Invalid OTP", data?.message || "OTP verification failed.");
        return;
      }

      await AsyncStorage.multiSet([
        ["accessToken", data.accessToken || ""],
        ["refreshToken", data.refreshToken || ""],
        ["user", JSON.stringify(data.user || {})],
        ["hasLaunched", "true"],
      ]);

      await signInFromStorage?.();

      showToast("success", "Welcome to Karto", "You are logged in successfully.");
    } catch (error: any) {
      showToast(
        "error",
        "Verification failed",
        error?.response?.data?.message || "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.container,
              { opacity: fade, transform: [{ translateY: slide }, { scale }] },
            ]}
          >
            <View style={styles.logoWrap}>
              <View style={styles.logo}>
                <Icon name="bag-handle" size={39} color={THEME.black} />
              </View>
              <View style={styles.logoGlow} />
            </View>

            <Text style={styles.appName}>Karto</Text>
            <Text style={styles.premium}>FAST LOCAL DELIVERY</Text>
            <Text style={styles.tagline}>Login only when you need cart, orders or checkout.</Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.title}>Login with OTP</Text>
                  <Text style={styles.subtitle}>No password needed. Simple and secure.</Text>
                </View>

                <View style={styles.secureIcon}>
                  <Icon name="shield-checkmark" size={24} color={THEME.green} />
                </View>
              </View>

              <View style={styles.switchRow}>
                <TouchableOpacity
                  style={[styles.switchBtn, loginType === "phone" && styles.switchActive]}
                  onPress={() => switchLoginType("phone")}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="call-outline"
                    size={16}
                    color={loginType === "phone" ? THEME.black : THEME.muted}
                  />
                  <Text style={[styles.switchText, loginType === "phone" && styles.switchTextActive]}>
                    Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switchBtn, loginType === "email" && styles.switchActive]}
                  onPress={() => switchLoginType("email")}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="mail-outline"
                    size={16}
                    color={loginType === "email" ? THEME.black : THEME.muted}
                  />
                  <Text style={[styles.switchText, loginType === "email" && styles.switchTextActive]}>
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {loginType === "phone" ? (
                <View style={styles.inputBox}>
                  <Text style={styles.country}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor={THEME.muted}
                    value={phone}
                    onChangeText={text => {
                      setPhone(text.replace(/\D/g, ""));
                      setOtpSent(false);
                      setOtp("");
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              ) : (
                <View style={styles.inputBox}>
                  <Icon name="mail-outline" size={20} color={THEME.yellow} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    placeholderTextColor={THEME.muted}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      setOtpSent(false);
                      setOtp("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading && !otpSent ? (
                  <ActivityIndicator color={THEME.black} />
                ) : (
                  <>
                    <Text style={styles.primaryText}>
                      {otpSent ? "Resend OTP" : "Send OTP"}
                    </Text>
                    <Icon name="arrow-forward" size={20} color={THEME.black} />
                  </>
                )}
              </TouchableOpacity>

              {otpSent && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpTitle}>Enter verification code</Text>
                  <Text style={styles.otpSub}>
                    We sent an OTP to your {loginType === "phone" ? "phone" : "email"}.
                  </Text>

                  <View style={styles.inputBox}>
                    <Icon name="keypad-outline" size={20} color={THEME.yellow} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      placeholderTextColor={THEME.muted}
                      value={otp}
                      onChangeText={text => setOtp(text.replace(/\D/g, ""))}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.verifyBtn, loading && styles.disabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.verifyText}>Verify & Continue</Text>
                        <Icon name="checkmark-circle" size={20} color={THEME.black} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={styles.guestBtn}
                activeOpacity={0.9}
                onPress={continueBrowsing}
              >
                <Icon name="storefront-outline" size={20} color={THEME.green} />
                <Text style={styles.guestText}>Continue As A Guest</Text>
                <Icon name="chevron-forward" size={18} color={THEME.muted} />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New to Karto?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignupScreen")}>
                  <Text style={styles.link}> Create account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.bottomHint}>
              You can browse Home without login. Login is required for protected actions.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  container: { alignItems: "center" },
  logoWrap: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    elevation: 12,
    zIndex: 2,
  },
  logoGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#3B320A",
    opacity: 0.65,
  },
  appName: {
    fontSize: 43,
    fontWeight: "900",
    color: THEME.text,
    letterSpacing: -1,
  },
  premium: {
    color: THEME.yellow,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "900",
    marginTop: 3,
  },
  tagline: {
    color: THEME.muted,
    marginTop: 8,
    marginBottom: 22,
    textAlign: "center",
    fontWeight: "700",
  },
  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 5, fontWeight: "700" },
  secureIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: THEME.bg,
    borderRadius: 18,
    padding: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  switchBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  switchActive: { backgroundColor: THEME.green },
  switchText: { color: THEME.muted, fontWeight: "900", fontSize: 13 },
  switchTextActive: { color: THEME.black },
  inputBox: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 17,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "800",
  },
  country: { color: THEME.yellow, fontWeight: "900", fontSize: 16 },
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: THEME.black, fontWeight: "900", fontSize: 16 },
  verifyBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  verifyText: { color: THEME.black, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.65 },
  otpBox: {
    marginTop: 16,
    backgroundColor: THEME.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
  },
  otpTitle: { color: THEME.text, fontWeight: "900", fontSize: 16 },
  otpSub: {
    color: THEME.muted,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  divider: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: { color: THEME.muted, marginHorizontal: 10, fontWeight: "800" },
  guestBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
  },
  guestText: {
    flex: 1,
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
    marginLeft: 9,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  footerText: { color: THEME.muted, fontWeight: "700" },
  link: { color: THEME.yellow, fontWeight: "900" },
  bottomHint: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});