const { db } = require("./../config/database");

// 📦 Petite helper function pour convertir mysql en Promises
function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
}

exports.getEquipement = (req, res) => {

    const q = `
                SELECT equipments.model, equipments.num_serie, 
                        equipments.id_equipement, 
                        equipments.installation_date, 
                        equipments.maintenance_date, 
                        equipments.date_prochaine_maintenance, 
                        bins.nom AS nom_bin, 
                        batiment.nom_batiment, 
                        statut_equipement.nom_statut, 
                        articles.nom_article,
                        adresse.adresse
                    FROM equipments 
                    LEFT JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                    LEFT JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                    LEFT JOIN articles ON equipments.id_type_equipement = articles.id_article
                    LEFT JOIN bins ON equipments.id_bin = bins.id
                    LEFT JOIN adresse ON equipments.location = adresse.id_adresse
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEquipementOneV = (req, res) => {
    const {id} = req.query;

    const q = `
            SELECT * 
                FROM 
            equipments 
                WHERE 
            equipments.id_equipement= ?
            `;

    db.query(q,[id],(error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEquipementOne = (req, res) => {
    const {id} = req.query;

    const q = `
            SELECT equipments.model, equipments.num_serie, 
                equipments.id_equipement, equipments.installation_date, 
                equipments.maintenance_date, equipments.date_prochaine_maintenance, bins.nom AS location, batiment.nom_batiment, statut_equipement.nom_statut, articles.nom_article FROM equipments 
                INNER JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                INNER JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                INNER JOIN articles ON equipments.id_type_equipement = articles.id_article
                INNER JOIN bins ON equipments.id_bin = bins.id
            WHERE 
                equipments.id_batiment= ?
            `;

    db.query(q,[id],(error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postEquipement = async (req, res) => {

    try {
        const q = 'INSERT INTO equipments(`id_bureau`,`id_bin`,`id_batiment`, `id_type_equipement`, `model`, `num_serie`, `installation_date`, `maintenance_date`,`date_prochaine_maintenance`, `location`, `status`) VALUES(?,?,?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.id_bureau,
            req.body.id_bin,
            req.body.id_batiment,
            req.body.id_type_equipement,
            req.body.model,
            req.body.num_serie,
            req.body.installation_date,
            req.body.maintenance_date,
            req.body.date_prochaine_maintenance,
            req.body.location,
            req.body.status
        ];


        db.query(q, values, (error, data)=> {
            if(error) {
                console.log(error)
            }
            return res.status(201).json({ message: 'Equipement ajouté avec succès' });
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putEquipement = async (req, res) => {
    const { id_equipement  } = req.query;
    const { model, num_serie, installation_date, maintenance_date, date_prochaine_maintenance, location, status} = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID de bins fourni non valide' });
    }

    try {
        const q = `
            UPDATE equipments 
            SET 
                model = ?,
                num_serie = ?,
                installation_date = ?,
                maintenance_date = ?,
                date_prochaine_maintenance = ?,
                location = ?,
                type_stockage = ?,
                status = ?
            WHERE id_equipement  = ?
        `;
      
        const values = [ model, num_serie, installation_date, maintenance_date, date_prochaine_maintenance, location, status, id_equipement ]

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Bins record not found' });
            }
            return res.json({ message: 'Bins record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating bins:", err);
        return res.status(500).json({ error: 'Failed to update bins record' });
    }
}

//Plan
exports.getBatimentPlans = (req, res) => {
  const { searchValue, selectedBatiment } = req.query;

  let whereClauses = [];
  let values = [];

  if (searchValue) {
    whereClauses.push(`bp.nom_document LIKE ?`);
    values.push(`%${searchValue}%`);
  }

  // Filtrage par bâtiment(s)
  if (selectedBatiment && (Array.isArray(selectedBatiment) ? selectedBatiment.length : true)) {
    const ids = Array.isArray(selectedBatiment) ? selectedBatiment : [selectedBatiment];
    whereClauses.push(`bp.id_batiment IN (${ids.map(() => '?').join(', ')})`);
    values.push(...ids);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const q = `
    SELECT bp.* 
    FROM batiment_plans bp
    ${whereClause}
    ORDER BY bp.date_ajout DESC
  `;

  db.query(q, values, (error, data) => {
    if (error) {
      return res.status(500).send(error);
    }
    return res.status(200).json(data);
  });
};

exports.getBatimentPlansOne = (req, res) => {
    const {id_batiment} = req.query;
    const q = `
                SELECT batiment_plans.nom_document, batiment_plans.type_document, batiment_plans.chemin_document, batiment_plans.date_ajout, batiment.nom_batiment 
                    FROM 
                batiment_plans 
                    INNER JOIN batiment ON batiment_plans.id_batiment = batiment.id_batiment
                    WHERE batiment_plans.id_batiment = ?
            `;

    db.query(q, [id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBatimentPlans = async (req, res) => {
    const { id_batiment, nom_document, type_document } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_batiment,
        nom_document,
        type_document
    }));

    try {
        await Promise.all(
            documents.map((doc) => {
                return new Promise((resolve, reject) => {
                    const query = 'INSERT INTO batiment_plans(`id_batiment`, `nom_document`, `type_document`, `chemin_document`) VALUES(?,?,?,?)';
                    db.query(query, [doc.id_batiment, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'insertion du document:', err);
                            reject(err); // Rejeter la promesse en cas d'erreur
                        } else {
                            resolve(result); 
                        }
                    });
                });
            })
        );

        res.status(200).json({ message: 'Documents ajoutés avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur', error });
    }
};

//DOC BATIMENT
exports.getBatimentDoc = (req, res) => {

    const q = `SELECT * FROM documents_batiment`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBatimentDocOne1 = (req, res) => {
    const {id_document} = req.query;

    const q = `SELECT * FROM documents_batiment WHERE id_document = ?`;

    db.query(q,[id_document], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBatimentDocOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `SELECT * FROM documents_batiment WHERE id_batiment = ?`;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBatimentDoc = async (req, res) => {
    const { id_batiment, nom_document, type_document } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_batiment,
        nom_document,
        type_document
    }));

    documents.forEach((doc) => {
        const query = `INSERT INTO documents_batiment (id_batiment, nom_document, type_document, chemin_document)
                       VALUES (?, ?, ?, ?)`;

        db.query(query, [doc.id_batiment, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'insertion du document:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }
        });
    });

    res.status(200).json({ message: 'Documents ajoutés avec succès' });
};

exports.putBatimentDoc = async (req, res) => {
    const { id_document } = req.query;

    if (!id_document || isNaN(id_document)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }
    
    const { nom_document, type_document } = req.body;
    if (!nom_document || !type_document) {
        return res.status(400).json({ error: 'Nom du document et type de document sont requis' });
    }

    try {
        const q = `
            UPDATE documents_batiment
            SET 
                nom_document = ?,
                type_document = ?
            WHERE id_document = ?
        `;
      
        const values = [
            nom_document,
            type_document,
            id_document
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Tache record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Tache record not found' });
            }

            return res.json({ message: 'Tache record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
};

exports.getMaintenance = (req, res) => {

    const q = `
                SELECT * FROM maintenance_logs
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getMaintenanceOne = (req, res) => {
    const {id} = req.query;

    const q = `
                SELECT maintenance_logs.id_maintenance, maintenance_logs.maintenance_date, maintenance_logs.description, articles.nom_article, statut_equipement.nom_statut FROM maintenance_logs 
                    LEFT JOIN equipments ON maintenance_logs.id_equipement = equipments.id_equipement
                    LEFT JOIN articles ON equipments.id_type_equipement = articles.id_article
                    LEFT JOIN statut_equipement ON maintenance_logs.status = statut_equipement.id_statut_equipement
                    WHERE 
                maintenance_logs.id_equipement = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postMaintenance = async (req, res) => {
    const { id_equipement, maintenance_date, description, status, id_technicien } = req.body;

    try {
        const qEquipement = 'UPDATE equipments SET status = ? WHERE id_equipement = ?';
        const q = 'INSERT INTO maintenance_logs(`id_equipement`, `maintenance_date`, `description`, `status`, `id_technicien`) VALUES(?,?,?,?,?)';

        // Exécution de la requête pour insérer dans maintenance_logs
        const values = [id_equipement, maintenance_date, description, status, id_technicien];
        await db.query(q, values);

        // Mise à jour du statut de l'équipement après insertion
        await db.query(qEquipement, [status, id_equipement]);

        // Réponse de succès
        return res.status(201).json({ message: 'Maintenance ajoutée avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de maintenance :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.getTypeEquipement = (req, res) => {

    const q = `
                SELECT * FROM type_equipement
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getStatutEquipement = (req, res) => {

    const q = `
                SELECT * FROM statut_equipement
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getStatutMaintenance= (req, res) => {

    const q = `
                SELECT * FROM statut_maintenance
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

// Stocks des équipements
exports.getStockEquipement = (req, res) => {

    const q = `
                SELECT stocks_equipements.quantite, 
                    stocks_equipements.seuil_alerte,
                    stocks_equipements.id_stock, 
                    articles.nom_article 
                FROM stocks_equipements
                    INNER JOIN articles ON stocks_equipements.id_type_equipement = articles.id_article
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getStockEquipementOne = (req, res) => {
    const {id} = req.query;

    const q = `
                SELECT * FROM stocks_equipements
                    WHERE 
                    id_stock = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postStockEquipement = async (req, res) => {

    try {
        const q = 'INSERT INTO stocks_equipements(`id_type_equipement`, `quantite`, `seuil_alerte`) VALUES(?,?,?)';

        const values = [
            req.body.id_type_equipement,
            req.body.quantite,
            req.body.seuil_alerte
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Maintenance ajouté avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de maintenance :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putStockEquipement = async (req, res) => {
    const { id } = req.query;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid equipement ID provided' });
    }

    try {
        const q = `
            UPDATE stocks_equipements 
            SET 
                id_type_equipement = ?,
                quantite = ?,
            WHERE id_stock = ?
        `;
      
        const values = [
            req.body.id_type_equipement,
            req.body.quantite,
            id
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Stocks equipements  record not found' });
            }
            return res.json({ message: 'stocks equipements  record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

//Tableau de bord
exports.getRapport = (req, res) => {

    const q = `
            SELECT 
                e.id_equipement AS equipment_id,
                articles.nom_article,
                e.status,
                e.date_prochaine_maintenance,
                statut_equipement.nom_statut,
                e.id_batiment
            FROM 
                equipments e
                INNER JOIN articles ON e.id_type_equipement = articles.id_article
                INNER JOIN statut_equipement ON e.status = statut_equipement.id_statut_equipement
            WHERE 
                e.date_prochaine_maintenance >= CURDATE()
            ORDER BY 
                e.date_prochaine_maintenance ASC;

            `;

    db.query(q,(error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getRapportOne = (req, res) => {
    const {id} = req.query;

    let q = `
            SELECT 
                e.id_equipement AS equipment_id,
                articles.nom_article,
                e.status,
                e.date_prochaine_maintenance,
                statut_equipement.nom_statut,
                e.id_batiment,
                batiment.nom_batiment
                
            FROM 
                equipments e
                INNER JOIN articles ON e.id_type_equipement = articles.id_article
                INNER JOIN statut_equipement ON e.status = statut_equipement.id_statut_equipement
                INNER JOIN batiment ON e.id_batiment = batiment.id_batiment
            WHERE 
                e.date_prochaine_maintenance >= CURDATE() AND e.id_batiment = ?
            ORDER BY 
                e.date_prochaine_maintenance ASC;

            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTableauBord = (req, res) => {

    let q = `
           SELECT 
                COUNT(e.id_equipement) AS nbre_equipement,
                SUM(CASE WHEN e.status = 1 THEN 1 ELSE 0 END) AS nbre_operationnel,
                SUM(CASE WHEN e.status = 2 THEN 1 ELSE 0 END) AS nbre_entretien,
                SUM(CASE WHEN e.status = 3 THEN 1 ELSE 0 END) AS nbre_enpanne,
                batiment.nom_batiment
            FROM equipments e
            INNER JOIN batiment ON e.id_batiment = batiment.id_batiment
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTableauBordOne = (req, res) => {
    const {id} = req.query;

    let q = `
           SELECT 
                COUNT(e.id_equipement) AS nbre_equipement,
                SUM(CASE WHEN e.status = 1 THEN 1 ELSE 0 END) AS nbre_operationnel,
                SUM(CASE WHEN e.status = 2 THEN 1 ELSE 0 END) AS nbre_entretien,
                SUM(CASE WHEN e.status = 3 THEN 1 ELSE 0 END) AS nbre_enpanne,
                batiment.nom_batiment
            FROM equipments e
            INNER JOIN batiment ON e.id_batiment = batiment.id_batiment
            WHERE e.id_batiment = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Entrepot
exports.getEntrepot = (req, res) => {

    const q = `
                SELECT entrepots.id, entrepots.nom, entrepots.description, batiment.nom_batiment FROM entrepots
INNER JOIN batiment ON entrepots.id_batiment = batiment.id_batiment
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEntrepotOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `
                SELECT * FROM entrepots WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEntrepotOneV = (req, res) => {
    const {id} = req.query;

    const q = `
                SELECT * FROM entrepots WHERE id = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postEntrepot = (req, res) => {
    const { nom, description, id_batiment } = req.body;
    const sql = 'INSERT INTO entrepots (nom, description, id_batiment) VALUES (?, ?, ?)';
    
    db.query(sql, [nom, description, id_batiment], (err, result) => {
        if (err) {
            return res.status(500).send('Erreur lors de la création de l entrepôt');
        }
        res.status(201).send('Entrepôt créé');
    });
};

exports.putEntrepot = async (req, res) => {
    const { id_entrepot } = req.query;
    const { nom, description} = req.body;

    if (!id_entrepot || isNaN(id_entrepot)) {
        return res.status(400).json({ error: 'ID de entrepot fourni non valide' });
    }

    try {
        const q = `
            UPDATE entrepots 
            SET 
                nom = ?,
                description = ?
            WHERE id = ?
        `;
      
        const values = [ nom, description, id_entrepot];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Entrepot record not found' });
            }
            return res.json({ message: 'Entrepot record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating entrepot:", err);
        return res.status(500).json({ error: 'Failed to update entrepot record' });
    }
}

//BINS
exports.getBins = (req, res) => {
    const { search } = req.query;

    let q = `
        SELECT 
            bins.id, bins.id_batiment, bins.nom, bins.superficie, 
            bins.longueur, bins.largeur, bins.hauteur, 
            bins.capacite, bins.superfice_sol, bins.volume_m3, statut_bins.nom_statut_bins AS statut, 
            type_stockage_bins.nom_stockage AS type_stockage,
            batiment.nom_batiment
        FROM bins
        INNER JOIN statut_bins ON bins.statut = statut_bins.id_statut_bins
        INNER JOIN type_stockage_bins ON bins.type_stockage = type_stockage_bins.id_type_stockage_bins
        INNER JOIN batiment ON bins.id_batiment = batiment.id_batiment
        WHERE bins.est_supprime = 0
    `;

    if (search) {
        const escapedSearch = db.escape(`%${search}%`);
        q += ` AND (bins.nom LIKE ${escapedSearch} OR batiment.nom_batiment LIKE ${escapedSearch})`;
    }

    q += ` ORDER BY bins.date_creation DESC`;

    let qSQL = `
        SELECT 
            COUNT(id) AS nbre_bin,
            SUM(b.superficie) AS total_superficie, 
            SUM(b.longueur) AS total_longueur, 
            SUM(b.largeur) AS total_largeur, 
            SUM(b.hauteur) AS total_hauteur, 
            SUM(b.capacite) AS total_capacite 
        FROM bins b 
        INNER JOIN batiment ON b.id_batiment = batiment.id_batiment
        WHERE b.est_supprime = 0
    `;

    if (search) {
        const escapedSearch = db.escape(`%${search}%`);
        qSQL += ` AND (b.nom LIKE ${escapedSearch} OR batiment.nom_batiment LIKE ${escapedSearch})`;
    }

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }

        db.query(qSQL, (errorSub, dataSub) => {
            if (errorSub) {
                return res.status(500).send(errorSub);
            }

            return res.status(200).json({
                data: data,
                statistiques: dataSub[0]
            });
        });
    });
};

exports.getBinsOne = (req, res) => {
    const {	id_batiment } = req.query;

    const q = `
                SELECT bins.id, bins.id_batiment, bins.nom, bins.superficie, 
                    bins.longueur, bins.largeur, bins.hauteur, 
                    bins.capacite, bins.superfice_sol, bins.volume_m3, statut_bins.nom_statut_bins AS statut, 
                    type_stockage_bins.nom_stockage AS type_stockage,
                    batiment.nom_batiment
                FROM bins
                	INNER JOIN batiment ON bins.id_batiment = batiment.id_batiment
                    INNER JOIN statut_bins ON bins.statut = statut_bins.id_statut_bins
                    INNER JOIN type_stockage_bins ON bins.type_stockage = type_stockage_bins.id_type_stockage_bins
                WHERE bins.id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBinsOneV = (req, res) => {
    const {	id } = req.query;

    const q = `
                SELECT * 
                FROM bins
                WHERE bins.id = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBins = (req, res) => {
    const { id_batiment, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut, superfice_sol, volume_m3 } = req.body;

    const qBin = 'INSERT INTO bins (id_batiment, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut, superfice_sol, volume_m3) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
    const qAdresse = 'INSERT INTO adresse (adresse, id_bin) VALUES (?,?)';

    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error('Erreur de connexion à la base de données :', connErr);
            return res.status(500).send('Erreur de connexion');
        }

        connection.beginTransaction((err) => {
            if (err) {
                console.error('Erreur lors du début de la transaction :', err);
                connection.release();
                return res.status(500).send("Erreur lors de l'initialisation de la transaction");
            }

            // Étape 1 : Insertion dans bins
            connection.query(qBin, [id_batiment, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut, superfice_sol, volume_m3], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'insertion dans bins :', err);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).send('Erreur lors de la création du bin');
                    });
                }

                const id_bin = result.insertId;

                // Étape 2 : Adresse (si fournie)
                if ( nom ) {
                    connection.query(qAdresse, [nom, id_bin], (err) => {
                        if (err) {
                            console.error('Erreur lors de l\'insertion de l\'adresse :', err);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).send('Erreur lors de la création de l\'adresse');
                            });
                        }

                        // Commit
                        connection.commit((err) => {
                            connection.release();
                            if (err) {
                                console.error('Erreur lors du commit :', err);
                                return connection.rollback(() => {
                                    res.status(500).send('Erreur lors de la validation de la transaction');
                                });
                            }
                            res.status(201).send('Bin créé avec adresse');
                        });
                    });

                } else {
                    // Pas d'adresse à insérer
                    connection.commit((err) => {
                        connection.release();
                        if (err) {
                            console.error('Erreur lors du commit :', err);
                            return connection.rollback(() => {
                                res.status(500).send('Erreur lors de la validation de la transaction');
                            });
                        }
                        res.status(201).send('Bin créé sans adresse');
                    });
                }
            });
        });
    });
};

exports.deleteUpdatedBins = (req, res) => {
    const { id } = req.query;
  
    const q = "UPDATE bins SET est_supprime = 1 WHERE id = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
};

exports.putBins = async (req, res) => {
    const { id } = req.query;
    const { nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut, superfice_sol, volume_m3 } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID de bins fourni non valide' });
    }

    try {
        const q = `
            UPDATE bins 
            SET 
                nom = ?,
                superficie = ?,
                longueur = ?,
                largeur = ?,
                hauteur = ?,
                capacite = ?,
                type_stockage = ?,
                statut = ?,
                superfice_sol = ?, 
                volume_m3 = ?
            WHERE id = ?
        `;
      
        const values = [nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut, superfice_sol, volume_m3, id]

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Bins record not found' });
            }
            return res.json({ message: 'Bins record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating bins:", err);
        return res.status(500).json({ error: 'Failed to update bins record' });
    }
};

//Maintenance Bins
exports.getMaintenanceBin = (req, res) => {

    const q = `
                SELECT * FROM maintenances_bins
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getMaintenanceBinOne = (req, res) => {
    const {id_bin} = req.query;

    const q = `
                SELECT * FROM maintenances_bins WHERE id_bin = ?
            `;

    db.query(q,[id_bin], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postMaintenanceBin = (req, res) => {
    const { id_bin, description} = req.body;
    const q = 'INSERT INTO bins (id_bin, description) VALUES (?,?)';
    
    db.query(q, [id_bin, description], (err, result) => {
        if (err) {
            return res.status(500).send('Erreur lors de la création de bins');
        }
        res.status(201).send('Bins créé');
    });
};

//Bureaux
exports.getBureaux = (req, res) => {

    const q = `
                SELECT bureaux.*, batiment.nom_batiment FROM bureaux
                    INNER JOIN batiment ON bureaux.id_batiment = batiment.id_batiment
                    WHERE bureaux.est_supprime = 0
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBureauxOneV = (req, res) => {
    const {id_bureau} = req.query;

    const q = `
                SELECT * FROM bureaux WHERE id_bureau = ?
            `;

    db.query(q,[id_bureau], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBureauxOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `
                SELECT * FROM bureaux WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBureaux = (req, res) => {
    const { id_batiment, nom, longueur, largeur, hauteur, nombre_postes } = req.body;
  
    const query = 'INSERT INTO bureaux (id_batiment, nom, longueur, largeur, hauteur, nombre_postes) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [id_batiment, nom, longueur, largeur, hauteur, nombre_postes];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion:', err);
        return res.status(500).send('Erreur serveur');
      }
      res.status(200).send('Bureau ajouté avec succès');
    });
};

exports.putBureaux = (req, res) => {
    const { id_bureau } = req.query;
    const { nom, longueur, largeur, hauteur, nombre_postes } = req.body;

    if (!id_bureau || isNaN(id_bureau)) {
        return res.status(400).json({ error: 'ID de bureau fourni non valide' });
    }

    try {
        const q = `
            UPDATE bureaux 
            SET 
                nom = ?,
                longueur = ?,
                largeur = ?,
                hauteur = ?,
                nombre_postes = ?
            WHERE id_bureau = ?
        `;
      
        const values = [nom, longueur, largeur, hauteur, nombre_postes, id_bureau]

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Bureau record not found' });
            }
            return res.json({ message: 'Bureau record updated successfully' });
        })
    } catch (err) {
        console.log(err)
        console.error("Error updating Bureau:", err);
        return res.status(500).json({ error: 'Failed to update bureau record' });
    }
};

exports.deleteUpdateBureaux = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE bureaux SET est_supprime = 1 WHERE id_bureau = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
};

//Niveau batiment
exports.getNiveauCount = (req, res) => {
    const { id_batiment } = req.query;

    const q = `
                SELECT 
                    COUNT(id_niveau) AS nbre_niveau
                FROM 
                    niveau_batiment           
                    WHERE id_batiment = ? 
                    `;

    db.query(q, [id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getNiveau = (req, res) => {

    const q = `
                SELECT 
                    nb.*, 
                    b.nom_batiment 
                FROM 
                    niveau_batiment nb
                    INNER JOIN batiment b ON nb.id_batiment = b.id_batiment
                    WHERE nb.est_supprime = 0
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getNiveauOneV = (req, res) => {
    const {id_niveau} = req.query;

    const q = `
                SELECT * FROM niveau_batiment WHERE id_niveau = ?
            `;

    db.query(q,[id_niveau], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getNiveauOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `
                SELECT * FROM niveau_batiment WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.postNiveau = (req, res) => {
    const { id_batiment, nom_niveau } = req.body;

    if(!id_batiment){
        return res.status(400).json({ error: "L'ID de niveau est requis." })
    }
  
    const query = 'INSERT INTO niveau_batiment (id_batiment, nom_niveau) VALUES (?, ?)';
    const values = [id_batiment, nom_niveau];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion:', err);
        return res.status(500).send('Erreur serveur');
      }
      res.status(200).send('Bureau ajouté avec succès');
    });
  }; */

exports.postNiveau = (req, res) => {
    const { id_batiment, niveaux } = req.body;

    if (!id_batiment) {
        return res.status(400).json({ error: "L'ID du bâtiment est requis." });
    }
    if (!niveaux || !Array.isArray(niveaux) || niveaux.length === 0) {
        return res.status(400).json({ error: "La liste des niveaux est requise." });
    }

    // Construire une liste de valeurs pour l'insertion en masse
    const query = 'INSERT INTO niveau_batiment (id_batiment, nom_niveau) VALUES ?';
    const values = niveaux.map(niveau => [id_batiment, niveau.nom_niveau]);

    db.query(query, [values], (err, result) => {
        if (err) {
            console.error("Erreur lors de l'insertion :", err);
            return res.status(500).send("Erreur serveur");
        }
        res.status(200).send("Niveaux ajoutés avec succès");
    });
};

exports.putNiveau = (req, res) => {
    const { id_niveau } = req.query;
    const { nom_niveau } = req.body;

    if (!id_niveau || isNaN(id_niveau)) {
        return res.status(400).json({ error: 'ID de niveau fourni non valide' });
    }

    try {
        const q = `
            UPDATE niveau_batiment 
            SET 
                nom_niveau = ?
            WHERE id_niveau = ?
        `;
      
        const values = [nom_niveau, id_niveau]

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Niveau record not found' });
            }
            return res.json({ message: 'Niveau record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating niveau:", err);
        return res.status(500).json({ error: 'Failed to update bins record' });
    }
};

exports.deleteUpdateNiveau = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE niveau_batiment SET est_supprime = 1 WHERE id_niveau = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
};

//Denomination batiment
exports.getDenominationCount = (req, res) => {
    const { id_batiment} = req.query;
    const q = `
                SELECT 
                    COUNT(id_denomination_bat) AS nbre_denomination, batiment.nom_batiment
                FROM 
                    denomination_bat
                INNER JOIN batiment ON denomination_bat.id_batiment = batiment.id_batiment
                WHERE denomination_bat.est_supprime = 0  AND denomination_bat.id_batiment = ?`;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDenomination = (req, res) => {

    const q = `
                SELECT dn.*, b.nom_batiment FROM denomination_bat dn
                    INNER JOIN batiment b ON dn.id_batiment = b.id_batiment
                    WHERE dn.est_supprime = 0
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDenominationOneV = (req, res) => {
    const {id_denomination_bat} = req.query;

    const q = `
                SELECT * FROM denomination_bat WHERE id_denomination_bat = ?
            `;

    db.query(q,[id_denomination_bat], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDenominationOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `
                SELECT * FROM denomination_bat WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.postDenomination = (req, res) => {
    const { id_batiment, nom_denomination_bat } = req.body;

    if(!id_batiment){
        return res.status(400).json({ error: "L'ID de whse_fact est requis." })
    }

    const query = 'INSERT INTO denomination_bat (id_batiment, nom_denomination_bat) VALUES (?, ?)';
    const values = [id_batiment, nom_denomination_bat];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion:', err);
        return res.status(500).send('Erreur serveur');
      }
      res.status(200).send('Bureau ajouté avec succès');
    });
  }; */

exports.postDenomination = (req, res) => {
    const { id_batiment, denominations } = req.body;

    if (!id_batiment) {
        return res.status(400).json({ error: "L'ID du bâtiment est requis." });
    }
    if (!denominations || !Array.isArray(denominations) || denominations.length === 0) {
        return res.status(400).json({ error: "La liste des dénominations est requise." });
    }

    const query = 'INSERT INTO denomination_bat (id_batiment, nom_denomination_bat) VALUES ?';
    const values = denominations.map(d => [id_batiment, d.nom_denomination_bat]);

    db.query(query, [values], (err, result) => {
        if (err) {
            console.error("Erreur lors de l'insertion :", err);
            return res.status(500).send("Erreur serveur");
        }
        res.status(200).send("Dénominations ajoutées avec succès");
    });
};

exports.putDenomination = (req, res) => {
    const { id_denomination_bat } = req.query;
    const { nom_denomination_bat } = req.body;

    if (!id_denomination_bat || isNaN(id_denomination_bat)) {
        return res.status(400).json({ error: 'ID de denomination fourni non valide' });
    }

    try {
        const q = `
            UPDATE denomination_bat 
            SET 
                nom_denomination_bat = ?
            WHERE id_denomination_bat = ?
        `;
      
        const values = [nom_denomination_bat, id_denomination_bat]

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Niveau record not found' });
            }
            return res.json({ message: 'Niveau record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating niveau:", err);
        return res.status(500).json({ error: 'Failed to update bins record' });
    }
}

exports.deleteUpdateDenomination = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE denomination_bat SET est_supprime = 1 WHERE id_denomination_bat = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
  }
//WHSE FACT
exports.getWHSE_FACT = (req, res) => {

    const q = `
                 SELECT b1.nom_batiment AS nom_whse_fact, 
                    b.nom_batiment,
                    tc.desc_template,
                    td.nom_type_d_occupation
                FROM whse_fact
                    INNER JOIN batiment b1 ON whse_fact.id_batiment = b1.id_batiment
                    LEFT JOIN batiment b ON whse_fact.id_batiment = b.id_batiment
                    LEFT JOIN template_occupation tc ON whse_fact.id_whse_fact = tc.id_whse_fact
                    LEFT JOIN type_d_occupation td ON tc.id_type_occupation = td.id_type_d_occupation
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getWHSE_FACT_ONE = (req, res) => {
    const {id_batiment} = req.query;

    if(!id_batiment){
        return res.status(400).json({ error: "L'ID de whse_fact est requis." })
    }

    const q = `
                SELECT * FROM whse_fact WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postWHSE_FACT = (req, res) => {
    const { id_batiment, nom_whse_fact } = req.body;

    if(!id_batiment){
        return res.status(400).json({ error: "L'ID de whse_fact est requis." })
    }
  
    const query = 'INSERT INTO whse_fact (id_batiment, nom_whse_fact) VALUES (?, ?)';
    const values = [id_batiment, nom_whse_fact];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'insertion:', err);
        return res.status(500).send('Erreur serveur');
      }
      res.status(200).send('Bureau ajouté avec succès');
    });
  };

//Adresse
exports.getAdresse = (req, res) => {
    const { search } = req.query;

    let q = `
        SELECT adresse.*, bins.nom, batiment.nom_batiment 
        FROM adresse
        LEFT JOIN bins ON adresse.id_bin = bins.id
        LEFT JOIN batiment ON bins.id_batiment = batiment.id_batiment
        WHERE bins.est_supprime = 0
    `;

    if (search) {
        const escapedSearch = `%${search}%`;
        q += ` AND (
            adresse.adresse LIKE ${db.escape(escapedSearch)} OR 
            batiment.nom_batiment LIKE ${db.escape(escapedSearch)} OR 
            bins.nom LIKE ${db.escape(escapedSearch)}
        )`;
    }

    q += ` ORDER BY adresse.created_at DESC`;

    let qSQL = `
        SELECT 
            COUNT(DISTINCT a.id_adresse) AS nbre_adresse,
            COUNT(DISTINCT b.id) AS nbre_bins,
            COUNT(DISTINCT batiment.id_batiment) AS nbre_batiment,
            SUM(a.superfice_sol) AS total_superficie,
            SUM(a.volume_m3) AS total_volume
        FROM adresse a
        INNER JOIN bins b ON a.id_bin = b.id
        INNER JOIN batiment ON b.id_batiment = batiment.id_batiment
        WHERE b.est_supprime = 0
    `;

    if (search) {
        const escapedSearch = `%${search}%`;
        qSQL += ` AND (
            a.adresse LIKE ${db.escape(escapedSearch)} OR 
            batiment.nom_batiment LIKE ${db.escape(escapedSearch)} OR 
            b.nom LIKE ${db.escape(escapedSearch)}
        )`;
    }

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        db.query(qSQL, (errorSub, dataSub) => {
            if (errorSub) {
                return res.status(500).send(errorSub);
            }

            return res.status(200).json({
                data: data,
                statistiques: dataSub[0]
            });
        });
    });
};

exports.getAdresseBinOne = (req, res) => {
    const { id_bin} = req.query;

    if (isNaN(parseInt(id_bin))) {
        return res.status(400).json({ message: "L'identifiant doit être un nombre valide." });
    }

    const q = `
                SELECT adresse.*, bins.nom, batiment.nom_batiment FROM adresse
                    LEFT JOIN bins ON adresse.id_bin = bins.id
                    LEFT JOIN batiment ON bins.id_batiment = batiment.id_batiment
                    WHERE adresse.id_bin = ?
            `;

    db.query(q, [id_bin], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postAdresse = (req, res) => {
  const { id_bin, adresses } = req.body;

  if (!id_bin) {
    return res.status(400).json({ error: "L'ID de bin est requis." });
  }

  if (!Array.isArray(adresses) || adresses.length === 0) {
    return res.status(400).json({ error: "Au moins une adresse est requise." });
  }

  const values = adresses.map(({ adresse, superficie_sol, volume_m3 }) => [
    adresse,
    id_bin,
    superficie_sol,
    volume_m3
  ]);

  const query = 'INSERT INTO adresse (adresse, id_bin, superfice_sol, volume_m3) VALUES ?';

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error("Erreur lors de l'insertion:", err);
      return res.status(500).send("Erreur serveur");
    }
    res.status(200).send('Les adresses ont été ajoutées avec succès');
  });
};

//Inspection
/* exports.getInspection = (req, res) => {
    const { idTache } = req.query;

    const whereClauses = ["inspections.est_supprime = 0"];
    const values = [];

    if (idTache) {
        whereClauses.push("inspections.id_tache = ?");
        values.push(idTache);
    }

    const whereSQL = `WHERE ${whereClauses.join(" AND ")}`;

    const q = `
        SELECT 
            inspections.*, 
            im.img, 
            im.commentaire, 
            ti.nom_type_instruction, 
            tache.nom_tache, 
            batiment.nom_batiment, 
            ct.nom_cat_inspection 
        FROM inspections
        INNER JOIN inspection_img im ON inspections.id_inspection = im.id_inspection
        LEFT JOIN tache ON inspections.id_tache = tache.id_tache
        LEFT JOIN type_instruction ti ON inspections.id_type_instruction = ti.id_type_instruction
        LEFT JOIN batiment ON inspections.id_batiment = batiment.id_batiment
        LEFT JOIN cat_inspection ct ON inspections.id_cat_instruction = ct.id_cat_inspection
        ${whereSQL}
        GROUP BY inspections.id_inspection
        ORDER BY inspections.date_creation DESC
    `;

    db.query(q, values, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}; */

exports.getInspection = (req, res) => {
    const { idTache } = req.query;

    const q = `
        SELECT 
            inspections.*, 
            im.commentaire, 
            ti.nom_type_instruction, 
            tache.nom_tache, 
            batiment.nom_batiment, 
            ct.nom_cat_inspection 
        FROM inspections
        LEFT JOIN inspection_img im ON inspections.id_inspection = im.id_inspection
        LEFT JOIN tache ON inspections.id_tache = tache.id_tache
        LEFT JOIN type_instruction ti ON inspections.id_type_instruction = ti.id_type_instruction
        LEFT JOIN batiment ON inspections.id_batiment = batiment.id_batiment
        LEFT JOIN cat_inspection ct ON inspections.id_cat_instruction = ct.id_cat_inspection
        GROUP BY inspections.id_inspection
        ORDER BY inspections.date_creation DESC
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getInspectionOneV = (req, res) => {
    const {id} = req.query;
    const q = `
                SELECT inspections.*, im.img, im.commentaire, ti.nom_type_instruction, tache.nom_tache, batiment.nom_batiment, ct.nom_cat_inspection, type_photo.nom_type_photo FROM inspections
                    INNER JOIN inspection_img im ON inspections.id_inspection = im.id_inspection
                    INNER JOIN type_photo ON im.id_type_photo = type_photo.id_type_photo
                    LEFT JOIN tache ON inspections.id_tache = tache.id_tache
                    LEFT JOIN type_instruction ti ON inspections.id_type_instruction = ti.id_type_instruction
                    LEFT JOIN batiment ON inspections.id_batiment = batiment.id_batiment
                    LEFT JOIN cat_inspection ct ON inspections.id_cat_instruction = ct.id_cat_inspection

                WHERE inspections.id_inspection = ?
            `;

    db.query(q, [id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getInspectionOne = (req, res) => {
    const {id_batiment} = req.query;
    const q = `
                SELECT inspections.*, im.img, im.commentaire, ti.nom_type_instruction, tache.nom_tache, batiment.nom_batiment, ct.nom_cat_inspection FROM inspections
                    INNER JOIN inspection_img im ON inspections.id_inspection = im.id_inspection
                    LEFT JOIN tache ON inspections.id_tache = tache.id_tache
                    LEFT JOIN type_instruction ti ON inspections.id_type_instruction = ti.id_type_instruction
                    LEFT JOIN batiment ON inspections.id_batiment = batiment.id_batiment
                    LEFT JOIN cat_inspection ct ON inspections.id_cat_instruction = ct.id_cat_inspection
                WHERE inspections.id_batiment = ?
            `;

    db.query(q, [id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.postInspections = async (req, res) => {
    const { id_batiment,id_type_photo, commentaire, id_cat_instruction, id_type_instruction, id_tache } = req.body;

    // Vérification si des fichiers ont été envoyés
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    try {
        // Requête d'insertion dans la table `inspections` (une seule fois)
        const query = `
            INSERT INTO inspections (
                id_tache,
                id_batiment,
                id_cat_instruction,
                id_type_instruction
            ) VALUES (?, ?, ?, ?)
        `;

        const queryF = `
            INSERT INTO inspection_img (id_inspection, id_type_photo, img, commentaire)
            VALUES (?, ?, ?, ?)
        `;

        // Valeurs pour l'insertion dans `inspections` (elles sont communes pour tous les fichiers)
        const values = [id_tache, id_batiment, id_cat_instruction, id_type_instruction];

        // Insertion dans `inspections` (une seule fois pour tous les fichiers)
        const result = await new Promise((resolve, reject) => {
            db.query(query, values, (error, result) => {
                if (error) {
                    reject(error);  // On rejette l'erreur si elle survient
                } else {
                    resolve(result);  // On résout la promesse si l'insertion est un succès
                }
            });
        });

        // Récupérer l'ID de l'inspection nouvellement insérée
        const insertId = result.insertId;

        // Créer les promesses d'insertion dans `inspection_img` pour chaque fichier
        const promises = req.files.map(file => {
            const imgValues = [insertId, id_type_photo, file.path.replace(/\\/g, '/'), commentaire]; // Valeurs pour l'insertion de l'image
            return new Promise((resolve, reject) => {
                db.query(queryF, imgValues, (imgError, imgResult) => {
                    if (imgError) {
                        reject(imgError); // On rejette l'erreur d'insertion de l'image
                    } else {
                        resolve(imgResult); // On résout la promesse si l'insertion est un succès
                    }
                });
            });
        });

        // Attendre que toutes les promesses d'insertion d'image soient exécutées
        await Promise.all(promises);

        return res.status(201).json({ message: 'Déclaration ajoutée avec succès' });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la déclaration." });
    }
}; */

exports.postInspections = async (req, res) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur de connexion DB :", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if (trxErr) {
                connection.release();
                console.error("Erreur transaction :", trxErr);
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const {
                    id_batiment,
                    id_type_photo,
                    id_cat_instruction,
                    id_type_instruction,
                    id_tache,
                    subData
                } = req.body;

                const insertSQL = `
                    INSERT INTO inspections (
                        id_tache,
                        id_batiment,
                        id_cat_instruction,
                        id_type_instruction
                    ) VALUES (?, ?, ?, ?)`;

                const values = [
                    id_tache,
                    id_batiment,
                    id_cat_instruction,
                    id_type_instruction
                ];

                const [insertResult] = await queryPromise(connection, insertSQL, values);
                const insertId = insertResult.insertId;

                // Traitement des sous-données
                let parsedSub = Array.isArray(subData) ? subData : JSON.parse(subData || '[]');

                if (!Array.isArray(parsedSub)) {
                    throw new Error("Le champ `subData` doit être un tableau.");
                }

                parsedSub = parsedSub.map((sub, index) => {
                    const fieldName = `img_${index}`;
                    const file = req.files?.find(f => f.fieldname === fieldName);
                    return {
                        ...sub,
                        img: file ? `public/uploads/${file.filename}` : null
                    };
                });

                const subQuery = `
                    INSERT INTO inspection_img (id_inspection, id_type_photo, img, commentaire)
                    VALUES (?, ?, ?, ?)
                `;

                for (const sub of parsedSub) {
                    const subValues = [
                        insertId,
                        id_type_photo,
                        sub.img,
                        sub.commentaire
                    ];
                    await queryPromise(connection, subQuery, subValues);
                }

                await connection.commit();
                connection.release();

                return res.status(200).json({ success: true, message: "Inspection enregistrée avec succès." });

            } catch (error) {
                console.error("Erreur dans la transaction :", error);
                connection.rollback(() => {
                    connection.release();
                    const msg = error.message || "Erreur inattendue lors du traitement.";
                    return res.status(500).json({ error: msg });
                });
            }
        });
    });
};

exports.postInspectionsApre = async (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const { id_inspection, id_type_photo, commentaire, subData } = req.body;

        // 1. Image principale
        const mainImage = req.files?.find((f) => f.fieldname === 'img');
        const mainImgPath = mainImage ? `public/uploads/${mainImage.filename}` : null;

        const insertQuery = `
          INSERT INTO inspection_img (id_inspection, id_type_photo, img, commentaire)
          VALUES (?, ?, ?, ?)
        `;
        const insertValues = [id_inspection, id_type_photo, mainImgPath, commentaire || null];

        const [insertResult] = await queryPromise(connection, insertQuery, insertValues);
        const insertId = insertResult.insertId;

        // 2. Sous images
        let parsedSub = Array.isArray(subData) ? subData : JSON.parse(subData || '[]');

        if (!Array.isArray(parsedSub)) {
          throw new Error("Le champ `subData` doit être un tableau.");
        }

        const subQuery = `
          INSERT INTO inspection_img (id_inspection, id_type_photo, img, commentaire)
          VALUES (?, ?, ?, ?)
        `;

        for (let i = 0; i < parsedSub.length; i++) {
          const sub = parsedSub[i];
          const file = req.files?.find((f) => f.fieldname === `img_${i}`);
          const subImgPath = file ? `public/uploads/${file.filename}` : null;

          const subValues = [
            id_inspection,
            id_type_photo,
            subImgPath,
            sub.commentaire || null,
          ];

          await queryPromise(connection, subQuery, subValues);
        }

        await connection.commit();
        connection.release();

        return res.status(200).json({ success: true, message: "Inspection enregistrée avec succès." });

      } catch (error) {
        console.error("Erreur dans la transaction :", error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({
            error: error.message || "Erreur inattendue lors du traitement.",
          });
        });
      }
    });
  });
};

exports.putInspections = (req, res) => {
    const { id_inspection } = req.query;
    const { id_batiment, commentaire, id_cat_instruction, id_type_instruction } = req.body;

    // Vérification des paramètres
    if (!id_inspection || isNaN(id_inspection)) {
        return res.status(400).json({ error: "L'ID de l'inspection fourni est invalide ou manquant." });
    }

    if (!id_batiment || !id_cat_instruction || !id_type_instruction) {
        return res.status(400).json({ 
            error: "Les champs id_batiment, id_cat_instruction et id_type_instruction sont obligatoires." 
        });
    }

    const query = `
        UPDATE inspections 
        SET 
            id_batiment = ?,
            id_cat_instruction = ?,
            id_type_instruction = ?
        WHERE id_inspection = ?
    `;

    const subQuery = `
        UPDATE inspection_img 
        SET commentaire = ?
        WHERE id_inspection = ?
    `;

    // Première mise à jour dans la table `inspections`
    db.query(query, [id_batiment, id_cat_instruction, id_type_instruction, id_inspection], (error, result) => {
        if (error) {
            console.error("Erreur lors de la mise à jour de l'inspection :", error);
            return res.status(500).json({ error: "Erreur lors de la mise à jour de l'inspection." });
        }

        // Mise à jour du commentaire dans `inspection_img`
        db.query(subQuery, [commentaire, id_inspection], (errorSub, resultSub) => {
            if (errorSub) {
                console.error("Erreur lors de la mise à jour du commentaire :", errorSub);
                return res.status(500).json({ error: "Erreur lors de la mise à jour du commentaire." });
            }

            return res.status(200).json({ message: "Inspection mise à jour avec succès." });
        });
    });
};


exports.inspectionsTache = (req, res) => {
    const { id_inspection } = req.query;
    const { id_tache } = req.body;

    if (!id_inspection || isNaN(id_inspection)) {
        return res.status(400).json({ error: 'L\'ID de l\'inspection fourni est invalide ou manquant.' });
    }

    if (!id_tache) {
        return res.status(400).json({ 
            error: 'Le champs id_tache est obligatoire.' 
        });
    }

    try {
        const query = `
            UPDATE inspections 
            SET 
                id_tache = ?
            WHERE id_inspection = ?
        `;

        const values = [id_tache, id_inspection];

        db.query(query, values, (error, result) => {
            if (error) {
                console.error('Erreur lors de la mise à jour :', error);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'inspection.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Aucune inspection trouvée avec l\'ID fourni.' });
            }

            return res.json({ message: 'Inspection mise à jour avec succès.' });
        });
    } catch (err) {
        console.error('Erreur serveur :', err);
        return res.status(500).json({ error: 'Une erreur serveur est survenue.' });
    }
};

exports.deleteUpdateInspections = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE inspections SET est_supprime = 1 WHERE id_inspection = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
  }

exports.getTypeInstruction = (req, res) => {
    const q = `
                SELECT *
                FROM type_instruction
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getType_photo = (req, res) => {
    const q = `
                SELECT *
                FROM type_photo
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Inspection
exports.getCatInspection = (req, res) => {
    const q = `
                SELECT *
                FROM cat_inspection
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCatInspectionOne = (req, res) => {
    const {id_cat_inspection} = req.query;
    const q = `
                SELECT *
                    FROM cat_inspection
                WHERE id_cat_inspection = ?
            `;

    db.query(q, [id_cat_inspection], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postCatInspection = (req, res) => {
    const {nom_cat_inspection} = req.body;
    const q = 'INSERT INTO cat_inspection (nom_cat_inspection) VALUES (?)';
    
    db.query(q, [nom_cat_inspection], (err, result) => {
        if (err) {
            return res.status(500).send('Erreur lors de la création de bins');
        }
        res.status(201).send('Bins créé');
    });
};

exports.putCatInspection = async (req, res) => {
    const { id_cat_inspection  } = req.query;

    if (!id_cat_inspection  || isNaN(id_cat_inspection )) {
        return res.status(400).json({ error: 'Invalid Categorie inspection ID provided' });
    }

    try {
        const q = `
            UPDATE cat_inspection  
            SET 
                nom_cat_inspection = ?
            WHERE id_cat_inspection = ?
        `;
      
        const values = [
            req.body.nom_cat_inspection,
            id_cat_inspection
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Categorie inspection record not found' });
            }
            return res.json({ message: 'Categorie inspection record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating Categorie inspection:", err);
        return res.status(500).json({ error: 'Failed to update Categorie inspection record' });
    }
}

exports.deleteCatInspection = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM cat_inspection WHERE id_cat_inspection = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
}