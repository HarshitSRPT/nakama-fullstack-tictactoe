export function getOrCreateDeviceId() {
  try {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  } catch (err) {
    console.warn("localStorage restricted, using transient ID");
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
