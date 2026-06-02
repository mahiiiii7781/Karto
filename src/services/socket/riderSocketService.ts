import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  "https://karto-backend-kor1.onrender.com";

class RiderSocketService {
  private socket: Socket | null = null;

  connect(riderId: string, cityId?: string) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("Rider Socket Connected");

      this.socket?.emit(
        "joinRiderRoom",
        riderId
      );

      if (cityId) {
        this.socket?.emit(
          "joinRiderCity",
          cityId
        );
      }

      this.socket?.emit(
        "rider-online",
        riderId
      );
    });

    this.socket.on(
      "disconnect",
      () => {
        console.log(
          "Rider Socket Disconnected"
        );
      }
    );

    return this.socket;
  }

  disconnect(riderId?: string) {
    if (!this.socket) return;

    if (riderId) {
      this.socket.emit(
        "leaveRiderRoom",
        riderId
      );

      this.socket.emit(
        "rider-offline",
        riderId
      );
    }

    this.socket.disconnect();
    this.socket = null;
  }

  listenForOrders(
    callback: (order: any) => void
  ) {
    this.socket?.on(
      "new-rider-order",
      callback
    );
  }

  removeOrderListener() {
    this.socket?.off(
      "new-rider-order"
    );
  }

  joinOrder(orderId: string) {
    this.socket?.emit(
      "joinOrderRoom",
      orderId
    );
  }

  leaveOrder(orderId: string) {
    this.socket?.emit(
      "leaveOrderRoom",
      orderId
    );
  }

  sendLocation(
    orderId: string,
    latitude: number,
    longitude: number
  ) {
    this.socket?.emit(
      "rider-location",
      {
        orderId,
        latitude,
        longitude,
        timestamp: Date.now(),
      }
    );
  }

  listenLocationUpdates(
    callback: (data: any) => void
  ) {
    this.socket?.on(
      "rider-location-updated",
      callback
    );
  }

  removeLocationListener() {
    this.socket?.off(
      "rider-location-updated"
    );
  }

  getSocket() {
    return this.socket;
  }
}

export const riderSocketService =
  new RiderSocketService();