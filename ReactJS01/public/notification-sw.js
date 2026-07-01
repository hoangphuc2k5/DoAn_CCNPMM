self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "Tegram notification", body: event.data?.text() || "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Tegram notification", {
      body: payload.body || "",
      icon: payload.icon || "/vite.svg",
      data: {
        url: payload.url || "/",
        notificationId: payload.notificationId || "",
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);
      if (existingClient) {
        existingClient.navigate(url);
        return existingClient.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
