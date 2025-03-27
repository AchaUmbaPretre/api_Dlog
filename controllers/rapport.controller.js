const { db } = require("./../config/database");

exports.getRapport = (req, res) => {

    const q = `SELECT * FROM rapport_special`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.getRapportOne = (req, res) => {
    const { rapport } = req.query;

    const q = `SELECT * FROM rapport_special WHERE 	id_rapport_special = ?`

    db.query(q, [rapport], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.postRapport = async (req, res) => {
    try {
        const {
            periode, id_client, superficie, entreposage, transport_nrj, teu, lourd, tonnage, 
            peage_camion, teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
            bouteilles_intrants, camions_charge_decharge, sacs_tonne, user_cr
        } = req.body;

        if (!periode || !id_client || !user_cr) {
            return res.status(400).json({ error: "Les champs 'periode', 'id_client' et 'user_cr' sont obligatoires." });
        }

        const insertRapport = `
            INSERT INTO rapport_special (
                periode, id_client, superficie, entreposage, 
                transport_nrj, teu, lourd, tonnage, peage_camion, 
                teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
                bouteilles_intrants, camions_charge_decharge, sacs_tonne, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            periode, id_client, superficie, entreposage, transport_nrj, teu, lourd, tonnage, 
            peage_camion, teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
            bouteilles_intrants, camions_charge_decharge, sacs_tonne, user_cr
        ];

        // Exécution de la requête avec une promesse
        const result = await new Promise((resolve, reject) => {
            db.query(insertRapport, values, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return res.status(201).json({ 
            message: "Rapport ajouté avec succès.",
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout du rapport :", error);
        return res.status(500).json({ error: "Une erreur interne s'est produite." });
    }
};