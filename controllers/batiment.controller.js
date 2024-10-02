const { db } = require("./../config/database");

exports.getEquipement = (req, res) => {

    const q = `
                SELECT equipments.model, equipments.num_serie, 
                    equipments.id_equipement, equipments.installation_date, 
                    equipments.maintenance_date, equipments.date_prochaine_maintenance, bins.nom AS location, batiment.nom_batiment, statut_equipement.nom_statut, articles.nom_article FROM equipments 
                    INNER JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                    INNER JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                    INNER JOIN articles ON equipments.id_type_equipement = articles.id_article
                    INNER JOIN bins ON equipments.id_bin = bins.id
            `;

    db.query(q, (error, data) => {
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

exports.getBatimentPlans = (req, res) => {

    const q = `
                SELECT * FROM batiment_plans
            `;

    db.query(q, (error, data) => {
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

//BINS
exports.getBins = (req, res) => {

    const q = `
                SELECT bins.id, bins.id_entrepot, bins.nom, bins.superficie, 
                    bins.longueur, bins.largeur, bins.hauteur, 
                    bins.capacite, statut_bins.nom_statut_bins AS statut, 
                    type_stockage_bins.nom_stockage AS type_stockage,
                    batiment.nom_batiment
                FROM bins
                    INNER JOIN statut_bins ON bins.statut = statut_bins.id_statut_bins
                    INNER JOIN type_stockage_bins ON bins.type_stockage = type_stockage_bins.id_type_stockage_bins
                    INNER JOIN entrepots ON bins.id_entrepot = entrepots.id
                    INNER JOIN batiment ON entrepots.id_batiment = batiment.id_batiment
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBinsOne = (req, res) => {
    const {	id_entrepot } = req.query;

    const q = `
                SELECT bins.id, bins.id_entrepot, bins.nom, bins.superficie, 
                    bins.longueur, bins.largeur, bins.hauteur, 
                    bins.capacite, statut_bins.nom_statut_bins AS statut, 
                    type_stockage_bins.nom_stockage AS type_stockage 
                FROM bins
                    INNER JOIN statut_bins ON bins.statut = statut_bins.id_statut_bins
                    INNER JOIN type_stockage_bins ON bins.type_stockage = type_stockage_bins.id_type_stockage_bins
                WHERE bins.id_entrepot = ?
            `;

    db.query(q,[id_entrepot], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBins = (req, res) => {
    const { id_entrepot, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut} = req.body;
    const q = 'INSERT INTO bins (id_entrepot, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut ) VALUES (?,?,?,?,?,?,?,?,?)';
    
    db.query(q, [id_entrepot, nom, superficie, longueur, largeur, hauteur, capacite, type_stockage, statut], (err, result) => {
        if (err) {
            console.log(err)
            return res.status(500).send('Erreur lors de la création de bins');
        }
        res.status(201).send('Bins créé');
    });
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
                SELECT * FROM bureaux
            `;

    db.query(q, (error, data) => {
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