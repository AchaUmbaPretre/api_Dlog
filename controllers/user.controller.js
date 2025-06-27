const { db } = require("./../config/database");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


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
        utilisateur.*, d.nom_departement, p.name
    FROM utilisateur
    LEFT JOIN departement d ON utilisateur.id_departement = d.id_departement
    LEFT JOIN provinces p ON utilisateur.id_ville = p.id
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
    const { nom, prenom, email, role, id_ville, id_departement } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid userId ID provided' });
    }

    try {
        const q = `
            UPDATE utilisateur
            SET 
                nom = ?,
                prenom = ?,
                email  = ?,
                role = ?,
                id_ville = ?,
                id_departement = ?
            WHERE id_utilisateur = ?
        `;
      
        const values = [nom, prenom, email, role, id_ville, id_departement, id];

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

exports.getSignature =  async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "L'id userId est requis"})
  }

  const q = `
            SELECT 
              * 
            FROM 
              signature 
            WHERE userId = ?
            `
  db.query(q, [userId], (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de signature :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.postSignature = async (req, res) => {
    try {
        const { userId, signature_data } = req.body;

        if (!userId || !signature_data) {
            return res.status(400).json({ error: "Les champs 'userId' et 'signature' sont requis." });
        }

        // 🔄 Convertir base64 → fichier image
        const matches = signature_data.match(/^data:image\/png;base64,(.+)$/);
          if (!matches) {
            throw new Error("Format de signature invalide.");
          }
        
          const base64Data = matches[1];
          const filename = `signature-${uuidv4()}.png`;
          const filePath = path.join(__dirname, '../public/uploads/', filename);
          const relativePath = `public/uploads/${filename}`;
        
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        

        const query = 'INSERT INTO signature (userId, signature) VALUES (?, ?)';
        const values = [userId, relativePath];

        await db.query(query, values);

        return res.status(201).json({ message: 'Signature a été enregistrée avec succès.' });

    } catch (error) {
        console.error('Erreur dans postModele:', error);

        return res.status(500).json({
            error: "Une erreur s'est produite lors de l'ajout du véhicule.",
            details: error?.message || null,
        });
    }
};

//Société
exports.getSociete =  async (req, res) => {

  const q = `
            SELECT 
              * 
            FROM 
              societes
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de société :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.postSociete = async (req, res) => {
  try {
    const { nom_societe, adresse, rccm, nif, telephone, email, logo } = req.body;

    // Validation basique
    if (!nom_societe) {
      return res.status(400).json({ error: "Le champ 'nom_societe' est requis." });
    }
    if (!logo) {
      return res.status(400).json({ error: "Le champ 'logo' est requis." });
    }

    // Extraction et vérification du base64
    const matches = logo.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      throw new Error("Format du logo invalide. Assurez-vous qu'il soit en base64 PNG ou JPEG.");
    }

    const extension = matches[1]; // png, jpeg...
    const base64Data = matches[2];

    // Génération du chemin et nom de fichier
    const filename = `logo-${uuidv4()}.${extension}`;
    const filePath = path.join(__dirname, '../public/uploads/', filename);
    const relativePath = `public/uploads/${filename}`;

    // Enregistrement du fichier sur le disque
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // Enregistrement en base de données
    const query = `
      INSERT INTO societes (nom_societe, adresse, rccm, nif, telephone, email, logo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [nom_societe, adresse, rccm, nif, telephone, email, relativePath];

    await db.query(query, values);

    return res.status(201).json({ message: 'Société enregistrée avec succès.' });
  } catch (error) {
    console.error('Erreur dans Société:', error);

    return res.status(500).json({
      error: "Une erreur s'est produite lors de l'enregistrement.",
      details: error?.message || null,
    });
  }
};