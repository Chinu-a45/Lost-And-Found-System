self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "New Notification";
      const options = {
        body: data.message || "You have a new update.",
        data: {
          url: data.url || "/",
        },
      };
          url: data.url || "/",
        },
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error("Error parsing push payload", err);
      event.waitUntil(
        self.registration.showNotification("New Notification", {
          body: event.data.text(),
        })
      );
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (windowClients) {
        let matchingClient = null;

        for (let i = 0; i < windowClients.length; i++) {
          const windowClient = windowClients[i];
          if (windowClient.url.includes(urlToOpen)) {
            matchingClient = windowClient;
            break;
          }
        }

        if (matchingClient) {
          return matchingClient.focus();
        } else {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
