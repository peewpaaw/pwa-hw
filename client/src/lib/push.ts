export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isIos() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isStandalone() {
  // iOS Safari adds navigator.standalone; others use matchMedia
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (navigator as any).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
}

