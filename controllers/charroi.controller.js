const { db } = require("./../config/database");
const moment = require('moment');
const util = require('util');

// 📦 Petite helper function pour convertir mysql en Promises
function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }

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

exports.postMarque = async (req, res) => {
    try {
        const q = 'INSERT INTO marque(`nom_marque`) VALUES(?)';

        const values = [
            req.body.nom_marque
        ];

        await db.query(q, values);
        return res.json('Processus réussi');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du vehicule." });
    }
}

exports.deleteMarque = (req, res) => {
    const id_marque = req.params.id;
  
    const q = "DELETE marque WHERE id_marque= ?";
  
    db.query(q, [id_marque], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }

exports.getModeleAll = (req, res) => {

    const q = `SELECT 
                    md.id_modele, 
                    md.modele, 
                    m.nom_marque 
                FROM modeles md
                INNER JOIN marque m ON m.id_marque = md.id_marque
                `;

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

exports.postModele = async (req, res) => {
    try {
        const { id_marque, modele } = req.body;

        if (!id_marque || !modele) {
            return res.status(400).json({ error: "Les champs 'id_marque' et 'modele' sont requis." });
        }

        const query = 'INSERT INTO modeles (id_marque, modele) VALUES (?, ?)';
        const values = [id_marque, modele];

        await db.query(query, values);

        return res.status(201).json({ message: 'Modèle enregistré avec succès.' });

    } catch (error) {
        console.error('Erreur dans postModele:', error);

        return res.status(500).json({
            error: "Une erreur s'est produite lors de l'ajout du véhicule.",
            details: error?.message || null,
        });
    }
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
        const query = `
            SELECT 
                v.id_vehicule, 
                v.immatriculation, 
                v.variante, 
                v.num_chassis, 
                v.annee_fabrication, 
                v.annee_circulation, 
                v.img, 
                v.longueur, 
                v.largeur,
                v.hauteur,
                v.poids,
                v.capacite_carburant,
                v.capacite_radiateur,
                v.capacite_carter,
                v.nbre_place,
                v.nbre_portes,
                v.nbre_moteur,
                v.date_service,
                v.pneus,
                marque.nom_marque, 
                modeles.modele, 
                cv.nom_cat, 
                c.nom_couleur, 
                u.nom
            FROM vehicules v
                LEFT JOIN marque ON v.id_marque = marque.id_marque
                LEFT JOIN modeles ON v.id_modele = modeles.id_modele
                LEFT JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
                LEFT JOIN couleurs c ON v.id_couleur = c.id_couleur
                LEFT JOIN utilisateur u ON v.user_cr = u.id_utilisateur
            WHERE v.id_vehicule = ?`;

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
/*         if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier téléchargé' });
        } */

        const profil = req?.files.map((file) => file.path.replace(/\\/g, '/')).join(',');

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
            id_fonction,
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
                statut, profil, sexe, id_type_contrat, id_fonction, type_travail,
                id_permis, id_ville, date_naissance, date_engagement, user_cr, tel_service
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            matricule, nom, prenom, telephone, adresse, id_etat_civil,
            statut, profil, sexe, id_type_contrat, id_fonction, type_travail,
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
        const query = `SELECT a.id_affectations, 
                            a.created_at, 
                            a.commentaire, 
                            c.nom, 
                            c.prenom, 
                            s.nom_site, 
                            u.nom AS user
                            FROM affectations a 
                        INNER JOIN chauffeurs c ON a.id_chauffeur = c.id_chauffeur
                        INNER JOIN sites s ON a.id_site = s.id_site
                        INNER JOIN utilisateur u ON a.user_cr = u.id_utilisateur`;
    
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
    const { id_site, id_chauffeur, commentaire, user_cr } = req.body;

    try {
        const q = 'INSERT INTO affectations(`id_site`, `id_chauffeur`, `commentaire`, `user_cr`) VALUES(?, ?, ?, ?)';

        const values = [
            id_site,
            id_chauffeur,
            commentaire,
            user_cr
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

//Type de reparation
exports.getTypeReparation = async (req, res) => {

    try {
        const query = `SELECT * FROM type_reparations`;
    
        const typeFonction = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste de type des réparations récupérées avec succès',
            data: typeFonction,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des dispositions:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des dispositions.",
        });
    }
}

exports.postTypeReparation = async (req, res) => {
    try {
        const q = 'INSERT INTO type_reparations(`type_rep`) VALUES(?)';

        const values = [
            req.body.type_rep
        ];

        await db.query(q, values, (error, data) => {

            if(error) {
                console.log(error)
            }
            return res.json('Processus réussi');
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du vehicule." });
    }
}

//Statut vehicule
exports.getStatutVehicule = (req, res) => {

    const q = `SELECT * FROM statut_vehicule`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Reparation
exports.getReparation = async (req, res) => {

    try {
        const query = `SELECT 
                            r.id_reparation, 
                            sr.date_reparation, 
                            sr.date_sortie, 
                            sr.id_sud_reparation,
                            sr.montant,
                            sr.description,
                            r.date_prevu, 
                            r.date_entree,
                            r.cout, 
                            r.commentaire, 
                            r.code_rep, 
                            v.immatriculation, 
                            m.nom_marque, 
                            f.nom_fournisseur, 
                            tss.nom_type_statut,
                            DATEDIFF(r.date_entree,sr.date_reparation) AS nb_jours_au_garage,
                            sr.id_type_reparation,
                            tr.type_rep
                        FROM 
                            reparations r
                        INNER JOIN 
                            vehicules v ON r.id_vehicule = v.id_vehicule
                        INNER JOIN 
                            marque m ON v.id_marque = m.id_marque
                        INNER JOIN 
                            fournisseur f ON r.id_fournisseur = f.id_fournisseur
                        INNER JOIN 
                        	sud_reparation sr ON r.id_reparation = sr.id_reparation
                        INNER JOIN 
                        	type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
                        LEFT JOIN 
                            type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
                        ORDER BY sr.created_at DESC
                       `;
    
        const typeFonction = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste des réparations récupérées avec succès',
            data: typeFonction,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des réparations:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des réparations.",
        });
    }
}

exports.getReparationOne = async (req, res) => {
    const { id_sud_reparation } = req.query;
    try {
        const query = `SELECT 
                            r.id_reparation, 
                            sr.date_reparation, 
                            sr.date_sortie, 
                            sr.id_sud_reparation,
                            r.date_prevu, 
                            r.date_entree,
                            r.cout, 
                            r.commentaire, 
                            r.code_rep, 
                            v.immatriculation, 
                            m.nom_marque, 
                            f.nom_fournisseur, 
                            tss.nom_type_statut,
                            DATEDIFF(r.date_entree,sr.date_reparation) AS nb_jours_au_garage,
                            sr.id_type_reparation,
                            sr.description,
                            tr.type_rep,
                            e.nom_evaluation
                        FROM 
                            reparations r
                        INNER JOIN 
                            vehicules v ON r.id_vehicule = v.id_vehicule
                        INNER JOIN 
                            marque m ON v.id_marque = m.id_marque
                        INNER JOIN 
                            fournisseur f ON r.id_fournisseur = f.id_fournisseur
                        LEFT JOIN 
                        	sud_reparation sr ON r.id_reparation = sr.id_reparation
                        INNER JOIN 
                        	type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
                        INNER JOIN 
                            type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
                        LEFT JOIN 
            				evaluation e ON sr.id_evaluation = e.id_evaluation
                            WHERE r.id_reparation = ?
                       `;
    
        const typeFonction = await queryAsync(query, id_sud_reparation);

        const q = `SELECT r.id_reparation, r.date_entree, r.date_prevu, r.cout, r.commentaire, f.nom_fournisseur, v.immatriculation, m.nom_marque FROM reparations r
                        LEFT JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
                        INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
                        LEFT JOIN marque m ON v.id_marque = m.id_marque
                        WHERE r.id_reparation = ?
                    `;

        const type = await queryAsync(q, id_sud_reparation)

        return res.status(200).json({
            message: 'Liste des réparations récupérées avec succès',
            data: typeFonction,
            dataGen: type
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des réparations:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des réparations.",
        });
    }
}

/* exports.postReparation = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const date_entree = moment(req.body.date_entree).format('YYYY-MM-DD');
        const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');

        const {
          id_vehicule,
          cout,
          id_fournisseur,
          commentaire,
          reparations,
          code_rep,
          kilometrage,
          user_cr,
          id_sub_inspection_gen
        } = req.body;

        if (!id_vehicule || !cout || !Array.isArray(reparations)) {
          throw new Error("Certains champs obligatoires sont manquants ou invalides.");
        }

        const insertMainQuery = `
          INSERT INTO reparations (
            id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
            commentaire, code_rep, kilometrage, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const mainValues = [
          id_vehicule,
          date_entree,
          date_prevu,
          cout,
          id_fournisseur,
          commentaire,
          code_rep,
          kilometrage,
          user_cr
        ];

        const [mainResult] = await queryPromise(connection, insertMainQuery, mainValues);
        const insertedRepairId = mainResult.insertId;

        const insertSubQuery = `
          INSERT INTO sud_reparation (
            id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description, id_statut
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const sud of reparations) {
          const subValues = [
            insertedRepairId,
            sud.id_type_reparation,
            id_sub_inspection_gen ?? null,
            sud.montant,
            sud.description,
            2
          ];
          await queryPromise(connection, insertSubQuery, subValues);
        }

        // Mise à jour du statut de la sous-inspection
        const updateQuery = `
          UPDATE sub_inspection_gen 
          SET date_reparation = ?, statut = ?
          WHERE id_sub_inspection_gen = ?
        `;
        const updateValues = [moment().format('YYYY-MM-DD'), 2, id_sub_inspection_gen];
        await queryPromise(connection, updateQuery, updateValues);

        // Commit si tout est OK
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation des données." });
          }

          return res.status(201).json({
            message: "Réparation enregistrée avec succès.",
            data: { id: insertedRepairId }
          });
        });

      } catch (error) {
        console.error("Erreur transactionnelle :", error);
        connection.rollback(() => {
          connection.release();
          const msg = error.message || "Erreur inattendue lors du traitement.";
          return res.status(500).json({ error: msg });
        });
      }
    });
  });
}; */

/* exports.postReparation = (req, res) => {

    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          console.error("Erreur transaction :", trxErr);
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_entree = moment(req.body.date_entree).format('YYYY-MM-DD');
          const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            cout,
            id_fournisseur,
            commentaire,
            reparations,
            code_rep,
            kilometrage,
            user_cr, 
            id_sub_inspection_gen
          } = req.body;

  
          if (!id_vehicule || !cout || !Array.isArray(reparations)) {
            throw new Error("Certains champs obligatoires sont manquants ou invalides.");
          }
  
          const insertMainQuery = `
            INSERT INTO reparations (
              id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
              commentaire, code_rep, kilometrage, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
  
          const mainValues = [
            id_vehicule,
            date_entree,
            date_prevu,
            cout,
            id_fournisseur,
            commentaire,
            code_rep,
            kilometrage,
            user_cr
          ];
  
          const [mainResult] = await queryPromise(connection, insertMainQuery, mainValues);
          const insertedRepairId = mainResult.insertId;
  
          const insertSubQuery = `
            INSERT INTO sud_reparation (
              id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description, id_statut
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          let sudReparationIds = [];  // Pour récupérer les ids des entrées dans `sud_reparation`
  
          // Gérer les réparations
          for (const sud of reparations) {
            const subValues = [
              insertedRepairId,
              sud.id_type_reparation,
              id_sub_inspection_gen ?? null,
              sud.montant,
              sud.description,
              2 // Statut "réparé"
            ];
            
            const [subResult] = await queryPromise(connection, insertSubQuery, subValues);
            const insertedSudReparationId = subResult.insertId;  // Récupération de l'ID `id_sud_reparation`
  
            sudReparationIds.push(insertedSudReparationId);  // Ajouter l'ID `id_sud_reparation` pour log
            // Si la réparation est liée à une inspection, on met à jour la sous-inspection
            if (id_sub_inspection_gen) {
              const updateQuery = `
                UPDATE sub_inspection_gen 
                SET date_reparation = ?, statut = ?
                WHERE id_sub_inspection_gen = ?
              `;
              const updateValues = [moment().format('YYYY-MM-DD'), 2, id_sub_inspection_gen];
              await queryPromise(connection, updateQuery, updateValues);
  
              // 🔥 Journalisation dans log_actions pour la mise à jour de la sous-inspection liée à une inspection
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'sub_inspection_gen',
                'Modification',
                id_sub_inspection_gen,
                user_cr || null,
                `Statut sous-inspection mis à jour à 2 (réparée), liée à réparation #${insertedRepairId}`
              ]);
            } else {
              // 🔥 Journalisation dans log_actions pour la création d'une réparation non liée à une inspection
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'reparations',
                'Création',
                insertedRepairId,
                user_cr || null,
                `Réparation créée sans lien avec une inspection, réparation #${insertedRepairId}`
              ]);
            }
  
            // Journaliser chaque entrée dans sud_reparation avec id_sud_reparation
            const logSudSQL = `
              INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
              VALUES (?, ?, ?, ?, ?)
            `;
            await queryPromise(connection, logSudSQL, [
              'sud_reparation',
              'Création',
              insertedSudReparationId,
              user_cr || null,
              `Réparation ajoutée à reparation, ID #${insertedSudReparationId}`
            ]);
          }
  
          // Commit si tout est OK
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              console.error("Erreur commit :", commitErr);
              return res.status(500).json({ error: "Erreur lors de la validation des données." });
            }
  
            return res.status(201).json({
              message: "Réparation enregistrée avec succès.",
              data: { id: insertedRepairId, sud_reparation_ids: sudReparationIds }
            });
          });
  
        } catch (error) {
          console.error("Erreur transactionnelle :", error);
          connection.rollback(() => {
            connection.release();
            const msg = error.message || "Erreur inattendue lors du traitement.";
            return res.status(500).json({ error: msg });
          });
        }
      });
    });
  }; */

exports.postReparation = (req, res) => {
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          console.error("Erreur transaction :", trxErr);
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_entree = moment(req.body.date_entree).format('YYYY-MM-DD');
          const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            cout,
            id_fournisseur,
            commentaire,
            reparations,
            code_rep,
            kilometrage,
            id_statut_vehicule,
            user_cr, 
            id_sub_inspection_gen
          } = req.body;
  
          if (!id_vehicule || !cout || !Array.isArray(reparations)) {
            throw new Error("Certains champs obligatoires sont manquants ou invalides.");
          }
  
          const insertMainQuery = `
            INSERT INTO reparations (
              id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
              commentaire, code_rep, kilometrage, id_statut_vehicule, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
  
          const mainValues = [
            id_vehicule,
            date_entree,
            date_prevu,
            cout,
            id_fournisseur,
            commentaire,
            code_rep,
            kilometrage,
            id_statut_vehicule,
            user_cr
          ];
  
          const [mainResult] = await queryPromise(connection, insertMainQuery, mainValues);
          const insertedRepairId = mainResult.insertId;
  
          // Insertion dans l'historique_vehicule
          const historiqueSQL = `
            INSERT INTO historique_vehicule (
              id_vehicule, id_chauffeur, id_statut_vehicule, id_reparation, action, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          const historiqueValues = [
            id_vehicule,
            null,  // Pas de chauffeur spécifié ici
            id_statut_vehicule, 
            insertedRepairId,
            "Nouvelle réparation ajoutée",
            `Réparation ajoutée avec succès pour le véhicule ${id_vehicule}`,
            user_cr
          ];
  
          await queryPromise(connection, historiqueSQL, historiqueValues);
  
          const insertSubQuery = `
            INSERT INTO sud_reparation (
              id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description, id_statut
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          let sudReparationIds = [];  // Pour récupérer les ids des entrées dans `sud_reparation`
  
          // Gérer les réparations
          for (const sud of reparations) {
            const subValues = [
              insertedRepairId,
              sud.id_type_reparation,
              id_sub_inspection_gen ?? null,
              sud.montant,
              sud.description,
              2 // Statut "réparé"
            ];
  
            const [subResult] = await queryPromise(connection, insertSubQuery, subValues);
            const insertedSudReparationId = subResult.insertId;  // Récupération de l'ID `id_sud_reparation`
  
            sudReparationIds.push(insertedSudReparationId);  // Ajouter l'ID `id_sud_reparation` pour log
            // Si la réparation est liée à une inspection, on met à jour la sous-inspection
            if (id_sub_inspection_gen) {
              const updateQuery = `
                UPDATE sub_inspection_gen 
                SET date_reparation = ?, statut = ?
                WHERE id_sub_inspection_gen = ?
              `;
              const updateValues = [moment().format('YYYY-MM-DD'), 2, id_sub_inspection_gen];
              await queryPromise(connection, updateQuery, updateValues);
  
              // 🔥 Journalisation dans log_actions pour la mise à jour de la sous-inspection liée à une inspection
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'sub_inspection_gen',
                'Modification',
                id_sub_inspection_gen,
                user_cr || null,
                `Statut sous-inspection mis à jour à 2 (réparée), liée à réparation #${insertedRepairId}`
              ]);
            } else {
              // 🔥 Journalisation dans log_actions pour la création d'une réparation non liée à une inspection
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'reparations',
                'Création',
                insertedRepairId,
                user_cr || null,
                `Réparation créée sans lien avec une inspection, réparation #${insertedRepairId}`
              ]);
            }
  
            // Journaliser chaque entrée dans sud_reparation avec id_sud_reparation
            const logSudSQL = `
              INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
              VALUES (?, ?, ?, ?, ?)
            `;
            await queryPromise(connection, logSudSQL, [
              'sud_reparation',
              'Création',
              insertedSudReparationId,
              user_cr || null,
              `Réparation ajoutée à reparation, ID #${insertedSudReparationId}`
            ]);
          }
  
          // Commit si tout est OK
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              console.error("Erreur commit :", commitErr);
              return res.status(500).json({ error: "Erreur lors de la validation des données." });
            }
  
            return res.status(201).json({
              message: "Réparation enregistrée avec succès.",
              data: { id: insertedRepairId, sud_reparation_ids: sudReparationIds }
            });
          });
  
        } catch (error) {
          console.error("Erreur transactionnelle :", error);
          connection.rollback(() => {
            connection.release();
            const msg = error.message || "Erreur inattendue lors du traitement.";
            return res.status(500).json({ error: msg });
          });
        }
      });
    });
  };
    
