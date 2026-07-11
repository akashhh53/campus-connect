const brevo = require("@getbrevo/brevo");

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendMail = async (to, subject, html) => {
  const email = new brevo.SendSmtpEmail();

  email.sender = {
    name: "Campus Connect",
    email: "akashsingh9580811832@gmail.com", // your verified sender email
  };

  email.to = [{ email: to }];

  email.subject = subject;
  email.htmlContent = html;

  try {
    const response = await apiInstance.sendTransacEmail(email);
    return response;
  } catch (err) {
    console.error("Brevo Error:", err.response?.body || err);
    throw err;
  }
};

module.exports = sendMail;