



const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.user.role.name !== "admin") {
      return res.status(403).json({
        message: "Admin access only"
      });
    }

    next();
  } catch (err) {
    return res.status(403).json({
      message: "Forbidden",
      error: err.message
    });
  }
};

module.exports = adminMiddleware;
