const { db } = require("./../config/database");
const moment = require('moment');
const util = require('util');


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
                        INNER JOIN 
                            type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
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
                        INNER JOIN 
                            type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
                            WHERE sr.id_sud_reparation = ?
                       `;
    
        const typeFonction = await queryAsync(query, id_sud_reparation);
        
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

exports.postReparation = async (req, res) => {

    try {
        const date_entree = moment(req.body.date_entree).format('YYYY-MM-DD');
        const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD')

        const {
            id_vehicule,
            cout,
            id_fournisseur,
            commentaire,
            id_etat,
            reparations,
            code_rep,
            user_cr,
            id_sub_inspection_gen
        } = req.body;

        const insertQuery = `
            INSERT INTO reparations (
                id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
                commentaire, code_rep, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const controleValues = [
            id_vehicule,
            date_entree,
            date_prevu,
            cout,
            id_fournisseur,
            commentaire,
            code_rep,
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
            INSERT INTO sud_reparation (
                id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description
            ) VALUES (?, ?, ?, ?, ?)
        `;

        const sudReparationPromises = reparations.map((sud) => {
            const sudValues = [insertId, sud.id_type_reparation, id_sub_inspection_gen, sud.montant, sud.description];
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
exports.getInspectionGen = (req, res) => {

    const q = `SELECT 
                    ig.id_inspection_gen, 
                    sug.date_reparation, 
                    sug.date_validation, 
                    sug.id_sub_inspection_gen,
                    ig.date_prevu, 
                    sug.commentaire, 
                    sug.avis, 
                    ig.date_inspection, 
                    v.immatriculation, 
                    c.nom, m.nom_marque, 
                    sug.montant, 
                    tss.nom_type_statut,
                    tr.type_rep
                FROM inspection_gen ig
                    INNER JOIN 
                        vehicules v ON ig.id_vehicule = v.id_vehicule
                    INNER JOIN 
                        chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
                    INNER JOIN 
                        marque m ON v.id_marque = m.id_marque
                    INNER JOIN 
                        sub_inspection_gen sug ON ig.id_inspection_gen = sug.id_inspection_gen
                    INNER JOIN 
                        type_statut_suivi tss ON sug.statut = tss.id_type_statut_suivi
                    INNER JOIN 
                    	type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getInspectionResume = (req, res) => {

    const q = `SELECT 
                    COUNT(sub.id_sub_inspection_gen) AS nbre_inspection,
                    SUM(sub.montant) AS budget_total,
                    COUNT(DISTINCT ig.id_vehicule) AS nbre_vehicule
                FROM sub_inspection_gen sub
                INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen;`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postInspectionGen = async (req, res) => {
    try {
        const date_inspection = moment(req.body.date_inspection).format('YYYY-MM-DD');
        const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD')

        const {
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            user_cr,
            reparations
        } = req.body;

        const insertQuery = `
            INSERT INTO inspection_gen (
                id_vehicule, id_chauffeur, date_inspection, date_prevu,
                id_statut_vehicule, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const controleValues = [
            id_vehicule,
            id_chauffeur,
            date_inspection,
            date_prevu,
            id_statut_vehicule,
            user_cr
        ];

        const result = await queryAsync(insertQuery, controleValues);
        const insertId = result.insertId;

        // Transforme reparations[] depuis JSON si nécessaire
        let parsedReparations = reparations;
        if (typeof reparations === 'string') {
            parsedReparations = JSON.parse(reparations);
        }

        // Associe chaque image reçue au bon objet "reparation"
        parsedReparations.forEach((rep, index) => {
            const fieldName = `img_${index}`;
            const file = req.files.find(f => f.fieldname === fieldName);
            rep.img = file ? `public/uploads/${file.filename}` : null;
        });
        

        if (!Array.isArray(parsedReparations)) {
            return res.status(400).json({
                error: "Le champ `réparations` doit être un tableau."
            });
        }

        const insertSudReparationQuery = `
            INSERT INTO sub_inspection_gen (
                id_inspection_gen, id_type_reparation, id_cat_inspection, id_carateristique_rep, montant, commentaire, avis, img, statut
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const sudReparationPromises = parsedReparations.map((sud) => {
            const sudValues = [insertId, sud.id_type_reparation, sud.id_cat_inspection, sud.id_carateristique_rep, sud.montant, sud.commentaire, sud.avis, sud.img, 1];
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
                WHERE sig.id_inspection_gen = ?
    `;

    db.query(query, [idInspection], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

//Validation inspection
exports.getValidationInspection = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    if (!id_sub_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                    SELECT iv.id_sub_inspection_gen, iv.id_type_reparation, iv.manoeuvre, iv.cout, ig.id_vehicule FROM inspection_valide iv
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
                manoeuvre
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
                (id_sub_inspection_gen, id_type_reparation, id_cat_inspection, cout, budget_valide, manoeuvre)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const insertValues = [
                id_sub_inspection_gen,
                id_type_reparation,
                id_cat_inspection,
                cout,
                budget_valide,
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
exports.getSuiviReparation = (req, res) => {
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

exports.postSuiviReparation = async (req, res) => {
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
