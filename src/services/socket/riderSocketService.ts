import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import apiClient from "@/api/apiClient";

const SOCKET_URL = apiClient.defaults.baseURL?.replace("/api", "") || "";

class RiderSocketService {
  private socket: Socket | null = null;

  async connect(riderId: string, cityId?: string) {
    if (this.socket?.connected) return this.socket;

    const token = await AsyncStorage.getItem("accessToken");

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("Rider Socket Connected");

      this.socket?.emit("joinRiderRoom", riderId);

      if (cityId) {
        this.socket?.emit("joinRiderCity", cityId);
      }

      this.socket?.emit("rider-online", {
        riderId,
        cityId,
      });
    });

    this.socket.on("disconnect", () => {
      console.log("Rider Socket Disconnected");
    });

    return this.socket;
  }

  disconnect(riderId?: string, cityId?: string) {
    if (!this.socket) return;

    if (riderId) {
      this.socket.emit("leaveRiderRoom", riderId);

      this.socket.emit("rider-offline", {
        riderId,
        cityId,
      });
    }

    if (cityId) {
      this.socket.emit("leaveRiderCity", cityId);
    }

    this.socket.disconnect();
    this.socket = null;
  }

  listenForOrders(callback: (order: any) => void) {
    const handler = (payload: any) => {
      const order = payload?.order || payload;
      if (order?.id) callback(order);
    };

    this.socket?.on("new-rider-order", handler);
    this.socket?.on("new-order-assignment", handler);
    this.socket?.on("NEW_RIDER_ORDER", handler);
  }

  removeOrderListener() {
    this.socket?.off("new-rider-order");
    this.socket?.off("new-order-assignment");
    this.socket?.off("NEW_RIDER_ORDER");
  }

  joinOrder(orderId: string) {
    this.socket?.emit("joinOrderRoom", orderId);
  }

  leaveOrder(orderId: string) {
    this.socket?.emit("leaveOrderRoom", orderId);
  }

  sendLocation(orderId: string, latitude: number, longitude: number) {
    this.socket?.emit("rider-location", {
      orderId,
      latitude,
      longitude,
      timestamp: Date.now(),
    });
  }

  listenLocationUpdates(callback: (data: any) => void) {
    this.socket?.on("rider-location-updated", callback);
  }

  removeLocationListener() {
    this.socket?.off("rider-location-updated");
  }

  listenOrderAccepted(callback: (order: any) => void) {
    this.socket?.on("order-accepted", callback);
    this.socket?.on("ORDER_ACCEPTED", callback);
    this.socket?.on("rider-order-accepted", callback);
  }

  removeOrderAcceptedListener() {
    this.socket?.off("order-accepted");
    this.socket?.off("ORDER_ACCEPTED");
    this.socket?.off("rider-order-accepted");
  }

  listenOrderCompleted(callback: (payload: any) => void) {
    this.socket?.on("order-completed", callback);
    this.socket?.on("order-delivered", callback);
  }

  removeOrderCompletedListener() {
    this.socket?.off("order-completed");
    this.socket?.off("order-delivered");
  }

  emitPopupOpened(orderId: string, riderId: string) {
    this.socket?.emit("rider-order-popup-opened", {
      orderId,
      riderId,
    });
  }

  emitPopupTimeout(orderId: string, riderId: string) {
    this.socket?.emit("rider-order-popup-timeout", {
      orderId,
      riderId,
    });
  }

  emitRiderAccepted(orderId: string, riderId: string) {
    this.socket?.emit("rider-accepted-order", {
      orderId,
      riderId,
    });
  }

  emitRiderRejected(orderId: string, riderId: string) {
    this.socket?.emit("rider-rejected-order", {
      orderId,
      riderId,
    });
  }

  getSocket() {
    return this.socket;
  }
}

export const riderSocketService = new RiderSocketService();