// src/screens/auth/LoginScreen.tsx
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

type LoginType = "emailPassword" | "emailOtp" | "phone";

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
      "",
    refreshToken:
      data?.refreshToken ||
      data?.refresh_token ||
      data?.data?.refreshToken ||
      "",
    user: data?.user || data?.data?.user || null,
  };
};

const getRoleRoute = (role?: string) => {
  const normalizedRole = String(role || "CUSTOMER").toUpperCase();

  if (normalizedRole === "ADMIN") return "RoleSelection";
  if (normalizedRole === "VENDOR") return "VendorApp";
  if (normalizedRole === "RIDER") return "RiderApp";

  return "UserApp";
};

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signInFromStorage } = useAuth();

  const [loginType, setLoginType] = useState<LoginType>("emailPassword");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [securePassword, setSecurePassword] = useState(true);
  const [loadingAction, setLoadingAction] = useState<
    "login" | "send" | "verify" | null
  >(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  const cleanPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const loading = loadingAction !== null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale, slide]);

  const resetOtpState = () => {
    setOtp("");
    setOtpSent(false);
  };

  const switchLoginType = (type: LoginType) => {
    if (loading || loginType === type) return;

    setLoginType(type);
    resetOtpState();
  };

  const resetToRoute = (routeName: string) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      })
    );
  };

  const saveAuthAndContinue = async (authData: any) => {
    await AsyncStorage.multiSet([
      ["accessToken", authData.accessToken],
      ["refreshToken", authData.refreshToken || ""],
      ["user", JSON.stringify(authData.user)],
      ["hasLaunched", "true"],
      ["guestMode", "false"],
    ]);

    await signInFromStorage?.();

    resetToRoute(getRoleRoute(authData.user?.role));
  };

  const continueBrowsing = async () => {
    try {
      await AsyncStorage.multiSet([
        ["hasLaunched", "true"],
        ["guestMode", "true"],
      ]);

      showToast(
        "info",
        "Guest mode",
        "You can login later for cart, checkout and orders."
      );

      resetToRoute("UserApp");
    } catch {
      showToast("error", "Unable to continue", "Please try again.");
    }
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
      showToast(
        "info",
        "Invalid phone",
        "Enter a valid 10 digit Indian phone number."
      );
      return false;
    }

    return true;
  };

  const handlePasswordLogin = async () => {
    if (loading) return;
    if (!validateEmail()) return;

    if (!password.trim()) {
      showToast("info", "Password required", "Please enter your password.");
      return;
    }

    setLoadingAction("login");

    try {
      const res = await apiClient.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const authData = normalizeAuthData(res?.data);

      if (!authData.success || !authData.accessToken || !authData.user) {
        showToast(
          "error",
          "Login failed",
          authData.message || "Invalid email or password."
        );
        return;
      }

      showToast("success", "Welcome to Karto", "You are logged in successfully.");
      await saveAuthAndContinue(authData);
    } catch (error: any) {
      showToast(
        "error",
        "Login failed",
        error?.response?.data?.message || "Invalid email or password."
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const validateBeforeOtp = () => {
    if (loginType === "emailOtp") return validateEmail();
    if (loginType === "phone") return validatePhone();

    return false;
  };

  const handleSendOtp = async () => {
    if (loading) return;
    if (!validateBeforeOtp()) return;

    setLoadingAction("send");

    try {
      const payload =
        loginType === "emailOtp"
          ? { email: email.trim().toLowerCase() }
          : { phone: `+91${cleanPhone}` };

      const res = await apiClient.post("/auth/send-otp", payload);
      const data = res?.data || {};

      if (data?.success === false) {
        showToast("error", "OTP failed", data?.message || "Unable to send OTP.");
        return;
      }

      setOtpSent(true);

      showToast(
        "success",
        "OTP sent",
        loginType === "emailOtp"
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
      setLoadingAction(null);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;

    const cleanOtp = otp.trim();

    if (!otpSent) {
      showToast("info", "Send OTP first", "Please send OTP first.");
      return;
    }

    if (!/^\d{4,6}$/.test(cleanOtp)) {
      showToast("info", "Invalid OTP", "Please enter the correct OTP.");
      return;
    }

    setLoadingAction("verify");

    try {
      const payload =
        loginType === "emailOtp"
          ? { email: email.trim().toLowerCase(), otp: cleanOtp }
          : { phone: `+91${cleanPhone}`, otp: cleanOtp };

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

      showToast("success", "Welcome to Karto", "You are logged in successfully.");
      await saveAuthAndContinue(authData);
    } catch (error: any) {
      showToast(
        "error",
        "Verification failed",
        error?.response?.data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const goToSignup = () => {
    navigation.navigate("SignupScreen");
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
              {
                opacity: fade,
                transform: [{ translateY: slide }, { scale }],
              },
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
            <Text style={styles.tagline}>
              Login for cart, checkout, orders and vendor/rider panels.
            </Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {loginType === "emailPassword"
                      ? "Login with Password"
                      : "Login with OTP"}
                  </Text>

                  <Text style={styles.subtitle}>
                    {loginType === "emailPassword"
                      ? "Use your email and password."
                      : "No password needed. Simple and secure."}
                  </Text>
                </View>

                <View style={styles.secureIcon}>
                  <Icon name="shield-checkmark" size={24} color={THEME.green} />
                </View>
              </View>

              <View style={styles.switchRow}>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    loginType === "emailPassword" && styles.switchActive,
                  ]}
                  onPress={() => switchLoginType("emailPassword")}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <Icon
                    name="lock-closed-outline"
                    size={15}
                    color={
                      loginType === "emailPassword"
                        ? THEME.black
                        : THEME.muted
                    }
                  />
                  <Text
                    style={[
                      styles.switchText,
                      loginType === "emailPassword" && styles.switchTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    loginType === "emailOtp" && styles.switchActive,
                  ]}
                  onPress={() => switchLoginType("emailOtp")}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <Icon
                    name="mail-outline"
                    size={15}
                    color={loginType === "emailOtp" ? THEME.black : THEME.muted}
                  />
                  <Text
                    style={[
                      styles.switchText,
                      loginType === "emailOtp" && styles.switchTextActive,
                    ]}
                  >
                    OTP
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    loginType === "phone" && styles.switchActive,
                  ]}
                  onPress={() => switchLoginType("phone")}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <Icon
                    name="call-outline"
                    size={15}
                    color={loginType === "phone" ? THEME.black : THEME.muted}
                  />
                  <Text
                    style={[
                      styles.switchText,
                      loginType === "phone" && styles.switchTextActive,
                    ]}
                  >
                    Phone
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
                      resetOtpState();
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!loading}
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
                      resetOtpState();
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              )}

              {loginType === "emailPassword" && (
                <>
                  <View style={styles.inputBox}>
                    <Icon
                      name="lock-closed-outline"
                      size={20}
                      color={THEME.yellow}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Enter password"
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

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      loadingAction === "login" && styles.disabled,
                    ]}
                    onPress={handlePasswordLogin}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loadingAction === "login" ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>Login</Text>
                        <Icon
                          name="arrow-forward"
                          size={20}
                          color={THEME.black}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {loginType !== "emailPassword" && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      loadingAction === "send" && styles.disabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loadingAction === "send" ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>
                          {otpSent ? "Resend OTP" : "Send OTP"}
                        </Text>
                        <Icon
                          name="arrow-forward"
                          size={20}
                          color={THEME.black}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {otpSent && (
                    <View style={styles.otpBox}>
                      <Text style={styles.otpTitle}>Enter verification code</Text>

                      <Text style={styles.otpSub}>
                        We sent an OTP to your{" "}
                        {loginType === "phone" ? "phone" : "email"}.
                      </Text>

                      <View style={styles.inputBox}>
                        <Icon
                          name="keypad-outline"
                          size={20}
                          color={THEME.yellow}
                        />

                        <TextInput
                          style={styles.input}
                          placeholder="Enter OTP"
                          placeholderTextColor={THEME.muted}
                          value={otp}
                          onChangeText={text =>
                            setOtp(text.replace(/\D/g, ""))
                          }
                          keyboardType="number-pad"
                          maxLength={6}
                          editable={!loading}
                        />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.verifyBtn,
                          loadingAction === "verify" && styles.disabled,
                        ]}
                        onPress={handleVerifyOtp}
                        disabled={loading}
                        activeOpacity={0.9}
                      >
                        {loadingAction === "verify" ? (
                          <ActivityIndicator color={THEME.black} />
                        ) : (
                          <>
                            <Text style={styles.verifyText}>
                              Verify & Continue
                            </Text>
                            <Icon
                              name="checkmark-circle"
                              size={20}
                              color={THEME.black}
                            />
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
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
                disabled={loading}
              >
                <Icon
                  name="storefront-outline"
                  size={20}
                  color={THEME.green}
                />

                <Text style={styles.guestText}>Continue As Guest</Text>

                <Icon
                  name="chevron-forward"
                  size={18}
                  color={THEME.muted}
                />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New to Karto?</Text>

                <TouchableOpacity onPress={goToSignup} disabled={loading}>
                  <Text style={styles.link}> Create account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.bottomHint}>
              Guest can browse Home. Login is required for cart, checkout and orders.
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    gap: 12,
  },
  title: { color: THEME.text, fontSize: 27, fontWeight: "900" },
  subtitle: {
    color: THEME.muted,
    marginTop: 5,
    fontWeight: "700",
    lineHeight: 18,
  },
  secureIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
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
    gap: 5,
  },
  switchActive: { backgroundColor: THEME.green },
  switchText: { color: THEME.muted, fontWeight: "900", fontSize: 12 },
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