//Carateristique rep
exports.getCarateristiqueRep = (req, res) => {

    const q = `SELECT * FROM carateristique_rep`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Inspection generale
/* exports.getInspectionGen = (req, res) => {
    const { searchValue } = req.query;
    const { id_vehicule, id_statut_vehicule, id_type_reparation } = req.body;

    let whereClauses = [];
    let values = [];

    if (searchValue) {
        whereClauses.push(`
            (
                v.immatriculation LIKE ? OR 
                c.nom LIKE ? OR 
                m.nom_marque LIKE ?
            )
        `);
        const likeValue = `%${searchValue}%`;
        values.push(likeValue, likeValue, likeValue);
    }
    if (id_vehicule && (Array.isArray(id_vehicule) ? id_vehicule.length : true)) {
        const ids = Array.isArray(id_vehicule) ? id_vehicule : [id_vehicule];
        whereClauses.push(`ig.id_vehicule IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }
    
    if (id_statut_vehicule && (Array.isArray(id_statut_vehicule) ? id_statut_vehicule.length : true)) {
        const ids = Array.isArray(id_statut_vehicule) ? id_statut_vehicule : [id_statut_vehicule];
        whereClauses.push(`ig.id_statut_vehicule IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }
    
    if (id_type_reparation && (Array.isArray(id_type_reparation) ? id_type_reparation.length : true)) {
        const ids = Array.isArray(id_type_reparation) ? id_type_reparation : [id_type_reparation];
        whereClauses.push(`sug.id_type_reparation IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }
    

    const whereSQL = whereClauses.length > 0 ? `WHERE sug.est_supprime = 0 ${whereClauses.join(' AND ')}` : '';

    const queryInspections = `
        SELECT 
            ig.id_inspection_gen, 
            ig.id_statut_vehicule,
            sug.date_reparation, 
            sug.date_validation, 
            sug.id_sub_inspection_gen,
            ig.date_prevu, 
            ig.kilometrage,
            sug.commentaire, 
            sug.avis, 
            iv.budget_valide,
            ig.date_inspection, 
            v.immatriculation, 
            c.nom AS nom_chauffeur, 
            m.nom_marque, 
            sug.montant, 
            tss.nom_type_statut,
            tr.type_rep,
            sv.nom_statut_vehicule
        FROM inspection_gen ig
        INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
        INNER JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
        INNER JOIN marque m ON v.id_marque = m.id_marque
        INNER JOIN sub_inspection_gen sug ON ig.id_inspection_gen = sug.id_inspection_gen
        INNER JOIN type_statut_suivi tss ON sug.statut = tss.id_type_statut_suivi
        INNER JOIN type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation
        LEFT JOIN inspection_valide iv ON sug.id_sub_inspection_gen = iv.id_sub_inspection_gen
        INNER JOIN statut_vehicule sv ON ig.id_statut_vehicule = sv.id_statut_vehicule
        ${whereSQL}
        ORDER BY ig.created_at DESC
    `;

    db.query(queryInspections, values, (error, inspections) => {
        if (error) {
            return res.status(500).send(error);
        }

        const queryStats = `
            SELECT 
                COUNT(DISTINCT sug.id_sub_inspection_gen) AS nbre_inspection,
                SUM(sug.montant) AS budget_total,
                SUM(iv.budget_valide) AS budget_valide,
                COUNT(DISTINCT ig.id_vehicule) AS nbre_vehicule,
                COUNT(DISTINCT CASE WHEN ig.id_statut_vehicule = 1 THEN ig.id_vehicule END) AS nbre_vehicule_immobile,
                COUNT(DISTINCT CASE WHEN ig.id_statut_vehicule = 3 THEN ig.id_vehicule END) AS nbre_reparation
            FROM sub_inspection_gen sug
            INNER JOIN inspection_gen ig ON sug.id_inspection_gen = ig.id_inspection_gen
            INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
            INNER JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
            INNER JOIN marque m ON v.id_marque = m.id_marque
            LEFT JOIN inspection_valide iv ON sug.id_sub_inspection_gen = iv.id_sub_inspection_gen
            INNER JOIN type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation
            ${whereSQL}
        `;

        db.query(queryStats, values, (err, stats) => {
            if (err) {
                return res.status(500).send(err);
            }

            return res.status(200).json({
                inspections,
                stats: stats[0]
            });
        });
    });
}; */

exports.getInspectionGen = (req, res) => {
    const { searchValue } = req.query;
    const { id_vehicule, id_statut_vehicule, id_type_reparation } = req.body;

    let whereClauses = [];
    let values = [];

    if (searchValue) {
        whereClauses.push(`(v.immatriculation LIKE ? OR c.nom LIKE ? OR m.nom_marque LIKE ?)`);
        const likeValue = `%${searchValue}%`;
        values.push(likeValue, likeValue, likeValue);
    }

    if (id_vehicule && (Array.isArray(id_vehicule) ? id_vehicule.length : true)) {
        const ids = Array.isArray(id_vehicule) ? id_vehicule : [id_vehicule];
        whereClauses.push(`ig.id_vehicule IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }

    if (id_statut_vehicule && (Array.isArray(id_statut_vehicule) ? id_statut_vehicule.length : true)) {
        const ids = Array.isArray(id_statut_vehicule) ? id_statut_vehicule : [id_statut_vehicule];
        whereClauses.push(`ig.id_statut_vehicule IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }

    if (id_type_reparation && (Array.isArray(id_type_reparation) ? id_type_reparation.length : true)) {
        const ids = Array.isArray(id_type_reparation) ? id_type_reparation : [id_type_reparation];
        whereClauses.push(`sug.id_type_reparation IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }

    let whereSQL = "WHERE sug.est_supprime = 0";
    if (whereClauses.length > 0) {
        whereSQL += " AND " + whereClauses.join(" AND ");
    }

    const queryInspections = `
        SELECT 
            ig.id_inspection_gen, 
            ig.id_statut_vehicule,
            sug.date_reparation, 
            sug.date_validation, 
            sug.id_sub_inspection_gen,
            ig.date_prevu, 
            ig.kilometrage,
            sug.commentaire, 
            sug.avis, 
            iv.budget_valide,
            ig.date_inspection, 
            v.immatriculation, 
            c.nom AS nom_chauffeur, 
            m.nom_marque, 
            sug.montant, 
            tss.nom_type_statut,
            tr.type_rep,
            sv.nom_statut_vehicule
        FROM inspection_gen ig
        INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
        INNER JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
        INNER JOIN marque m ON v.id_marque = m.id_marque
        INNER JOIN sub_inspection_gen sug ON ig.id_inspection_gen = sug.id_inspection_gen
        INNER JOIN type_statut_suivi tss ON sug.statut = tss.id_type_statut_suivi
        INNER JOIN type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation
        LEFT JOIN inspection_valide iv ON sug.id_sub_inspection_gen = iv.id_sub_inspection_gen
        INNER JOIN statut_vehicule sv ON ig.id_statut_vehicule = sv.id_statut_vehicule
        ${whereSQL}
        ORDER BY ig.created_at DESC
    `;

    db.query(queryInspections, values, (error, inspections) => {
        if (error) {
            return res.status(500).send(error);
        }

        const queryStats = `
            SELECT 
                COUNT(DISTINCT sug.id_sub_inspection_gen) AS nbre_inspection,
                SUM(sug.montant) AS budget_total,
                SUM(iv.budget_valide) AS budget_valide,
                COUNT(DISTINCT ig.id_vehicule) AS nbre_vehicule,
                COUNT(DISTINCT CASE WHEN ig.id_statut_vehicule = 1 THEN ig.id_vehicule END) AS nbre_vehicule_immobile,
                COUNT(DISTINCT CASE WHEN ig.id_statut_vehicule = 3 THEN ig.id_vehicule END) AS nbre_reparation
            FROM sub_inspection_gen sug
            INNER JOIN inspection_gen ig ON sug.id_inspection_gen = ig.id_inspection_gen
            INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
            INNER JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
            INNER JOIN marque m ON v.id_marque = m.id_marque
            LEFT JOIN inspection_valide iv ON sug.id_sub_inspection_gen = iv.id_sub_inspection_gen
            INNER JOIN type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation
            ${whereSQL}
        `;

        db.query(queryStats, values, (err, stats) => {
            if (err) {
                return res.status(500).send(err);
            }

            return res.status(200).json({
                inspections,
                stats: stats[0]
            });
        });
    });
};

exports.getInspectionResume = (req, res) => {

    const q = `SELECT 
                    COUNT(sub.id_sub_inspection_gen) AS nbre_inspection,
                    SUM(sub.montant) AS budget_total,
                    SUM(iv.budget_valide) AS budget_valide,
                    COUNT(DISTINCT ig.id_vehicule) AS nbre_vehicule
                FROM sub_inspection_gen sub
                INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen
                LEFT JOIN inspection_valide iv ON sub.id_sub_inspection_gen = iv.id_sub_inspection_gen`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.postInspectionGen = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        // Formatage des dates
        const date_inspection = moment(req.body.date_inspection).format('YYYY-MM-DD');
        const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');

        const {
          id_vehicule,
          id_chauffeur,
          id_statut_vehicule,
          kilometrage,
          user_cr,
          reparations
        } = req.body;

        // Vérification des champs obligatoires
        if (!id_vehicule || !id_statut_vehicule ) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertControleSQL = `
          INSERT INTO inspection_gen (
            id_vehicule, id_chauffeur, date_inspection, date_prevu, id_statut_vehicule, kilometrage, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const controleValues = [
          id_vehicule,
          id_chauffeur,
          date_inspection,
          date_prevu,
          id_statut_vehicule,
          kilometrage,
          user_cr
        ];

        const [insertControleResult] = await queryPromise(connection, insertControleSQL, controleValues);
        const insertId = insertControleResult.insertId;

        // Parsing des réparations
        let parsedReparations = Array.isArray(reparations) ? reparations : JSON.parse(reparations || '[]');

        // Validation format
        if (!Array.isArray(parsedReparations)) {
          throw new Error("Le champ `réparations` doit être un tableau.");
        }

        // Ajout des images
        parsedReparations = parsedReparations.map((rep, index) => {
          const fieldName = `img_${index}`;
          const file = req.files.find(f => f.fieldname === fieldName);
          return {
            ...rep,
            img: file ? `public/uploads/${file.filename}` : null
          };
        });

        // Insertion réparations une par une
        const insertReparationSQL = `
          INSERT INTO sub_inspection_gen (
            id_inspection_gen, id_type_reparation, id_cat_inspection, montant, commentaire, avis, img, statut
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const rep of parsedReparations) {
          const repValues = [
            insertId,
            rep.id_type_reparation,
            rep.id_cat_inspection,
            rep.montant,
            rep.commentaire,
            rep.avis,
            rep.img,
            1
          ];

          await queryPromise(connection, insertReparationSQL, repValues);
        }

        // Tout s'est bien passé
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "Inspection a été enregistrée avec succès.",
            data: { id: insertId }
          });
        });

      } catch (error) {
        console.error("Erreur dans la transaction :", error);
        connection.rollback(() => {
          connection.release();
          const msg = error.message || "Erreur inattendue lors du traitement.";
          return res.status(500).json({ error: msg });
        });
      }
    });
  });
}; */

/* exports.postInspectionGen = (req, res) => {
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur de connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          console.error("Erreur transaction :", trxErr);
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_inspection = moment(req.body.date_inspection).format('YYYY-MM-DD');
          const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            reparations
          } = req.body;
  
          if (!id_vehicule || !id_statut_vehicule) {
            throw new Error("Champs obligatoires manquants.");
          }
  
          const insertControleSQL = `
            INSERT INTO inspection_gen (
              id_vehicule, id_chauffeur, date_inspection, date_prevu, id_statut_vehicule, kilometrage, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
  
          const controleValues = [
            id_vehicule,
            id_chauffeur,
            date_inspection,
            date_prevu,
            id_statut_vehicule,
            kilometrage,
            user_cr
          ];
  
          const [insertControleResult] = await queryPromise(connection, insertControleSQL, controleValues);
          const insertId = insertControleResult.insertId;
  
          // Traitement des réparations
          let parsedReparations = Array.isArray(reparations) ? reparations : JSON.parse(reparations || '[]');
  
          if (!Array.isArray(parsedReparations)) {
            throw new Error("Le champ `réparations` doit être un tableau.");
          }
  
          parsedReparations = parsedReparations.map((rep, index) => {
            const fieldName = `img_${index}`;
            const file = req.files.find(f => f.fieldname === fieldName);
            return {
              ...rep,
              img: file ? `public/uploads/${file.filename}` : null
            };
          });
  
          const insertReparationSQL = `
            INSERT INTO sub_inspection_gen (
              id_inspection_gen, id_type_reparation, id_cat_inspection, montant, commentaire, avis, img, statut
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
  
          const logSQL = `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `;
  
          for (const rep of parsedReparations) {
            const repValues = [
              insertId,
              rep.id_type_reparation,
              rep.id_cat_inspection,
              rep.montant,
              rep.commentaire,
              rep.avis,
              rep.img,
              1
            ];
  
            const [insertRepResult] = await queryPromise(connection, insertReparationSQL, repValues);
            const subInspectionId = insertRepResult.insertId;
  
            // 🔥 Journalisation : log de la sous-inspection
            await queryPromise(connection, logSQL, [
              'sub_inspection_gen',
              'Création',
              subInspectionId,
              user_cr || null,
              `Ajout d'une inspection ID ${subInspectionId} liée à l'inspection #${insertId}, type réparation ${rep.id_type_reparation}`
            ]);
          }
  
          // Tout s'est bien passé
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              console.error("Erreur commit :", commitErr);
              return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
            }
  
            return res.status(201).json({
              message: "Inspection enregistrée avec succès.",
              data: { id: insertId }
            });
          });
  
        } catch (error) {
          console.error("Erreur dans la transaction :", error);
          connection.rollback(() => {
            connection.release();
            const msg = error.message || "Erreur inattendue lors du traitement.";
            return res.status(500).json({ error: msg });
          });
        }
      });
    });
}; */

