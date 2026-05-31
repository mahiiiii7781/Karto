// src/screens/auth/SignupScreen.tsx
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

const API_BASE_URL = "https://karto-backend-kor1.onrender.com/api";

type RootStackParamList = {
  LoginScreen: undefined;
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

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp } = useAuth();

  const [signupType, setSignupType] = useState<"password" | "email" | "phone">("password");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(45)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 550, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const resetOtp = (type: "password" | "email" | "phone") => {
    setSignupType(type);
    setOtp("");
    setOtpSent(false);
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing Details", "Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(fullName.trim(), email.trim(), password);

      if (error) {
        Alert.alert("Signup Failed", error.message);
        return;
      }

      await AsyncStorage.setItem("hasLaunched", "true");

      Alert.alert("Account Created", "Please login now.", [
        { text: "OK", onPress: () => navigation.replace("LoginScreen") },
      ]);
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

    if (signupType === "email" && !email.trim()) {
      Alert.alert("Missing Email", "Please enter email.");
      return;
    }

    if (signupType === "phone" && !phone.trim()) {
      Alert.alert("Missing Phone", "Please enter phone number.");
      return;
    }

    setLoading(true);
    try {
      const body =
        signupType === "email"
          ? { email: email.trim() }
          : { phone: `+91${phone.trim()}` };

      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("OTP Failed", data.message || "Failed to send OTP.");
        return;
      }

      setOtpSent(true);
      Alert.alert("OTP Sent", "Please enter the OTP to create account.");
    } catch {
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
        signupType === "email"
          ? { fullName: fullName.trim(), email: email.trim(), otp: otp.trim() }
          : { fullName: fullName.trim(), phone: `+91${phone.trim()}`, otp: otp.trim() };

      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Invalid OTP", data.message || "OTP verification failed.");
        return;
      }

      await AsyncStorage.setItem("accessToken", data.accessToken);
      await AsyncStorage.setItem("refreshToken", data.refreshToken);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      await AsyncStorage.setItem("hasLaunched", "true");
    } catch {
      Alert.alert("Error", "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.container, { opacity: fade, transform: [{ translateY: slide }, { scale }] }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color={THEME.yellow} />
            </TouchableOpacity>

            <View style={styles.logo}>
              <Icon name="bag-handle" size={42} color={THEME.black} />
            </View>

            <Text style={styles.appName}>Karto</Text>
            <Text style={styles.premium}>CUSTOMER ACCOUNT</Text>
            <Text style={styles.tagline}>Food, grocery, medicine and more.</Text>

            <View style={styles.card}>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Start your premium Karto experience</Text>

              <View style={styles.inputBox}>
                <Icon name="person-outline" size={20} color={THEME.yellow} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={THEME.muted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.switchRow}>
                {["password", "email", "phone"].map((x) => (
                  <TouchableOpacity
                    key={x}
                    style={[styles.switchBtn, signupType === x && styles.switchActive]}
                    onPress={() => resetOtp(x as any)}
                  >
                    <Text style={[styles.switchText, signupType === x && styles.switchTextActive]}>
                      {x === "password" ? "Password" : x === "email" ? "Email OTP" : "Phone OTP"}
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
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                    onChangeText={setPhone}
                    keyboardType="number-pad"
                    maxLength={10}
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
                    />
                    <TouchableOpacity onPress={() => setSecurePassword(!securePassword)}>
                      <Icon name={securePassword ? "eye-outline" : "eye-off-outline"} size={20} color={THEME.muted} />
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
                    />
                    <TouchableOpacity onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}>
                      <Icon name={secureConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={THEME.muted} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={[styles.primaryBtn, loading && styles.disabled]} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color={THEME.black} /> : <>
                      <Text style={styles.primaryText}>Create Account</Text>
                      <Icon name="checkmark-circle" size={20} color={THEME.black} />
                    </>}
                  </TouchableOpacity>
                </>
              )}

              {signupType !== "password" && (
                <>
                  <TouchableOpacity style={[styles.primaryBtn, loading && styles.disabled]} onPress={handleSendOtp} disabled={loading}>
                    <Text style={styles.primaryText}>{otpSent ? "Resend Secure OTP" : "Send Secure OTP"}</Text>
                    <Icon name="shield-checkmark" size={20} color={THEME.black} />
                  </TouchableOpacity>

                  <View style={[styles.inputBox, { marginTop: 14 }]}>
                    <Icon name="keypad-outline" size={20} color={THEME.yellow} />
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
                    style={[styles.primaryBtn, (!otpSent || loading) && styles.disabled]}
                    onPress={handleVerifyOtp}
                    disabled={!otpSent || loading}
                  >
                    {loading ? <ActivityIndicator color={THEME.black} /> : <>
                      <Text style={styles.primaryText}>Verify & Create</Text>
                      <Icon name="checkmark-circle" size={20} color={THEME.black} />
                    </>}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={18} color={THEME.green} />
                <Text style={styles.infoText}>
                  New users are created as CUSTOMER. Vendor, rider and admin roles will be assigned from backend.
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
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
  safe: { flex: 1, backgroundColor: THEME.black },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 22 },
  container: { alignItems: "center" },
  backBtn: {
    alignSelf: "flex-start", width: 42, height: 42, borderRadius: 21,
    backgroundColor: THEME.black2, borderWidth: 1, borderColor: THEME.border,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  logo: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: THEME.yellow,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
    shadowColor: THEME.yellow, shadowOpacity: 0.55, shadowRadius: 22, elevation: 12,
  },
  appName: { fontSize: 44, fontWeight: "900", color: THEME.text },
  premium: { color: THEME.yellow, fontSize: 11, letterSpacing: 2, fontWeight: "900", marginTop: 4 },
  tagline: { color: THEME.muted, marginTop: 8, marginBottom: 24 },
  card: {
    width: "100%", backgroundColor: THEME.card, borderRadius: 28, padding: 22,
    borderWidth: 1, borderColor: THEME.border, shadowColor: "#000",
    shadowOpacity: 0.5, shadowRadius: 18, elevation: 10,
  },
  title: { color: THEME.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: THEME.muted, marginTop: 6, marginBottom: 20 },
  switchRow: {
    flexDirection: "row", backgroundColor: THEME.black2, borderRadius: 16,
    padding: 4, marginBottom: 16, borderWidth: 1, borderColor: THEME.border,
  },
  switchBtn: { flex: 1, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  switchActive: { backgroundColor: THEME.yellow },
  switchText: { color: THEME.muted, fontWeight: "800", fontSize: 12 },
  switchTextActive: { color: THEME.black, fontWeight: "900" },
  inputBox: {
    height: 56, flexDirection: "row", alignItems: "center", backgroundColor: THEME.black2,
    borderWidth: 1, borderColor: THEME.border, borderRadius: 16, paddingHorizontal: 14, marginBottom: 14,
  },
  input: { flex: 1, color: THEME.text, paddingHorizontal: 12, fontSize: 15 },
  country: { color: THEME.yellow, fontWeight: "900", fontSize: 16 },
  primaryBtn: {
    height: 56, borderRadius: 18, backgroundColor: THEME.yellow,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    shadowColor: THEME.yellow, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  primaryText: { color: THEME.black, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.6 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16,
    backgroundColor: "#102417", padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: "#173923",
  },
  infoText: { color: THEME.muted, flex: 1, fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: THEME.muted },
  link: { color: THEME.yellow, fontWeight: "900" },
});