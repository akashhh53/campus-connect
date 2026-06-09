// middleware/moduleAccess.js

// /**
//  * Middleware to check if user has access to a specific module
//  * @param {string} moduleName - Name of the module (e.g., 'feed', 'lostFound', 'marketplace')
//  * @returns {Function} Express middleware
//  */
const requireModule = (moduleName) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      // Get allowed modules from user's role
      const allowedModules = user.role?.allowedModules || {};
      
      // Check if user has access to this module
      if (!allowedModules[moduleName]) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. ${moduleName} module is not available for your role.` 
        });
      }

      next();
    } catch (error) {
      console.error("Module Access Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify module access" 
      });
    }
  };
};

/**
 * Get all allowed modules for current user
 */
const getAllowedModules = async (req, res) => {
  try {
    const user = req.user;
    const allowedModules = user.role?.allowedModules || {};
    
    const enabledModules = Object.entries(allowedModules)
      .filter(([module, isEnabled]) => isEnabled === true)
      .map(([module]) => module);
    
    res.json({
      success: true,
      role: user.role?.name,
      modules: allowedModules,
      enabledModules: enabledModules
    });
    
  } catch (error) {
    console.error("Get Modules Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch modules" 
    });
  }
};

module.exports = { requireModule, getAllowedModules };