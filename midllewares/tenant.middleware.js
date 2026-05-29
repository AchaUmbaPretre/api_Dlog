const db = require('../config/database');

const tenantFilter = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    req.tenantId = null;
    req.isSuperAdmin = false;
    return next();
  }
  
  const tenantId = user.tenant_id;
  const isSuperAdmin = user.is_super_admin === 1;
  
  req.tenantId = tenantId;
  req.isSuperAdmin = isSuperAdmin;
  
  next();
};

module.exports = { tenantFilter };