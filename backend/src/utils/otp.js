const bcrypt = require('bcrypt');

const generateOTP = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  return { code, hash, expiresAt };
};

module.exports = generateOTP;
