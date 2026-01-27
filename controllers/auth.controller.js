const { db } = require('./../config/database');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const util = require("util");
const { getCookie } = require('../utils/getCookie');
const query = util.promisify(db.query).bind(db);

dotenv.config();

exports.registerController = async (req, res) => {
    const { username, email, password, role, telephone } = req.body;
  
    try {
      const query = 'SELECT * FROM utilisateur WHERE email = ?';
      const values = [email];
  
      db.query(query, values, async (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
  
        if (results.length > 0) {
          return res.status(200).json({ message: 'Utilisateur existe déjà', success: false });
        }
  
        const defaultPassword = password || '1234';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
        const insertQuery = 'INSERT INTO utilisateur (nom,	email, mot_de_passe, role) VALUES (?, ?, ?, ?)';
        const insertValues = [username, email, hashedPassword,role];
  
        db.query(insertQuery, insertValues, (err, insertResult) => {
          if (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
          }
  
          res.status(201).json({ message: 'Enregistré avec succès', success: true });
        });
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Erreur dans le contrôleur de registre : ${err.message}`,
      });
    }
};
  
/* exports.loginController = async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const query = 'SELECT * FROM utilisateur WHERE email = ?';
      const values = [username];
  
      db.query(query, values, async (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
  
        const user = results[0];
  
        if (!user) {
          return res.status(200).json({ message: 'Utilisateur non trouvé', success: false });
        }
  
        const passwordMatch = await bcrypt.compare(password, user.mot_de_passe);
  
        if (!passwordMatch) {
          return res.status(200).json({ message: 'Email ou mot de passe invalide', success: false });
        }
  
        const accessToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT,
          { expiresIn: '3d' }
        );
  
        const { password: userPassword, ...userWithoutPassword } = user;
  
        res.status(200).json({
          message: 'Connexion réussie',
          success: true,
          ...userWithoutPassword,
          accessToken,
        });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }; */
  
exports.loginController = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

  try {
    // 1️⃣ Récupérer l’utilisateur
    const users = await query('SELECT * FROM utilisateur WHERE email = ? LIMIT 1', [username]);
    if (!users.length)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe invalide' });

    const user = users[0];

    // 2️⃣ Vérifier mot de passe
    const passwordMatch = await bcrypt.compare(password, user.mot_de_passe);
    if (!passwordMatch)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe invalide' });

    // 3️⃣ Permissions RBAC
    const rolePerms = await query('SELECT permission FROM roles_permissions WHERE role = ?', [user.role]);
    const permissions = rolePerms.map(rp => rp.permission);

    // 4️⃣ Scopes sites
    const userSites = await query('SELECT site_id FROM user_sites WHERE user_id = ?', [user.id_utilisateur]);
    const scope_sites = userSites.map(s => s.site_id);

    // 5️⃣ Scopes départements
    const userDepartments = await query(
      'SELECT id_departement FROM user_departements WHERE id_user = ? AND can_view = 1',
      [user.id_utilisateur]
    );
    const scope_departments = userDepartments.map(d => d.id_departement);

    const userTerminals = await query(
      'SELECT terminal_id FROM user_terminals WHERE user_id = ?',
      [user.id_utilisateur]
    );
    const scope_terminals = userTerminals.map(t => t.terminal_id);

    await query('DELETE FROM refresh_tokens WHERE user_id = ?', [
      user.id_utilisateur
    ]);
    

    // 6️⃣ JWT access token
    const payload = { id: user.id_utilisateur, role: user.role, permissions, scope_sites, scope_departments, scope_terminals };
    const accessToken = jwt.sign(payload, process.env.JWT, { expiresIn: '15m' });

    // 7️⃣ Refresh token sécurisé avec bcryptjs
    const plainRefreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(plainRefreshToken, 10);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [user.id_utilisateur, hashedRefreshToken]
    );

    // 8️⃣ Envoyer le refresh token en cookie HttpOnly
    res.setHeader(
      'Set-Cookie',
      `refreshToken=${plainRefreshToken}; HttpOnly; Path=/; Max-Age=${
        7 * 24 * 60 * 60
      }; SameSite=Lax`
    );

    const { mot_de_passe, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      ...userWithoutPassword,
      permissions,
      scope_sites,
      scope_departments,
      scope_terminals,
      accessToken
    });

  } catch (err) {
    console.error('loginController error', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

exports.refreshTokenController = async (req, res) => {
  try {
    // 🔹 Récupérer le refreshToken depuis le cookie (sans cookie-parser)
    const tokenFromCookie = getCookie(req, 'refreshToken');
    if (!tokenFromCookie) return res.status(401).json({ message: 'Refresh token manquant' });

    // 🔹 Chercher le token actif dans la base
    const rows = await query('SELECT * FROM refresh_tokens WHERE expires_at > NOW()');

    let matchedToken = null;
    for (const row of rows) {
      if (await bcrypt.compare(tokenFromCookie, row.token)) {
        matchedToken = row;
        break;
      }
    }

    if (!matchedToken) return res.status(403).json({ message: 'Refresh token invalide ou expiré' });

    // 🔹 Récupérer l'utilisateur
    const users = await query('SELECT * FROM utilisateur WHERE id_utilisateur = ?', [matchedToken.user_id]);
    if (!users.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const user = users[0];

    // 🔹 Permissions et scopes
    const rolePerms = await query('SELECT permission FROM roles_permissions WHERE role = ?', [user.role]);
    const permissions = rolePerms.map(rp => rp.permission);

    const userSites = await query('SELECT site_id FROM user_sites WHERE user_id = ?', [user.id_utilisateur]);
    const scope_sites = userSites.map(s => s.site_id);

    const userDepartments = await query(
      'SELECT id_departement FROM user_departements WHERE id_user = ? AND can_view = 1',
      [user.id_utilisateur]
    );
    const scope_departments = userDepartments.map(d => d.id_departement);

    const userTerminals = await query('SELECT terminal_id FROM user_terminals WHERE user_id = ?', [user.id_utilisateur]);
    const scope_terminals = userTerminals.map(t => t.terminal_id);

    const payload = {
      id: user.id_utilisateur,
      role: user.role,
      permissions,
      scope_sites,
      scope_departments,
      scope_terminals
    };
    const accessToken = jwt.sign(payload, process.env.JWT, { expiresIn: '15m' });

    // 🔹 Retirer le mot de passe côté client
    const { mot_de_passe, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      ...userWithoutPassword,
      permissions,
      scope_sites,
      scope_departments,
      scope_terminals,
      accessToken
    });

  } catch (err) {
    console.error('refreshTokenController error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = getCookie(req, 'refreshToken');

    if (!refreshToken) {
      // 🔹 Pas de cookie => succès
      return res.status(200).json({ message: "Déconnexion réussie" });
    }

    // 🔹 Supprimer le refresh token correspondant dans la base
    const rows = await query('SELECT * FROM refresh_tokens');
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token)) {
        await query('DELETE FROM refresh_tokens WHERE id = ?', [row.id]);
        break;
      }
    }

    // 🔹 Supprimer le cookie côté client
    res.setHeader(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax'
    );

    return res.status(200).json({ message: "Déconnexion réussie" });

  } catch (err) {
    console.error('logoutController error', err);
    return res.status(500).json({ message: 'Erreur serveur lors de la déconnexion' });
  }
};

/* exports.logout = (req, res) => {
    res.clearCookie('access_token', {
      sameSite: 'None',
      secure: true,
    });
  
    res.status(200).json({ message: 'Utilisateur déconnecté avec succès' });
  }; */

// Créer le transporteur avec les informations SMTP
const transporter = nodemailer.createTransport({
  host: 'mail.loginsmart-cd.com', // Serveur sortant
  port: 465, // Port SMTP pour SSL
  secure: true, // Utiliser SSL
  auth: {
    user: 'contact@loginsmart-cd.com', // Votre adresse email
    pass: '824562776Acha', // Mot de passe du compte de messagerie
  },
});

// Fonction pour envoyer l'email
const sendEmail = async (options) => {
  const mailOptions = {
    from: '"Dlog" <contact@loginsmart-cd.com>', // Nom et adresse de l'expéditeur
    to: options.email, // Adresse email du destinataire
    subject: options.subject, // Sujet de l'email
    text: options.message, // Message en texte brut
    // html: options.htmlMessage, // Message en HTML si nécessaire
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error.message);
  }
};

// Fonction pour gérer la demande de réinitialisation de mot de passe
exports.detailForgot = (req, res) => {
  const { email } = req.query;

  const q = `SELECT utilisateur.nom, utilisateur.id_utilisateur, utilisateur.email FROM utilisateur WHERE email = ?`;

  db.query(q, [email], (error, data) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: "L'utilisateur n'existe pas" });
    }

    const user = data[0];

    // Générer un jeton JWT pour la réinitialisation (expirant en 10 minutes)
    const resetToken = jwt.sign({ id: user.id_utilisateur }, process.env.JWT, {
      expiresIn: '30m',
    });

    // URL de réinitialisation
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${user.id_utilisateur}`;
    const message = `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetUrl}`;

    // Envoyer l'email avec Nodemailer
    sendEmail({
      email: user.email,
      subject: 'Réinitialisation de mot de passe',
      message,
    });

    res.status(200).json({ message: 'Email envoyé avec succès.' });
  });
};
  
exports.updateUser = async (req, res) => {
    const {id} = req.query;
    const { password } = req.body;
  
    if (!id || !password) {
        return res.status(400).json({ error: "L'identifiant et le mot de passe sont requis" });
    }
  
    try {
  
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
  
        const q = `UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?`;
  
        db.query(q, [hashedPassword, id], (error, data) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            if (data.affectedRows === 0) {
                return res.status(404).json({ error: "Utilisateur non trouvé" });
            }
            res.status(200).json({ message: "Mot de passe mis à jour avec succès" });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  };