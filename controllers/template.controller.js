const { db } = require("./../config/database");

//Template
exports.getTemplate = (req, res) => {

    const q = `
           SELECT 
                tm.id_template, 
                tm.date_actif,
                tm.date_inactif,
                tm.desc_template,
                client.nom, 
                td.nom_type_d_occupation, 
                batiment.nom_batiment, 
                dn.nom_denomination_bat, 
                whse_fact.nom_whse_fact,
                objet_fact.nom_objet_fact,
                statut_template.nom_statut_template,
                statut_template.id_statut_template,
                niveau_batiment.nom_niveau
            FROM 
                template_occupation tm
                INNER JOIN client ON tm.id_client = client.id_client
                INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
                INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
                INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
                INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
                INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
                INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
                INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau          
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTemplateOne = (req, res) => {
    const {id_batiment} = req.query;

    const q = `
           SELECT * FROM template_occupation WHERE id_batiment = ?
            `;

    db.query(q,[id_batiment], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postTemplate = async (req, res) => {
    try {
        const query = `
            INSERT INTO template_occupation 
            (id_client, id_type_occupation, id_batiment, id_niveau, id_denomination, id_whse_fact, id_objet_fact, desc_template, status_template, date_actif) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            req.body.id_client,
            req.body.id_type_occupation,
            req.body.id_batiment,
            req.body.id_niveau,
            req.body.id_denomination,
            req.body.id_whse_fact,
            req.body.id_objet_fact,
            req.body.desc_template , 
            req.body.status_template || 1,
            req.body.date_actif || new Date() 
        ];

        await db.query(query, values);
        return res.status(201).json({ message: 'Template ajouté avec succès' });
    } catch (error) {
        console.error("Erreur lors de l'ajout du nouveau template:", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du template." });
    }
};


//Type d'occupation
exports.getTypeOccupation = (req, res) => {

    const q = `
            SELECT * FROM type_d_occupation
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Objet facture
exports.getObjetFacture = (req, res) => {

    const q = `
            SELECT * FROM objet_fact
            `;  

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    }); 
};

//Déclaration superficie
exports.getDeclaration = (req, res) => {

    const q = `
           SELECT * FROM declaration_superficie   
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDeclarationOne = (req, res) => {

    const q = `
           SELECT * FROM declaration_superficie   
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDeclaration = async (req, res) => {
    try {
        const query = `
            INSERT INTO declaration_superficie (type_activite, id_ville, id_client, id_batiment, id_objet, manutention, tarif_manutention, debours, total, ttc, observation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            req.body.type_activite,
            req.body.id_ville,
            req.body.id_client,
            req.body.id_batiment,
            req.body.id_objet,
            req.body.manutention,
            req.body.tarif_manutention,
            req.body.debours,
            req.body.total,
            req.body.ttc,
            req.body.observation
        ];

        await db.query(query, values);
        return res.status(201).json({ message: 'Déclaration ajoutée avec succès' });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la déclaration." });
    }
};
