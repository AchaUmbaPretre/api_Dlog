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

exports.getSocieteOne =  async (req, res) => {
  const { id_societe } = req.query;

  if(!id_societe) {
    return res.status(400).json({ message: "L'identifiant est requis"})
  }

  const q = `
            SELECT 
              * 
            FROM 
              societes
            WHERE 
              id_societe = ?
            `
  db.query(q, [id_societe], (err, result) => {
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

    if (!nom_societe) {
      return res.status(400).json({ error: "Le champ 'nom_societe' est requis." });
    }
    if (!logo) {
      return res.status(400).json({ error: "Le champ 'logo' est requis." });
    }

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

//Personnel
exports.getPersonnel =  async (req, res) => {

  const q = `
            SELECT 
              p.id_personnel,
              p.nom,
              p.prenom,
              p.matricule,
              d.nom_departement
            FROM 
              personnel p
              LEFT JOIN 
              	departement d ON p.id_departement = d.id_departement
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de personnel :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.postPersonnel = async (req, res) => {
    try {
        
        const q = 'INSERT INTO personnel(`nom`, `prenom`, `matricule`, `id_departement`) VALUES(?,?,?,?)';

        const values = [
            req.body.nom,
            req.body.prenom,
            req.body.matricule,
            req.body.id_departement
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Personnel a été ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau personnel:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du personnel." });
    }
};

//Visiteurs_Pietons
exports.getVisiteurPieton =  async (req, res) => {

  const q = `
            SELECT 
              vp.*,
              md.nom_motif_demande
            FROM 
              visiteurs_pietons vp
              INNER JOIN motif_demande md ON vp.motif = md.id_motif_demande
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de visiteur pieton :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.postVisiteurPieton = async (req, res) => {
    try {
        
        const q = 'INSERT INTO visiteurs_pietons(`nom_complet`, `piece_identite`, `entreprise`, `motif`) VALUES(?,?,?,?)';

        const values = [
            req.body.nom_complet,
            req.body.piece_identite,
            req.body.entreprise,
            req.body.id_motif
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Visiteur piéton a été ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau personnel:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du personnel." });
    }
};

//PIETONS RETOUR 
exports.getVisiteurPietonRetour =  async (req, res) => {

  const q = `
            SELECT 
              vp.*, 
              md.nom_motif_demande
            FROM 
              visiteurs_pietons vp
              INNER JOIN motif_demande md ON vp.motif = md.id_motif_demande
            WHERE 
              vp.date_heure_depart IS NULL;
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de visiteur pieton :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.putVisiteurPietonRetour = async (req, res) => {
  const { id_visiteur } = req.query;

  if (!id_visiteur) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur de début de transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const sql = `
          UPDATE visiteurs_pietons 
          SET date_heure_depart = ?
          WHERE id_visiteur = ?
        `;

        const params = [timestamp(), id_visiteur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release();

          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          return res.status(200).json({ message: "Date de sortie mise à jour avec succès." });
        });
      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur lors de la mise à jour :", error);
          return res.status(500).json({ error: error.message || "Erreur inattendue." });
        });
      }
    });
  });
};

//Visiteurs_véhicule
exports.getVisiteurVehicule=  async (req, res) => {

  const q = `
            SELECT 
              *
            FROM 
              visiteur_vehicules
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de visiteur pieton :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.postVisiteurVehicule = async (req, res) => {
    try {
        
        const q = 'INSERT INTO visiteur_vehicules(`immatriculation`, `type_vehicule`, `id_chauffeur`, `proprietaire`, `motif`, `entreprise`,`vehicule_connu`) VALUES(?,?,?,?,?,?)';

        const values = [
            req.body.immatriculation,
            req.body.type_vehicule,
            req.body.id_chauffeur,
            req.body.proprietaire,
            req.body.motif,
            req.body.entreprise
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Visiteur vehiculé a été ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau personnel:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du personnel." });
    }
};

// SORTIE VEHICULE VISITEUR
exports.getVisiteurVehiculeRetour =  async (req, res) => {

  const q = `
            SELECT 
              rv.*, 
              md.nom_motif_demande
            FROM 
              registre_visiteur rv
              INNER JOIN motif_demande md ON rv.id_motif = md.id_motif_demande
            WHERE 
              rv.date_sortie IS NULL;
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de vehicule visiteur :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.putVisiteurVehiculeRetour = async (req, res) => {
  const { id_registre_visiteur } = req.query;

  if (!id_registre_visiteur) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur de début de transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const sql = `
          UPDATE visiteur_vehicules 
          SET date_sortie = ?
          WHERE id_registre_visiteur = ?
        `;

        const params = [timestamp(), id_registre_visiteur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release(); // Toujours libérer la connexion

          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          return res.status(200).json({ message: "Date de sortie mise à jour avec succès." });
        });
      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur lors de la mise à jour :", error);
          return res.status(500).json({ error: error.message || "Erreur inattendue." });
        });
      }
    });
  });
};