exports.postInspectionGen = (req, res) => {
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur de connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          console.error("Erreur transaction :", trxErr);
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_inspection = moment(req.body.date_inspection).format('YYYY-MM-DD');
          const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            reparations
          } = req.body;
  
          if (!id_vehicule || !id_statut_vehicule) {
            throw new Error("Champs obligatoires manquants.");
          }
  
          const insertControleSQL = `
            INSERT INTO inspection_gen (
              id_vehicule, id_chauffeur, date_inspection, date_prevu, id_statut_vehicule, kilometrage, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
  
          const controleValues = [
            id_vehicule,
            id_chauffeur,
            date_inspection,
            date_prevu,
            id_statut_vehicule,
            kilometrage,
            user_cr
          ];
  
          const [insertControleResult] = await queryPromise(connection, insertControleSQL, controleValues);
          const insertId = insertControleResult.insertId;
  
          // Insertion dans l'historique_vehicule
          const historiqueSQL = `
            INSERT INTO historique_vehicule (
              id_vehicule, id_chauffeur, id_statut_vehicule, id_inspection_gen, action, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          const historiqueValues = [
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            insertId,
            "Nouvelle inspection ajoutée",
            `Inspection ajoutée avec succès pour le véhicule ${id_vehicule}`,
            user_cr
          ];
  
          await queryPromise(connection, historiqueSQL, historiqueValues);
  
          // Traitement des réparations
          let parsedReparations = Array.isArray(reparations) ? reparations : JSON.parse(reparations || '[]');
  
          if (!Array.isArray(parsedReparations)) {
            throw new Error("Le champ `réparations` doit être un tableau.");
          }
  
          parsedReparations = parsedReparations.map((rep, index) => {
            const fieldName = `img_${index}`;
            const file = req.files.find(f => f.fieldname === fieldName);
            return {
              ...rep,
              img: file ? `public/uploads/${file.filename}` : null
            };
          });
  
          const insertReparationSQL = `
            INSERT INTO sub_inspection_gen (
              id_inspection_gen, id_type_reparation, id_cat_inspection, montant, commentaire, avis, img, statut
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
  
          const logSQL = `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `;
  
          for (const rep of parsedReparations) {
            const repValues = [
              insertId,
              rep.id_type_reparation,
              rep.id_cat_inspection,
              rep.montant,
              rep.commentaire,
              rep.avis,
              rep.img,
              1
            ];
  
            const [insertRepResult] = await queryPromise(connection, insertReparationSQL, repValues);
            const subInspectionId = insertRepResult.insertId;
  
            // 🔥 Journalisation : log de la sous-inspection
            await queryPromise(connection, logSQL, [
              'sub_inspection_gen',
              'Création',
              subInspectionId,
              user_cr || null,
              `Ajout d'une inspection ID ${subInspectionId} liée à l'inspection #${insertId}, type réparation ${rep.id_type_reparation}`
            ]);
          }
  
          // Tout s'est bien passé
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              console.error("Erreur commit :", commitErr);
              return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
            }
  
            return res.status(201).json({
              message: "Inspection enregistrée avec succès.",
              data: { id: insertId }
            });
          });
  
        } catch (error) {
          console.error("Erreur dans la transaction :", error);
          connection.rollback(() => {
            connection.release();
            const msg = error.message || "Erreur inattendue lors du traitement.";
            return res.status(500).json({ error: msg });
          });
        }
      });
    });
  };
  
