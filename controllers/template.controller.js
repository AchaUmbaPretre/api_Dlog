const { db } = require("./../config/database");

//Template
exports.getTemplate = (req, res) => {

    const q = `
            SELECT * FROM template_occupation
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
        const q = 'INSERT INTO template_occupation(`id_client`, `id_type_occupation`, `id_batiment`, `id_niveau`, `id_denomination`, `id_whse_fact`, `id_objet_fact`, `desc_template`, `status_template`) VALUES(?,?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.id_client,
            req.body.id_type_occupation,
            req.body.id_batiment,
            req.body.id_niveau,
            req.body.id_denomination,
            req.body.id_whse_fact,
            req.body.id_objet_fact,
            req.body.desc_template,
            req.body.status_template        
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Batiment ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};