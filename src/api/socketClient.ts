import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOCKET_BASE_URL } from "@/api/apiClient";

type SocketCallback = (...args: any[]) => void;

let socket: Socket | null = null;

const STORAGE_KEYS = {
  accessToken: "accessToken",
  user: "user",
};

const getToken = async () => {
  return AsyncStorage.getItem(STORAGE_KEYS.accessToken);
};

const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => !!socket?.connected;

export const connectSocket = async () => {
  const token = await getToken();

  if (socket?.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_BASE_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    auth: {
      token,
    },
    query: {
      token: token || "",
    },
  });

  socket.on("connect", async () => {
    const user = await getStoredUser();

    if (user?.id) {
      joinUserRoom(user.id);
    }

    if (user?.role === "VENDOR") {
      joinVendorRoom(user.id);
    }

    if (user?.role === "RIDER") {
      joinRiderRoom(user.id);

      if (user?.cityId) {
        joinRiderCity(user.cityId);
      }
    }

    if (user?.role === "ADMIN") {
      joinAdminRoom();
    }
  });

  socket.on("connect_error", error => {
    console.log("Socket connect error:", error.message);
  });

  socket.on("disconnect", reason => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

export const refreshSocketAuth = async () => {
  const token = await getToken();

  if (!socket) {
    return connectSocket();
  }

  socket.auth = {
    ...(socket.auth || {}),
    token,
  };

  socket.io.opts.query = {
    ...(socket.io.opts.query || {}),
    token: token || "",
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const emitSocket = (event: string, payload?: any) => {
  if (!socket) return;
  socket.emit(event, payload);
};

export const onSocket = (event: string, callback: SocketCallback) => {
  if (!socket) return () => {};

  socket.on(event, callback);

  return () => {
    socket?.off(event, callback);
  };
};

export const offSocket = (event: string, callback?: SocketCallback) => {
  if (!socket) return;

  if (callback) {
    socket.off(event, callback);
  } else {
    socket.off(event);
  }
};

/* =========================
   USER ROOM
========================= */

export const joinUserRoom = (userId: string) => {
  if (!socket || !userId) return;
  socket.emit("joinUserRoom", userId);
  socket.emit("join-user-room", userId);
};

export const leaveUserRoom = (userId: string) => {
  if (!socket || !userId) return;
  socket.emit("leaveUserRoom", userId);
  socket.emit("leave-user-room", userId);
};

/* =========================
   ORDER ROOM
========================= */

export const joinOrderRoom = (orderId: string) => {
  if (!socket || !orderId) return;
  socket.emit("joinOrderRoom", orderId);
  socket.emit("join-order-room", orderId);
};

export const leaveOrderRoom = (orderId: string) => {
  if (!socket || !orderId) return;
  socket.emit("leaveOrderRoom", orderId);
  socket.emit("leave-order-room", orderId);
};

/* =========================
   VENDOR ROOM
========================= */

export const joinVendorRoom = (vendorId: string) => {
  if (!socket || !vendorId) return;
  socket.emit("joinVendorRoom", vendorId);
  socket.emit("join-vendor-room", vendorId);
};

export const leaveVendorRoom = (vendorId: string) => {
  if (!socket || !vendorId) return;
  socket.emit("leaveVendorRoom", vendorId);
  socket.emit("leave-vendor-room", vendorId);
};

export const vendorOnline = (vendorId?: string) => {
  if (!socket) return;
  socket.emit("vendor-online", vendorId ? { vendorId } : {});
};

export const vendorOffline = (vendorId?: string) => {
  if (!socket) return;
  socket.emit("vendor-offline", vendorId ? { vendorId } : {});
};

export const requestVendorDashboardRefresh = (vendorId?: string) => {
  if (!socket) return;
  socket.emit("vendor-dashboard-refresh-request", vendorId ? { vendorId } : {});
};

/* =========================
   RIDER ROOM
========================= */

export const joinRiderRoom = (riderId: string) => {
  if (!socket || !riderId) return;
  socket.emit("joinRiderRoom", riderId);
  socket.emit("join-rider-room", riderId);
};

export const leaveRiderRoom = (riderId: string) => {
  if (!socket || !riderId) return;
  socket.emit("leaveRiderRoom", riderId);
  socket.emit("leave-rider-room", riderId);
};

export const joinRiderCity = (cityId: string) => {
  if (!socket || !cityId) return;
  socket.emit("joinRiderCity", cityId);
  socket.emit("join-rider-city", cityId);
};

export const leaveRiderCity = (cityId: string) => {
  if (!socket || !cityId) return;
  socket.emit("leaveRiderCity", cityId);
  socket.emit("leave-rider-city", cityId);
};

export const riderOnline = (payload?: { riderId?: string; cityId?: string }) => {
  if (!socket) return;
  socket.emit("rider-online", payload || {});
};

export const riderOffline = (payload?: { riderId?: string; cityId?: string }) => {
  if (!socket) return;
  socket.emit("rider-offline", payload || {});
};

export const sendRiderLocation = (payload: {
  orderId: string;
  latitude: number;
  longitude: number;
  riderId?: string;
  userId?: string;
  vendorId?: string;
}) => {
  if (!socket || !payload?.orderId) return;

  socket.emit("rider-location", {
    ...payload,
    location: {
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
  });
};

/* =========================
   ADMIN ROOM
========================= */

export const joinAdminRoom = () => {
  if (!socket) return;
  socket.emit("joinAdminRoom");
  socket.emit("join-admin-room");
};

export const leaveAdminRoom = () => {
  if (!socket) return;
  socket.emit("leaveAdminRoom");
  socket.emit("leave-admin-room");
};

/* =========================
   ORDER EVENTS LISTENERS
========================= */

export const onOrderUpdated = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("order-updated", callback),
    onSocket("orderStatusUpdated", callback),
    onSocket("ORDER_STATUS_UPDATED", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onNewOrder = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("NEW_ORDER", callback),
    onSocket("vendor:newOrder", callback),
    onSocket("new-order", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onNewRiderOrder = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("NEW_RIDER_ORDER", callback),
    onSocket("new-rider-order", callback),
    onSocket("new-order-assignment", callback),
    onSocket("rider:newOrder", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onRiderLocationUpdated = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("rider-location-updated", callback),
    onSocket("RIDER_LOCATION_UPDATED", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onVendorDashboardRefresh = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("VENDOR_DASHBOARD_REFRESH", callback),
    onSocket("vendor:dashboardRefresh", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onRiderAssigned = (callback: SocketCallback) => {
  const cleanups = [
    onSocket("RIDER_ASSIGNED", callback),
    onSocket("vendor:riderAssigned", callback),
    onSocket("ORDER_ACCEPTED_BY_RIDER", callback),
  ];

  return () => cleanups.forEach(cleanup => cleanup());
};

export const onGlobalAnnouncement = (callback: SocketCallback) => {
  return onSocket("GLOBAL_ANNOUNCEMENT", callback);
};

/* =========================
   RIDER ACTION EVENTS
========================= */

export const riderPopupOpened = (payload: { orderId: string; riderId?: string }) => {
  if (!socket || !payload?.orderId) return;
  socket.emit("rider-order-popup-opened", payload);
};

export const riderPopupTimeout = (payload: { orderId: string; riderId?: string }) => {
  if (!socket || !payload?.orderId) return;
  socket.emit("rider-order-popup-timeout", payload);
};

export const riderAcceptedOrder = (payload: {
  orderId: string;
  riderId?: string;
  vendorId?: string;
  userId?: string;
}) => {
  if (!socket || !payload?.orderId) return;
  socket.emit("rider-accepted-order", payload);
};

export const riderRejectedOrder = (payload: {
  orderId: string;
  riderId?: string;
  vendorId?: string;
}) => {
  if (!socket || !payload?.orderId) return;
  socket.emit("rider-rejected-order", payload);
};

export default {
  getSocket,
  isSocketConnected,
  connectSocket,
  disconnectSocket,
  refreshSocketAuth,

  emitSocket,
  onSocket,
  offSocket,

  joinUserRoom,
  leaveUserRoom,

  joinOrderRoom,
  leaveOrderRoom,

  joinVendorRoom,
  leaveVendorRoom,
  vendorOnline,
  vendorOffline,
  requestVendorDashboardRefresh,

  joinRiderRoom,
  leaveRiderRoom,
  joinRiderCity,
  leaveRiderCity,
  riderOnline,
  riderOffline,
  sendRiderLocation,

  joinAdminRoom,
  leaveAdminRoom,

  onOrderUpdated,
  onNewOrder,
  onNewRiderOrder,
  onRiderLocationUpdated,
  onVendorDashboardRefresh,
  onRiderAssigned,
  onGlobalAnnouncement,

  riderPopupOpened,
  riderPopupTimeout,
  riderAcceptedOrder,
  riderRejectedOrder,
};