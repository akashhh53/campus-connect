



const globalAdminMiddleware = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.user.role.name !== "globalAdmin") {
      return res.status(403).json({
        message: "globalAdmin access only"
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

module.exports = globalAdminMiddleware;
