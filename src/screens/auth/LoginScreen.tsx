// src/screens/auth/LoginScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api/";

type RootStackParamList = {
  SignupScreen: undefined;
};

const THEME = {
  black: "#050807",
  black2: "#0B0F0A",
  card: "#101510",
  green: "#22C55E",
  yellow: "#FACC15",
  text: "#FFFFFF",
  muted: "#A7B0AA",
  border: "#2C382E",
  danger: "#EF4444",
};

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { signIn, signInFromStorage } = useAuth();

  const [loginType, setLoginType] = useState<"password" | "email" | "phone">(
    "password"
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

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
  }, []);

  const resetOtp = (type: "password" | "email" | "phone") => {
    setLoginType(type);
    setOtp("");
    setOtpSent(false);
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Details", "Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        Alert.alert("Login Failed", error.message || "Invalid login details.");
        return;
      }

      await AsyncStorage.setItem("hasLaunched", "true");
    } catch (error) {
      console.log("PASSWORD LOGIN ERROR:", error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (loginType === "email" && !email.trim()) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }

    if (loginType === "phone" && !phone.trim()) {
      Alert.alert("Missing Phone", "Please enter phone number.");
      return;
    }

    setLoading(true);

    try {
      const body =
        loginType === "email"
          ? { email: email.trim() }
          : { phone: `+91${phone.trim()}` };

      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("OTP Failed", data.message || "Failed to send OTP.");
        return;
      }

      setOtpSent(true);
      Alert.alert("OTP Sent", "Please enter the OTP to continue.");
    } catch (error) {
      console.log("SEND OTP ERROR:", error);
      Alert.alert("Error", "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Missing OTP", "Please enter OTP.");
      return;
    }

    setLoading(true);

    try {
      const body =
        loginType === "email"
          ? {
              email: email.trim(),
              otp: otp.trim(),
            }
          : {
              phone: `+91${phone.trim()}`,
              otp: otp.trim(),
            };

      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Invalid OTP", data.message || "OTP verification failed.");
        return;
      }

      await AsyncStorage.setItem("accessToken", data.accessToken);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("hasLaunched", "true");

      await signInFromStorage();
    } catch (error) {
      console.log("OTP VERIFY ERROR:", error);
      Alert.alert("Error", "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.container,
              {
                opacity: fade,
                transform: [{ translateY: slide }, { scale }],
              },
            ]}
          >
            <View style={styles.logo}>
              <Icon name="cart" size={42} color={THEME.black} />
            </View>

            <Text style={styles.appName}>Karto</Text>
            <Text style={styles.premium}>PREMIUM DELIVERY EXPERIENCE</Text>
            <Text style={styles.tagline}>Everything delivered, smoothly.</Text>

            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Login securely to continue shopping
              </Text>

              <View style={styles.switchRow}>
                {["password", "email", "phone"].map((x) => (
                  <TouchableOpacity
                    key={x}
                    style={[
                      styles.switchBtn,
                      loginType === x && styles.switchActive,
                    ]}
                    onPress={() => resetOtp(x as any)}
                  >
                    <Text
                      style={[
                        styles.switchText,
                        loginType === x && styles.switchTextActive,
                      ]}
                    >
                      {x === "password"
                        ? "Password"
                        : x === "email"
                        ? "Email OTP"
                        : "Phone OTP"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(loginType === "password" || loginType === "email") && (
                <View style={styles.inputBox}>
                  <Icon name="mail-outline" size={20} color={THEME.yellow} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={THEME.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {loginType === "phone" && (
                <View style={styles.inputBox}>
                  <Text style={styles.country}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={THEME.muted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              )}

              {loginType === "password" && (
                <>
                  <View style={styles.inputBox}>
                    <Icon
                      name="lock-closed-outline"
                      size={20}
                      color={THEME.yellow}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={THEME.muted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={securePassword}
                    />

                    <TouchableOpacity
                      onPress={() => setSecurePassword(!securePassword)}
                    >
                      <Icon
                        name={
                          securePassword ? "eye-outline" : "eye-off-outline"
                        }
                        size={20}
                        color={THEME.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.disabled]}
                    onPress={handlePasswordLogin}
                    disabled={loading}
                  >
                    {loading ? (
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

              {loginType !== "password" && (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.disabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>
                          {otpSent ? "Resend Secure OTP" : "Send Secure OTP"}
                        </Text>
                        <Icon
                          name="shield-checkmark"
                          size={20}
                          color={THEME.black}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={[styles.inputBox, { marginTop: 14 }]}>
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
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      (!otpSent || loading) && styles.disabled,
                    ]}
                    onPress={handleVerifyOtp}
                    disabled={!otpSent || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={THEME.black} />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>
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
                </>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don’t have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("SignupScreen")}
                >
                  <Text style={styles.link}> Register</Text>
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
  safe: {
    flex: 1,
    backgroundColor: THEME.black,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },
  container: {
    alignItems: "center",
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 12,
  },
  appName: {
    fontSize: 44,
    fontWeight: "900",
    color: THEME.text,
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
  },
  card: {
    width: "100%",
    backgroundColor: THEME.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    marginTop: 6,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: THEME.black2,
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
  switchActive: {
    backgroundColor: THEME.yellow,
  },
  switchText: {
    color: THEME.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  switchTextActive: {
    color: THEME.black,
    fontWeight: "900",
  },
  inputBox: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.black2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: THEME.text,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  country: {
    color: THEME.yellow,
    fontWeight: "900",
    fontSize: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: THEME.yellow,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: THEME.muted,
  },
  link: {
    color: THEME.yellow,
    fontWeight: "900",
  },
});