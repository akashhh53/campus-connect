const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const sendMail = async (to, subject, html) => {
  return transporter.sendMail({
    from: `"CampusConnect" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendMail;
