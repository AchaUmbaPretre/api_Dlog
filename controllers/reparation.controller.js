const moment = require('moment');
const { queryAsync } = require('../config/database');

//Controle technique
exports.getControleTechnique = async (req, res) => {
    try {
        const { filtre } = req.query;
        let whereClause = '';

        switch (filtre) {
            case 'encours':
                whereClause = 'WHERE ct.date_validite >= CURDATE()';
                break;
            case '3mois':
                whereClause = `
                    WHERE ct.date_validite >= CURDATE() 
                    AND ct.date_validite <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
                `;
                break;
            case 'expire':
                whereClause = 'WHERE ct.date_validite < CURDATE()';
                break;
            default:
                whereClause = '';
        }

        const query = `
            SELECT ct.id_controle_tech, ct.date_controle, ct.date_validite, ct.kilometrage, 
                   ct.ref_controle, ct.resultat, ct.cout_device, ct.cout_ttc, ct.taxe, 
                   ct.commentaire, v.immatriculation, f.nom_fournisseur, 
                   c.nom AS nom_chauffeur, m.nom_marque, tr.type_rep, rct.description,
                    CASE
                        WHEN CURDATE() <= ct.date_validite THEN
                            CASE
                                WHEN ct.date_validite <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH) THEN 'Expire dans 3 mois'
                                ELSE 'En cours'
                            END
                        ELSE 'Expiré'
                    END AS statut
            FROM controle_technique ct
            INNER JOIN vehicules v ON ct.id_vehicule = v.id_vehicule
            INNER JOIN marque m ON v.id_marque = m.id_marque
            INNER JOIN fournisseur f ON ct.id_fournisseur = f.id_fournisseur
            INNER JOIN chauffeurs c ON ct.id_chauffeur = c.id_chauffeur
            INNER JOIN reparation_controle_tech rct ON ct.id_controle_tech = rct.id_controle_technique
            INNER JOIN type_reparations tr ON rct.id_type_reparation = tr.id_type_reparation
            ${whereClause} 
            ORDER BY ct.date_validite ASC
        `;

        const controle = await queryAsync(query);

        return res.status(200).json({
            message: 'Liste de controle de technique récupérées avec succès',
            data: controle,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des suivie :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des suivie.",
        });
    }
};

exports.postControlTechnique = async (req, res) => {
    try {
        const date_controle = moment(req.body.date_controle).format('YYYY-MM-DD');
        const date_validite = moment(req.body.date_validite).format('YYYY-MM-DD');

        const {
            id_vehicule,
            kilometrage,
            ref_controle,
            id_agent,
            resultat,
            cout_device,
            cout_ttc,
            taxe,
            id_fournisseur,
            id_chauffeur,
            commentaire,
            reparations,
            user_cr
        } = req.body;

        const insertQuery = `
            INSERT INTO controle_technique (
                id_vehicule, date_controle, date_validite, kilometrage, ref_controle, id_agent,
                 resultat, cout_device, cout_ttc, taxe, id_fournisseur, id_chauffeur, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const controleValues = [
            id_vehicule,
            date_controle,
            date_validite,
            kilometrage,
            ref_controle,
            id_agent,
            resultat,
            cout_device,
            cout_ttc,
            taxe,
            id_fournisseur,
            id_chauffeur,
            commentaire,
            user_cr
        ];

        const result = await queryAsync(insertQuery, controleValues);
        const insertId = result.insertId;

        if (!Array.isArray(reparations)) {
            return res.status(400).json({
                error: "Le champ `réparations` doit être un tableau."
            });
        }

        const insertSudReparationQuery = `
            INSERT INTO reparation_controle_tech (
                id_controle_technique, id_type_reparation, visite, description
            ) VALUES (?, ?, ?, ?)
        `;

        const sudReparationPromises = reparations.map((sud) => {
            const sudValues = [insertId, sud.id_type_reparation, sud.visite, sud.description];
            return queryAsync(insertSudReparationQuery, sudValues);
        });

        await Promise.all(sudReparationPromises);

        return res.status(201).json({
            message: 'Le controle technique a été ajouté avec succès',
            data: { id: insertId },
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout de maintenance :', error);

        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage =
            error.code === 'ER_DUP_ENTRY'
                ? "Une réparation avec ces informations existe déjà."
                : "Une erreur s'est produite lors de l'ajout de la réparation.";

        return res.status(statusCode).json({ error: errorMessage });
    }
};