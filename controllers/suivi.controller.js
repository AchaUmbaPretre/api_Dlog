const { db } = require("./../config/database");

exports.getSuiviCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_suivi_controle) AS nbre_suivi
        FROM suivi_controle_de_base
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getSuivi = (req, res) => {

    const q = `
            SELECT d.nom_departement AS nom_departement, s.commentaires, s.date_suivi, type.nom_type_statut AS statut FROM suivi_controle_de_base AS s
        INNER JOIN controle_de_base AS c ON s.id_controle = c.id_controle
        INNER JOIN departement AS d ON c.id_departement = d.id_departement
        INNER JOIN type_statut_suivi AS type ON s.status = type.id_type_statut_suivi
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getSuiviOne = (req, res) => {
    const {id_suivi} = req.query;

    const q = `
        SELECT sc.id_suivi_controle, sc.id_controle, sc.commentaires, sc.date_suivi, ts.nom_type_statut, u.nom, CASE 
            WHEN sc.est_termine = 0 THEN 'Non' 
            ELSE 'Oui' 
                END AS est_termine FROM suivi_controle_de_base AS sc
        INNER JOIN utilisateur AS u ON sc.effectue_par = u.id_utilisateur
        INNER JOIN type_statut_suivi AS ts ON sc.status = ts.id_type_statut_suivi
                WHERE sc.id_controle =${id_suivi}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getSuiviAllNbre = (req, res) => {
    const { id_tache } = req.query;
    let q = `
        SELECT 
            (SELECT COUNT(suivi_tache.id_suivi)
             FROM suivi_tache
             WHERE suivi_tache.id_tache = ?) AS nbre_tracking,
             
            (SELECT COUNT(tache_documents.id_tache_document)
             FROM tache_documents
             WHERE tache_documents.id_tache = ?) AS nbre_doc
    `;

    db.query(q, [id_tache, id_tache], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data[0]);
    });
};

