// src/screens/auth/SignupScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { CommonActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import apiClient from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";

type RootStackParamList = {
  LoginScreen: undefined;
  UserApp: undefined;
};

type SignupType = "password" | "email" | "phone";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  blue: "#38BDF8",
  orange: "#FB923C",
  text: "#F8FAFC",
  muted: "#8A94A6",
  border: "#1E2A22",
  black: "#050807",
  danger: "#EF4444",
};

const showToast = (
  type: "success" | "error" | "info",
  text1: string,
  text2?: string
) => {
  Toast.show({
    type,
    text1,
    text2,
    position: "bottom",
    visibilityTime: 1900,
  });
};

const normalizeAuthData = (raw: any) => {
  const data = raw?.data || raw || {};

  return {
    success: data?.success !== false,
    message: data?.message,
    accessToken:
      data?.accessToken ||
      data?.access_token ||
      data?.token ||
      data?.data?.accessToken ||
      data?.data?.access_token ||
      "",
    refreshToken:
      data?.refreshToken ||
      data?.refresh_token ||
      data?.data?.refreshToken ||
      data?.data?.refresh_token ||
      "",
    user: data?.user || data?.data?.user || null,
  };
};

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, signInFromStorage } = useAuth() as any;

  const [signupType, setSignupType] = useState<SignupType>("password");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [loadingAction, setLoadingAction] = useState<"register" | "send" | "verify" | null>(
    null
  );

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(45)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const loading = loadingAction !== null;
  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale, slide]);

  const resetOtp = (type: SignupType) => {
    if (loading || signupType === type) return;

    setSignupType(type);
    setOtp("");
    setOtpSent(false);
  };

  const resetToUserApp = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "UserApp" as never }],
      })
    );
  };

  const goToLogin = () => {
    navigation.navigate("LoginScreen");
  };

  const validateName = () => {
    const cleanName = fullName.trim();

    if (!cleanName) {
      showToast("info", "Name required", "Please enter your full name.");
      return false;
    }

    if (cleanName.length < 2) {
      showToast("info", "Name too short", "Full name must be at least 2 characters.");
      return false;
    }

    if (cleanName.length > 60) {
      showToast("info", "Name too long", "Full name cannot exceed 60 characters.");
      return false;
    }

    return true;
  };

  const validateEmail = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showToast("info", "Email required", "Please enter your email address.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      showToast("info", "Invalid email", "Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const validatePhone = () => {
    if (!cleanPhone) {
      showToast("info", "Phone required", "Please enter your phone number.");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      showToast("info", "Invalid phone", "Enter a valid 10 digit Indian phone number.");
      return false;
    }

    return true;
  };

  const validatePasswordSignup = () => {
    if (!validateName() || !validateEmail()) return false;

    if (!password.trim() || !confirmPassword.trim()) {
      showToast("info", "Password required", "Please enter and confirm your password.");
      return false;
    }

    if (password.length < 6) {
      showToast("info", "Weak password", "Password should be at least 6 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      showToast("info", "Password mismatch", "Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!validatePasswordSignup()) return;

    setLoadingAction("register");

    try {
      const { error, data } = await signUp?.(
        fullName.trim(),
        email.trim().toLowerCase(),
        password
      );

      if (error) {
        showToast("error", "Signup failed", error.message || "Please try again.");
        return;
      }

      const authData = normalizeAuthData(data);

      await AsyncStorage.setItem("hasLaunched", "true");

      if (authData.accessToken && authData.user) {
        await AsyncStorage.multiSet([
          ["accessToken", authData.accessToken],
          ["refreshToken", authData.refreshToken || ""],
          ["user", JSON.stringify(authData.user)],
          ["guestMode", "false"],
        ]);

        await signInFromStorage?.();
        showToast("success", "Account created", "Welcome to Karto.");
        resetToUserApp();
        return;
      }

      showToast("success", "Account created", "Please login now.");
      navigation.replace("LoginScreen");
    } catch (error: any) {
      showToast("error", "Signup failed", error?.message || "Something went wrong.");
    } finally {
      setLoadingAction(null);
    }
  };

  const validateOtpTarget = () => {
    if (!validateName()) return false;

    if (signupType === "email") return validateEmail();
    if (signupType === "phone") return validatePhone();

    return false;
  };

  const handleSendOtp = async () => {
    if (loading) return;
    if (!validateOtpTarget()) return;

    setLoadingAction("send");

    try {
      const payload =
        signupType === "email"
          ? { email: email.trim().toLowerCase(), fullName: fullName.trim() }
          : { phone: `+91${cleanPhone}`, fullName: fullName.trim() };

      const res = await apiClient.post("/auth/send-otp", payload);
      const data = res?.data || {};

      if (data?.success === false) {
        showToast("error", "OTP failed", data?.message || "Failed to send OTP.");
        return;
      }

      setOtpSent(true);
      showToast("success", "OTP sent", "Please enter the OTP to create account.");
    } catch (error: any) {
      showToast(
        "error",
        "OTP failed",
        error?.response?.data?.message || "Failed to send OTP."
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;

    if (!otpSent) {
      showToast("info", "Send OTP first", "Please send OTP before verifying.");
      return;
    }

    if (!/^\d{4,6}$/.test(otp.trim())) {
      showToast("info", "Invalid OTP", "Please enter the correct OTP.");
      return;
    }

    setLoadingAction("verify");

    try {
      const payload =
        signupType === "email"
          ? {
              fullName: fullName.trim(),
              email: email.trim().toLowerCase(),
              otp: otp.trim(),
            }
          : {
              fullName: fullName.trim(),
              phone: `+91${cleanPhone}`,
              otp: otp.trim(),
            };

      const res = await apiClient.post("/auth/verify-otp", payload);
      const authData = normalizeAuthData(res?.data);

      if (!authData.success || !authData.accessToken || !authData.user) {
        showToast(
          "error",
          "Invalid OTP",
          authData.message || "OTP verification failed."
        );
        return;
      }

      await AsyncStorage.multiSet([
        ["accessToken", authData.accessToken],
        ["refreshToken", authData.refreshToken || ""],
        ["user", JSON.stringify(authData.user)],
        ["hasLaunched", "true"],
        ["guestMode", "false"],
      ]);

      await signInFromStorage?.();

      showToast("success", "Account created", "Welcome to Karto.");
      resetToUserApp();
    } catch (error: any) {
      showToast(
        "error",
        "OTP verification failed",
        error?.response?.data?.message || "Please try again."
      );
    } finally {
      setLoadingAction(null);
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
          <View style={styles.topGlow} />
          <View style={styles.yellowGlow} />

          <Animated.View
            style={[
              styles.container,
              { opacity: fade, transform: [{ translateY: slide }, { scale }] },
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Icon name="chevron-back" size={24} color={THEME.text} />
            </TouchableOpacity>

            <View style={styles.logoWrap}>
              <View style={styles.logo}>
                <Icon name="bag-handle" size={42} color={THEME.black} />
              </View>
              <View style={styles.logoGlow} />
            </View>

            <Text style={styles.appName}>Karto</Text>
            <Text style={styles.premium}>CUSTOMER ACCOUNT</Text>
            <Text style={styles.tagline}>Create your account for cart, orders and checkout.</Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Create account</Text>
                  <Text style={styles.subtitle}>Start your premium Karto experience</Text>
                </View>

                <View style={styles.customerBadge}>
                  <Icon name="person-circle-outline" size={22} color={THEME.green} />
                </View>
              </View>

              <View style={styles.inputBox}>
                <Icon name="person-outline" size={20} color={THEME.yellow} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={THEME.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  maxLength={60}
                  editable={!loading}
                />
              </View>

              <View style={styles.switchRow}>
                {[
                  { key: "password", label: "Password" },
                  { key: "email", label: "Email OTP" },
                  { key: "phone", label: "Phone OTP" },
                ].map(item => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.switchBtn, signupType === item.key && styles.switchActive]}
                    onPress={() => resetOtp(item.key as SignupType)}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.switchText,
                        signupType === item.key && styles.switchTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(signupType === "password" || signupType === "email") && (
                <View style={styles.inputBox}>
                  <Icon name="mail-outline" size={20} color={THEME.yellow} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={THEME.muted}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      setOtpSent(false);
                      setOtp("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              )}

              {signupType === "phone" && (
                <View style={styles.inputBox}>
                  <Text style={styles.country}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={THEME.muted}
                    value={phone}
                    onChangeText={text => {
                      setPhone(text.replace(/\D/g, ""));
                      setOtpSent(false);
                      setOtp("");
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
              )}

              {signupType === "password" && (
                <>
                  <View style={styles.inputBox}>
                    <Icon name="lock-closed-outline" size={20} color={THEME.yellow} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={THEME.muted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={securePassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setSecurePassword(prev => !prev)}
                      disabled={loading}
                    >
                      <Icon
                        name={securePassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={THEME.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputBox}>
                    <Icon name="shield-checkmark-outline" size={20} color={THEME.yellow} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor={THEME.muted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={secureConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setSecureConfirmPassword(prev => !prev)}
                      disabled={loading}
                    >
                      <Icon
                        name={secureConfirmPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={THEME.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loadingAction === "register" && styles.disabled]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loadingAction === "register" ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>Create Account</Text>
                        <Icon name="checkmark-circle" size={20} color={THEME.black} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {signupType !== "password" && (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, loadingAction === "send" && styles.disabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loadingAction === "send" ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>
                          {otpSent ? "Resend Secure OTP" : "Send Secure OTP"}
                        </Text>
                        <Icon name="shield-checkmark" size={20} color={THEME.black} />
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={[styles.inputBox, styles.otpInput]}>
                    <Icon name="keypad-outline" size={20} color={THEME.yellow} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      placeholderTextColor={THEME.muted}
                      value={otp}
                      onChangeText={text => setOtp(text.replace(/\D/g, ""))}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      (!otpSent || loadingAction === "verify") && styles.disabled,
                    ]}
                    onPress={handleVerifyOtp}
                    disabled={!otpSent || loading}
                    activeOpacity={0.9}
                  >
                    {loadingAction === "verify" ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.verifyText}>Verify & Create</Text>
                        <Icon name="checkmark-circle" size={20} color={THEME.black} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={18} color={THEME.green} />
                <Text style={styles.infoText}>
                  New users are created as CUSTOMER. Vendor, rider and admin roles are assigned from backend.
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={goToLogin} disabled={loading}>
                  <Text style={styles.link}> Login</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    padding: 22,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -90,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  yellowGlow: {
    position: "absolute",
    bottom: -90,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(250,204,21,0.11)",
  },
  container: { alignItems: "center" },
  backBtn: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
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
    zIndex: 2,
  },
  logoGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "rgba(250,204,21,0.22)",
  },
  appName: {
    fontSize: 44,
    fontWeight: "900",
    color: THEME.text,
    letterSpacing: -1,
  },
  premium: {
    color: THEME.yellow,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "900",
    marginTop: 4,
  },
  tagline: {
    color: THEME.muted,
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "700",
  },
  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  customerBadge: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: THEME.text, fontSize: 28, fontWeight: "900" },
  subtitle: {
    color: THEME.muted,
    marginTop: 6,
    fontWeight: "700",
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: THEME.bg,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  switchBtn: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  switchActive: { backgroundColor: THEME.yellow },
  switchText: {
    color: THEME.muted,
    fontWeight: "900",
    fontSize: 11,
  },
  switchTextActive: { color: THEME.black },
  inputBox: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  otpInput: {
    marginTop: 14,
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
  disabled: { opacity: 0.6 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#102116",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#20462C",
  },
  infoText: {
    color: THEME.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: { color: THEME.muted, fontWeight: "700" },
  link: { color: THEME.yellow, fontWeight: "900" },
});
