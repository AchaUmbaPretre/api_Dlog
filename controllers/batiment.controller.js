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

exports.postEquipement = async (req, res) => {

    try {
        const q = 'INSERT INTO equipments(`id_batiment`, `id_type_equipement`, `model`, `num_serie`, `installation_date`, `maintenance_date`, `location`, `status`) VALUES(?,?,?,?,?,?,?,?)';

        const values = [
            req.body.id_batiment,
            req.body.id_type_equipement,
            req.body.model,
            req.body.num_serie,
            req.body.installation_date,
            req.body.maintenance_date,
            req.body.location,
            req.body.status
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Suivi de tache ajouté avec succès' });
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

    documents.forEach((doc) => {
        const query = 'INSERT INTO batiment_plans(`id_batiment`, `nom_document`, `type_document`, `chemin_document`) VALUES(?,?,?,?,?,?,?,?)';

        db.query(query, [doc.id_batiment, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'insertion du document:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }
        });
    });

    res.status(200).json({ message: 'Documents ajoutés avec succès' });
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

exports.postMaintenance = async (req, res) => {

    try {
        const q = 'INSERT INTO maintenance_logs(`id_equipement`, `maintenance_date`, `description`, `status`) VALUES(?,?,?,?)';

        const values = [
            req.body.id_equipement,
            req.body.maintenance_date,
            req.body.description,
            req.body.status
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