//Sub Inspection
exports.getSubInspection = (req, res) => {
    const { idInspection } = req.query;

    if (!idInspection) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                SELECT sig.id_sub_inspection_gen, sig.montant, tr.type_rep, ci.nom_cat_inspection, ig.date_inspection, v.immatriculation, m.nom_marque, sig.id_type_reparation, sig.id_cat_inspection, sig.img, sig.commentaire, sig.avis, sig.img, tss.nom_type_statut FROM sub_inspection_gen sig
                    INNER JOIN type_reparations tr ON sig.id_type_reparation = tr.id_type_reparation
                    INNER JOIN cat_inspection ci ON sig.id_cat_inspection = ci.id_cat_inspection
                    INNER JOIN inspection_gen ig ON sig.id_inspection_gen = ig.id_inspection_gen
                    INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
                    INNER JOIN marque m ON v.id_marque = m.id_marque
                    INNER JOIN type_statut_suivi tss ON sig.statut = tss.id_type_statut_suivi
                WHERE sig.id_inspection_gen = ? AND sig.est_supprime = 0
            `;

    db.query(query, [idInspection], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

exports.getSubInspectionOneV = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    if (!id_sub_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                SELECT sub.*, ig.*
                    FROM 
                    sub_inspection_gen sub 
                    INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen
                    WHERE sub.id_sub_inspection_gen = ?
                `;

    db.query(query, [id_sub_inspection_gen], (err, results) => {
        if (err) {

            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

exports.getSubInspectionOne = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    if (!id_sub_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                SELECT sig.id_sub_inspection_gen, sig.montant, tr.type_rep, ci.nom_cat_inspection, ig.date_inspection, v.immatriculation, m.nom_marque, sig.id_type_reparation, sig.id_cat_inspection, sig.img, sig.commentaire, sig.avis, sig.img, tss.nom_type_statut FROM sub_inspection_gen sig
                    INNER JOIN type_reparations tr ON sig.id_type_reparation = tr.id_type_reparation
                    INNER JOIN cat_inspection ci ON sig.id_cat_inspection = ci.id_cat_inspection
                    INNER JOIN inspection_gen ig ON sig.id_inspection_gen = ig.id_inspection_gen
                    INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
                    INNER JOIN marque m ON v.id_marque = m.id_marque
                    INNER JOIN type_statut_suivi tss ON sig.statut = tss.id_type_statut_suivi
                WHERE sig.id_sub_inspection_gen = ?
                `;

    db.query(query, [id_sub_inspection_gen], (err, results) => {
        if (err) {

            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

/* exports.putInspectionGen = (req, res) => {
    const idSub = req.query.id_sub_inspection_gen;
    const idInspection = req.query.id_inspection_gen;
  
    if (!idSub || !idInspection) {
      return res.status(400).json({ error: "ID de sous-inspection ou d'inspection manquant." });
    }
  
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          // Formatage des données
            const date_inspection = moment(new Date(req.body.date_inspection)).format('YYYY-MM-DD');
            const date_prevu = moment(new Date(req.body.date_prevu)).format('YYYY-MM-DD');

  
          const {
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            reparations
          } = req.body;
  
          // Mise à jour inspection principale
          await queryPromise(connection, `
            UPDATE inspection_gen
            SET id_vehicule = ?, id_chauffeur = ?, date_inspection = ?, date_prevu = ?, id_statut_vehicule = ?, kilometrage = ?, user_cr = ?
            WHERE id_inspection_gen = ?
          `, [
            id_vehicule,
            id_chauffeur,
            date_inspection,
            date_prevu,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            idInspection
          ]);
  
          // Extraction de la réparation (on suppose qu'il y en a une seule)
          const rep = Array.isArray(reparations) ? reparations[0] : reparations;
  
          const fieldName = `img_0`;
          const file = req.files?.find(f => f.fieldname === fieldName);
          const imagePath = file ? `public/uploads/${file.filename}` : rep.img || null;
  
          // Mise à jour de la sous-inspection
          await queryPromise(connection, `
            UPDATE sub_inspection_gen
            SET id_type_reparation = ?, id_cat_inspection = ?, montant = ?, commentaire = ?, avis = ?, img = ?, statut = 1
            WHERE id_sub_inspection_gen = ? AND id_inspection_gen = ?
          `, [
            rep.id_type_reparation,
            rep.id_cat_inspection,
            rep.montant,
            rep.commentaire,
            rep.avis,
            imagePath,
            idSub,
            idInspection
          ]);

          await queryPromise(connection,
            `INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
             VALUES (?, ?, ?, ?, ?)`, [
              'sub_inspection_gen',
              'Modification',
              idSub,
              user_cr || null,
              `Ajout d'une inspection ID ${idSub} liée à l'inspection #${idInspection}, type réparation ${rep.id_type_reparation}`
            ]
          );
          
  
          connection.commit((err) => {
            connection.release();
            if (err) {
              return res.status(500).json({ error: "Erreur lors du commit." });
            }
  
            return res.status(200).json({ message: "Sous-inspection mise à jour avec succès." });
          });
  
        } catch (err) {
          console.error("Erreur :", err);
          connection.rollback(() => {
            connection.release();
            return res.status(500).json({ error: err.message || "Erreur interne." });
          });
        }
      });
    });
}; */
  
