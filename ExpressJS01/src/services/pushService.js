const PushSubscription = require("../models/pushSubscription");

let webpush = null;
try {
  webpush = require("web-push");
} catch (error) {
  webpush = null;
}

const hasWebPushConfig = () =>
  Boolean(webpush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

const getPublicKey = () => ({
  EC: 0,
  data: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    enabled: hasWebPushConfig(),
  },
});

const configureWebPush = () => {
  if (!hasWebPushConfig()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
};

const saveSubscription = async (userId, subscription, userAgent = "") => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { EC: 1, EM: "Push subscription không hợp lệ" };
  }

  const data = await PushSubscription.findOneAndUpdate(
    { user: userId, endpoint: subscription.endpoint },
    {
      user: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { EC: 0, EM: "Đã bật push notification", data };
};

const removeSubscription = async (userId, endpoint) => {
  await PushSubscription.deleteOne({ user: userId, endpoint });
  return { EC: 0, EM: "Đã tắt push notification" };
};

const sendPushToUser = async (userId, payload) => {
  if (!configureWebPush()) return { skipped: true };

  const subscriptions = await PushSubscription.find({ user: userId });
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await subscription.deleteOne();
        } else {
          console.error("Web push failed:", error.message);
        }
      }
    }),
  );

  return { sent: true };
};

module.exports = {
  getPublicKey,
  removeSubscription,
  saveSubscription,
  sendPushToUser,
};
