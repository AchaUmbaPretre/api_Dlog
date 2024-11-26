const { db } = require("./../config/database");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();


exports.getUserCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_utilisateur) AS nbre_users
        FROM utilisateur
        `;

     
    db.query(q,(error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getUsers = (req, res) => {

    const q = `
    SELECT 
        utilisateur.*
    FROM utilisateur
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getUserOne = (req, res) => {
    const { id_user } = req.query;

    const q = `
        SELECT 
            utilisateur.nom,
            utilisateur.prenom,
            utilisateur.email,
            utilisateur.role,
            utilisateur.mot_de_passe,
            utilisateur.id_ville,
            utilisateur.id_departement
        FROM utilisateur 
            WHERE utilisateur.id_utilisateur = ?
    `;
     
    db.query(q, [id_user], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.registerUser = async (req, res) => {
    const { nom, prenom, email, mot_de_passe, role, id_ville, id_departement  } = req.body;
  
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
  
        const defaultPassword = mot_de_passe || '1234';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
        const insertQuery = 'INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role, id_ville, id_departement ) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const insertValues = [nom, prenom, email, hashedPassword,role, id_ville, id_departement];
  
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

exports.putUser = async (req, res) => {
    const { id } = req.query;
    const { nom, prenom, email } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid userId ID provided' });
    }

    try {
        const q = `
            UPDATE utilisateur
            SET 
                nom = ?,
                prenom = ?,
                email  = ?
            WHERE id_utilisateur = ?
        `;
      
        const values = [nom, prenom, email, id];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'user record not found' });
            }
            return res.json({ message: 'User record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating user :", err);
        return res.status(500).json({ error: 'Failed to update user record' });
    }
}

exports.deleteUser = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM utilisateur WHERE id_utilisateur = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }

exports.putUserOne = async (req, res) => {
    const { id } = req.query;
  
    const q = "UPDATE utilisateur SET `nom` = ?, `email` = ?, `mot_de_passe` = ?, `id_ville` = ?, `id_departement` WHERE id_utilisateur = ?";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash( req.body.mot_de_passe, salt);
    const values = [
      req.body.nom,
      req.body.email,
      hashedPassword,
      req.body.id_ville,
      req.body.id_departement,
      id
    ];
  
    db.query(q, values, (err, data) => {
      if (err) {
        console.error(err);
        console.log(err)
        return res.status(500).json(err);
      }
      return res.json(data);
    });
  };