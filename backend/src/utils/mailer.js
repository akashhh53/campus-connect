const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  connectionTimeout: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS) || 10000,
  greetingTimeout: Number(process.env.MAIL_GREETING_TIMEOUT_MS) || 10000,
  socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT_MS) || 15000,
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

  return withTimeout(
    transporter.sendMail({
      from: `"CampusConnect" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    }),
    mailTimeoutMs,
  );
};

module.exports = sendMail;
