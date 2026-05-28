// middlewares/tenant.middleware.js
const db = require('../config/database');

const tenantFilter = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    req.tenantId = null;
    req.isSuperAdmin = false;
    return next();
  }
  
  // 🔥 Maintenant on utilise directement les valeurs du token
  const tenantId = user.tenant_id;
  const isSuperAdmin = user.is_super_admin === 1;
  
  console.log('🔧 tenantFilter - user:', {
    id: user.id,
    role: user.role,
    is_super_admin: user.is_super_admin,
    tenant_id: user.tenant_id
  });
  console.log('✅ tenantId final:', tenantId);
  console.log('✅ isSuperAdmin:', isSuperAdmin);
  
  req.tenantId = tenantId;
  req.isSuperAdmin = isSuperAdmin;
  
  next();
};

module.exports = { tenantFilter };