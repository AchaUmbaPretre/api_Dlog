const { db } = require("./../config/database");

exports.getEquipement = (req, res) => {

    const q = `
                SELECT * FROM equipments
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
                equipments.maintenance_date, equipments.date_prochaine_maintenance, equipments.location, batiment.nom_batiment, statut_equipement.nom_statut, articles.nom_article FROM equipments 
                INNER JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                INNER JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                INNER JOIN articles ON equipments.id_type_equipement = articles.id_article
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
        const q = 'INSERT INTO equipments(`id_batiment`, `id_type_equipement`, `model`, `num_serie`, `installation_date`, `maintenance_date`,`date_prochaine_maintenance`, `location`, `status`) VALUES(?,?,?,?,?,?,?,?,?)';

        const values = [
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
                SELECT maintenance_logs.id_maintenance, maintenance_logs.maintenance_date, maintenance_logs.description, articles.nom_article, statut_maintenance.nom_statut_maintenance FROM maintenance_logs 
                    LEFT JOIN equipments ON maintenance_logs.id_equipement = equipments.id_equipement
                    LEFT JOIN articles ON equipments.id_type_equipement = articles.id_article
                    LEFT JOIN statut_maintenance ON maintenance_logs.status = statut_maintenance.id_statut_maintenance
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

    try {
        const q = 'INSERT INTO maintenance_logs(`id_equipement`, `maintenance_date`, `description`, `status`, `id_technicien`) VALUES(?,?,?,?,?)';

        const values = [
            req.body.id_equipement,
            req.body.maintenance_date,
            req.body.description,
            req.body.status,
            req.body.id_technicien
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Maintenance ajouté avec succès' });
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
                SELECT * FROM stocks_equipements
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