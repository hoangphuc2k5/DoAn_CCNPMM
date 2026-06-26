const net = require("net");
const tls = require("tls");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true") === "true";

const isEnabled = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);

const encodeBase64 = (value = "") => Buffer.from(value).toString("base64");

const readResponse = (socket) =>
  new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const text = chunk.toString();
      if (/^\d{3}[\s-]/m.test(text)) {
        cleanup();
        resolve(text);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });

const sendLine = async (socket, line) => {
  socket.write(`${line}\r\n`);
  return readResponse(socket);
};

const createSocket = () =>
  new Promise((resolve, reject) => {
    const socket = SMTP_SECURE
      ? tls.connect(SMTP_PORT, SMTP_HOST, { servername: SMTP_HOST }, () => resolve(socket))
      : net.connect(SMTP_PORT, SMTP_HOST, () => resolve(socket));
    socket.setTimeout(12000);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP timeout")));
  });

const sendEmail = async ({ to, subject, text }) => {
  if (!isEnabled() || !to) return { skipped: true };

  let socket;
  try {
    socket = await createSocket();
    await readResponse(socket);
    await sendLine(socket, `EHLO ${SMTP_HOST}`);
    await sendLine(socket, "AUTH LOGIN");
    await sendLine(socket, encodeBase64(SMTP_USER));
    await sendLine(socket, encodeBase64(SMTP_PASS));
    await sendLine(socket, `MAIL FROM:<${SMTP_FROM}>`);
    await sendLine(socket, `RCPT TO:<${to}>`);
    await sendLine(socket, "DATA");

    const message = [
      `From: ${SMTP_FROM}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      text,
      ".",
    ].join("\r\n");

    await sendLine(socket, message);
    await sendLine(socket, "QUIT");
    return { sent: true };
  } catch (error) {
    console.error("Email notification failed:", error.message);
    return { error: error.message };
  } finally {
    socket?.end();
  }
};

module.exports = {
  sendEmail,
};
