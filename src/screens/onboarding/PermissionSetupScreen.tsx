import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "react-native-geolocation-service";
import NetInfo from "@react-native-community/netinfo";

const THEME = {
  bg: "#050807",
  card: "#0D1511",
  card2: "#101C15",
  green: "#22C55E",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  border: "#1E2A22",
  black: "#041008",
};

export default function PermissionSetupScreen({ route }: any) {
  const onDone = route?.params?.onDone;

  const [checking, setChecking] = useState(true);
  const [netOk, setNetOk] = useState(false);
  const [locationOk, setLocationOk] = useState(false);
  const [notificationOk, setNotificationOk] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    runInitialChecks();
  }, []);

  const runInitialChecks = async () => {
    try {
      setChecking(true);

      const netState = await NetInfo.fetch();

      setNetOk(
        Boolean(netState.isConnected && netState.isInternetReachable !== false)
      );
    } finally {
      setChecking(false);
    }
  };

  const requestNotification = async () => {
    try {
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

        setNotificationOk(granted === PermissionsAndroid.RESULTS.GRANTED);
        return;
      }

      setNotificationOk(true);
    } catch {
      setNotificationOk(false);
    }
  };

  const requestLocation = async () => {
    try {
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
          return;
        }
      }

      Geolocation.getCurrentPosition(
        () => {
          setLocationOk(true);
        },
        () => {
          setLocationOk(false);
          Alert.alert(
            "Location Required",
            "Please enable location for better nearby store recommendations."
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
    }
  };

  const continueToApp = async () => {
    try {
      const netState = await NetInfo.fetch();
      const hasInternet = Boolean(
        netState.isConnected && netState.isInternetReachable !== false
      );

      if (!hasInternet) {
        Alert.alert(
          "No Internet",
          "Please check your internet connection before continuing."
        );
        setNetOk(false);
        return;
      }

      setProcessing(true);

      await AsyncStorage.setItem("permissionSetupDone", "true");
      await AsyncStorage.removeItem("permissionSetupPending");

      if (typeof onDone === "function") {
        onDone();
      }
    } catch {
      Alert.alert("Error", "Unable to continue. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={styles.loadingText}>Checking setup...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topGlow} />

      <View style={styles.header}>
        <View style={styles.logo}>
          <Icon name="shield-checkmark" size={34} color={THEME.black} />
        </View>

        <Text style={styles.title}>Setup Karto</Text>
        <Text style={styles.subtitle}>
          Enable a few things to get nearby stores, order alerts and a smooth
          delivery experience.
        </Text>
      </View>

      <View style={styles.card}>
        <PermissionRow
          icon="wifi-outline"
          title="Internet Connection"
          subtitle="Required to load stores and orders"
          status={netOk}
          buttonText="Recheck"
          onPress={runInitialChecks}
        />

        <PermissionRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Get order updates and delivery alerts"
          status={notificationOk}
          buttonText={notificationOk ? "Allowed" : "Allow"}
          onPress={requestNotification}
        />

        <PermissionRow
          icon="location-outline"
          title="Current Location"
          subtitle="Show nearby restaurants and stores"
          status={locationOk}
          buttonText={locationOk ? "Allowed" : "Allow"}
          onPress={requestLocation}
          last
        />
      </View>

      <View style={styles.noteCard}>
        <Icon name="information-circle-outline" size={22} color={THEME.green} />
        <Text style={styles.noteText}>
          You can still browse Karto, but location and notifications make your
          experience faster and smarter.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, processing && { opacity: 0.65 }]}
        onPress={continueToApp}
        disabled={processing}
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

      <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
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
}: any) => (
  <View style={[styles.permissionRow, last && { borderBottomWidth: 0 }]}>
    <View style={styles.permissionIcon}>
      <Icon name={icon} size={23} color={THEME.green} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={styles.permissionSub}>{subtitle}</Text>
    </View>

    <TouchableOpacity
      style={[styles.rowBtn, status && styles.rowBtnDone]}
      onPress={onPress}
      disabled={status}
    >
      <Text style={[styles.rowBtnText, status && styles.rowBtnDoneText]}>
        {buttonText}
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: THEME.muted,
    marginTop: 12,
    fontWeight: "700",
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "#12351F",
    opacity: 0.55,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: THEME.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: THEME.text,
    fontSize: 31,
    fontWeight: "900",
  },
  subtitle: {
    color: THEME.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
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
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
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
  },
  rowBtn: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  rowBtnDone: {
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
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
    backgroundColor: "#07150D",
    borderWidth: 1,
    borderColor: "#173923",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  noteText: {
    flex: 1,
    color: THEME.muted,
    lineHeight: 19,
    fontSize: 13,
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
  continueText: {
    color: THEME.black,
    fontSize: 17,
    fontWeight: "900",
  },
  settingsBtn: {
    marginTop: 14,
    alignItems: "center",
  },
  settingsText: {
    color: THEME.muted,
    fontWeight: "800",
  },
});