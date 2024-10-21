const { db } = require('./../config/database');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

dotenv.config();

exports.registerController = async (req, res) => {
    const { username, email, password, role, telephone } = req.body;
    console.log(req.body)
  
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
  
exports.loginController = async (req, res) => {
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
  };
  
exports.logout = (req, res) => {
    res.clearCookie('access_token', {
      sameSite: 'None',
      secure: true,
    });
  
    res.status(200).json({ message: 'Utilisateur déconnecté avec succès' });
  };

exports.detailForgot = (req, res) => {
    const { email } = req.query;
    const q = `SELECT users.username, users.id, users.email FROM users WHERE email = ?`
  
    db.query(q,[email], (error, data) => {
      if(error) {
        return res.status(500).json({ error: error.message });
      }
      res.status(200).json(data);
    });
  };
  
/* exports.updateUser = async (req, res) => {
    const id = req.params.id
    const { password } = req.query;
  
    if (!id || !password) {
        return res.status(400).json({ error: "ID and password are required" });
    }
  
    try {
  
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
  
        const q = `UPDATE users SET password = ? WHERE id = ?`;
  
        db.query(q, [hashedPassword, id], (error, data) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            if (data.affectedRows === 0) {
                return res.status(404).json({ error: "User not found" });
            }
            res.status(200).json({ message: "Password updated successfully" });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  }; */

exports.updateUser = async (req, res) => {
    const { token } = req.params; // Récupérer le jeton de l'URL
    const { password } = req.body; // Récupérer le nouveau mot de passe de la requête

    if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
    }

    try {
        // Vérifier le jeton JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const id = decoded.id; // Récupérer l'ID utilisateur à partir du jeton

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const q = `UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?`;
        db.query(q, [hashedPassword, id], (error, data) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            if (data.affectedRows === 0) {
                return res.status(404).json({ error: "User not found" });
            }
            res.status(200).json({ message: "Password updated successfully" });
        });
    } catch (error) {
        res.status(500).json({ error: "Invalid token or token expired." });
    }
};


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
      expiresIn: '10m',
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
