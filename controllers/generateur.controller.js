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
    const { code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir, valeur_acquisition, dimension, poids, longueur, largeur, annee_fabrication, annee_service, img, id_type_carburant, refroidissement, puissanc_sec, capacite_radiateur, frequence, cos_phi, nbre_cylindre, tension,type_lubrifiant, puissance_acc, pression_acc, capacite_carter, regime_moteur_vehicule, consommation_carburant, demarrage, nbr_phase, disposition_cylindre, user_cr  } = req.body;

    if(!id_modele) {
        res.status(400).send({message : 'Il y a des champs manquants.'})
    }

    try {
        let img = null;
        if (req.files && req.files.length > 0) {
            img = req.files.map((file) => file.path.replace(/\\/g, '/')).join(',');
        }

        const values =  [
            code_groupe, 
            id_type_gen, 
            id_modele, 
            num_serie, 
            puissance, 
            reservoir, 
            valeur_acquisition, 
            dimension, 
            poids, 
            longueur, 
            largeur, 
            annee_fabrication, 
            annee_service, 
            img, 
            id_type_carburant, 
            refroidissement,
             puissanc_sec, 
             capacite_radiateur, 
             frequence, 
             cos_phi, 
             nbre_cylindre, 
             tension,
             type_lubrifiant, 
             puissance_acc, 
             pression_acc, 
             capacite_carter, 
             regime_moteur_vehicule, 
             consommation_carburant, 
             demarrage, 
             nbr_phase, 
             disposition_cylindre, 
             user_cr
        ];

        const q = `INSERT INTO generateur (code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir, valeur_acquisition, dimension, poids, longueur, largeur, annee_fabrication, annee_service, img, id_type_carburant, refroidissement, puissanc_sec, capacite_radiateur, frequence, cos_phi, nbre_cylindre, tension,type_lubrifiant, puissance_acc, pression_acc, capacite_carter, regime_moteur_vehicule, consommation_carburant, demarrage, nbr_phase, disposition_cylindre, user_cr)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `
        
        db.query(q, values, (error, data)=> {
            if(error) {
                console.error(error)
            }
            res.status(201).json({ message: 'Le générateur ajouté avec succès' });
        })
        
    } catch (error) {
        console.error("Erreur lors de l'ajout du generateur :", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du generateur" });
    }
    
}