exports.putInspectionGen = (req, res) => {
    const idSub = req.query.id_sub_inspection_gen;
    const idInspection = req.query.id_inspection_gen;
  
    if (!idSub || !idInspection) {
      return res.status(400).json({ error: "ID de sous-inspection ou d'inspection manquant." });
    }
  
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_inspection = moment(new Date(req.body.date_inspection)).format('YYYY-MM-DD');
          const date_prevu = moment(new Date(req.body.date_prevu)).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            reparations
          } = req.body;
  
          // ✅ Mise à jour de l’inspection principale
          await queryPromise(connection, `
            UPDATE inspection_gen
            SET id_vehicule = ?, id_chauffeur = ?, date_inspection = ?, date_prevu = ?, id_statut_vehicule = ?, kilometrage = ?, user_cr = ?
            WHERE id_inspection_gen = ?
          `, [
            id_vehicule,
            id_chauffeur,
            date_inspection,
            date_prevu,
            id_statut_vehicule,
            kilometrage,
            user_cr,
            idInspection
          ]);
  
          // ✅ Enregistrement dans l’historique
          const historiqueSQL = `
            INSERT INTO historique_vehicule (
              id_vehicule, id_chauffeur, id_statut_vehicule, id_inspection_gen, action, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          const historiqueValues = [
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            idInspection,
            "Mise à jour inspection",
            `Inspection #${idInspection} et sous-inspection #${idSub} modifiées.`,
            user_cr
          ];
          await queryPromise(connection, historiqueSQL, historiqueValues);
  
          // ✅ Traitement de la sous-inspection
          const rep = Array.isArray(reparations) ? reparations[0] : reparations;
          const fieldName = `img_0`;
          const file = req.files?.find(f => f.fieldname === fieldName);
          const imagePath = file ? `public/uploads/${file.filename}` : rep.img || null;
  
          await queryPromise(connection, `
            UPDATE sub_inspection_gen
            SET id_type_reparation = ?, id_cat_inspection = ?, montant = ?, commentaire = ?, avis = ?, img = ?, statut = 1
            WHERE id_sub_inspection_gen = ? AND id_inspection_gen = ?
          `, [
            rep.id_type_reparation,
            rep.id_cat_inspection,
            rep.montant,
            rep.commentaire,
            rep.avis,
            imagePath,
            idSub,
            idInspection
          ]);
  
          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sub_inspection_gen',
            'Modification',
            idSub,
            user_cr || null,
            `Modification de la sous-inspection #${idSub} liée à l’inspection #${idInspection}, type réparation ${rep.id_type_reparation}`
          ]);
  
          connection.commit((err) => {
            connection.release();
            if (err) {
              return res.status(500).json({ error: "Erreur lors du commit." });
            }
  
            return res.status(200).json({ message: "Sous-inspection mise à jour avec succès." });
          });
  
        } catch (err) {
          console.error("Erreur :", err);
          connection.rollback(() => {
            connection.release();
            return res.status(500).json({ error: err.message || "Erreur interne." });
          });
        }
      });
    });
  };
  
exports.deleteInspectionGen = (req, res) => {
    const {id_sud_reparation, user_id } = req.body;
  
    if (!id_sud_reparation) {
      return res.status(400).json({ error: "L'ID de la réparation est requis." });
    }
  
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur de connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
  
          await queryPromise(connection, `
            UPDATE sub_inspection_gen SET est_supprime = 1 WHERE id_sub_inspection_gen = ?
          `, [id_sud_reparation]);
  
          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sud_reparation',
            'Suppression',
            id_sud_reparation,
            user_id || null,
            `Suppression logique de la réparation #${id_sud_reparation}`
          ]);
  
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              return res.status(500).json({ error: "Erreur lors du commit." });
            }
  
            return res.status(200).json({ message: "Inspection supprimée avec succès." });
          });
  
        } catch (err) {
          console.error("Erreur pendant suppression :", err);
          connection.rollback(() => {
            connection.release();
            return res.status(500).json({ error: err.message || "Erreur inattendue." });
          });
        }
      });
    });
};
  
