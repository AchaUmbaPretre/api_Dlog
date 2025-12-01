const { db } = require("./../config/database");

//Type des Générateurs
exports.getTypeGenerateur = (req, res) => {
  const query = `SELECT * FROM type_generateur`;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Erreur lors de la récupération des types de générateur :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de la récupération des types de générateur."
      });
    }

    return res.status(200).json(results);
  });
};

exports.postTypeGenerateur = (req, res) => {
  const { nom_type_gen } = req.body;

  if (!nom_type_gen || nom_type_gen.trim() === "") {
    return res.status(400).json({ message: "Le nom du type de générateur est requis." });
  }

  const query = `INSERT INTO type_generateur (nom_type_gen) VALUES (?)`;
  const values = [nom_type_gen];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l’insertion du type de générateur :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "Le type de générateur a été enregistré avec succès.",
      insertedId: result.insertId
    });
  });
};

//Marque generateur
exports.getMarqueGenerateur = (req,res) => {
    const q = `SELECT * FROM marque_generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.postMarqueGenerateur = (req, res) => {
  const { nom_marque } = req.body;

  // Validation
  if (!nom_marque || nom_marque.trim() === "") {
    return res.status(400).json({ message: "Le nom de la marque est requis." });
  }

  const query = `INSERT INTO marque_generateur (nom_marque) VALUES (?)`;
  const values = [nom_marque.trim()];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l'insertion de la marque :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "La marque a été enregistrée avec succès.",
      insertedId: result.insertId
    });
  });
};

//Modele generateur
exports.getModeleGenerateur = (req,res) => {
    const q = `SELECT * FROM modele_generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.getModeleGenerateurOne = (req,res) => {
    const {id_marque_generateur} = req.query;

    if(!id_marque_generateur) {
        res.status(400).json({message: "Veuillez entrer l'id marque"})
    }

    const q = `SELECT * FROM modele_generateur WHERE id_marque_generateur = ?`;

    db.query(q, [id_marque_generateur], (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.postModeleGenerateur = (req, res) => {
  const { nom_modele, id_marque_generateur } = req.body;

  // Validation
  if (!nom_modele || nom_modele() === "") {
    return res.status(400).json({ message: "Le nom du modèle est requis." });
  }

  const query = `INSERT INTO modele_generateur (nom_modele, id_marque_generateur) VALUES (?,?)`;
  const values = [nom_modele.trim(), id_marque_generateur];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l'insertion de la marque :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "Le modèle a été enregistré avec succès.",
      insertedId: result.insertId
    });
  });
};

//Refroidissement
exports.getRefroidissement = (req, res) => {
    const q = `SELECT * FROM refroidissement`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

//Générateur
exports.getGenerateur = (req, res) => {
    const q = `SELECT * FROM generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.getGenerateurOne = (req, res) => {
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

        console.log(req.body)

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
