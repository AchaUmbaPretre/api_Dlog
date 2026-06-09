const { db } = require("./../config/database");
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function queryPromise(connection, sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve([results]);
    });
  });
};

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
};

exports.getUserAll = (req, res) => {

    const q = `
        SELECT 
            utilisateur.id_utilisateur,
            utilisateur.nom,
            utilisateur.prenom,
            utilisateur.email,
            utilisateur.role,
            utilisateur.mot_de_passe,
            utilisateur.id_ville,
            utilisateur.id_departement,
            utilisateur.limite_vehicules
        FROM utilisateur
    `;
     
    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getUsers = (req, res) => {
    const currentUserId = req.user?.id || req.query.currentUserId;
    const isSuperAdmin = req.user?.is_super_admin === 1;
    
    if (!currentUserId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    // 🔥 Déterminer quels utilisateurs afficher selon le rôle
    let q;
    let params = [];
    
    if (isSuperAdmin) {
        // Super Admin voit TOUS les utilisateurs
        q = `
            SELECT 
                u.id_utilisateur,
                u.nom,
                u.prenom,
                u.email,
                u.role,
                u.tenant_id,
                u.created_by,
                u.niveau,
                u.is_active,
                d.nom_departement,
                p.name as province_nom,
                (SELECT nom FROM utilisateur WHERE id_utilisateur = u.created_by) as created_by_nom
            FROM utilisateur u
            LEFT JOIN departement d ON u.id_departement = d.id_departement
            LEFT JOIN provinces p ON u.id_ville = p.id
            ORDER BY u.date_creation DESC
        `;
    } else {
        // 🔥 Récupérer le tenant_id de l'utilisateur connecté
        const tenantQuery = `
            SELECT tenant_id, role FROM utilisateur WHERE id_utilisateur = ?
        `;
        
        db.query(tenantQuery, [currentUserId], (err, userResults) => {
            if (err || userResults.length === 0) {
                return res.status(500).json({ error: 'Erreur lors de la récupération' });
            }
            
            const user = userResults[0];
            const tenantId = user.tenant_id;
            const isAdmin = user.role === 'Admin';
            
            if (isAdmin) {
                // Admin voit ses utilisateurs (ceux qu'il a créés)
                q = `
                    SELECT 
                        u.id_utilisateur,
                        u.nom,
                        u.prenom,
                        u.email,
                        u.role,
                        u.tenant_id,
                        u.created_by,
                        u.niveau,
                        u.is_active,
                        d.nom_departement,
                        p.name as province_nom,
                        (SELECT nom FROM utilisateur WHERE id_utilisateur = u.created_by) as created_by_nom
                    FROM utilisateur u
                    LEFT JOIN departement d ON u.id_departement = d.id_departement
                    LEFT JOIN provinces p ON u.id_ville = p.id
                    WHERE u.created_by = ? OR u.id_utilisateur = ?
                    ORDER BY u.date_creation DESC
                `;
                params = [currentUserId, currentUserId];
            } else {
                // User voit uniquement ses propres infos
                q = `
                    SELECT 
                        u.id_utilisateur,
                        u.nom,
                        u.prenom,
                        u.email,
                        u.role,
                        u.tenant_id,
                        d.nom_departement,
                        p.name as province_nom
                    FROM utilisateur u
                    LEFT JOIN departement d ON u.id_departement = d.id_departement
                    LEFT JOIN provinces p ON u.id_ville = p.id
                    WHERE u.id_utilisateur = ?
                `;
                params = [currentUserId];
            }
            
            db.query(q, params, (error, data) => {
                if (error) {
                  return res.status(500).send(error);
                }
                return res.status(200).json(data);
            });
        });
        return;
    }
    
    db.query(q, params, (error, data) => {
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
};

exports.registerUser = async (req, res) => {
    const adminId = req.user?.id;
    const adminTenantId = req.user?.tenant_id || adminId;
    const adminRole = req.user?.role;
    
    const { nom, prenom, email, mot_de_passe, role, id_ville, id_departement } = req.body;
    
    // Vérifier que c'est bien un admin qui crée
    if (!adminId || (adminRole !== 'Admin' && adminRole !== 'SuperAdmin')) {
        return res.status(403).json({ 
            success: false, 
            message: 'Seul un administrateur peut créer des utilisateurs' 
        });
    }
    
    console.log('👤 Admin connecté:', {
        id: adminId,
        role: adminRole,
        tenant_id: adminTenantId
    });
    
    try {
        // Vérifier si l'utilisateur existe déjà
        const checkUserQuery = 'SELECT * FROM utilisateur WHERE email = ?';
        db.query(checkUserQuery, [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length > 0) {
                return res.status(200).json({ 
                    message: 'Utilisateur existe déjà', 
                    success: false 
                });
            }
            
            const defaultPassword = mot_de_passe || '1234';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            
            // 🔥 INSERTION avec tenant_id hérité de l'admin
            const insertQuery = `
                INSERT INTO utilisateur 
                (nom, prenom, email, mot_de_passe, role, id_ville, id_departement, 
                 tenant_id, created_by, niveau, date_creation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            const insertValues = [
                nom, 
                prenom, 
                email, 
                hashedPassword,
                role || 'User',
                id_ville || null, 
                id_departement || null,
                adminTenantId,   // 🔥 Hérite du tenant de l'admin
                adminId,         // 🔥 Qui a créé (l'admin connecté)
                2                // 🔥 niveau = 2 (utilisateur standard)
            ];
            
            db.query(insertQuery, insertValues, (err, insertResult) => {
                if (err) {
                    console.error('❌ Erreur insertion:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                console.log('✅ Utilisateur créé:', {
                    id: insertResult.insertId,
                    email,
                    role: role || 'User',
                    tenant_id: adminTenantId,
                    created_by: adminId
                });
                
                res.status(201).json({ 
                    message: 'Enregistré avec succès', 
                    success: true,
                    data: {
                        id: insertResult.insertId,
                        email,
                        role: role || 'User',
                        tenant_id: adminTenantId
                    }
                });
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
    const { nom, prenom, email, role, id_ville, id_departement, matricule } = req.body;

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
                id_departement = ?,
                matricule = ?
            WHERE id_utilisateur = ?
        `;
      
        const values = [nom, prenom, email, role, id_ville, id_departement,matricule, id];

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
};

exports.deleteUser = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM utilisateur WHERE id_utilisateur = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
};

exports.putIsActive = async (req, res) => {
  const { id_utilisateur, is_active } = req.body; // attendre 0 ou 1

  if (!id_utilisateur || (is_active !== 0 && is_active !== 1)) {
    return res.status(400).json({ error: "Champs requis manquants ou invalides." });
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
          UPDATE utilisateur 
          SET is_active = ?
          WHERE id_utilisateur = ?
        `;

        const params = [is_active, id_utilisateur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          const msg = is_active ? "Utilisateur activé avec succès." : "Utilisateur désactivé avec succès.";
          return res.status(200).json({ message: msg });
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

//Limiter le nombre de vehicule
exports.putLimiteVehicule = async (req, res) => {
  const { id_utilisateur, limite_vehicules } = req.body; // Récupérer du body

  if (!id_utilisateur || limite_vehicules === undefined) {
    return res.status(400).json({ error: "Champs requis manquants ou invalides." });
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
          UPDATE utilisateur 
          SET limite_vehicules = ?
          WHERE id_utilisateur = ?
        `;

        const params = [limite_vehicules, id_utilisateur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          const msg = limite_vehicules ? "Utilisateur activé avec succès." : "Utilisateur désactivé avec succès.";
          return res.status(200).json({ message: msg });
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

        const params = [new Date(), id_visiteur];

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

exports.putIsActive = async (req, res) => {
  const { id_utilisateur, is_active } = req.body; // attendre 0 ou 1

  if (!id_utilisateur || (is_active !== 0 && is_active !== 1)) {
    return res.status(400).json({ error: "Champs requis manquants ou invalides." });
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
          UPDATE utilisateur 
          SET is_active = ?
          WHERE id_utilisateur = ?
        `;

        const params = [is_active, id_utilisateur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          const msg = is_active ? "Utilisateur activé avec succès." : "Utilisateur désactivé avec succès.";
          return res.status(200).json({ message: msg });
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

exports.putShowInPresence = async (req, res) => {
  const { id_utilisateur, show_in_presence } = req.body;

  if (typeof id_utilisateur !== "number" || ![0, 1].includes(show_in_presence)) {
    return res.status(400).json({ error: "Champs requis manquants ou invalides." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    const sql = `
      UPDATE utilisateur 
      SET show_in_presence = ?
      WHERE id_utilisateur = ?
    `;

    connection.query(sql, [show_in_presence, id_utilisateur], (err, results) => {
      connection.release();
      if (err) {
        console.error("Erreur lors de la mise à jour :", err);
        return res.status(500).json({ error: "Impossible de mettre à jour l'utilisateur." });
      }

      const msg = show_in_presence
        ? "Utilisateur activé dans la liste de présence."
        : "Utilisateur désactivé dans la liste de présence.";

      return res.status(200).json({ message: msg });
    });
  });
};

//Visiteurs_véhicule
/* exports.getVisiteurVehicule=  async (req, res) => {

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
}; */
