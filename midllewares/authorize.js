//authorize.js
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
        scope_terminals: decoded.scope_terminals || [],
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

exports.isSuperAdmin = (req, res, next) => {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    
    const query = 'SELECT is_super_admin, role FROM utilisateur WHERE id_utilisateur = ?';
    db.query(query, [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }
        
        if (results[0].is_super_admin !== 1 && results[0].role !== 'SuperAdmin') {
            return res.status(403).json({ success: false, message: 'Super Admin requis' });
        }
        
        next();
    });
};

// Vérifier si l'utilisateur peut gérer un autre utilisateur
exports.canManageUser = (req, res, next) => {
    const managerId = req.user?.id || req.body.managerId;
    const targetUserId = req.params.userId || req.body.userId;
    
    if (!managerId || !targetUserId) {
        return res.status(400).json({ success: false, message: 'IDs manquants' });
    }
    
    // Vérifier la hiérarchie
    const query = `
        WITH RECURSIVE hierarchy AS (
            SELECT id_utilisateur, created_by, niveau, is_super_admin
            FROM utilisateur 
            WHERE id_utilisateur = ?
            UNION ALL
            SELECT u.id_utilisateur, u.created_by, u.niveau, u.is_super_admin
            FROM utilisateur u
            INNER JOIN hierarchy h ON u.id_utilisateur = h.created_by
        )
        SELECT * FROM hierarchy WHERE id_utilisateur = ?
    `;
    
    db.query(query, [managerId, targetUserId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous ne pouvez pas gérer cet utilisateur' 
            });
        }
        next();
    });
};
