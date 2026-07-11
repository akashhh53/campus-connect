import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const PHONE_NOTIFICATIONS_KEY = "cc-phone-notifications-enabled";
const CHANNEL_ID = "campus-connect-updates";

const canUseBrowserNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

const getStoredEnabled = () =>
  localStorage.getItem(PHONE_NOTIFICATIONS_KEY) === "true";

const setStoredEnabled = (enabled) => {
  localStorage.setItem(PHONE_NOTIFICATIONS_KEY, String(Boolean(enabled)));
};

const getNotificationId = () => Number(String(Date.now()).slice(-9));

const ensureNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Campus Connect",
    description: "Chat and campus activity alerts",
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  });
};

export const arePhoneNotificationsEnabled = () => getStoredEnabled();

export const getPhoneNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    const permission = await LocalNotifications.checkPermissions();
    return permission.display;
  }

  if (canUseBrowserNotifications()) {
    return Notification.permission;
  }

  return "unsupported";
};

export const requestPhoneNotifications = async () => {
  let permission = await getPhoneNotificationPermission();

  if (Capacitor.isNativePlatform() && permission !== "granted") {
    const result = await LocalNotifications.requestPermissions();
    permission = result.display;
  } else if (canUseBrowserNotifications() && permission === "default") {
    permission = await Notification.requestPermission();
  }

  const enabled = permission === "granted";

  if (enabled) {
    await ensureNotificationChannel();
  }

  setStoredEnabled(enabled);
  return { enabled, permission };
};

export const disablePhoneNotifications = () => {
  setStoredEnabled(false);
};

export const syncPhoneNotificationState = async () => {
  if (!getStoredEnabled()) {
    return { enabled: false, permission: "default" };
  }

  const permission = await getPhoneNotificationPermission();
  const enabled = permission === "granted";
  setStoredEnabled(enabled);

  if (enabled) {
    await ensureNotificationChannel();
  }

  return { enabled, permission };
};

export const showPhoneNotification = async (
  { title = "Campus Connect", body = "You have a new update.", data = {} },
  { onlyWhenHidden = true } = {},
) => {
  if (!getStoredEnabled()) return false;

  if (
    onlyWhenHidden &&
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  ) {
    return false;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.checkPermissions();

      if (permission.display !== "granted") {
        setStoredEnabled(false);
        return false;
      }

      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: getNotificationId(),
            title,
            body,
            channelId: CHANNEL_ID,
            extra: data,
          },
        ],
      });

      return true;
    }

    if (canUseBrowserNotifications() && Notification.permission === "granted") {
      new Notification(title, { body, data });
      return true;
    }
  } catch (error) {
    console.log(error);
  }

  return false;
};
