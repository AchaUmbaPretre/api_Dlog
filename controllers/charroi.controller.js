const { db } = require("./../config/database");

const queryAsync = (query, values = []) =>
    new Promise((resolve, reject) => {
        db.query(query, values, (error, results) => {
            if (error) {
                return reject(error);
        }
        resolve(results);
    });
});

exports.getCatVehicule = (req, res) => {

    const q = `SELECT * FROM cat_vehicule`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getMarque = (req, res) => {

    const q = `SELECT * FROM marque`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getModele = (req, res) => {
    const { id_marque } = req.query;

    const q = `SELECT * FROM modeles WHERE id_marque = ?`;

    db.query(q, [id_marque], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDisposition = (req, res) => {

    const q = `SELECT * FROM disposition_cylindre`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCouleur = (req, res) => {

    const q = `SELECT * FROM couleurs`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTypeCarburant = (req, res) => {

    const q = `SELECT * FROM type_carburant`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTypePneus = (req, res) => {

    const q = `SELECT * FROM type_pneus`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getLubrifiant = (req, res) => {

    const q = `SELECT * FROM lubrifiant`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Vehicule
exports.getVehiculeCount = async (req, res) => {

    try {
          const query = `SELECT COUNT(id) AS nbre_vehicule FROM vehicules`;
          const [result] = await queryAsync(query);
      
          return res.status(200).json({
            message: 'Le nombre total de véhicules a été récupéré avec succès.',
            data: result,
          });
    } catch (error) {
          console.error('Erreur lors de la récupération des chauffeurs :', error);
        return res.status(500).json({
            message: "Une erreur s'est produite lors de la récupération des chauffeurs.",
            error: error.message,
        });
    }
};

exports.getVehicule = async (req, res) => {
    try {
        const query = `SELECT v.*, marque.nom_marque, modeles.modele, cv.nom_cat FROM vehicules v
                            INNER JOIN marque ON v.id_marque = marque.id_marque
                            LEFT JOIN modeles ON v.id_modele = modeles.id_modele
                            INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule`;

            const chauffeurs = await queryAsync(query);
    
            return res.status(200).json({
                message: 'Liste des véhicules récupérés avec succès',
                data: chauffeurs,
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des chauffeurs :', error);
    
            return res.status(500).json({
                error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
            });
        }
};

exports.getVehiculeOne = async (req, res) => {
    const { id_vehicule } = req.query;

    try {
        const query = `SELECT v.* FROM vehicules v WHERE v.id_vehicule = ?`;

            const chauffeurs = await queryAsync(query, id_vehicule);
    
            return res.status(200).json({
                message: 'Liste des véhicules récupérés avec succès',
                data: chauffeurs,
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des chauffeurs :', error);
    
            return res.status(500).json({
                error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
            });
        }
};

exports.postVehicule = async (req, res) => {

    try {
        let img = null;
        if (req.files && req.files.length > 0) {
            img = req.files.map((file) => file.path.replace(/\\/g, '/')).join(',');
        }

        // Déstructuration des champs du corps de la requête
        const {
            immatriculation,
            numero_ordre,
            id_marque,
            id_modele,
            variante,
            num_chassis,
            annee_fabrication,
            annee_circulation,
            id_cat_vehicule,
            id_type_permis_vehicule,
            longueur,
            largeur,
            hauteur,
            poids,
            id_couleur,
            capacite_carburant,
            capacite_radiateur,
            capacite_carter,
            nbre_place,
            nbre_portes,
            nbre_moteur,
            cylindre,
            nbre_cylindre,
            disposition_cylindre,
            id_type_carburant,
            regime_moteur_vehicule,
            consommation_carburant,
            turbo,
            date_service,
            km_initial,
            nbre_chev,
            id_transmission,
            id_climatisation,
            pneus,
            valeur_acquisition,
            lubrifiant_moteur,
            id_etat,
            user_cr
        } = req.body;

        // Préparation de la requête SQL
        const query = `
            INSERT INTO vehicules (
                immatriculation, numero_ordre, id_marque, id_modele, variante, num_chassis,
                annee_fabrication, annee_circulation, id_cat_vehicule, id_type_permis_vehicule, img,
                longueur, largeur, hauteur, poids, id_couleur, capacite_carburant, capacite_radiateur,
                capacite_carter, nbre_place, nbre_portes, nbre_moteur, cylindre, nbre_cylindre, disposition_cylindre,
                id_type_carburant, regime_moteur_vehicule, consommation_carburant, turbo, date_service, km_initial, nbre_chev,
                id_transmission, id_climatisation, pneus, valeur_acquisition, lubrifiant_moteur, id_etat, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Préparation des valeurs à insérer
        const values = [
            immatriculation, numero_ordre, id_marque, id_modele, variante, num_chassis,  
            annee_fabrication, annee_circulation, id_cat_vehicule, id_type_permis_vehicule, img,
            longueur, largeur, hauteur, poids, id_couleur, capacite_carburant, capacite_radiateur,
            capacite_carter, nbre_place, nbre_portes, nbre_moteur, cylindre, nbre_cylindre, disposition_cylindre, 
            id_type_carburant, regime_moteur_vehicule, consommation_carburant, turbo, date_service, km_initial, nbre_chev,
            id_transmission, id_climatisation, pneus, valeur_acquisition, lubrifiant_moteur, id_etat, user_cr
        ];

        // Exécution de la requête d'insertion
        const result = await queryAsync(query, values);

        return res.status(201).json({
            message: 'Véhicule ajouté avec succès',
            data: { id: result.insertId, immatriculation, numero_ordre },
        });

    } catch (error) {
        console.error('Erreur lors de l’ajout du véhicule :', error);

        // Gestion des erreurs SQL
        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage =
            error.code === 'ER_DUP_ENTRY'
                ? "Un véhicule avec ces informations existe déjà."
                : "Une erreur s'est produite lors de l'ajout du véhicule.";

        return res.status(statusCode).json({ error: errorMessage });
    }
};

exports.putVehicule = async (req, res) => {
    try {
        let img = null;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            img = req.files.map(file => file.path.replace(/\\/g, '/')).join(',');
        }

        const {
            immatriculation, numero_ordre, id_marque, id_modele, variante, num_chassis,  
            annee_fabrication, annee_circulation, id_cat_vehicule, id_type_permis_vehicule,
            longueur, largeur, hauteur, poids, id_couleur, capacite_carburant, capacite_radiateur,
            capacite_carter, nbre_place, nbre_portes, nbre_moteur, cylindre, nbre_cylindre, disposition_cylindre, 
            id_type_carburant, regime_moteur_vehicule, consommation_carburant, turbo, date_service, km_initial, nbre_chev,
            id_transmission, id_climatisation, pneus, valeur_acquisition, lubrifiant_moteur, id_etat, user_cr, id_vehicule
        } = req.body;

        if (!id_vehicule) {
            return res.status(400).json({ error: "L'identifiant du véhicule est requis." });
        }

        const query = `
            UPDATE vehicules
            SET immatriculation = ?, numero_ordre = ?, id_marque = ?, id_modele = ?,
                variante = ?, num_chassis = ?, annee_fabrication = ?, annee_circulation = ?, id_cat_vehicule = ?, id_type_permis_vehicule = ?, 
                img = ?, longueur = ?, largeur = ?, hauteur = ?, poids = ?, id_couleur = ?, capacite_carburant = ?, capacite_radiateur = ?, capacite_carter = ?,
                nbre_place = ?, nbre_portes = ?, nbre_moteur = ?, cylindre = ?, nbre_cylindre = ?, disposition_cylindre = ?, id_type_carburant = ?,
                regime_moteur_vehicule = ?, consommation_carburant = ?, turbo = ?, date_service = ?, km_initial = ?, nbre_chev = ?,
                id_transmission = ?, id_climatisation = ?, pneus = ?, valeur_acquisition = ?, lubrifiant_moteur = ?, id_etat = ?, user_cr = ?
            WHERE id_vehicule = ?
        `;

        const values = [
            immatriculation || null, numero_ordre || null, id_marque || null, id_modele || null, variante || null, num_chassis || null,  
            annee_fabrication || null, annee_circulation || null, id_cat_vehicule || null, id_type_permis_vehicule || null, img || null,
            longueur || null, largeur || null, hauteur || null, poids || null, id_couleur || null, capacite_carburant || null, capacite_radiateur || null,
            capacite_carter || null, nbre_place || null, nbre_portes || null, nbre_moteur || null, cylindre || null, nbre_cylindre || null, disposition_cylindre || null, 
            id_type_carburant || null, regime_moteur_vehicule || null, consommation_carburant || null, turbo || null, date_service || null, km_initial || null, nbre_chev || null,
            id_transmission || null, id_climatisation || null, pneus || null, valeur_acquisition || null, lubrifiant_moteur || null, id_etat || null, user_cr || null, id_vehicule
        ];

        const result = await queryAsync(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Aucun véhicule trouvé avec cet identifiant." });
        }

        return res.status(200).json({ message: "Véhicule mis à jour avec succès." });

    } catch (error) {
        console.error("Erreur lors de la mise à jour du véhicule :", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de la mise à jour du véhicule." });
    }
};

exports.deleteVehicule = async (req, res) => {
    try {
      const { id_vehicule } = req.query;

      if (!id_vehicule) {
        return res.status(400).json({ message: "Paramètre 'id_vehicule' manquant." });
      }
  
      const q = "UPDATE vehicules SET est_supprime = 1 WHERE id_vehicule = ?";
  
      db.query(q, [id_vehicule], (err, result) => {
        if (err) {
          console.error("Erreur de requête de base de données:", err);
          return res.status(500).json({ message: "Une erreur de base de données s'est produite." });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Vehicule introuvable." });
        }
  
        return res.status(200).json({ message: "Vehicule supprimé avec succès." });
      });
    } catch (error) {
      console.error("Erreur inattendue:", error);
      return res.status(500).json({ message: "Une erreur inattendue s'est produite." });
    }
};

//Chauffeur
exports.getChauffeurCount = async(req, res) => {

    try {
        const query = `SELECT COUNT(id) AS nbre_chauffeur FROM chauffeurs`

        const chauffeurs = await queryAsync(query);
        return res.status(200).json({
            message: 'Le count est récupéré avec succès',
            data: chauffeurs,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chauffeurs :', error);
    
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
        });
    }
}

exports.getChauffeur = async (req, res) => {
    try {
        const query = `SELECT ch.*, s.nom_site FROM chauffeurs ch
                            LEFT JOIN affectations a ON ch.id_chauffeur = a.id_chauffeur
                            LEFT JOIN sites s ON a.id_site = s.id_site`;

            const chauffeurs = await queryAsync(query);
    
            return res.status(200).json({
                message: 'Liste des chauffeurs récupérée avec succès',
                data: chauffeurs,
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des chauffeurs :', error);
    
            return res.status(500).json({
                error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
            });
        }
};

exports.postChauffeur = async (req, res) => {
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier téléchargé' });
        }

        const profil = req.files.map((file) => file.path.replace(/\\/g, '/')).join(',');

        const {
            matricule,
            nom,
            prenom,
            telephone,
            adresse,
            id_etat_civil,
            statut,
            sexe,
            id_type_contrat,
            type_travail,
            id_permis,
            id_ville,
            date_naissance,
            date_engagement,
            user_cr,
            tel_service,
        } = req.body;

        const query = `
            INSERT INTO chauffeurs (
                matricule, nom, prenom, telephone, adresse, id_etat_civil,
                statut, profil, sexe, id_type_contrat, type_travail,
                id_permis, id_ville, date_naissance, date_engagement, user_cr, tel_service
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            matricule, nom, prenom, telephone, adresse, id_etat_civil,
            statut, profil, sexe, id_type_contrat, type_travail,
            id_permis, id_ville, date_naissance, date_engagement, user_cr, tel_service,
        ];

        const result = await queryAsync(query, values);

        return res.status(201).json({
            message: 'Chauffeur ajouté avec succès',
            data: { id: result.insertId, nom, prenom },
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du chauffeur :', error);

        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage =
            error.code === 'ER_DUP_ENTRY'
                ? "Un chauffeur avec ces informations existe déjà."
                : "Une erreur s'est produite lors de l'ajout du chauffeur.";

        return res.status(statusCode).json({ error: errorMessage });
    }
};

//Permis
exports.getCatPermis = (req, res) => {

    const q = `SELECT * FROM cat_permis`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Sexe
exports.getEtatCivil = (req, res) => {

    const q = `SELECT * FROM etat_civils`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Type fonction
exports.getTypeFonction = (req, res) => {

    const q = `SELECT * FROM type_fonction`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Site
exports.getSites = async (req, res) => {

    try {
        const query = `SELECT 
                            s.id_site,
                            s.CodeSite, 
                            s.nom_site, 
                            s.adress, 
                            s.tel,
                            p.name
                        FROM 
                            sites s
                            INNER JOIN provinces p ON s.IdVille = p.id`;
    
        const typeTache = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste des sites récupérées avec succès',
            data: typeTache,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des sites:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des sites",
        });
    }
}

exports.postSites = async (req, res) => {
    const { CodeSite, IdVille, nom_site, IdZone, adress, tel, state, ref_site  } = req.body;

    try {
        const q = 'INSERT INTO sites(`CodeSite`, `IdVille`, `nom_site`, `IdZone`, `adress`, `tel`, `state`, `ref_site`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)';

        const values = [
            CodeSite,
            IdVille,
            nom_site,
            IdZone,
            adress,
            tel,
            state,
            ref_site
        ]
        
        await db.query(q, values, (error, result) => {
            if(error) {
                console.log(error)
            }

            return res.status(201).json({ message: 'Le site ete ajouté avec succès'})

        });

    } catch (error) {
        console.error('Erreur lors de la récupération des sites:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des sites",
        });
    }
}

//Affectation
exports.getAffectation = async (req, res) => {

    try {
        const query = `SELECT 
                            *
                        FROM 
                            affectations`;
    
        const typeTache = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste d affectation récupérée avec succès',
            data: typeTache,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des sites:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des sites",
        });
    }
}

exports.postAffectation = async (req, res) => {
    const { CodeSite, IdVille, nom_site, IdZone, adress, tel, state, ref_site  } = req.body;

    try {
        const q = 'INSERT INTO sites(`CodeSite`, `IdVille`, `nom_site`, `IdZone`, `adress`, `tel`, `state`, `ref_site`) VALUES(?, ?, ?, ?, ?, ?, ?, ?)';

        const values = [
            CodeSite,
            IdVille,
            nom_site,
            IdZone,
            adress,
            tel,
            state,
            ref_site
        ]
        
        await db.query(q, values, (error, result) => {
            if(error) {
                console.log(error)
            }

            return res.status(201).json({ message: 'Le site ete ajouté avec succès'})

        });

    } catch (error) {
        console.error('Erreur lors de la récupération des sites:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des sites",
        });
    }
}