import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Linking,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "react-native-geolocation-service";
import NetInfo from "@react-native-community/netinfo";
import Toast from "react-native-toast-message";

const THEME = {
  bg: "#070A08",
  card: "#101713",
  card2: "#151F19",
  green: "#22C55E",
  yellow: "#FACC15",
  orange: "#FB923C",
  blue: "#38BDF8",
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

export default function PermissionSetupScreen({ route }: any) {
  const onDone = route?.params?.onDone;

  const [checking, setChecking] = useState(true);
  const [netOk, setNetOk] = useState(false);
  const [locationOk, setLocationOk] = useState(false);
  const [notificationOk, setNotificationOk] = useState(Platform.OS !== "android");
  const [processing, setProcessing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [netChecking, setNetChecking] = useState(false);

  useEffect(() => {
    runInitialChecks();
  }, []);

  const runInitialChecks = async () => {
    try {
      setChecking(true);
      setNetChecking(true);

      const netState = await NetInfo.fetch();
      const hasInternet = Boolean(
        netState.isConnected && netState.isInternetReachable !== false
      );

      setNetOk(hasInternet);

      if (!hasInternet) {
        showToast("info", "No internet", "Please check your connection.");
      }
    } catch {
      setNetOk(false);
      showToast("error", "Network check failed", "Please try again.");
    } finally {
      setChecking(false);
      setNetChecking(false);
    }
  };

  const requestNotification = async () => {
    if (notificationLoading || notificationOk) return;

    try {
      setNotificationLoading(true);

      if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "Karto Notifications",
            message:
              "Allow Karto to send order updates, delivery alerts and offers.",
            buttonPositive: "Allow",
            buttonNegative: "Not Now",
          }
        );

        const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
        setNotificationOk(allowed);

        showToast(
          allowed ? "success" : "info",
          allowed ? "Notifications enabled" : "Notifications skipped",
          allowed
            ? "You will receive order updates."
            : "You can enable it later from settings."
        );
        return;
      }

      setNotificationOk(true);
      showToast("success", "Notifications ready", "You will receive order updates.");
    } catch {
      setNotificationOk(false);
      showToast("error", "Notification permission failed", "Please try again.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const requestLocation = async () => {
    if (locationLoading || locationOk) return;

    try {
      setLocationLoading(true);

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Karto Location Permission",
            message:
              "Karto uses your location to show nearby stores and faster delivery options.",
            buttonPositive: "Allow",
            buttonNegative: "Not Now",
          }
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationOk(false);
          showToast(
            "info",
            "Location skipped",
            "You can still browse Karto and enable location later."
          );
          return;
        }
      }

      Geolocation.getCurrentPosition(
        () => {
          setLocationOk(true);
          setLocationLoading(false);
          showToast("success", "Location enabled", "Nearby stores will be more accurate.");
        },
        error => {
          setLocationOk(false);
          setLocationLoading(false);
          showToast(
            "info",
            "Location unavailable",
            error?.message || "You can enable location later from settings."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } catch {
      setLocationOk(false);
      setLocationLoading(false);
      showToast("error", "Location permission failed", "Please try again.");
    }
  };

  const continueToApp = async () => {
    if (processing) return;

    try {
      const netState = await NetInfo.fetch();
      const hasInternet = Boolean(
        netState.isConnected && netState.isInternetReachable !== false
      );

      if (!hasInternet) {
        setNetOk(false);
        showToast("error", "No internet", "Please check your connection before continuing.");
        return;
      }

      setProcessing(true);

      await AsyncStorage.multiSet([["permissionSetupDone", "true"]]);
      await AsyncStorage.removeItem("permissionSetupPending");

      if (typeof onDone === "function") {
        onDone();
      }
    } catch {
      showToast("error", "Unable to continue", "Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      showToast("error", "Unable to open settings", "Please open settings manually.");
    }
  };

  if (checking) {
    return (
      <View style={styles.center}>
        <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>K</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Checking setup...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={THEME.bg} barStyle="light-content" />

      <View style={styles.topGlow} />
      <View style={styles.yellowGlow} />

      <View style={styles.header}>
        <View style={styles.logo}>
          <Icon name="shield-checkmark" size={34} color={THEME.black} />
        </View>

        <Text style={styles.kicker}>FINAL SETUP</Text>
        <Text style={styles.title}>Setup Karto</Text>

        <Text style={styles.subtitle}>
          Enable essentials for nearby stores, delivery alerts and a smoother
          Karto experience.
        </Text>
      </View>

      <View style={styles.card}>
        <PermissionRow
          icon="wifi-outline"
          color={THEME.blue}
          title="Internet Connection"
          subtitle="Required to load stores, orders and live updates"
          status={netOk}
          loading={netChecking}
          buttonText={netOk ? "Online" : "Recheck"}
          onPress={runInitialChecks}
        />

        <PermissionRow
          icon="notifications-outline"
          color={THEME.yellow}
          title="Notifications"
          subtitle="Get order updates, delivery alerts and offers"
          status={notificationOk}
          loading={notificationLoading}
          buttonText={notificationOk ? "Allowed" : "Allow"}
          onPress={requestNotification}
        />

        <PermissionRow
          icon="location-outline"
          color={THEME.green}
          title="Current Location"
          subtitle="Show nearby restaurants and stores"
          status={locationOk}
          loading={locationLoading}
          buttonText={locationOk ? "Allowed" : "Allow"}
          onPress={requestLocation}
          last
        />
      </View>

      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Icon name="information-circle-outline" size={22} color={THEME.yellow} />
        </View>

        <Text style={styles.noteText}>
          Location and notifications are recommended, not forced. You can update
          permissions anytime from app settings.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, processing && styles.disabled]}
        onPress={continueToApp}
        disabled={processing}
        activeOpacity={0.9}
      >
        {processing ? (
          <ActivityIndicator color={THEME.black} />
        ) : (
          <>
            <Text style={styles.continueText}>Continue to Karto</Text>
            <Icon name="arrow-forward-circle" size={22} color={THEME.black} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsBtn} onPress={openSettings} activeOpacity={0.85}>
        <Icon name="settings-outline" size={17} color={THEME.yellow} />
        <Text style={styles.settingsText}>Open App Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const PermissionRow = ({
  icon,
  title,
  subtitle,
  status,
  buttonText,
  onPress,
  last,
  color,
  loading,
}: any) => (
  <View style={[styles.permissionRow, last && { borderBottomWidth: 0 }]}>
    <View style={[styles.permissionIcon, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Icon name={icon} size={23} color={color} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={styles.permissionSub}>{subtitle}</Text>
    </View>

    <TouchableOpacity
      style={[styles.rowBtn, status && styles.rowBtnDone]}
      onPress={onPress}
      disabled={status || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={THEME.black} />
      ) : (
        <Text style={[styles.rowBtnText, status && styles.rowBtnDoneText]}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingBottom: Platform.OS === "ios" ? 34 : 26,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: 74,
    height: 74,
    borderRadius: 25,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingLogoText: {
    color: THEME.yellow,
    fontSize: 38,
    fontWeight: "900",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "800",
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "rgba(34,197,94,0.17)",
  },
  yellowGlow: {
    position: "absolute",
    bottom: 110,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(250,204,21,0.10)",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 31,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 5,
    borderColor: "#102116",
  },
  kicker: {
    color: THEME.yellow,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 7,
  },
  title: {
    color: THEME.text,
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    fontWeight: "700",
  },
  card: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 26,
    padding: 14,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 15,
  },
  permissionSub: {
    color: THEME.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
    fontWeight: "700",
  },
  rowBtn: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minWidth: 75,
    alignItems: "center",
  },
  rowBtnDone: {
    backgroundColor: "#102116",
    borderWidth: 1,
    borderColor: "#20462C",
  },
  rowBtnText: {
    color: THEME.black,
    fontWeight: "900",
    fontSize: 12,
  },
  rowBtnDoneText: {
    color: THEME.green,
  },
  noteCard: {
    marginTop: 16,
    backgroundColor: "#252109",
    borderWidth: 1,
    borderColor: "#57470A",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  noteIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(250,204,21,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: {
    flex: 1,
    color: THEME.muted,
    lineHeight: 19,
    fontSize: 13,
    fontWeight: "700",
  },
  continueBtn: {
    marginTop: "auto",
    backgroundColor: THEME.green,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabled: {
    opacity: 0.65,
  },
  continueText: {
    color: THEME.black,
    fontSize: 17,
    fontWeight: "900",
  },
  settingsBtn: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 8,
  },
  settingsText: {
    color: THEME.yellow,
    fontWeight: "900",
  },
});
