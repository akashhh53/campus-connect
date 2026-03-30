



const alumniMiddleware = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.user.role.name !== "alumni") {
      return res.status(403).json({
        message: "Alumni access only"
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

module.exports = alumniMiddleware;
