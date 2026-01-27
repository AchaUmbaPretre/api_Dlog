const jwt = require('jsonwebtoken');

exports.authorize = (permission) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT);

      // RBAC
      if (!decoded.permissions?.includes(permission)) {
        return res.status(403).json({ message: 'Permission refusée' });
      }

      // ABAC
      req.abac = {
        scope_sites: decoded.scope_sites || [],
        scope_departments: decoded.scope_departments || [],
        user_id: decoded.id,
        role: decoded.role
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token expiré',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        message: 'Token invalide',
        code: 'TOKEN_INVALID'
      });
    }
  };
};
