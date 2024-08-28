const { db } = require('./../config/database');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

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
  
        const insertQuery = 'INSERT INTO utilisaeur (username, email, mot_de_passe, telephone, role) VALUES (?, ?, ?, ?, ?)';
        const insertValues = [username, email, hashedPassword,telephone, role];
  
        db.query(insertQuery, insertValues, (err, insertResult) => {
          if (err) {
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
  
        const passwordMatch = await bcrypt.compare(password, user.password);
  
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
  
  exports.updateUser = async (req, res) => {
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
  };