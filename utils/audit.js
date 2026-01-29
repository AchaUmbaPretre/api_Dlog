const { db } = require("./../config/database");
const util = require("util");
const query = util.promisify(db.query).bind(db);

const auditPresence = async ({
  user_id = null,
  action,
  entity,
  entity_id = null,
  old_value = null,
  new_value = null,
  ip_address = null
}) => {
  await query(
    `INSERT INTO audit_logs_presence
     (user_id, action, entity, entity_id, old_value, new_value, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      action,
      entity,
      entity_id,
      old_value ? JSON.stringify(old_value) : null,
      new_value ? JSON.stringify(new_value) : null,
      ip_address
    ]
  );
};

module.exports = { auditPresence };