//Validation inspection
exports.getValidationInspection = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    if (!id_sub_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                    SELECT iv.id_sub_inspection_gen, iv.id_type_reparation, iv.manoeuvre, iv.cout, ig.id_vehicule, iv.budget_valide, sub.avis, sub.commentaire as description, ig.kilometrage, ig.id_statut_vehicule FROM inspection_valide iv
                        INNER JOIN sub_inspection_gen sub ON iv.id_sub_inspection_gen = sub.id_sub_inspection_gen
                        INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen
                        WHERE iv.id_sub_inspection_gen =  ?
                    `;

    db.query(query, [id_sub_inspection_gen], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

/* exports.postValidationInspection = async (req, res) => {
    try {
        const inspections = req.body;

        if (!Array.isArray(inspections) || inspections.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée reçue.' });
        }

        for (const inspection of inspections) {
            const {
                id_sub_inspection_gen,
                id_type_reparation,
                id_cat_inspection,
                montant,
                manoeuvre
            } = inspection;

            const cout = montant;

            const insertQuery = `
                INSERT INTO inspection_valide 
                (id_sub_inspection_gen, id_type_reparation, id_cat_inspection, cout, manoeuvre)
                VALUES (?, ?, ?, ?, ?)
            `;

            const insertValues = [
                id_sub_inspection_gen,
                id_type_reparation,
                id_cat_inspection,
                cout,
                manoeuvre
            ];

            await queryAsync(insertQuery, insertValues);

            const updateQuery = `
                UPDATE sub_inspection_gen 
                SET date_validation = ? 
                WHERE id_sub_inspection_gen = ?
            `;

            const updateValues = [moment().format('YYYY-MM-DD'), id_sub_inspection_gen];

            await queryAsync(updateQuery, updateValues);
        }

        return res.status(201).json({ message: 'Les inspections ont été validées avec succès.' });

    } catch (error) {
        console.error('Erreur lors de la validation des inspections :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la validation des inspections.",
        });
    }
}; */

exports.postValidationInspection = async (req, res) => {
    try {
        const inspections = req.body;

        if (!Array.isArray(inspections) || inspections.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée reçue.' });
        }

        for (const inspection of inspections) {
            const {
                id_sub_inspection_gen,
                id_type_reparation,
                id_cat_inspection,
                montant,
                budget_valide,
                manoeuvre,
                user_cr
            } = inspection;

            const cout = montant;

            // Vérifie si cette réparation a déjà été validée pour cette sous-inspection
            const checkQuery = `
                SELECT COUNT(*) AS count 
                FROM inspection_valide 
                WHERE id_sub_inspection_gen = ? AND id_type_reparation = ?
            `;
            const [checkResult] = await queryAsync(checkQuery, [id_sub_inspection_gen, id_type_reparation]);

            if (checkResult.count > 0) {
                // On ignore ou on peut aussi renvoyer une erreur
                return res.status(400).json({
                    error: `Le type de réparation a déjà été validé pour la sous-inspection).`
                });
            }

            // Si pas encore validé, on insère
            const insertQuery = `
                INSERT INTO inspection_valide 
                (id_sub_inspection_gen, id_type_reparation, id_cat_inspection, cout, budget_valide, manoeuvre, user_cr)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const insertValues = [
                id_sub_inspection_gen,
                id_type_reparation,
                id_cat_inspection,
                cout,
                budget_valide,
                manoeuvre,
                user_cr
            ];

            await queryAsync(insertQuery, insertValues);

            const updateQuery = `
                UPDATE sub_inspection_gen 
                SET date_validation = ?, statut = ?
                WHERE id_sub_inspection_gen = ?
            `;

            const updateValues = [moment().format('YYYY-MM-DD'), 8, id_sub_inspection_gen];

            await queryAsync(updateQuery, updateValues);
        }

        return res.status(201).json({ message: 'Les inspections ont été validées avec succès.' });

    } catch (error) {
        console.error('Erreur lors de la validation des inspections :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la validation des inspections.",
        });
    }
};

//Suivi d'inspection
exports.getSuiviInspection = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    const q = `
                SELECT 
                    si.*, 
                    type_statut_suivi.nom_type_statut,
                    CASE 
                        WHEN si.est_termine = 0 THEN 'Non' 
                        ELSE 'Oui' 
                    END AS est_termine,
                    utilisateur.nom, 
                    -- Récupération de la date du dernier suivi
                    (SELECT MAX(date_suivi) 
                    FROM suivi_inspection si 
                    WHERE si.id_sub_inspection_gen = sug.id_sub_inspection_gen
                    ) AS date_dernier_suivi
                FROM 
                    suivi_inspection si
                INNER JOIN 
                    utilisateur ON si.effectue_par = utilisateur.id_utilisateur
                INNER JOIN 
                    sub_inspection_gen sug ON si.id_sub_inspection_gen = sug.id_sub_inspection_gen
                INNER JOIN 
                    type_statut_suivi ON si.status = type_statut_suivi.id_type_statut_suivi
                WHERE si.id_sub_inspection_gen = ? AND si.est_supprime = 0
            `;

    db.query(q, [id_sub_inspection_gen], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postSuiviInspection = async (req, res) => {
    let connection;

    try {
        const {
            id_sub_inspection_gen,
            status,
            commentaire,
            pourcentage_avancement,
            effectue_par,
            est_termine
        } = req.body;

        if (!id_sub_inspection_gen || !status || !effectue_par) {
            return res.status(400).json({ error: 'Champs requis manquants.' });
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        const beginTransaction = util.promisify(connection.beginTransaction).bind(connection);
        const commit = util.promisify(connection.commit).bind(connection);
        const connQuery = util.promisify(connection.query).bind(connection);

        await beginTransaction();

        const insertQuery = `
            INSERT INTO suivi_inspection (
                id_sub_inspection_gen, status, commentaire, pourcentage_avancement, effectue_par, est_termine
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        await connQuery(insertQuery, [
            id_sub_inspection_gen,
            status,
            commentaire,
            pourcentage_avancement,
            effectue_par,
            est_termine ? 1 : 0
        ]);

        const updateQuery = `
            UPDATE sub_inspection_gen
            SET statut = ?
            WHERE id_sub_inspection_gen = ?
        `;

        await connQuery(updateQuery, [status, id_sub_inspection_gen]);

        await commit();
        connection.release();

        return res.status(201).json({ message: 'Suivi d’inspection ajouté avec succès.' });

    } catch (error) {
        // 🔥 connection est maintenant bien définie même ici
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('Erreur pendant le rollback :', rollbackError);
            }
        }

        console.error('[postSuiviInspection] Erreur :', error);
        return res.status(500).json({
            error: "Une erreur s’est produite lors de l’ajout du suivi.",
            details: error.message
        });
    }
};

//Suivi réparation
/* exports.getSuiviReparation = (req, res) => {
    const { id_sud_reparation } = req.query;

    const q = `
                SELECT 
                    si.*, 
                    type_statut_suivi.nom_type_statut,
                    CASE 
                        WHEN si.est_termine = 0 THEN 'Non' 
                        ELSE 'Oui' 
                    END AS est_termine,
                    utilisateur.nom, 
                    -- Récupération de la date du dernier suivi
                    (SELECT MAX(date_suivi) 
                    FROM suivi_inspection si 
                    WHERE si.id_reparation = sud.id_sud_reparation
                    ) AS date_dernier_suivi
                FROM 
                    suivi_inspection si
                INNER JOIN 
                    utilisateur ON si.effectue_par = utilisateur.id_utilisateur
                INNER JOIN 
                    sud_reparation sud ON si.id_reparation = sud.id_sud_reparation
                INNER JOIN 
                    type_statut_suivi ON si.status = type_statut_suivi.id_type_statut_suivi
                WHERE si.id_reparation = ? AND si.est_supprime = 0
            `;

    db.query(q, [id_sud_reparation], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};
 */
exports.getSuiviReparation = (req, res) => {
    const { id_reparation } = req.query;

    const q = `SELECT sr.id_suivi_reparation, 
                    sr.budget, 
                    sr.commentaire, 
                     p.nom AS type_rep, 
                     ci.nom_cat_inspection AS nom_cat_inspection,
                    u.nom,
                    e.nom_evaluation
                    FROM 
                    suivi_reparation sr 
                    LEFT JOIN
                         pieces p ON sr.id_piece = p.id
                    LEFT JOIN 
                        cat_inspection ci ON sr.id_tache_rep = ci.id_cat_inspection
                    LEFT JOIN 
                    	sud_reparation sud ON sr.id_sud_reparation = sud.id_sud_reparation
                    LEFT JOIN 
                    	utilisateur u ON sr.user_cr = u.id_utilisateur
                    LEFT JOIN 
            			evaluation e ON sr.id_evaluation = e.id_evaluation
                    WHERE sud.id_reparation = ?
                `;

    db.query(q, [id_reparation], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getSuiviReparationOne = (req, res) => {
    const { id_sud_reparation } = req.query;

    const q = `
           SELECT 
            	sr.id_sud_reparation, 
                sr.id_reparation, 
                sr.montant, 
                sr.description, 
                sr.date_sortie, 
                sr.id_statut,
                tr.type_rep,
                r.date_entree,
                r.date_prevu,
                f.nom_fournisseur,
                v.immatriculation,
                m.nom_marque,
                e.nom_evaluation
            FROM 
            sud_reparation sr 
            INNER JOIN 
            	reparations r ON sr.id_reparation = r.id_reparation
            INNER JOIN
            	type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
            INNER JOIN 
            	fournisseur f ON r.id_fournisseur = f.id_fournisseur
            INNER JOIN 
            	vehicules v ON r.id_vehicule = v.id_vehicule
            INNER JOIN 
            	marque m ON v.id_marque = m.id_marque
            LEFT JOIN 
            	evaluation e ON sr.id_evaluation = e.id_evaluation
            WHERE sr.id_sud_reparation = ?
            `;

    db.query(q, [id_sud_reparation], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

/* exports.postSuiviReparation = async (req, res) => {
    let connection;

    try {
        const {
            id_sud_reparation,
            status,
            commentaire,
            pourcentage_avancement,
            effectue_par,
            est_termine
        } = req.body;

        if (!id_sud_reparation || !status || !effectue_par) {
            return res.status(400).json({ error: 'Champs requis manquants.' });
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        const beginTransaction = util.promisify(connection.beginTransaction).bind(connection);
        const commit = util.promisify(connection.commit).bind(connection);
        const connQuery = util.promisify(connection.query).bind(connection);

        await beginTransaction();

        const insertQuery = `
            INSERT INTO suivi_inspection (
                id_sud_reparation, status, commentaire, pourcentage_avancement, effectue_par, est_termine
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        await connQuery(insertQuery, [
            id_sud_reparation,
            status,
            commentaire,
            pourcentage_avancement,
            effectue_par,
            est_termine ? 1 : 0
        ]);

        const updateQuery = `
            UPDATE sud_reparation
            SET id_statut = ?
            WHERE id_sud_reparation = ?
        `;

        await connQuery(updateQuery, [status, id_sud_reparation]);

        await commit();
        connection.release();

        return res.status(201).json({ message: 'Suivi de reparation ajouté avec succès.' });

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('Erreur pendant le rollback :', rollbackError);
            }
        }

        console.error('[postSuiviInspection] Erreur :', error);
        return res.status(500).json({
            error: "Une erreur s’est produite lors de l’ajout du suivi.",
            details: error.message
        });
    }
}; */

exports.postSuiviReparation = async (req, res) => {
    let connection;

    try {

        const {id_evaluation, id_sud_reparation, user_cr, info} = req.body
        
        if(!id_evaluation) {
            return res.status(400).json({ error: 'Champs requis manquants.'});
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if(err) return reject(err);
                resolve(conn)
            });
        });

        const beginTransaction = util.promisify(connection.beginTransaction).bind(connection);
        const commit = util.promisify(connection.commit).bind(connection);
        const connQuery = util.promisify(connection.query).bind(connection);

        await beginTransaction();

        const insertQuery = `
            INSERT INTO suivi_reparation (
                id_sud_reparation,
                id_tache_rep,
                id_piece,
                budget,
                commentaire,
                user_cr
            ) VALUES (?, ?, ?, ?, ?, ?)`;

            for (const rep of info) {
                const repValues = [
                    id_sud_reparation,
                    rep.id_tache_rep,
                    rep.id_piece,
                    rep.budget,
                    rep.commentaire,
                    user_cr
                ]

                await connQuery(insertQuery,repValues)
            }

            const updateQuery = `
                UPDATE sud_reparation 
                SET id_evaluation = ?
                WHERE id_sud_reparation = ?
            `;
            await connQuery(updateQuery, [id_evaluation, id_sud_reparation])

            await commit();
            connection.release();

            return res.status(201).json({ message: 'Suivi de reparation ajouté avec succès.' });

    } catch (error) {
        if(connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('Erreur pendant le rollback :', rollbackError);
            }
        }
    }
}

