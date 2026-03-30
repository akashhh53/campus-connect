



const teacherMiddleware = (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.user.role.name !== "teacher") {
      return res.status(403).json({
        message: "teacher access only"
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

module.exports = teacherMiddleware;
