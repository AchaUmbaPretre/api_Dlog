const { db } = require('./../config/database');
const util = require("util");
const query = util.promisify(db.query).bind(db);

exports.postNotifications = async(req, res) => {
    const { token, platform, device_name } = req.body;
    const userId = req.user.id;

    try {
    await query(
      `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1, updated_at = NOW()`,
      [userId, token, platform, device_name]
    );
    
    res.json({ success: true, message: 'Token enregistré' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

exports.DesactiveToken = async (req, res) => {
  const { token } = req.body;
  
  try {
    await query(`UPDATE push_tokens SET is_active = 0 WHERE token = ?`, [token]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
}