exports.getEvaluation = (req, res) => {

    const q = `
                SELECT * FROM evaluation
            `;

    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

//Document réparation
exports.getDocumentReparation = (req, res) => {
    const {id_sud_reparation} = req.query;
    const q = `
                SELECT 
                    dr.nom_document, 
                    dr.type_document, 
                    dr.chemin_document, 
                    dr.created_at
                FROM 
                    document_reparation dr
                WHERE dr.id_sud_reparation = ?
            `;

    db.query(q, [id_sud_reparation], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDocumentReparation = async (req, res) => {
    const { id_sud_reparation, id_sub_inspection, nom_document, type_document, chemin_document } = req.body;
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_sud_reparation,
        id_sub_inspection,
        nom_document,
        type_document
    }));
    

    try {
        await Promise.all(
            documents.map((doc) => {
                return new Promise((resolve, reject) => {
                    const query = 'INSERT INTO document_reparation(`id_sud_reparation`, `id_sub_inspection`, `nom_document`, `type_document`, `chemin_document`) VALUES(?,?,?,?,?)';
                    db.query(query, [doc.id_sud_reparation, doc.id_sub_inspection, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'insertion du document:', err);
                            reject(err);
                        } else {
                            resolve(result); 
                        }
                    });
                });
            })
        );

        res.status(200).json({ message: 'Documents ajoutés avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur', error });
    }
};

