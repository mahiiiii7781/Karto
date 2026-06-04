import Geolocation from "@react-native-community/geolocation";
import { riderService } from "@/services/api/riderApi";

let watchId: number | null = null;
let lastSentAt = 0;

const MIN_INTERVAL = 8000;

type StartTrackingParams = {
  orderId: string;
  onLocation?: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  onError?: (message: string) => void;
};

export const liveLocationService = {
  start: ({ orderId, onLocation, onError }: StartTrackingParams) => {
    if (!orderId) {
      onError?.("Order id missing for live tracking");
      return;
    }

    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      watchId = null;
    }

    watchId = Geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        onLocation?.({
          latitude,
          longitude,
        });

        const now = Date.now();

        if (now - lastSentAt < MIN_INTERVAL) {
          return;
        }

        lastSentAt = now;

        try {
          await riderService.updateLocation(
            orderId,
            latitude,
            longitude
          );
        } catch (error: any) {
          onError?.(
            error?.message || "Live location update failed"
          );
        }
      },
      (error) => {
        onError?.(
          error?.message ||
            "Unable to fetch current location"
        );
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 20,
        interval: 8000,
        fastestInterval: 5000,
      } as any
    );
  },

  stop: () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      watchId = null;
    }

    lastSentAt = 0;
  },

  isRunning: () => watchId !== null,
};