const nodemailer = require("nodemailer");
const dns = require("dns");

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const mailHost = process.env.MAIL_HOST || "smtp.gmail.com";
const configuredPort = Number(process.env.MAIL_PORT);
const configuredSecure =
  process.env.MAIL_SECURE === undefined
    ? undefined
    : process.env.MAIL_SECURE === "true";

const getMailTransports = () => {
  const transports = [];

  if (configuredPort) {
    transports.push({
      port: configuredPort,
      secure:
        configuredSecure === undefined ? configuredPort === 465 : configuredSecure,
    });
  }

  transports.push({ port: 587, secure: false });
  transports.push({ port: 465, secure: true });

  const seen = new Set();

  return transports.filter((transport) => {
    const key = `${transport.port}:${transport.secure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const createTransporter = ({ port, secure }) =>
  nodemailer.createTransport({
    host: mailHost,
    port,
    secure,
    requireTLS: !secure,
    family: 4,
    connectionTimeout: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS) || 8000,
    greetingTimeout: Number(process.env.MAIL_GREETING_TIMEOUT_MS) || 8000,
    socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT_MS) || 12000,
    tls: {
      servername: mailHost,
    },
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Mail server did not respond in time"));
      }, ms);
    }),
  ]);

const sendMail = async (to, subject, html) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("Mail credentials are not configured");
  }

  const mailTimeoutMs = Number(process.env.MAIL_SEND_TIMEOUT_MS) || 20000;
  const mail = {
    from: `"CampusConnect" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  };

  let lastError;

  for (const transportConfig of getMailTransports()) {
    try {
      const transporter = createTransporter(transportConfig);
      return await withTimeout(transporter.sendMail(mail), mailTimeoutMs);
    } catch (error) {
      lastError = error;
      console.warn(
        `Mail send failed on ${mailHost}:${transportConfig.port}:`,
        error.message,
      );
    }
  }

  throw new Error(lastError?.message || "Unable to send email");
};

module.exports = sendMail;
