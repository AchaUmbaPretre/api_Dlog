const { db } = require("./../config/database");

exports.getGenerateur = () => {
    const q = `SELECT * FROM generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.getGenerateurOne = () => {
    const { id_generateur } = req.query;

    if(!id_generateur) {
        res.status(400).json({message: 'Paramètres manquants.'})
    }

    const q = `SELECT * FROM generateur WHERE id_generateur = ?`;

    db.query(q, [id_generateur], (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.postGenerateur = async (req, res) => {
    try {
        const {
            code_groupe,
            id_type_gen,
            id_modele,
            num_serie,
            puissance,
            reservoir,
            valeur_acquisition,
            dimension,
            longueur,
            largeur,
            hauteur,
            poids,
            annee_fabrication,
            annee_service,
            id_type_carburant,
            refroidissement,
            puissance_sec,
            capacite_radiateur,
            frequence,
            cos_phi,
            nbre_cylindre,
            tension,
            type_lubrifiant,
            puissance_acc,
            pression_acc,
            capacite_carter,
            regime_moteur,
            consommation_carburant,
            demarrage,
            nbr_phase,
            disposition_cylindre,
            user_cr
        } = req.body;

        // Vérification des champs obligatoires
        if (!id_modele || !puissance || !id_type_gen ) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires pour la logistique."
            });
        }

        // Calcul automatique du volume (m3)
        const volume = parseFloat(longueur) * parseFloat(largeur) * parseFloat(hauteur);

        let img = null;
        if (req.files && req.files.length > 0) {
            img = req.files.map(file => file.path.replace(/\\/g, "/")).join(",");
        }

        const values = [
            code_groupe,
            id_type_gen,
            id_modele,
            num_serie,
            puissance,
            reservoir,
            valeur_acquisition,
            dimension,
            longueur,
            largeur,
            hauteur,
            poids,
            volume,
            annee_fabrication,
            annee_service,
            img,
            id_type_carburant,
            refroidissement,
            puissance_sec,
            capacite_radiateur,
            frequence,
            cos_phi,
            nbre_cylindre,
            tension,
            type_lubrifiant,
            puissance_acc,
            pression_acc,
            capacite_carter,
            regime_moteur,
            consommation_carburant,
            demarrage,
            nbr_phase,
            disposition_cylindre,
            id_carburant_vehicule,
            user_cr
        ];

        const q = `
            INSERT INTO generateur (
                code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir, valeur_acquisition,
                dimension, longueur, largeur, hauteur, poids, volume, annee_fabrication, annee_service, img,
                id_type_carburant, refroidissement, puissance_sec, capacite_radiateur, frequence, cos_phi,
                nbre_cylindre, tension, type_lubrifiant, puissance_acc, pression_acc, capacite_carter,
                regime_moteur, consommation_carburant, demarrage, nbr_phase, disposition_cylindre, user_cr
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `;

        db.query(q, values, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Erreur serveur lors de l'ajout du générateur." });
            }

            res.status(201).json({
                message: "Générateur ajouté avec succès dans le système logistique (volume calculé automatiquement)."
            });
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};
