const { db } = require('./../config/database');
const util = require("util");
const query = util.promisify(db.query).bind(db);

const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
    console.error(`❌ Token invalide: ${expoPushToken}`);
    return false;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    badge: 1,
    priority: 'high',
  };

  console.log(message)

  try {
    const response = await fetch(EXPO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log(`✅ Notification envoyée à ${expoPushToken}`);
      return true;
    } else {
      console.error(`❌ Erreur Expo:`, result);
      
      // Si le token est invalide, le désactiver
      if (result.data && result.data.details && result.data.details.error === 'DeviceNotRegistered') {
        await query(
          `UPDATE push_tokens SET is_active = 0 WHERE token = ?`,
          [expoPushToken]
        );
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur envoi notification:`, error);
    return false;
  }
}

/**
 * Envoie des notifications en lot (plus efficace)
 */
async function sendMultiplePushNotifications(messages) {
  const validMessages = messages.filter(msg => 
    msg.to && msg.to.startsWith('ExponentPushToken')
  );

  if (validMessages.length === 0) return [];

  try {
    const response = await fetch(EXPO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validMessages),
    });

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error(`❌ Erreur envoi lot:`, error);
    return [];
  }
}

// Enregistrer un token
exports.postNotifications = async (req, res) => {
    const { token, platform, device_name } = req.body;
    const { user_id : userId } = req.abac || {};
    
    if (!token) {
        return res.status(400).json({ success: false, message: 'Token requis' });
    }

    try {
        // Vérifier si le token existe déjà
        const existing = await query(
            `SELECT id FROM push_tokens WHERE token = ?`,
            [token]
        );

        if (existing.length) {
            await query(
                `UPDATE push_tokens SET is_active = 1, updated_at = NOW() WHERE token = ?`,
                [token]
            );
        } else {
            await query(
                `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active)
                 VALUES (?, ?, ?, ?, 1)`,
                [userId, token, platform, device_name]
            );
        }
        
        res.json({ success: true, message: 'Token enregistré' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// Désactiver un token
exports.DesactiveToken = async (req, res) => {
    const { token } = req.body;
    
    try {
        await query(`UPDATE push_tokens SET is_active = 0 WHERE token = ?`, [token]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false });
    }
};

// Envoyer une notification à un utilisateur spécifique
exports.sendToUser = async (req, res) => {
    const { user_id, title, body, data } = req.body;

    try {
        const tokens = await query(
            `SELECT token FROM push_tokens WHERE user_id = ? AND is_active = 1`,
            [user_id]
        );

        const results = [];
        for (const token of tokens) {
            const success = await sendPushNotification(token.token, title, body, data);
            results.push({ token: token.token, success });
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// Envoyer une notification à plusieurs utilisateurs
exports.sendToMany = async (req, res) => {
    const { userIds, title, body, data } = req.body;

    try {
        let queryStr = `SELECT token FROM push_tokens WHERE is_active = 1`;
        const params = [];

        if (userIds && userIds.length) {
            queryStr += ` AND user_id IN (${userIds.map(() => '?').join(',')})`;
            params.push(...userIds);
        }

        const tokens = await query(queryStr, params);

        const messages = tokens.map(token => ({
            to: token.token,
            sound: 'default',
            title: title,
            body: body,
            data: data,
            badge: 1,
            priority: 'high',
        }));

        const results = await sendMultiplePushNotifications(messages);

        res.json({ success: true, results });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false });
    }
};

// Envoyer une notification à tous les utilisateurs
exports.sendToAll = async (req, res) => {
    const { title, body, data, role } = req.body;

    try {
        let queryStr = `SELECT token FROM push_tokens WHERE is_active = 1`;
        const params = [];

        if (role) {
            queryStr += ` AND user_id IN (SELECT id_utilisateur FROM utilisateur WHERE role = ?)`;
            params.push(role);
        }

        const tokens = await query(queryStr, params);

        const messages = tokens.map(token => ({
            to: token.token,
            sound: 'default',
            title: title,
            body: body,
            data: data,
            badge: 1,
            priority: 'high',
        }));

        const results = await sendMultiplePushNotifications(messages);

        res.json({ success: true, sent: results.length, results });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false });
    }
};

// Notification de pointage réussi
exports.notifyPointageSuccess = async (userId, type, siteName, time, isLate, lateMinutes) => {
    const title = type === 'ENTREE' ? '✅ Arrivée pointée' : '✅ Départ pointé';
    let body = `Votre ${type === 'ENTREE' ? 'arrivée' : 'départ'} à ${siteName} a été enregistré à ${time}`;
    
    if (isLate && lateMinutes) {
        body += ` (${lateMinutes} min de retard)`;
    }

    const tokens = await query(
        `SELECT token FROM push_tokens WHERE user_id = ? AND is_active = 1`,
        [userId]
    );

    for (const token of tokens) {
        await sendPushNotification(token.token, title, body, {
            type: 'POINTAGE_SUCCESS',
            pointageType: type,
        });
    }
};

// Rappel aux utilisateurs qui n'ont pas pointé
exports.sendAbsenceReminder = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    try {
        const absentUsers = await query(
            `SELECT u.id_utilisateur, u.nom, u.prenom, pt.token
             FROM utilisateur u
             JOIN push_tokens pt ON pt.user_id = u.id_utilisateur
             WHERE u.is_active = 1
             AND NOT EXISTS (
                 SELECT 1 FROM presences p 
                 WHERE p.id_utilisateur = u.id_utilisateur 
                 AND p.date_presence = ?
             )
             AND pt.is_active = 1`,
            [today]
        );

        const messages = absentUsers.map(user => ({
            to: user.token,
            sound: 'default',
            title: '⚠️ Absence détectée',
            body: `${user.prenom} ${user.nom}, vous n'avez pas encore pointé aujourd'hui.`,
            data: { type: 'ABSENCE_REMINDER', userId: user.id_utilisateur },
            badge: 1,
            priority: 'high',
        }));

        const results = await sendMultiplePushNotifications(messages);

        res.json({ success: true, sent: results.length, results });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ success: false });
    }
};