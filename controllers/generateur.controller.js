const { db } = require("./../config/database");
const { promisify } = require("util");
const query = promisify(db.query).bind(db);

exports.getGenerateur = () => {
    const q = `SELECT * FROM generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
}

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
}

exports.postGenerateur = () => {
    const { code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir, valeur_acquisition, dimension, poids, longueur, largeur, annee_fabrication, annee_service, img, id_type_carburant, refroidissement, puissanc_sec, capacite_radiateur, frequence, nbre_cylindre, tension,type_lubrifiant, puissance_acc, pression_acc  } = req.body;

    if(!id_modele)
}