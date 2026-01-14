const jwt = require('jsonwebtoken');

/**
 * Vérifie la permission et applique les filtres ABAC (sites + départements)
 * @param {string} permission - permission RBAC requise pour la route
 */
exports.authorize = (permission) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT);

      // 1️⃣ Vérification de la permission RBAC
      if (!decoded.permissions.includes(permission)) {
        return res.status(403).json({ message: 'Permission refusée' });
      }

      // 2️⃣ Préparer filtres ABAC
      req.abac = {
        scope_sites: decoded.scope_sites || [],
        scope_departments: decoded.scope_departments || [],
        user_id: decoded.id
      };

      next();
    } catch (err) {
      console.error('authorize middleware error:', err);
      return res.status(401).json({ message: 'Token invalide' });
    }
  };
};
