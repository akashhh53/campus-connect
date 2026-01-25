const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_KEY,
    { expiresIn: '30m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.JWT_KEY,
    { expiresIn: '7d' }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
