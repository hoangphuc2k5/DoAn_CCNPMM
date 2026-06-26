const getId = (value) => value?._id || value || "";

const buildPostTarget = (item) => {
  const postId = getId(item.post) || item.metadata?.postId;
  if (!postId) return "/";

  const params = new URLSearchParams({ postId });
  const commentId = getId(item.comment) || item.metadata?.commentId;
  if (commentId) params.set("commentId", commentId);
  return `/?${params.toString()}`;
};

const getNotificationTargetUrl = (item) => {
  if (item?.metadata?.targetUrl) return item.metadata.targetUrl;

  if (item?.type === "new_message") {
    const params = new URLSearchParams();
    if (item.metadata?.conversationId) params.set("conversationId", item.metadata.conversationId);
    if (item.metadata?.messageId) params.set("messageId", item.metadata.messageId);
    return params.toString() ? `/chat?${params.toString()}` : "/chat";
  }

  if (item?.post) return buildPostTarget(item);

  if (["follow", "friend_request", "friend_accept"].includes(item?.type)) {
    const actorId = getId(item.actor);
    return actorId ? `/profile/${actorId}` : "/";
  }

  return "/";
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const enableBrowserPush = async ({ getPushPublicKeyApi, subscribePushApi }) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Trình duyệt chưa hỗ trợ push notification");
  }
  if (!("Notification" in window)) {
    throw new Error("Trình duyệt chưa hỗ trợ hiển thị thông báo");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Bạn chưa cấp quyền nhận thông báo");
  }

  const registration = await navigator.serviceWorker.register("/notification-sw.js");
  const keyRes = await getPushPublicKeyApi();
  const vapidKey = keyRes?.data?.publicKey || "";
  if (!vapidKey) {
    return {
      EC: 0,
      EM: "Đã bật thông báo realtime. Cấu hình VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY để nhận push khi đóng tab.",
    };
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  return subscribePushApi(subscription);
};

const showLocalNotification = async (item) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const actorName = item.actor?.name || "Tegram";
  const body = item.metadata?.preview || item.content || "";
  const title = `${actorName} ${item.text || ""}`.trim() || "Tegram notification";
  const url = getNotificationTargetUrl(item);

  const registration = await navigator.serviceWorker?.getRegistration?.();
  if (registration?.showNotification) {
    registration.showNotification(title, {
      body,
      data: { url },
      icon: "/vite.svg",
    });
    return;
  }

  const notification = new Notification(title, { body });
  notification.onclick = () => {
    window.focus();
    window.location.href = url;
  };
};

export {
  enableBrowserPush,
  getNotificationTargetUrl,
  showLocalNotification,
};