//PIECE
exports.getCatPiece = (req, res) => {

    const q = `SELECT * FROM categorie_pieces`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getPiece = (req, res) => {
    const q = `SELECT p.nom, p.id, cp.titre FROM pieces p
                    INNER JOIN 
                        categorie_pieces cp ON p.idcategorie = cp.id`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getPieceOne = (req, res) => {
    const { id_cat } = req.query;

    const q = `SELECT 
                    p.nom, 
                    p.id 
                    FROM 
                pieces p
                INNER JOIN 
                    categorie_pieces cp ON p.id = cp.id
                WHERE p.id = ?`;

    db.query(q, [id_cat], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postPiece = async (req, res) => {

    try {
        const q = 'INSERT INTO pieces(`nom`, `idcategorie`) VALUES(?,?)';

        const values = [
            req.body.nom,
            req.body.idcategorie
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Piece ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la pièce :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la pièce." });
    }
};

//TRACKING GEN
exports.getTrackingGen = (req, res) => {
    const { searchValue } = req.query;
    const likeSearch = `%${searchValue || ''}%`;
  
    const qDetails = `
      -- 1. Inspection seule
      SELECT 
          v.id_vehicule,
          v.immatriculation,
          m.nom_marque,
          ig.date_inspection,
          sub.montant AS montant_inspection,
          sub.commentaire,
          sub.avis,
          NULL AS date_entree_reparation,
          NULL AS montant_reparation,
          NULL AS description,
          tr.type_rep,
          'Inspection' AS origine
      FROM vehicules v
      INNER JOIN marque m ON v.id_marque = m.id_marque
      LEFT JOIN inspection_gen ig ON v.id_vehicule = ig.id_vehicule
      LEFT JOIN sub_inspection_gen sub ON ig.id_inspection_gen = sub.id_inspection_gen
            LEFT JOIN type_reparations tr ON sub.id_type_reparation = tr.id_type_reparation
      WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
        AND ig.id_inspection_gen IS NOT NULL
  
      UNION ALL
  
      -- 2. Réparation issue d'une inspection
      SELECT 
          v.id_vehicule,
          v.immatriculation,
          m.nom_marque,
          ig.date_inspection,
          NULL AS montant_inspection,
          NULL AS commentaire,
          NULL AS avis,
          r.date_entree AS date_entree_reparation,
          sr.montant AS montant_reparation,
          sr.description,
          tr.type_rep,
          'Réparation suite inspection' AS origine
      FROM vehicules v
      INNER JOIN marque m ON v.id_marque = m.id_marque
      LEFT JOIN inspection_gen ig ON v.id_vehicule = ig.id_vehicule
      LEFT JOIN sub_inspection_gen sub ON ig.id_inspection_gen = sub.id_inspection_gen
      LEFT JOIN sud_reparation sr ON sub.id_sub_inspection_gen = sr.id_sub_inspection_gen
      LEFT JOIN reparations r ON sr.id_reparation = r.id_reparation
      LEFT JOIN type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
      WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
        AND sr.id_reparation IS NOT NULL
  
      UNION ALL
  
      -- 3. Réparation directe
      SELECT 
          v.id_vehicule,
          v.immatriculation,
          m.nom_marque,
          NULL AS date_inspection,
          NULL AS montant_inspection,
          NULL AS commentaire,
          NULL AS avis,
          r.date_entree AS date_entree_reparation,
          sr.montant AS montant_reparation,
          sr.description,
          tr.type_rep,
          'Réparation directe' AS origine
      FROM vehicules v
      INNER JOIN marque m ON v.id_marque = m.id_marque
      INNER JOIN reparations r ON v.id_vehicule = r.id_vehicule
      LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
      LEFT JOIN type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
      WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
        AND (sr.id_sub_inspection_gen IS NULL OR sr.id_sub_inspection_gen = 0)
  
      ORDER BY id_vehicule, date_inspection, date_entree_reparation;
    `;
  
    const qCount = `
      SELECT origine, COUNT(*) AS total
      FROM (
          SELECT 'Inspection' AS origine
          FROM vehicules v
          INNER JOIN marque m ON v.id_marque = m.id_marque
          LEFT JOIN inspection_gen ig ON v.id_vehicule = ig.id_vehicule
          LEFT JOIN sub_inspection_gen sub ON ig.id_inspection_gen = sub.id_inspection_gen
          WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
            AND ig.id_inspection_gen IS NOT NULL
  
          UNION ALL
  
          SELECT 'Réparation suite inspection' AS origine
          FROM vehicules v
          INNER JOIN marque m ON v.id_marque = m.id_marque
          LEFT JOIN inspection_gen ig ON v.id_vehicule = ig.id_vehicule
          LEFT JOIN sub_inspection_gen sub ON ig.id_inspection_gen = sub.id_inspection_gen
          LEFT JOIN sud_reparation sr ON sub.id_sub_inspection_gen = sr.id_sub_inspection_gen
          LEFT JOIN reparations r ON sr.id_reparation = r.id_reparation
          WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
            AND sr.id_reparation IS NOT NULL
  
          UNION ALL
  
          SELECT 'Réparation directe' AS origine
          FROM vehicules v
          INNER JOIN marque m ON v.id_marque = m.id_marque
          INNER JOIN reparations r ON v.id_vehicule = r.id_vehicule
          LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
          WHERE (v.immatriculation LIKE ? OR m.nom_marque LIKE ?)
            AND (sr.id_sub_inspection_gen IS NULL OR sr.id_sub_inspection_gen = 0)
      ) AS unioned
      GROUP BY origine;
    `;
  
    db.query(
      qDetails,
      [likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch],
      (error, details) => {
        if (error) return res.status(500).send(error);
  
        db.query(
          qCount,
          [likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch],
          (err, counts) => {
            if (err) return res.status(500).send(err);
  
            return res.status(200).json({
              data: details,
              totalByOrigine: counts,
            });
          }
        );
      }
    );
};
  
//LOG INSPECTION REPARATION
/* exports.getLogInspection = (req, res) => {

const q = `SELECT 
  log.log_inspection,
  log.table_name,
  log.action,
  log.description,
  log.created_at,

  -- Infos véhicule et marque
  v.immatriculation,
  m.nom_marque,

  -- Type de réparation s’il y a
  tr1.type_rep AS sub_type_rep,
  tr2.type_rep AS sud_type_rep2

FROM log_inspection log

-- Jointure inspection_gen directe
LEFT JOIN inspection_gen ig_inspect 
  ON log.table_name = 'inspection_gen' AND log.record_id = ig_inspect.id_inspection_gen

-- Jointure sub_inspection_gen
LEFT JOIN sub_inspection_gen sub 
  ON log.table_name = 'sub_inspection_gen' AND log.record_id = sub.id_sub_inspection_gen

-- Jointure sud_reparation
LEFT JOIN sud_reparation sud
  ON log.table_name = 'sud_reparation' AND log.record_id = sud.id_sud_reparation

-- Relier inspection depuis sub_inspection ou inspection direct
LEFT JOIN inspection_gen ig 
  ON ig.id_inspection_gen = 
     CASE 
       WHEN log.table_name = 'inspection_gen' THEN ig_inspect.id_inspection_gen
       WHEN log.table_name = 'sub_inspection_gen' THEN sub.id_inspection_gen
       WHEN log.table_name = 'sud_reparation' THEN (
           SELECT si.id_inspection_gen
           FROM sub_inspection_gen si
           WHERE si.id_sub_inspection_gen = sud.id_sub_inspection_gen
           LIMIT 1
       )
       ELSE NULL
     END

-- Véhicule et marque liés à l’inspection
LEFT JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
LEFT JOIN marque m ON v.id_marque = m.id_marque

-- Type de réparation depuis sub
LEFT JOIN type_reparations tr1 ON sub.id_type_reparation = tr1.id_type_reparation

-- Type de réparation depuis sud
LEFT JOIN type_reparations tr2 ON sud.id_type_reparation = tr2.id_type_reparation
ORDER BY log.created_at DESC;
`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des corbeilles:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des corbeilles' });
        }
        res.json(results);
    })
} */

exports.getLogInspection = (req, res) => {

    const q = `
                SELECT
                    log.log_inspection,
                    log.table_name,
                    log.action,
                    log.description,
                    log.created_at,
                    COALESCE(u1.nom, u2.nom) AS nom,
                    COALESCE(u1.prenom, u2.prenom) AS prenom,

                    -- Infos véhicule et marque
                        v.immatriculation,
                        m.nom_marque,

                    -- Type de réparation fusionné
                    CASE 
                        WHEN log.table_name = 'sub_inspection_gen' THEN tr1.type_rep
                        WHEN log.table_name = 'sud_reparation' THEN tr2.type_rep
                        ELSE NULL
                        END AS type_rep

                    FROM log_inspection log

                    -- Jointure inspection_gen directe
                    LEFT JOIN inspection_gen ig_inspect 
                    ON log.table_name = 'inspection_gen' AND log.record_id = ig_inspect.id_inspection_gen

                    -- Jointure sub_inspection_gen (depuis log)
                    LEFT JOIN sub_inspection_gen sub 
                    ON log.table_name = 'sub_inspection_gen' AND log.record_id = sub.id_sub_inspection_gen

                    -- Jointure sud_reparation (depuis log)
                    LEFT JOIN sud_reparation sud
                    ON log.table_name = 'sud_reparation' AND log.record_id = sud.id_sud_reparation

                    -- Jointure inspection depuis sub_inspection_gen
                    LEFT JOIN inspection_gen ig_sub
                    ON sub.id_inspection_gen = ig_sub.id_inspection_gen

                    -- Jointure inspection depuis sud_reparation → sub → inspection
                    LEFT JOIN sub_inspection_gen sub2 
                    ON sud.id_sub_inspection_gen = sub2.id_sub_inspection_gen

                    LEFT JOIN inspection_gen ig_sud
                    ON sub2.id_inspection_gen = ig_sud.id_inspection_gen

                    -- Jointure inspection finale (priorité selon type de table)
                    LEFT JOIN inspection_gen ig 
                        ON (log.table_name = 'inspection_gen' AND ig.id_inspection_gen = ig_inspect.id_inspection_gen)
                        OR (log.table_name = 'sub_inspection_gen' AND ig.id_inspection_gen = ig_sub.id_inspection_gen)
                        OR (log.table_name = 'sud_reparation' AND ig.id_inspection_gen = ig_sud.id_inspection_gen)

                    -- Véhicule et marque liés à l’inspection
                    LEFT JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
                    LEFT JOIN marque m ON v.id_marque = m.id_marque

                    -- Type de réparation depuis sub_inspection_gen
                    LEFT JOIN type_reparations tr1 ON sub.id_type_reparation = tr1.id_type_reparation

                    -- Type de réparation depuis sud_reparation
                    LEFT JOIN type_reparations tr2 ON sud.id_type_reparation = tr2.id_type_reparation
                    
                    -- Créateurs
                    LEFT JOIN utilisateur u1 ON ig_sub.user_cr = u1.id_utilisateur
                    LEFT JOIN reparations r ON sud.id_reparation = r.id_reparation
                    LEFT JOIN utilisateur u2 ON r.user_cr = u2.id_utilisateur
                    ORDER BY log.created_at DESC
                `;
        
            db.query(q, (error, results) => {
                if(error) {
                    console.error('Erreur lors de la récupération des corbeilles:', err);
                    return res.status(500).json({ error: 'Erreur lors de la récupération des corbeilles' });
                }
                res.json(results);
            })
}

//Document réparation
exports.getDocumentInspection = (req, res) => {
    const {id_sub_inspection} = req.query;
    const q = `
                SELECT 
                    dr.nom_document, 
                    dr.type_document, 
                    dr.chemin_document, 
                    dr.created_at
                FROM 
                    document_reparation dr
                WHERE dr.id_sub_inspection = ?
            `;

    db.query(q, [id_sub_inspection], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Historique
exports.getHistorique = (req, res) => {

    const q = `SELECT hv.id_historique, hv.date_action, hv.action, hv.commentaire, u.nom, v.immatriculation, sv.nom_statut_vehicule, m.nom_marque FROM historique_vehicule hv 
                    LEFT JOIN utilisateur u ON hv.user_cr = u.id_utilisateur
                    LEFT JOIN vehicules v ON hv.id_vehicule = v.id_vehicule
                    LEFT JOIN statut_vehicule sv ON hv.id_statut_vehicule = sv.id_statut_vehicule
                    LEFT JOIN marque m ON v.id_marque = m.id_marque`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};
