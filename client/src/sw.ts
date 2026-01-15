/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  // injected by workbox at build time
  __WB_MANIFEST: Array<unknown>;
};

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json();
    } catch {
      return null;
    }
  })();

  const title = data?.title || "Уведомление";
  const body = data?.body || "Есть обновление статуса";
  const url = data?.url || "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url, requestId: data?.requestId },
      tag: data?.requestId ? `request-${data.requestId}` : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = allClients.find((c) => "focus" in c);
      if (client) {
        await client.focus();
        // WindowClient has navigate(), but the type can be broader.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any).navigate?.(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