exports.getSuiviTacheUn = (req, res) => {
    const {id_suivi} = req.query;

    const q = `
        SELECT 
            suivi_tache.*, 
            type_statut_suivi.nom_type_statut,
            CASE 
        WHEN suivi_tache.est_termine = 0 THEN 'Non' 
        ELSE 'Oui' 
            END AS est_termine,
            utilisateur.nom, 
            tache.nom_tache
        FROM 
            suivi_tache
        LEFT JOIN 
            utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
        LEFT JOIN 
            tache ON suivi_tache.id_tache = tache.id_tache
        LEFT JOIN 
            type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE suivi_tache.est_supprime = 0 AND suivi_tache.id_suivi = ?
        `;
     
    db.query(q,[id_suivi], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

/* exports.getSuiviTacheOne = (req, res) => {
    const {id_user, role} = req.query;

    const q = `
        SELECT 
            suivi_tache.*, 
            type_statut_suivi.nom_type_statut,
            CASE 
        WHEN suivi_tache.est_termine = 0 THEN 'Non' 
        ELSE 'Oui' 
            END AS est_termine,
            utilisateur.nom, 
            tache.nom_tache
        FROM 
            suivi_tache
        INNER JOIN 
            utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
        INNER JOIN 
            tache ON suivi_tache.id_tache = tache.id_tache
        INNER JOIN 
            type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE suivi_tache.est_supprime = 0
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
} */
    
exports.getSuiviTacheOne = (req, res) => {
    const { id_user, role } = req.query;
    
        let additionalCondition = '';
        if (role !== 'Admin') {
            additionalCondition = `AND tache.user_cr = ${db.escape(id_user)}`;
        }
    
        const q = `
            SELECT 
                suivi_tache.*, 
                type_statut_suivi.nom_type_statut,
                CASE 
                    WHEN suivi_tache.est_termine = 0 THEN 'Non' 
                    ELSE 'Oui' 
                END AS est_termine,
                utilisateur.nom, 
                tache.nom_tache
            FROM 
                suivi_tache
            INNER JOIN 
                utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
            INNER JOIN 
                tache ON suivi_tache.id_tache = tache.id_tache
            INNER JOIN 
                type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE 
                suivi_tache.est_supprime = 0
                ${additionalCondition}
        `;
    
        db.query(q, (error, data) => {
            if (error) {
                console.error('Error executing query:', error);
                return res.status(500).send(error);
            }
            return res.status(200).json(data);
        });
    };

/* exports.getSuiviTacheOneV = (req, res) => {
    const {id_tache} = req.query;

    const q = `
                SELECT 
            suivi_tache.*, 
            type_statut_suivi.nom_type_statut,
            CASE 
        WHEN suivi_tache.est_termine = 0 THEN 'Non' 
        ELSE 'Oui' 
            END AS est_termine,
            utilisateur.nom, 
            tache.nom_tache
        FROM 
            suivi_tache
        INNER JOIN 
            utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
        INNER JOIN 
            tache ON suivi_tache.id_tache = tache.id_tache
        INNER JOIN 
            type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE suivi_tache.id_tache = ?
        `;
     
    db.query(q,[id_tache], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
} */

exports.getSuiviTacheOneV = (req, res) => {
        const { id_tache } = req.query;
    
        const q = `
            SELECT 
                suivi_tache.*, 
                type_statut_suivi.nom_type_statut,
                CASE 
                    WHEN suivi_tache.est_termine = 0 THEN 'Non' 
                    ELSE 'Oui' 
                END AS est_termine,
                utilisateur.nom, 
                tache.nom_tache,
                -- Récupération de la date du dernier suivi
                (SELECT MAX(date_suivi) 
                 FROM suivi_tache 
                 WHERE suivi_tache.id_tache = tache.id_tache
                ) AS date_dernier_suivi
            FROM 
                suivi_tache
            INNER JOIN 
                utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
            INNER JOIN 
                tache ON suivi_tache.id_tache = tache.id_tache
            INNER JOIN 
                type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE suivi_tache.id_tache = ? AND suivi_tache.est_supprime = 0
        `;
    
        db.query(q, [id_tache], (error, data) => {
            if (error) res.status(500).send(error);
            return res.status(200).json(data);
        });
    };

exports.postSuivi = async (req, res) => {

    try {
        const q = 'INSERT INTO suivi_controle_de_base(`id_controle`, `status`, `commentaires`, `effectue_par`, `est_termine`) VALUES(?,?,?,?,?)';

        const values = [
            req.body.id_controle,
            req.body.status,
            req.body.commentaires,
            req.body.effectue_par,
            req.body.est_termine
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Suivi ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.postSuiviTache = async (req, res) => {
    try {
        const qTache = 'UPDATE tache SET statut = ? WHERE id_tache = ?';
        const q = 'INSERT INTO suivi_tache(`id_tache`, `status`, `commentaire`, `pourcentage_avancement`, `effectue_par`, `est_termine`) VALUES(?,?,?,?,?,?)';

        const values = [
            req.body.id_tache,
            req.body.status,
            req.body.commentaire,
            req.body.pourcentage_avancement,
            req.body.effectue_par,
            req.body.est_termine ? 1 : 0
        ];

        const insertSuiviTache = new Promise((resolve, reject) => {
            db.query(q, values, (error, data) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });

        const updateTacheStatut = new Promise((resolve, reject) => {
            db.query(qTache, [req.body.status, req.body.id_tache], (error, data) => {
                if (error) {
                    return reject(error); // En cas d'erreur, on rejette
                }
                resolve(data);
            });
        });

        // Exécution des promesses
        await insertSuiviTache;
        await updateTacheStatut;

        // Si tout se passe bien
        return res.status(201).json({ message: 'Suivi de tâche ajouté avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.deleteUpdatedSuiviTache = (req, res) => {
    const { id } = req.query;
  
    const q = "UPDATE suivi_tache SET est_supprime = 1 WHERE id_suivi = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
  }

exports.deleteSuivi = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM suivi_controle_de_base WHERE id_suivi_controle = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }

exports.getDocGeneral = (req, res) => {
    const q = `
                SELECT documents.* FROM documents
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDocGeneral = async (req, res) => {
    const { nom_document, type_document } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    if (!nom_document || !type_document) {
        return res.status(400).json({ message: 'Des champs obligatoires sont manquants' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        nom_document,
        type_document
    }));

    // Utiliser une transaction ou un moyen de s'assurer que toutes les insertions sont effectuées
    try {
        documents.forEach((doc) => {
            const query = `INSERT INTO documents (nom_document, type_document, chemin_document)
                           VALUES (?, ?, ?)`;

            db.query(query, [doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'insertion du document:', err);
                    throw err;
                }
            });
        });

        res.status(200).json({ message: 'Documents ajoutés avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'insertion des documents:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};