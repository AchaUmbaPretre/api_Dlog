const { db } = require("./../config/database");
const moment = require('moment');
const util = require('util');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// Créer le transporteur avec les informations SMTP
const transporter = nodemailer.createTransport({
  host: 'mail.loginsmart-cd.com', // Serveur sortant
  port: 465, // Port SMTP pour SSL
  secure: true, // Utiliser SSL
  auth: {
    user: 'contact@loginsmart-cd.com', // Votre adresse email
    pass: '824562776Acha', // Mot de passe du compte de messagerie
  },
});

// Fonction pour envoyer l'email
const sendEmail = async (options) => {
  const mailOptions = {
    from: '"Dlog" <contact@loginsmart-cd.com>', // Nom et adresse de l'expéditeur
    to: options.email, // Adresse email du destinataire
    subject: options.subject, // Sujet de l'email
    text: options.message, // Message en texte brut
    // html: options.htmlMessage, // Message en HTML si nécessaire
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error.message);
  }
};

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

//Vehicule disponible
exports.getVehiculeDispo = (req, res) => {

    const q = `
            SELECT v.id_vehicule, v.immatriculation, marque.nom_marque, modeles.modele, cv.nom_cat FROM vehicules v
              INNER JOIN marque ON v.id_marque = marque.id_marque
              LEFT JOIN modeles ON v.id_modele = modeles.id_modele
              INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
              WHERE v.IsDispo = 1
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Vehicule Occupé
exports.getVehiculeOccupe = (req, res) => {

    const q = `
            SELECT v.id_vehicule, v.immatriculation, marque.nom_marque, modeles.modele, cv.nom_cat, c.nom FROM vehicules v
              INNER JOIN marque ON v.id_marque = marque.id_marque
              LEFT JOIN modeles ON v.id_modele = modeles.id_modele
              INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
              INNER JOIN affectation_demande ad ON v.id_vehicule = ad.id_vehicule
              INNER JOIN chauffeurs c ON ad.id_chauffeur = c.id_chauffeur
              WHERE v.IsDispo = 0
              GROUP BY v.id_vehicule
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
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
                            tr.type_rep,
                            sv.nom_statut_vehicule
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
                        LEFT JOIN 
                        	statut_vehicule sv ON r.id_statut_vehicule = sv.id_statut_vehicule
                         WHERE sr.est_supprime = 0
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

/* exports.getReparationOne = async (req, res) => {
    const { id_sud_reparation, id_inspection_gen } = req.query;

    try {
        if (id_inspection_gen) {
          const qI = `SELECT id_sub_inspection_gen  FROM sub_inspection_gen`
          const type = await queryAsync(qI, id_inspection_gen)
          const id = type.id_sub_inspection_gen;

        }
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
                            WHERE r.id_reparation = ? OR r.id_sub_inspection_gen = ?
                       `;
    
        const typeFonction = await queryAsync(query, id_sud_reparation, id);

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
} */
exports.getReparationOneV = async (req, res) => {
  const { id_sud_reparation } = req.query;

  if (!id_sud_reparation ) {
    return res.status(400).json({ error: "L'identifiant de la réparation est requis." });
  }

  const q = `SELECT r.*, sud.*, v.immatriculation, m.nom_marque, tr.type_rep, ev.nom_evaluation FROM reparations r
            INNER JOIN sud_reparation sud ON r.id_reparation = sud.id_reparation
            INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
            INNER JOIN marque m ON v.id_marque = m.id_marque
            LEFT JOIN type_reparations tr ON sud.id_type_reparation = tr.id_type_reparation
            LEFT JOIN evaluation ev ON sud.id_evaluation = ev.id_evaluation
            WHERE sud.id_sud_reparation = ?`;

  db.query(q, [id_sud_reparation], (err, results) => {
    if(err) {
      console.error("Erreur lors de la récupération des sous-inspections :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }

    return res.status(200).json(results);
  })
}

exports.getReparationOne = async (req, res) => {
      const { id_sud_reparation, id_inspection_gen } = req.query;
    
      try {
        let id_sub_inspection_gen = null;
    
        if (id_inspection_gen) {
          const qI = `SELECT id_sub_inspection_gen FROM sub_inspection_gen WHERE id_inspection_gen = ?`;
          const result = await queryAsync(qI, [id_inspection_gen]);
    
          if (result && result.length > 0) {
            id_sub_inspection_gen = result[0].id_sub_inspection_gen;
          }
        }
    
        const query = `
          SELECT 
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
            DATEDIFF(r.date_entree, sr.date_reparation) AS nb_jours_au_garage,
            sr.id_type_reparation,
            sr.description,
            tr.type_rep,
            e.nom_evaluation
          FROM 
            reparations r
          INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
          INNER JOIN marque m ON v.id_marque = m.id_marque
          INNER JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
          LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
          INNER JOIN type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
          INNER JOIN type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
          LEFT JOIN evaluation e ON sr.id_evaluation = e.id_evaluation
          WHERE r.id_reparation = ? OR sr.id_sub_inspection_gen = ?
        `;
    
        const typeFonction = await queryAsync(query, [id_sud_reparation, id_sub_inspection_gen]);
    
        const q = `
          SELECT 
            r.id_reparation, 
            r.date_entree, 
            r.date_prevu, 
            r.cout, 
            r.commentaire, 
            f.nom_fournisseur, 
            v.immatriculation, 
            m.nom_marque 
          FROM 
            reparations r
          LEFT JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
          INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
          LEFT JOIN marque m ON v.id_marque = m.id_marque
          LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
          WHERE r.id_reparation = ? OR sr.id_sub_inspection_gen = ?
        `;
    
        const type = await queryAsync(q, [id_sud_reparation, id_sub_inspection_gen]);
    
        return res.status(200).json({
          message: 'Liste des réparations récupérées avec succès',
          data: typeFonction,
          dataGen: type
        });
    
      } catch (error) {
        console.error('Erreur lors de la récupération des réparations :', error);
        return res.status(500).json({
          error: "Une erreur s'est produite lors de la récupération des réparations.",
        });
      }
};

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
  
          if (!id_vehicule || cout === null || cout === undefined || !Array.isArray(reparations)) {
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

          const insertSubQuery = `
            INSERT INTO sud_reparation (
              id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description, id_statut
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          let sudReparationIds = []; 
  
          // Gérer les réparations
          for (const sud of reparations) {
            const subValues = [
              insertedRepairId,
              sud.id_type_reparation,
              id_sub_inspection_gen ?? null,
              sud.montant,
              sud.description,
              2
            ];
  
            const [subResult] = await queryPromise(connection, insertSubQuery, subValues);
            const insertedSudReparationId = subResult.insertId;  // Récupération de l'ID `id_sud_reparation`

          // Insertion dans l'historique_vehicule
          const historiqueSQL = `
          INSERT INTO historique_vehicule (
            id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const historiqueValues = [
          id_vehicule,
          null,
          id_statut_vehicule, 
          2,
          insertedSudReparationId,
          "Nouvelle réparation ajoutée",
          `Réparation ajoutée avec succès pour le véhicule ${id_vehicule}`,
          user_cr
        ];

        await queryPromise(connection, historiqueSQL, historiqueValues);

  
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

            const getVehiculeSQL = `
            SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
              INNER JOIN marque m ON v.id_marque = m.id_marque
              WHERE v.id_vehicule = ?
            `;
          const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
            
          const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
          const [getTypeResult] = await queryPromise(connection, getType, sud.id_type_reparation);

          // 🔔 Ajout de la notification
          const notifQuery = `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
          `;

          const notifMessage = `Une nouvelle réparation a été enregistrée pour le véhicule ${getVehiculeResult?.[0].nom_marque}, immatriculé ${getVehiculeResult?.[0].immatriculation}, de type ${getTypeResult?.[0].type_rep}.`;

          await queryPromise(connection, notifQuery, [user_cr, notifMessage]);

          //Utilisateur
          const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
          const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
          const userEmail = userResult?.[0]?.email;

          // Envoi d'emails aux utilisateurs autorisés
          const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

            const [perResult] = await queryPromise(connection, permissionSQL);
            const message = 
            `
            Bonjour,

            Une nouvelle réparation a été enregistrée pour le véhicule suivant :

            - Marque : ${getVehiculeResult?.[0].nom_marque}
            - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
            - Type de réparation : ${getTypeResult?.[0].type_rep}

            Merci de prendre les dispositions nécessaires si besoin.

            Cordialement,  
            L'équipe Maintenance GTM
            `;

            perResult
              .filter(({ email }) => email !== userEmail)
              .forEach(({ email }) => {
                sendEmail({
                  email,
                  subject: '📌 Nouvelle réparation enregistrée',
                  message
                });
              });
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

/* exports.deleteReparation = (req, res) => {
    const {id_sud_reparation, user_id } = req.body;
  
    if (!id_sud_reparation) {
      return res.status(400).json({ error: "L'ID de la reparation est requis." });
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
            UPDATE sud_reparation SET est_supprime = 1 WHERE id_sud_reparation  = ?
          `, [id_sud_reparation]);
  
          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sud_reparation_gen',
            'Suppression',
            id_sud_reparation ,
            user_id || null,
            `Suppression logique de la réparation #${id_sud_reparation}`
          ]);
  
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              return res.status(500).json({ error: "Erreur lors du commit." });
            }
  
            return res.status(200).json({ message: "Réparation a été supprimée avec succès." });
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
}; */   
 
exports.deleteReparation = (req, res) => {
  const { id_sud_reparation, user_id } = req.body;

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
        // Suppression logique
        await queryPromise(connection, `
          UPDATE sud_reparation SET est_supprime = 1 WHERE id_sud_reparation = ?
        `, [id_sud_reparation]);

        // Journalisation
        await queryPromise(connection, `
          INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'sud_reparation_gen',
          'Suppression',
          id_sud_reparation,
          user_id || null,
          `Suppression logique de la réparation #${id_sud_reparation}`
        ]);

        // 🔔 Notification
        const notifMessage = `La sous-réparation #${id_sud_reparation} a été supprimée par l'utilisateur ${user_id}.`;
        await queryPromise(connection, `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
        `, [user_id, notifMessage]);

        // Commit
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          return res.status(200).json({ message: "Réparation a été supprimée avec succès." });
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

exports.putReparation = (req, res) => {
  const idSud = req.query.id_sud_reparation;
  const idReparation = req.query.id_reparation;

  if (!idSud || !idReparation) {
    return res.status(400).json({ error: "ID de réparation ou ID de sous-réparation manquant." });
  }

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
        const {
          id_vehicule,
          cout,
          date_entree,
          date_prevu,
          commentaire,
          code_rep,
          kilometrage,
          id_statut_vehicule,
          id_fournisseur,
          reparations,
          user_cr
        } = req.body;

        // 1. Mise à jour de la table `reparations`
        const updateMainSQL = `
          UPDATE reparations
          SET id_vehicule = ?, cout = ?, date_entree = ?, date_prevu = ?, commentaire = ?, code_rep = ?, 
              kilometrage = ?, id_statut_vehicule = ?, id_fournisseur = ?
          WHERE id_reparation = ?
        `;
        await queryPromise(connection, updateMainSQL, [
          id_vehicule,
          cout,
          moment(date_entree).format('YYYY-MM-DD'),
          moment(date_prevu).format('YYYY-MM-DD'),
          commentaire,
          code_rep,
          kilometrage,
          id_statut_vehicule,
          id_fournisseur,
          idReparation
        ]);

        // 2. Mise à jour de la sous-réparation correspondante
        if (Array.isArray(reparations)) {
          for (const r of reparations) {
            const updateSubSQL = `
              UPDATE sud_reparation
              SET id_type_reparation = ?, montant = ?, description = ?, id_statut = ?
              WHERE id_sud_reparation = ? AND id_reparation = ?
            `;
            await queryPromise(connection, updateSubSQL, [
              r.id_type_reparation,
              r.montant,
              r.description,
              r.id_statut || 2,
              idSud,
              idReparation
            ]);

            // 3. Journalisation de la modification
            const logSQL = `
              INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
              VALUES (?, ?, ?, ?, ?)
            `;
            await queryPromise(connection, logSQL, [
              'sud_reparation',
              'Modification',
              idSud,
              user_cr || null,
              `Sous-réparation mise à jour pour la réparation #${idReparation}`
            ]);

            
        const getVehiculeSQL = `
        SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
          INNER JOIN marque m ON v.id_marque = m.id_marque
          WHERE v.id_vehicule = ?
        `;
        
        const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
        const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
        const [getTypeResult] = await queryPromise(connection, getType, r.id_type_reparation);

        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
        const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
        const userEmail = userResult?.[0]?.email;

        // Envoi d'emails aux utilisateurs autorisés
        const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

        const [perResult] = await queryPromise(connection, permissionSQL);
        const message = 
        `
        Bonjour,

        La réparation n°${idReparation} concernant le véhicule suivant a été mise à jour :

        - Marque : ${getVehiculeResult?.[0].nom_marque}
        - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
        - Type de réparation : ${getTypeResult?.[0].type_rep}

        Nous vous invitons à consulter les détails dans le système si nécessaire.

        Cordialement,  
        L'équipe Maintenance GTM
        `;

        perResult
        .filter(({ email }) => email !== userEmail)
        .forEach(({ email }) => {
          sendEmail({
            email,
            subject: `📌 Mise à jour de la réparation n°${idReparation}`,
            message
          });
        });
          }
        }

        // 4. Mise à jour du statut véhicule dans historique
        const histoSQL = `
          INSERT INTO historique_vehicule (
            id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await queryPromise(connection, histoSQL, [
          id_vehicule,
          null,
          id_statut_vehicule,
          2,
          idSud,
          "Mise à jour réparation",
          `Mise à jour de la réparation ${idReparation}`,
          user_cr
        ]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation des données." });
          }

          return res.status(200).json({ message: "Réparation mise à jour avec succès." });
        });

      } catch (error) {
        console.error("Erreur durant la mise à jour :", error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({ error: error.message || "Erreur inattendue." });
        });
      }
    });
  });
};

exports.getReparationImage = (req, res) => {
  const { id_reparation, id_inspection_gen } = req.query;

  const query = `
                  SELECT ir.id_image_reparation, ir.commentaire, ir.image, tp.nom_type_photo, ir.created_at FROM image_reparation ir
                    INNER JOIN type_photo tp ON ir.id_type_photo = tp.id_type_photo
                    INNER JOIN reparations r ON ir.id_reparation = r.id_reparation
                    INNER JOIN sud_reparation sud ON r.id_reparation = sud.id_reparation
                    WHERE ir.id_reparation = ? OR sud.id_sub_inspection_gen = ?
                  `;

  db.query(query, [id_reparation, id_inspection_gen ], (err, results) => {
      if (err) {
        console.error("Erreur lors de la récupération des sous-inspections :", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
      }
      return res.status(200).json(results);
  });
};

exports.postReparationImage = (req, res) => {
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
        const { id_reparation, commentaire, id_type_photo } = req.body;

        if (!id_reparation || !req.files || !req.files[0]) {
          throw new Error("Champs obligatoires manquants ou fichier non fourni.");
        }

        const file = req.files[0];
        const imagePath = file.path.replace(/\\/g, '/');

        const q = `INSERT INTO image_reparation (id_reparation, commentaire, id_type_photo, image) VALUES (?, ?, ?, ?)`;
        const values = [id_reparation, commentaire, id_type_photo, imagePath];

        const result = await queryPromise(connection, q, values);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "Image enregistrée avec succès.",
            data: { id: result.insertId }
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(400).json({ error: error.message });
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
            sv.nom_statut_vehicule,
            ci.nom_cat_inspection
        FROM inspection_gen ig
        INNER JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
        LEFT JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
        INNER JOIN marque m ON v.id_marque = m.id_marque
        INNER JOIN sub_inspection_gen sug ON ig.id_inspection_gen = sug.id_inspection_gen
        INNER JOIN type_statut_suivi tss ON sug.statut = tss.id_type_statut_suivi
        INNER JOIN type_reparations tr ON sug.id_type_reparation = tr.id_type_reparation
        LEFT JOIN inspection_valide iv ON sug.id_sub_inspection_gen = iv.id_sub_inspection_gen
        LEFT JOIN statut_vehicule sv ON ig.id_statut_vehicule = sv.id_statut_vehicule
        LEFT JOIN cat_inspection ci ON sug.id_cat_inspection = ci.id_cat_inspection
        ${whereSQL}
        GROUP BY sug.id_sub_inspection_gen
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
            LEFT JOIN chauffeurs c ON ig.id_chauffeur = c.id_chauffeur
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

        const logPermission = `SELECT u.email FROM permission p 
                                INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
                                WHERE p.menus_id = 14
                              GROUP BY p.user_id`


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

          await queryPromise(connection, logSQL, [
            'sub_inspection_gen',
            'Création',
            subInspectionId,
            user_cr || null,
            `Ajout d'une inspection ID ${subInspectionId} liée à l'inspection #${insertId}, type réparation ${rep.id_type_reparation}`
          ]);

          // Insertion dans historique_vehicule
          const historiqueSQL = `
            INSERT INTO historique_vehicule (
              id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sub_inspection_gen, action, commentaire, user_cr
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const historiqueValues = [
              id_vehicule,
              id_chauffeur,
              id_statut_vehicule,
              1,
              subInspectionId,
              "Nouvelle inspection ajoutée",
              `Inspection ajoutée avec succès pour le véhicule ${id_vehicule}`,
              user_cr
            ];
            await queryPromise(connection, historiqueSQL, historiqueValues);   
            
            const getVehiculeSQL = `
            SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
              INNER JOIN marque m ON v.id_marque = m.id_marque
              WHERE v.id_vehicule = ?
            `;
            const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
            
          const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
          const [getTypeResult] = await queryPromise(connection, getType, rep.id_type_reparation);

          const notifSQL = `
              INSERT INTO notifications (user_id, message)
              VALUES (?, ?)
            `;
            const notifMsg = `Une nouvelle inspection a été ajoutée pour le véhicule ${getVehiculeResult?.[0].nom_marque}, immatriculé ${getVehiculeResult?.[0].immatriculation}, de type ${getTypeResult?.[0].type_rep}.`;  
            await queryPromise(connection, notifSQL, [user_cr, notifMsg]);
        }

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
          reparations,
          ref
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

          await queryPromise(connection, logSQL, [
            'sub_inspection_gen',
            'Création',
            subInspectionId,
            user_cr || null,
            `Ajout d'une inspection ID ${subInspectionId} liée à l'inspection #${insertId}, type réparation ${rep.id_type_reparation}`
          ]);

          // Insertion dans historique_vehicule
          const historiqueSQL = `
            INSERT INTO historique_vehicule (
              id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sub_inspection_gen, action, commentaire, user_cr
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const historiqueValues = [
              id_vehicule,
              id_chauffeur,
              id_statut_vehicule,
              1,
              subInspectionId,
              "Nouvelle inspection ajoutée",
              `Inspection ajoutée avec succès pour le véhicule ${id_vehicule}`,
              user_cr
            ];
            await queryPromise(connection, historiqueSQL, historiqueValues);   
            
            const getVehiculeSQL = `
            SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
              INNER JOIN marque m ON v.id_marque = m.id_marque
              WHERE v.id_vehicule = ?
            `;
        const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
            
        const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
        const [getTypeResult] = await queryPromise(connection, getType, rep.id_type_reparation);

        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
        const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
        const userEmail = userResult?.[0]?.email;

        const notifSQL = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
          `;
        const notifMsg = `Une nouvelle inspection a été ajoutée pour le véhicule ${getVehiculeResult?.[0].nom_marque}, immatriculé ${getVehiculeResult?.[0].immatriculation}, de type ${getTypeResult?.[0].type_rep}.`;  
        await queryPromise(connection, notifSQL, [user_cr, notifMsg]);

        // Envoi d'emails aux utilisateurs autorisés
        const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

        const [perResult] = await queryPromise(connection, permissionSQL);
        const message = 
        `
        Bonjour,
        
        Une nouvelle inspection a été enregistrée pour le véhicule suivant :
        
        - Marque : ${getVehiculeResult?.[0].nom_marque}
        - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
        - Type de réparation : ${getTypeResult?.[0].type_rep}
        
        Merci de prendre les dispositions nécessaires si besoin.
        
        Cordialement,  
        L'équipe Maintenance GTM
        `;

        perResult
          .filter(({ email }) => email !== userEmail)
          .forEach(({ email }) => {
            sendEmail({
              email,
              subject: '📌 Nouvelle inspection enregistrée',
              message
            });
          });
        }

        if (Array.isArray(ref) && ref.length > 0) {
          const refSQL = `
            INSERT INTO paiement_reference (
              id_inspection_gen, reference, montant, date_paiement, commentaire
            ) VALUES (?, ?, ?, ?, ?)
          `;
          for (const refData of ref) {
            await queryPromise(connection, refSQL, [
              insertId,
              refData.reference,
              refData.montant,
              refData.date_paiement,
              refData.commentaire
            ]);
          }
        }

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

exports.putInspectionImage = (req, res) => {
    const { id_sub_inspection_gen, user_id } = req.body;
  
    if (!id_sub_inspection_gen || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Image ou ID de l'inspection manquant." });
    }
  
    const file = req.files[0];
    const imagePath = file.path.replace(/\\/g, '/'); // corriger les backslashes Windows
  
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
            UPDATE sub_inspection_gen SET img = ? WHERE id_sub_inspection_gen = ?
          `, [imagePath, id_sub_inspection_gen]);
  
          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sub_inspection_gen',
            'Modification',
            id_sub_inspection_gen,
            user_id || null,
            `Modification de l'image de l'inspection #${id_sub_inspection_gen}`
          ]);
  
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              return res.status(500).json({ error: "Erreur lors du commit." });
            }
  
            return res.status(200).json({ message: "Image mise à jour avec succès." });
          });
  
        } catch (error) {
          connection.rollback(() => {
            connection.release();
            return res.status(500).json({ error: error.message || "Erreur inattendue." });
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
                SELECT sig.id_sub_inspection_gen, sig.montant, tr.type_rep, ci.nom_cat_inspection, ig.date_inspection, v.immatriculation, m.nom_marque, sig.id_type_reparation, sig.id_cat_inspection, sig.img, sig.commentaire, sig.avis, sig.img, sig.created_at, tss.nom_type_statut, sig.update_at FROM sub_inspection_gen sig
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
              id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sub_inspection_gen, action, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const historiqueValues = [
            id_vehicule,
            id_chauffeur,
            id_statut_vehicule,
            1,
            idSub,
            "Mise à jour inspection",
            `Inspection N° #${idInspection} et sous-inspection N° #${idSub} modifiées.`,
            user_cr
          ];
          await queryPromise(connection, historiqueSQL, historiqueValues);
  
          // ✅ Traitement de la sous-inspection
          const rep = Array.isArray(reparations) ? reparations[0] : reparations;
          await queryPromise(connection, `
            UPDATE sub_inspection_gen
            SET id_type_reparation = ?, id_cat_inspection = ?, montant = ?, commentaire = ?, avis = ?, statut = 1
            WHERE id_sub_inspection_gen = ? AND id_inspection_gen = ?
          `, [
            rep.id_type_reparation,
            rep.id_cat_inspection,
            rep.montant,
            rep.commentaire,
            rep.avis,
            idSub,
            idInspection
          ]);

          const getVehiculeSQL = `
          SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
            INNER JOIN marque m ON v.id_marque = m.id_marque
            WHERE v.id_vehicule = ?
          `;
          
          const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
          const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
          const [getTypeResult] = await queryPromise(connection, getType, rep.id_type_reparation);

          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sub_inspection_gen',
            'Modification',
            idSub,
            user_cr || null,
            `Modification de la sous-inspection N° ${idSub} liée à l’inspection N° ${idInspection}, type réparation ${rep.id_type_reparation}`
          ]);

        //Notification
        const notifMessage = `L’inspection n°${idInspection} du véhicule ${getVehiculeResult?.[0].nom_marque}, immatriculé ${getVehiculeResult?.[0].immatriculation}, de type ${getTypeResult?.[0].type_rep}, a été mise à jour.`;

        await queryPromise(connection, `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
        `, [user_cr, notifMessage]);

        // Envoi d'emails aux utilisateurs autorisés
        const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

        const [perResult] = await queryPromise(connection, permissionSQL);
        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
        const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
        const userEmail = userResult?.[0]?.email;

        const message = 
        `
        Bonjour,

        L’inspection n°${idInspection} concernant le véhicule suivant a été mise à jour :

        - Marque : ${getVehiculeResult?.[0].nom_marque}
        - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
        - Type de réparation : ${getTypeResult?.[0].type_rep}

        Nous vous invitons à consulter les détails dans le système si nécessaire.

        Cordialement,  
        L'équipe Maintenance GTM
        `;

        perResult
        .filter(({ email }) => email !== userEmail)
        .forEach(({ email }) => {
          sendEmail({
            email,
            subject: `📌 Mise à jour de l’inspection n°${idInspection}`,
            message
          });
        });
        
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
    const {id_sub_inspection_gen, user_id } = req.body;
  
    if (!id_sub_inspection_gen) {
      return res.status(400).json({ error: "L'ID de l'inspection est requis." });
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
  
          // 🔔 Ajout de la notification
          const notifMessage = `L'inspection #${id_sub_inspection_gen} a été supprimée par l'utilisateur ${user_id}.`;
          await queryPromise(connection, `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
          `, [user_id, notifMessage]);

          await queryPromise(connection, `
            UPDATE sub_inspection_gen SET est_supprime = 1 WHERE id_sub_inspection_gen = ?
          `, [id_sub_inspection_gen]);
  
          await queryPromise(connection, `
            INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
            VALUES (?, ?, ?, ?, ?)
          `, [
            'sub_inspection_gen',
            'Suppression',
            id_sub_inspection_gen,
            user_id || null,
            `Suppression logique de l’inspection #${id_sub_inspection_gen}`
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
exports.getValidationInspectionAll = (req, res) => {
    const { id_inspection_gen } = req.query;

    if (!id_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                    SELECT iv.id_sub_inspection_gen,iv.manoeuvre, ig.id_vehicule, iv.budget_valide, iv.id_type_reparation FROM inspection_valide iv
                        INNER JOIN sub_inspection_gen sub ON iv.id_sub_inspection_gen = sub.id_sub_inspection_gen
                        INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen
                        WHERE ig.id_inspection_gen = ? AND sub.est_supprime = 0
                    `;

    db.query(query, [id_inspection_gen], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

exports.getValidationInspection = (req, res) => {
    const { id_sub_inspection_gen } = req.query;

    if (!id_sub_inspection_gen) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
                    SELECT iv.id_sub_inspection_gen, iv.id_type_reparation, iv.manoeuvre, iv.cout, ig.id_vehicule, iv.budget_valide, sub.avis, sub.commentaire as description, ig.kilometrage, ig.id_statut_vehicule FROM inspection_valide iv
                        INNER JOIN sub_inspection_gen sub ON iv.id_sub_inspection_gen = sub.id_sub_inspection_gen
                        INNER JOIN inspection_gen ig ON sub.id_inspection_gen = ig.id_inspection_gen
                        WHERE iv.id_sub_inspection_gen =  ? AND sub.est_supprime = 0
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

exports.putValidationInspection = (req, res) => {
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
        const updates = req.body; // C'est un tableau

        const updateSQL = `
          UPDATE inspection_valide
          SET budget_valide = ?, manoeuvre = ?
          WHERE id_sub_inspection_gen = ?
        `;

        for (const item of updates) {
          const { budget_valide, manoeuvre, id_sub_inspection_gen } = item;
          await queryAsync(updateSQL, [budget_valide, manoeuvre, id_sub_inspection_gen]);
        }

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit de la transaction." });
          }

          return res.status(200).json({ message: "Les validations ont été mises à jour avec succès." });
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
            est_termine,
            user_cr
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

        const getSubQuery = `
          SELECT sub.id_sub_inspection_gen, i.id_vehicule, i.id_statut_vehicule FROM 
          sub_inspection_gen sub 
          INNER JOIN inspection_gen i ON sub.id_inspection_gen = i.id_inspection_gen
          WHERE sub.id_sub_inspection_gen = ?
        `;
        const [subResult] = await connQuery(getSubQuery, [id_sub_inspection_gen]);

        const historiqueSQL = `
          INSERT INTO historique_vehicule (
            id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sub_inspection_gen, action, commentaire, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const historiqueValues = [
          subResult?.id_vehicule,
          null,
          subResult?.id_statut_vehicule,
          status,
          subResult?.id_sub_inspection_gen,
          "Nouveau suivi d'inspection ajouté",
          `Un nouveau suivi a été ajouté avec succès pour le véhicule n°${subResult?.id_vehicule}.`,
          user_cr
        ];
        
        await queryPromise(connection, historiqueSQL, historiqueValues);

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

exports.getSuiviReparation = async(req, res) => {
    const { id_reparation, id_inspection_gen } = req.query;

    let id_sub_inspection_gen = null;

    if (id_inspection_gen) {
      const qI = `SELECT id_sub_inspection_gen FROM sub_inspection_gen WHERE id_inspection_gen = ?`;
      const result = await queryAsync(qI, [id_inspection_gen]);

      if (result && result.length > 0) {
        id_sub_inspection_gen = result[0].id_sub_inspection_gen;
      }
    }

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
            			  evaluation e ON sud.id_evaluation = e.id_evaluation
                    WHERE sud.id_reparation = ? OR sud.id_sub_inspection_gen = ?
                `;

    db.query(q, [id_reparation, id_sub_inspection_gen], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getSuiviReparationOne = (req, res) => {
    const { id_sud_reparation } = req.query;

    const q = `
           SELECT sr.id_suivi_reparation, 
                    sr.budget, 
                    sr.commentaire, 
                    sr.id_evaluation,
                    sr.id_sud_reparation,
                    sr.id_piece,
                    sr.id_tache_rep,
                    sr.statut_fin,
                     p.nom AS type_rep, 
                     ci.nom_cat_inspection AS nom_cat_inspection,
                    u.nom,
                    e.nom_evaluation,
                    e.id_evaluation,
                    v.immatriculation,
                    m.nom_marque,
                    v.immatriculation,
                    tr.type_rep AS nom_type_rep
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
                    	reparations r ON sud.id_reparation = r.id_reparation
                    LEFT JOIN 
                    	vehicules v ON r.id_vehicule = v.id_vehicule
                    LEFT JOIN 
                    	marque m ON v.id_marque = m.id_marque
                    LEFT JOIN 
            			    evaluation e ON sud.id_evaluation = e.id_evaluation
                     LEFT JOIN type_reparations tr ON sud.id_type_reparation = tr.id_type_reparation
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

/* exports.postSuiviReparation = async (req, res) => {
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
} */

exports.postSuiviReparation = async (req, res) => {
      let connection;
  
      try {
          const { id_evaluation, id_statut_vehicule, id_sud_reparation, user_cr, info } = req.body;
  
          if (!id_evaluation || !id_sud_reparation || !user_cr || !info || !Array.isArray(info)) {
            return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
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
              INSERT INTO suivi_reparation (
                  id_sud_reparation,
                  id_tache_rep,
                  id_piece,
                  budget,
                  commentaire,
                  user_cr
              ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          for (const rep of info) {
              const repValues = [
                  id_sud_reparation,
                  rep.id_tache_rep,
                  rep.id_piece,
                  rep.budget,
                  rep.commentaire,
                  user_cr
              ];
              await connQuery(insertQuery, repValues);
          }

          const getSubQuery = `
              SELECT sud.id_sub_inspection_gen, r.id_vehicule, r.id_statut_vehicule, r.id_reparation, gen.id_inspection_gen, sud.id_type_reparation
              FROM sud_reparation sud
              INNER JOIN reparations r ON sud.id_reparation = r.id_reparation
              LEFT JOIN sub_inspection_gen sub ON sud.id_sub_inspection_gen = sub.id_sub_inspection_gen
              LEFT JOIN inspection_gen gen ON sub.id_inspection_gen = gen.id_inspection_gen
              WHERE id_sud_reparation = ?
            `;
          const [subResult] = await connQuery(getSubQuery, [id_sud_reparation]);


          // Mise à jour de l'évaluation
          const updateEvalQuery = `
              UPDATE sud_reparation 
              SET id_evaluation = ?
              WHERE id_sud_reparation = ?
          `;
          await connQuery(updateEvalQuery, [id_evaluation, id_sud_reparation]);
  
          // Mise à jour du statut si évaluation est "OK (R)" → id_evaluation = 1
          if (parseInt(id_evaluation) === 1) {
              const updateStatusQuery = `
                UPDATE sud_reparation
                SET id_statut = 9
                WHERE id_sud_reparation = ?
              `;
              await connQuery(updateStatusQuery, [id_sud_reparation]);

              const updateEtatQuery = `
                UPDATE reparations
                SET id_statut_vehicule = ?
                WHERE id_reparation = ?
              `;
              await connQuery(updateEtatQuery, [id_statut_vehicule, subResult?.id_reparation]);

              const updateStatusQueryInspect = `
                UPDATE sub_inspection_gen
                SET statut = 9
                WHERE id_sub_inspection_gen = ?
              `;
              await connQuery(updateStatusQueryInspect, [subResult?.id_sub_inspection_gen]);

              const updateStatusQueryInspectGen = `
                UPDATE inspection_gen
                SET id_statut_vehicule = ?
                WHERE id_inspection_gen = ?
              `;
              await connQuery(updateStatusQueryInspectGen, [id_statut_vehicule, subResult?.id_inspection_gen, ]);

              const historiqueSQL = `
                INSERT INTO historique_vehicule (
                  id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;
    
              const historiqueValues = [
                subResult?.id_vehicule,
                null,
                id_statut_vehicule || subResult?.id_statut_vehicule,
                9,
                id_sud_reparation,
                "Nouveau suivi de réparation ajouté",
                `Un nouveau suivi a été ajouté avec succès pour le véhicule n°${subResult?.id_vehicule}.`,
                user_cr
              ];
            
              await queryPromise(connection, historiqueSQL, historiqueValues);

              const getVehiculeSQL = `
              SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
                INNER JOIN marque m ON v.id_marque = m.id_marque
                WHERE v.id_vehicule = ?
              `;
              
              const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, subResult?.id_vehicule);
              const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
              const [getTypeResult] = await queryPromise(connection, getType, subResult?.id_type_reparation);

              // Envoi d'emails aux utilisateurs autorisés
              const permissionSQL = `
              SELECT u.email FROM permission p 
                INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
                WHERE p.menus_id = 14 AND p.can_read = 1
                GROUP BY p.user_id
              `;

              const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
              const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
              const userEmail = userResult?.[0]?.email;

            const [perResult] = await queryPromise(connection, permissionSQL);
            const message = 
            `
            Bonjour,

            Le véhicule suivant a été réparé pour le type d’intervention suivant :

            - Marque : ${getVehiculeResult?.[0].nom_marque}
            - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
            - Type de réparation : ${getTypeResult?.[0].type_rep}
            - Réparation n°${id_sud_reparation}

            La réparation a été finalisée avec succès et le statut du véhicule a été mis à jour dans le système.

            Cordialement,  
            L'équipe Maintenance GTM
            `;

            perResult
              .filter(({ email }) => email !== userEmail)
              .forEach(({ email }) => {
                sendEmail({
                  email,
                  subject: `🔧 Réparation mise à jour`,
                  message
                  });
                });
          }
  
          await commit();
          connection.release();
  
          return res.status(201).json({ message: 'Suivi de réparation ajouté avec succès.' });
  
      } catch (error) {
          console.error("Erreur pendant le traitement :", error);
          if (connection) {
              try {
                  await connection.rollback();
                  connection.release();
              } catch (rollbackError) {
                  console.error('Erreur pendant le rollback :', rollbackError);
              }
          }
          return res.status(500).json({ error: 'Erreur interne du serveur.' });
      }
  };

exports.putSuiviReparation = async (req, res) => {
    let connection;

    try {
        const { id_suivi_reparation } = req.query;
        const { id_tache_rep, id_piece, budget, commentaire, id_evaluation, id_sud_reparation } = req.body;

        if (!id_suivi_reparation || !id_evaluation || !id_sud_reparation) {
            return res.status(400).json({ error: 'Certains champs requis sont manquants.' });
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        const connQuery = util.promisify(connection.query).bind(connection);

        // Mise à jour du suivi
        const updateQuery = `
            UPDATE suivi_reparation
            SET 
                id_tache_rep = ?,
                id_piece = ?,
                budget = ?,
                commentaire = ?
            WHERE id_suivi_reparation = ?
        `;

        const values = [
            id_tache_rep || null,
            id_piece || null,
            budget || 0,
            commentaire || '',
            id_suivi_reparation
        ];

        const result = await connQuery(updateQuery, values);

        if (result.affectedRows === 0) {
            connection.release();
            return res.status(404).json({ error: 'Aucun suivi trouvé avec cet ID.' });
        }

        // Mise à jour de l’évaluation
        const updateEvalQuery = `
            UPDATE sud_reparation 
            SET id_evaluation = ?
            WHERE id_sud_reparation = ?
        `;
        await connQuery(updateEvalQuery, [id_evaluation, id_sud_reparation]);

        // Mise à jour du statut si l’évaluation est "OK (R)" (id = 1)
        if (parseInt(id_evaluation) === 1) {
            const updateStatusQuery = `
                UPDATE sud_reparation
                SET id_statut = 9
                WHERE id_sud_reparation = ?
            `;
            await connQuery(updateStatusQuery, [id_sud_reparation]);
        }

        connection.release();

        return res.status(200).json({ message: 'Suivi de réparation et évaluation mis à jour avec succès.' });

    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        if (connection) connection.release();
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

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
      GROUP BY origine
      ORDER BY ;
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
  const { searchValue } = req.query;

  let whereClauses = [];
  let values = [];

  if (searchValue) {
    whereClauses.push(`(v.immatriculation LIKE ? OR m.nom_marque LIKE ?)`);
    const likeValue = `%${searchValue}%`;
    values.push(likeValue, likeValue);
  }

  const whereClauseString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const historiqueQuery = `
    SELECT 
      hv.id_historique, 
      hv.date_action, 
      hv.action, 
      hv.commentaire, 
      u.nom, 
      v.immatriculation, 
      sv.nom_statut_vehicule, 
      m.nom_marque, 
      COALESCE(tr.type_rep, trs.type_rep) AS type_rep, 
      ts.nom_type_statut 
    FROM historique_vehicule hv 
    LEFT JOIN utilisateur u ON hv.user_cr = u.id_utilisateur
    LEFT JOIN vehicules v ON hv.id_vehicule = v.id_vehicule
    LEFT JOIN statut_vehicule sv ON hv.id_statut_vehicule = sv.id_statut_vehicule
    LEFT JOIN sub_inspection_gen sub ON hv.id_sub_inspection_gen = sub.id_sub_inspection_gen
    LEFT JOIN sud_reparation sud ON hv.id_sud_reparation = sud.id_sud_reparation
    LEFT JOIN type_reparations tr ON sub.id_type_reparation = tr.id_type_reparation
    LEFT JOIN type_reparations trs ON sud.id_type_reparation = trs.id_type_reparation
    LEFT JOIN type_statut_suivi ts ON hv.statut = ts.id_type_statut_suivi
    LEFT JOIN marque m ON v.id_marque = m.id_marque
    ${whereClauseString}
    ORDER BY hv.created_at DESC;
  `;

  const dateQuery = `
    SELECT 
      MAX(hv.date_action) AS date_recente, 
      MIN(hv.date_action) AS date_ancienne
    FROM historique_vehicule hv
    LEFT JOIN vehicules v ON hv.id_vehicule = v.id_vehicule
    LEFT JOIN marque m ON v.id_marque = m.id_marque
    ${whereClauseString};
  `;

  const statQuery = `
    SELECT 
        ts.nom_type_statut,
        sv.nom_statut_vehicule
    FROM historique_vehicule hv
    LEFT JOIN type_statut_suivi ts ON hv.statut = ts.id_type_statut_suivi
    LEFT JOIN statut_vehicule sv ON hv.id_statut_vehicule = sv.id_statut_vehicule
    LEFT JOIN vehicules v ON hv.id_vehicule = v.id_vehicule
    LEFT JOIN marque m ON v.id_marque = m.id_marque
    ${whereClauseString}
    ORDER BY hv.date_action DESC
    LIMIT 1;
  `

  db.query(historiqueQuery, values, (error, historiqueData) => {
    if (error) {
      return res.status(500).send(error);
    }

    db.query(dateQuery, values, (err, dateResult) => {
      if (err) {
        return res.status(500).send(err);
      }

      db.query(statQuery, values, (error, result) => {
        if(error) {
          return res.status(500).send(error);
        }

        return res.status(200).json({
        data: historiqueData,
        date_recente: dateResult[0]?.date_recente || null,
        date_ancienne: dateResult[0]?.date_ancienne || null,
        statut: result
      });
      })
    });
  });
};

exports.getHistoriqueNotification = (req, res) => {
  const { userId } = req.query;

  const q = `SELECT hv.id_historique, hv.date_action, hv.action, hv.commentaire, u.nom, v.immatriculation, sv.nom_statut_vehicule, m.nom_marque FROM historique_vehicule hv 
              LEFT JOIN utilisateur u ON hv.user_cr = u.id_utilisateur
              LEFT JOIN vehicules v ON hv.id_vehicule = v.id_vehicule
              LEFT JOIN statut_vehicule sv ON hv.id_statut_vehicule = sv.id_statut_vehicule
              LEFT JOIN marque m ON v.id_marque = m.id_marque
              WHERE hv.vu = 0 AND hv.user_cr =! ? `;

  db.query(q, [userId], (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.getReclamation = (req, res) => {
  const { id_reparation, inspectionId } = req.query;

  const q = `SELECT rs.id_reclamations, 
                rs.intitule, 
                rs.description, 
                rs.etat, 
                rs.date_debut, 
                rs.date_fin, 
                rs.raison_fin, 
                rs.montant,
                tr.type_rep,
                ev.nom_evaluation,
                subr.description AS desc2,
                subr.cout,
                subr.id_sub_reclamation,
                u.nom
              FROM reclamations rs
            INNER JOIN 
            	sub_reclamation subr ON rs.id_reclamations = subr.id_reclamation
            INNER JOIN 
            	type_reparations tr ON subr.id_type_reparation = tr.id_type_reparation
            INNER JOIN 
            	evaluation ev ON rs.etat = ev.id_evaluation
            INNER JOIN 
            	sud_reparation sud ON rs.id_sud_reparation = sud.id_sud_reparation
            INNER JOIN 
              reparations r ON sud.id_reparation = r.id_reparation
            INNER JOIN 
            	utilisateur u ON rs.user_cr = u.id_utilisateur
            WHERE r.id_reparation = ? OR sud.id_sub_inspection_gen = ?
            ` 

  db.query(q, [id_reparation, inspectionId], (err, result) => {
    if(err){
      console.error('Erreur lors de la récupération', err)
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }

    return res.status(200).json(result);
  })
}

exports.getReclamationOne = (req, res) => {
  const { id_sub_reclamation } = req.query;

  const q = `SELECT rs.id_reclamations, 
                rs.intitule, 
                rs.description, 
                rs.etat, 
                rs.date_debut, 
                rs.date_fin, 
                rs.raison_fin, 
                rs.montant,
                tr.type_rep,
                ev.nom_evaluation,
                subr.description AS desc2,
                subr.cout
              FROM reclamations rs
            INNER JOIN 
            	sub_reclamation subr ON rs.id_reclamations = subr.id_reclamation
            INNER JOIN 
            	type_reparations tr ON subr.id_type_reparation = tr.id_type_reparation
            INNER JOIN evaluation ev ON rs.etat = ev.id_evaluation
            WHERE subr.id_sub_reclamation = ?`

  db.query(q, [id_sub_reclamation], (err, result) => {

    if(err){
      console.error('Erreur lors de la récupération', err)
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }

    return res.status(200).json(result);
  })
}

exports.postReclamation = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }
      try {
        const { id_sud_reparation, 
                intitule, 
                description, 
                id_evaluation, 
                date_debut, 
                date_fin, 
                raison_fin, 
                montant, 
                sub_reclamation,
                user_cr
              } = req.body;

          const insertReclame = `INSERT INTO reclamations (
              id_sud_reparation, intitule, description, etat, date_debut, date_fin, raison_fin, montant, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

          const Reclamevalues = [
            id_sud_reparation,
            intitule,
            description,
            id_evaluation,
            date_debut,
            date_fin,
            raison_fin, 
            montant,
            user_cr
          ]
        const [insertReclameResult] = await queryPromise(connection, insertReclame, Reclamevalues)
        const insertId = insertReclameResult.insertId;

        // Mise à jour de l'évaluation
        const updateEvalQuery = `
          UPDATE sud_reparation 
          SET id_evaluation = ?
          WHERE id_sud_reparation = ?
      `;
      await queryPromise(connection, updateEvalQuery, [id_evaluation, id_sud_reparation]);

        const qSud = `INSERT INTO sub_reclamation (id_reclamation, id_type_reparation, id_piece, cout, description) VALUES (?, ?, ?, ?, ?)`;

        for (const recl of sub_reclamation) {
          const reclValues = [
            insertId,
            recl.	id_type_reparation,
            recl.	id_piece,
            recl.cout,
            recl.description
          ]

          const [insertSub] = await queryPromise(connection, qSud, reclValues)

          const idSub = insertSub.insertId;  
          
          connection.commit((commitErr) => {
            connection.release();
            if(commitErr) {
              console.error("Erreur commit : ", commitErr)
              return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
            }
          })
  
          return res.status(201).json({
            message: "Inspection enregistrée avec succès.",
            data: { id: insertId },
            subData: {ids: idSub}
          });
        }

      } catch (error) {
        console.error("Erreur dans la transaction :", error);
        connection.rollback(() => {
          connection.release();
          const msg = error.message || "Erreur inattendue lors du traitement.";
          return res.status(500).json({ error: msg });
        });
      }
    })
  })
}

exports.getServiceDemandeur = (req, res) => {
    const q = `SELECT 
                  sd.id_service_demandeur, 
                  sd.nom_service, 
                  d.nom_departement 
                FROM 
                service_demandeur sd 
                INNER JOIN 
                  departement d ON sd.id_departement = d.id_departement`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.postServiceDemandeur = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error('Erreur de connexion à la base de données :', connErr);
      return res.status(500).json({ error: "Impossible de se connecter à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur lors de l’ouverture de la transaction :', trxErr);
        return res.status(500).json({ error: "Échec de l’initiation de la transaction." });
      }

      try {
        const { nom_service, id_departement } = req.body;

        if (!nom_service) {
          throw new Error("le champ nom service est requis.");
        }

        const insertSql = `
            INSERT INTO service_demandeur (
              nom_service,
              id_departement
            ) VALUES (?, ?)
        `
        await queryPromise(connection, insertSql, [nom_service, id_departement])

                connection.commit((commitErr) => {
          connection.release();

          if (commitErr) {
            console.error("Erreur lors de la validation de la transaction :", commitErr);
            return res.status(500).json({ error: "Une erreur est survenue lors de la finalisation de l’opération." });
          }

          return res.status(201).json({
            message: "Le demandeur a été enregistrée avec succès.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(500).json({
            error: error.message || "Une erreur est survenue lors du traitement de la demande.",
          });
        });
      }
    })
  })
}


exports.getTypeVehicule = (req, res) => {
    const q = `SELECT * FROM type_vehicule`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getMotif = (req, res) => {
    const q = `SELECT * FROM motif_demande`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getDemandeVehicule = (req, res) => {
  const { userId, userRole } = req.query;

  let q = `
    SELECT 
      dv.id_demande_vehicule, 
      dv.date_chargement, 
      dv.date_prevue, 
      dv.date_retour,
      dv.vu,
      tv.nom_type_vehicule,
      md.nom_motif_demande,
      sd.nom_service,
      c.nom,
      u.nom AS nom_user,
      l.nom_destination,
      tss.nom_type_statut
    FROM demande_vehicule dv
    INNER JOIN type_vehicule tv ON dv.id_type_vehicule = tv.id_type_vehicule
    INNER JOIN motif_demande md ON dv.id_motif_demande = md.id_motif_demande
    INNER JOIN service_demandeur sd ON dv.id_demandeur = sd.id_service_demandeur
    INNER JOIN client c ON dv.id_client = c.id_client
    LEFT JOIN destination l ON dv.id_destination = l.id_destination
    INNER JOIN type_statut_suivi tss ON dv.statut = tss.id_type_statut_suivi
    INNER JOIN utilisateur u ON dv.user_cr = u.id_utilisateur
  `;

  const params = [];

  if (userRole !== 'Admin' && userRole !== 'RH' && userRole !== 'RS') {
    q += ` WHERE dv.user_cr = ?`;
    params.push(userId);
  }

  q += ` ORDER BY dv.created_at DESC`;

  db.query(q, params, (error, data) => {
    if (error) {
      console.error("Erreur SQL :", error);
      return res.status(500).send("Erreur serveur");
    }
    return res.status(200).json(data);
  });
};

exports.getDemandeVehiculeOne = (req, res) => {
    const { id_demande_vehicule } = req.query;

    if(!id_demande_vehicule) {
      return res.status(400).json({ error: 'Invalid id demande'})
    }

    let q = `    SELECT 
                  dv.*,
                  tv.nom_type_vehicule,
                  md.nom_motif_demande,
                  sd.nom_service,
                  c.nom,
                  u.nom AS nom_user,
                  l.nom_destination,
                  tss.nom_type_statut
                FROM demande_vehicule dv
                INNER JOIN type_vehicule tv ON dv.id_type_vehicule = tv.id_type_vehicule
                INNER JOIN motif_demande md ON dv.id_motif_demande = md.id_motif_demande
                INNER JOIN service_demandeur sd ON dv.id_demandeur = sd.id_service_demandeur
                INNER JOIN client c ON dv.id_client = c.id_client
                LEFT JOIN destination l ON dv.id_destination = l.id_destination
                INNER JOIN type_statut_suivi tss ON dv.statut = tss.id_type_statut_suivi
                INNER JOIN utilisateur u ON dv.user_cr = u.id_utilisateur
                WHERE dv.id_demande_vehicule = ?
              `;

    db.query(q, [id_demande_vehicule], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDemandeVehicule = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion DB :', connErr);
      return res.status(500).json({ error: "Erreur de connexion à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur transaction :', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          date_chargement,
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          user_cr,
          personne_bord
        } = req.body;

        if (!user_cr || !id_type_vehicule) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO demande_vehicule (
            date_chargement, 
            date_prevue, 
            date_retour, 
            id_type_vehicule, 
            id_motif_demande,
            id_demandeur,
            id_client,
            id_destination,
            statut,
            user_cr,
            personne_bord
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const valuesDemande = [
          date_chargement,
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          1,
          user_cr,
          personne_bord
        ];

        const [insertDemandeResult] = await queryPromise(connection, insertSQL, valuesDemande);
        const insertId = insertDemandeResult.insertId;

        const notifSQL = `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
          `;

        const notifMsg = `Vous avez reçu la demande n°${insertId}, en attente de votre intervention.`;

        await queryPromise(connection, notifSQL, [user_cr, notifMsg]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de l'enregistrement de la transaction." });
          }

          return res.status(201).json({
            message: "La demande a été enregistrée avec succès.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(500).json({
            error: error.message || "Une erreur est survenue lors de l'enregistrement.",
          });
        });
      }
    });
  });
};

exports.putDemandeVehicule = (req, res) => {
  const { id_demande_vehicule } = req.query;

  if (!id_demande_vehicule) {
    return res.status(400).json({ error: "L'identifiant de la demande est requis." });
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
        const {
          date_chargement,
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          id_utilisateur
        } = req.body;

        // Vérification des champs requis
        if (!id_type_vehicule) {
          throw new Error("Champs obligatoires manquants.");
        }

        const updateSQL = `
          UPDATE demande_vehicule SET
            date_chargement = ?,
            date_prevue = ?,
            date_retour = ?,
            id_type_vehicule = ?,
            id_motif_demande = ?,
            id_demandeur = ?,
            id_client = ?,
            id_destination = ?
          WHERE id_demande_vehicule = ?
        `;

        const valuesUpdate = [
          date_chargement,
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          id_demande_vehicule
        ];

        await queryPromise(connection, updateSQL, valuesUpdate);

        // Suppression des utilisateurs liés existants
        const deleteUsersSQL = `
          DELETE FROM demande_vehicule_users WHERE id_demande_vehicule = ?
        `;
        await queryPromise(connection, deleteUsersSQL, [id_demande_vehicule]);

        // Ajout des nouveaux utilisateurs liés
        let parsedUsers = Array.isArray(id_utilisateur)
          ? id_utilisateur
          : JSON.parse(id_utilisateur || '[]');

        if (!Array.isArray(parsedUsers)) {
          throw new Error("Le champ 'id_utilisateur' doit être un tableau.");
        }

        const insertUsersSQL = `
          INSERT INTO demande_vehicule_users (id_demande_vehicule, id_utilisateur) VALUES (?, ?)
        `;

        await Promise.all(parsedUsers.map(user =>
          queryPromise(connection, insertUsersSQL, [id_demande_vehicule, user])
        ));

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(200).json({
            message: "La demande a été mise à jour avec succès.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors de la mise à jour.",
          });
        });
      }
    });
  });
};

exports.putDemandeVehiculeVue = (req, res) => {
  const { id_demande } = req.query;

  if(!id_demande) {
    return res.status(400).json({ error: 'Invalid id demande'})
  }

  try {
    let query = `UPDATE 
                  demande_vehicule 
                  SET vu = 1, statut = 2 WHERE id_demande_vehicule = ?`
    db.query(query, [id_demande], (error, results) => {
      if(error) {
        console.error("Erreur execution : ", error)
        return res.status(500).json({ error: 'Failed to update template status'})
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Charroi not found' });
      }
      return res.json({ message: 'Charroi status updated successfully' });
    });
    
  } catch (error) {
    console.error("Error updating demande status:", err);
    return res.status(500).json({ error: 'Failed to update demande status' });
  }
};

exports.putDemandeVehiculeAnnuler = (req, res) => {
  const { id_demande } = req.query;

  if(!id_demande) {
    return res.status(400).json({ error: 'Invalid id demande'})
  }

  try {
    let query = `UPDATE 
                  demande_vehicule 
                  SET statut = 10 WHERE id_demande_vehicule = ?`
    db.query(query, [id_demande], (error, results) => {
      if(error) {
        console.error("Erreur execution : ", error)
        return res.status(500).json({ error: 'Failed to update demande status'})
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Demande not found' });
      }
      return res.json({ message: 'Demande status updated successfully' });
    });
    
  } catch (error) {
    console.error("Error updating demande status:", err);
    return res.status(500).json({ error: 'Failed to update demande status' });
  }
};

exports.putDemandeVehiculeRetour = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion DB :', connErr);
      return res.status(500).json({ error: "Erreur de connexion à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur transaction :', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const { id_demande } = req.query;

        if (!id_demande) {
          connection.release();
          return res.status(400).json({ error: 'ID de demande invalide.' });
        }

/*         // Mettre à jour la date de retour
        const updateDemandeQuery = `
          UPDATE demande_vehicule
          SET date_retour = ?
          WHERE id_demande_vehicule = ?
        `;
        const values = [new Date(), id_demande];
        await queryPromise(connection, updateDemandeQuery, values);
 */
        // Récupérer l'ID du véhicule affecté
        const getVehiculeQuery = `
          SELECT id_vehicule
          FROM affectation_demande
          WHERE id_demande_vehicule = ?
        `;
        const [vehiculeResult] = await queryPromise(connection, getVehiculeQuery, [id_demande]);

        if (!vehiculeResult || vehiculeResult.length === 0) {
          connection.release();
          return res.status(404).json({ error: "Aucun véhicule affecté trouvé pour cette demande." });
        }

        const idVehicule = vehiculeResult[0].id_vehicule;

        // Mettre à jour la disponibilité du véhicule
        const updateDispoQuery = `
          UPDATE vehicules
          SET IsDispo = 1
          WHERE id_vehicule = ?
        `;
        await queryPromise(connection, updateDispoQuery, [idVehicule]);

        // Commit de la transaction
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation des données." });
          }
          return res.status(200).json({ message: "Le retour du véhicule a été enregistré avec succès." });
        });

      } catch (err) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur lors du traitement :", err);
          return res.status(500).json({ error: "Échec de la mise à jour du retour du véhicule." });
        });
      }
    });
  });
};

//Validation demande
exports.getValidationDemande = (req, res) => {

    const q = `
            SELECT * FROM validation_demande
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getValidationDemandeOne = (req, res) => {
    const { id_bande_sortie } = req.query;

    if (!id_bande_sortie) {
      return res.status(400).json({ error: 'L\'ID de la validation fourni est invalide ou manquant.' });
    }

    const q = `
              SELECT 
                vd.*, u.nom, u.prenom, u.role
              FROM 
              validation_demande vd 
              INNER JOIN utilisateur u ON vd.validateur_id = u.id_utilisateur
              WHERE vd.id_bande_sortie = ?
            `;

    db.query(q, [id_bande_sortie], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.postValidationDemande = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion DB :', connErr);
      return res.status(500).json({ error: "Erreur de connexion à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur transaction :', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const { id_bande_sortie, validateur_id } = req.body;

        if (!id_bande_sortie || !validateur_id) {
          throw new Error("Les champs 'id_bande_sortie' et 'validateur_id' sont requis.");
        }

        // Récupérer l'ID de la signature du validateur
        const signatureSql = `
          SELECT id_signature 
          FROM signature 
          WHERE userId = ?
          LIMIT 1
        `;

        const [signatureRow] = await queryPromise(connection, signatureSql, [validateur_id]);

        if (!signatureRow) {
          throw new Error("Aucune signature trouvée pour ce validateur.");
        }

        const idSignature = signatureRow[0].id_signature;

        // Insertion de la validation
        const insertSQL = `
          INSERT INTO validation_demande (
            id_bande_sortie,
            validateur_id,
            id_signature,
            date_validation
          ) VALUES (?, ?, ?, NOW())
        `;

        const values = [
          id_bande_sortie,
          validateur_id,
          idSignature
        ];

        await queryPromise(connection, insertSQL, values);
        
        const updateBonSortie = `UPDATE bande_sortie SET statut = 2 WHERE id_bande_sortie = ?`;
        

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de l'enregistrement de la validation." });
          }

          return res.status(201).json({
            message: "Bon de sortie validé avec succès et signature enregistrée.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur dans la transaction :", error);
          return res.status(500).json({
            error: error.message || "Une erreur est survenue lors de la validation."
          });
        });
      }
    });
  });
}; */

exports.postValidationDemande = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion DB :', connErr);
      return res.status(500).json({ error: "Erreur de connexion à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur transaction :', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const { id_bande_sortie, validateur_id } = req.body;

        if (!id_bande_sortie || !validateur_id) {
          throw new Error("Les champs 'id_bande_sortie' et 'validateur_id' sont requis.");
        }

        // Récupérer l'ID de la signature du validateur
        const signatureSql = `
          SELECT id_signature 
          FROM signature 
          WHERE userId = ?
          LIMIT 1
        `;
        const [signatureRow] = await queryPromise(connection, signatureSql, [validateur_id]);

        if (!signatureRow) {
          throw new Error("Aucune signature trouvée pour ce validateur.");
        }

        const idSignature = signatureRow[0].id_signature;

        // Insertion de la validation
        const insertSQL = `
          INSERT INTO validation_demande (
            id_bande_sortie,
            validateur_id,
            id_signature,
            date_validation
          ) VALUES (?, ?, ?, NOW())
        `;
        await queryPromise(connection, insertSQL, [id_bande_sortie, validateur_id, idSignature]);

        // Compter combien de validations existent déjà pour ce bon de sortie
        const countSQL = `
          SELECT COUNT(DISTINCT validateur_id) AS total_validations
          FROM validation_demande
          WHERE id_bande_sortie = ?
        `;

        const [countRow] = await queryPromise(connection, countSQL, [id_bande_sortie]);
        const totalValidations = countRow[0].total_validations;

        // Si 3 validateurs différents ont validé, changer le statut
        if (totalValidations >= 1) {
          const updateSQL = `UPDATE bande_sortie SET statut = 2 WHERE id_bande_sortie = ?`;
          await queryPromise(connection, updateSQL, [id_bande_sortie]);
        }

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de l'enregistrement de la validation." });
          }

          return res.status(201).json({
            message: "Validation enregistrée avec succès.",
            statut_mis_a_jour: totalValidations >= 3
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur dans la transaction :", error);
          return res.status(500).json({
            error: error.message || "Une erreur est survenue lors de la validation."
          });
        });
      }
    });
  });
};

//Destination
exports.getDestination = (req, res) => {
    const q = `SELECT 
                d.*, 
                v.nom_ville 
                FROM destination d
                  INNER JOIN villes v ON d.id_ville = v.id_ville`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDestination = (req, res) => {
    db.getConnection((connErr, connection) => {
        if(connErr) {
            console.error("Erreur de connexion DB : ", connErr)
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                console.error("Erreur transaction : ", trxErr)
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const { nom_destination, id_ville } = req.body;

                if (!nom_destination || !id_ville) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                const insertSql = `
                    INSERT INTO destination (
                    nom_destination, id_ville
                    ) VALUES (?, ?)
                `
                const values = [
                    nom_destination,
                    id_ville
                ]

                const [insertResult] = await queryPromise(connection, insertSql, values);
                const insertId = insertResult.insertId;

            connection.commit((commitErr) => {
                connection.release();
                if (commitErr) {
                    console.error("Erreur commit :", commitErr);
                    return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
                }

                return res.status(201).json({
                    message: "La destination a été enregistrée avec succès.",
                    data: { id: insertId }
                });
                });

            } catch (error) {
               console.log(error)               
            }
        })
    })
};

//Affectation
exports.getAffectationDemande = (req, res) => {

    const q = `
        SELECT 
          ad.id_affectation_demande, 
          ad.date_prevue,
          ad.date_retour,
          ad.personne_bord,
          ad.commentaire, 
          mfd.nom_motif_demande,
          ts.nom_type_statut,
          sd.nom_service,
          l.nom_destination,
          c.nom, 
          v.immatriculation, 
          m.nom_marque,
          cv.nom_cat,
          d.nom_departement
        FROM affectation_demande ad
          INNER JOIN 
            chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
          INNER JOIN 
            vehicules v ON ad.id_vehicule = v.id_vehicule
          INNER JOIN 
            marque m ON m.id_marque = v.id_marque
          LEFT JOIN 
            modeles md ON v.id_modele = md.id_modele
          LEFT JOIN 
          	cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
          INNER JOIN 
            type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
          LEFT JOIN 
            motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
          LEFT JOIN
            service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
          LEFT JOIN 
            destination l ON ad.id_destination = l.id_destination
          LEFT JOIN 
          	departement d ON sd.id_departement = d.id_departement
          ORDER BY ad.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getAffectationDemandeOne = (req, res) => {
    const { id_affectation_demande } = req.query;

    if (!id_affectation_demande) {
      return res.status(400).json({ message: "L'identifiant (id) est requis." });
    }

    const q = `
              SELECT * FROM affectation_demande WHERE id_affectation_demande = ?
            `;

    db.query(q, [id_affectation_demande], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postAffectationDemande = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion à la base de données :', connErr);
      return res.status(500).json({ error: "Impossible de se connecter à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur lors de l’ouverture de la transaction :', trxErr);
        return res.status(500).json({ error: "Échec de l’initiation de la transaction." });
      }

      try {
        const { 
          id_demande_vehicule, 
          id_vehicule, 
          id_chauffeur, 
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          personne_bord,
          commentaire,
          user_cr, 
        } = req.body;

        if (!id_vehicule || !id_chauffeur || !user_cr) {
          throw new Error("Certains champs requis sont manquants dans la requête.");
        }

        const insertSql = `
          INSERT INTO affectation_demande (
            id_demande_vehicule,
            id_vehicule,
            id_chauffeur,
            date_prevue,
            date_retour,
            id_type_vehicule,
            id_motif_demande,
            id_demandeur,
            id_client,
            id_destination,
            statut,
            personne_bord,
            commentaire,
            user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const valuesDemande = [
            id_demande_vehicule, 
            id_vehicule, 
            id_chauffeur, 
            date_prevue,
            date_retour,
            id_type_vehicule,
            id_motif_demande,
            id_demandeur,
            id_client,
            id_destination,
            11,
            personne_bord,
            commentaire,
            user_cr
          ]

        await queryPromise(connection, insertSql, valuesDemande);

        if (id_demande_vehicule) {
          const updateDemandeSql = `UPDATE demande_vehicule SET statut = 11 WHERE id_demande_vehicule = ?`;
          await queryPromise(connection, updateDemandeSql, [id_demande_vehicule]);
        }

        const updateVehiculeSql = `
          UPDATE vehicules SET IsDispo = 0 WHERE id_vehicule = ?
        `;
        await queryPromise(connection, updateVehiculeSql, [id_vehicule]);

        // Notification à l'utilisateur
        const notifSQL = `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
        `;

        const notifMsg = `Votre demande a été approuvée avec succès.`;
        await queryPromise(connection, notifSQL, [user_cr, notifMsg]);

        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
        const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
        const userEmail = userResult?.[0]?.email;

        // Envoi d'e-mails aux utilisateurs autorisés
        const permissionSQL = `
          SELECT u.email FROM permission p 
          INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
          INNER JOIN submenus sub ON p.submenu_id = sub.id
          WHERE sub.id = 50 AND p.can_read = 1
          GROUP BY p.user_id
        `;

        const [perResult] = await queryPromise(connection, permissionSQL);

        const message = `
Bonjour,

Votre demande a été approuvée avec succès.

Cordialement,  
L'équipe Logistique GTM
        `;

        perResult
          .filter(({ email }) => email !== userEmail)
          .forEach(({ email }) => {
            sendEmail({
              email,
              subject: '📌 Nouvelle affectation enregistrée',
              message
            });
          });

        connection.commit((commitErr) => {
          connection.release();

          if (commitErr) {
            console.error("Erreur lors de la validation de la transaction :", commitErr);
            return res.status(500).json({ error: "Une erreur est survenue lors de la finalisation de l’opération." });
          }

          return res.status(201).json({
            message: "L'affectation de la demande a été enregistrée avec succès.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(500).json({
            error: error.message || "Une erreur est survenue lors du traitement de la demande.",
          });
        });
      }
    });
  });
};

//Bande de sortie
exports.getBandeSortie = (req, res) => {

    const q = `
        SELECT 
          ad.id_bande_sortie, 
          ad.date_prevue,
          ad.date_retour,
          ad.personne_bord,
          ad.commentaire, 
          mfd.nom_motif_demande,
          ts.nom_type_statut,
          cv.nom_cat,
          sd.nom_service,
          l.nom_destination,
          c.nom, 
          v.immatriculation, 
          m.nom_marque
        FROM bande_sortie ad
          INNER JOIN 
            chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
          INNER JOIN 
            vehicules v ON ad.id_vehicule = v.id_vehicule
          INNER JOIN 
            marque m ON m.id_marque = v.id_marque
          LEFT JOIN 
            modeles md ON v.id_modele = md.id_modele
          INNER JOIN 
            type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
          LEFT JOIN 
          	cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
          LEFT JOIN 
            motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
          LEFT JOIN
            service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
          LEFT JOIN 
            destination l ON ad.id_destination = l.id_destination
          ORDER BY ad.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBandeSortieOne = (req, res) => {
    const { id_bande_sortie } = req.query;

    if (!id_bande_sortie) {
      return res.status(400).json({ message: "L'identifiant (id) est requis." });
    }

    const q = `
             SELECT bs.*, 
                v.immatriculation, 
                m.nom_marque, 
                ml.modele, 
                sd.nom_service, 
                c.nom AS nom_chauffeur, 
                cv.nom_cat AS nom_type_vehicule,
                md.nom_motif_demande
                FROM 
                bande_sortie bs
                INNER JOIN 
                  vehicules v ON bs.id_vehicule = v.id_vehicule
                LEFT JOIN 
                  marque m ON v.id_marque = m.id_marque
                LEFT JOIN 
                  modeles ml ON v.id_modele = ml.id_modele
                LEFT JOIN
                  service_demandeur sd ON bs.id_demandeur = sd.id_service_demandeur
                LEFT JOIN 
                  chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
                INNER JOIN 
                  cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
                INNER JOIN 
                  motif_demande md ON bs.id_motif_demande = md.id_motif_demande
                LEFT JOIN 
                  client ON bs.id_client = client.id_client
                LEFT JOIN 
                  destination l ON bs.id_destination = l.id_destination
                WHERE 
                bs.id_bande_sortie = ?
            `;

    db.query(q, [id_bande_sortie], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBandeSortie = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion à la base de données :', connErr);
      return res.status(500).json({ error: "Impossible de se connecter à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur lors de l’ouverture de la transaction :', trxErr);
        return res.status(500).json({ error: "Échec de l’initiation de la transaction." });
      }

      try {
        const {
          id_affectation_demande,
          id_vehicule,
          id_chauffeur,
          date_prevue,
          date_retour,
          id_type_vehicule,
          id_motif_demande,
          id_demandeur,
          id_client,
          id_destination,
          personne_bord,
          commentaire,
          id_societe,
          user_cr
        } = req.body;

        // Vérification des champs obligatoires
        if (!id_vehicule || !id_chauffeur || !user_cr || !date_prevue || !id_societe) {
          throw new Error("Champs requis manquants.");
        }

        // Insertion du bon de sortie
        const insertBonSql = `
          INSERT INTO bande_sortie (
            id_affectation_demande,
            id_vehicule,
            id_chauffeur,
            date_prevue,
            date_retour,
            id_type_vehicule,
            id_motif_demande,
            id_demandeur,
            id_client,
            id_destination,
            statut,
            personne_bord,
            commentaire,
            id_societe,
            user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const bonValues = [
          id_affectation_demande || null,
          id_vehicule,
          id_chauffeur,
          date_prevue,
          date_retour,
          id_type_vehicule || null,
          id_motif_demande || null,
          id_demandeur || null,
          id_client || null,
          id_destination || null,
          2,
          personne_bord || '',
          commentaire || '',
          id_societe,
          user_cr
        ];

        const insertResult = await queryPromise(connection, insertBonSql, bonValues);
        const id_bande_sortie = insertResult[0].insertId;
        // Récupération de la signature du validateur
        const signatureSql = `
          SELECT id_signature 
          FROM signature 
          WHERE userId = ?
          LIMIT 1
        `;
        const [signatureRow] = await queryPromise(connection, signatureSql, [user_cr]);

        if (!signatureRow) {
          throw new Error("Aucune signature disponible pour l'utilisateur.");
        }

        const id_signature = signatureRow[0].id_signature;

        // Insertion de la validation
        const insertValidationSql = `
          INSERT INTO validation_demande (
            id_bande_sortie,
            validateur_id,
            id_signature,
            date_validation
          ) VALUES (?, ?, ?, NOW())
        `;

        await queryPromise(connection, insertValidationSql, [
          id_bande_sortie,
          user_cr,
          id_signature
        ]);

        // Commit final
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation finale." });
          }

          return res.status(201).json({
            message: "Bon de sortie enregistré et validé avec succès.",
            id_bande_sortie
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la demande."
          });
        });
      }
    })
  })
};

//Bon de sortie du personnel
exports.getBonSortiePerso = (req, res) => {

    const q = `
            SELECT 
              bsp.id_personnel,
              bsp.id_bon_sortie, 
              bsp.date_sortie, 
              bsp.date_retour, 
              p.nom, 
              p.prenom, 
              sd.nom_service, 
              md.nom_motif_demande, 
              c.nom AS nom_client,
              d.nom_destination,
              u.nom AS user,
              tsv.nom_type_statut
          FROM bon_de_sortie_perso bsp
          INNER JOIN personnel p ON bsp.id_personnel = p.id_personnel
          INNER JOIN service_demandeur sd ON bsp.id_demandeur = sd.id_service_demandeur
          LEFT JOIN motif_demande md ON bsp.id_motif = md.id_motif_demande
          LEFT JOIN client c ON bsp.id_client = c.id_client
          LEFT JOIN destination d ON bsp.id_destination = d.id_destination
          LEFT JOIN societes s ON bsp.id_societe = bsp.id_societe
          INNER JOIN type_statut_suivi tsv ON bsp.statut = tsv.id_type_statut_suivi
          INNER JOIN utilisateur u ON bsp.user_cr = u.id_utilisateur
          ORDER BY bsp.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBonSortiePersoOne = (req, res) => {
    const { id_bon_sortie } = req.query;

    if (!id_bon_sortie) {
      return res.status(400).json({ message: "L'identifiant (id) est requis." });
    }

    const q = `
          SELECT bsp.id_bon_sortie, 
                bsp.date_sortie, 
                bsp.date_retour, 
                p.nom, 
                p.prenom, 
                sd.nom_service, 
                md.nom_motif_demande, 
                c.nom, 
                d.nom_destination,
                u.nom
            FROM bon_de_sortie_perso bsp
            INNER JOIN personnel p ON bsp.id_personnel = p.id_personnel
            INNER JOIN service_demandeur sd ON bsp.id_demandeur = sd.id_service_demandeur
            LEFT JOIN motif_demande md ON bsp.id_motif = md.id_motif_demande
            LEFT JOIN client c ON bsp.id_client = c.id_client
            LEFT JOIN destination d ON bsp.id_destination = d.id_destination
            LEFT JOIN societes s ON bsp.id_societe = bsp.id_societe
            INNER JOIN type_statut_suivi tsv ON bsp.statut = tsv.id_type_statut_suivi
            INNER JOIN utilisateur u ON bsp.user_cr = u.id_utilisateur
            WHERE bsp.id_bon_sortie = ?
            ORDER BY bsp.created_at DESC
            `;

    db.query(q, [id_bon_sortie], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBonSortiePerso = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error('Erreur de connexion à la base de données :', connErr);
      return res.status(500).json({ error: "Impossible de se connecter à la base de données." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error('Erreur lors de l’ouverture de la transaction :', trxErr);
        return res.status(500).json({ error: "Échec de l’initiation de la transaction." });
      }

      try {
        const {
          id_personnel,
          id_motif,
          id_demandeur,
          id_client,
          id_destination,
          id_societe,
          date_sortie,
          date_retour,
          user_cr
        } = req.body;

        if (!id_personnel || !id_motif ) {
          throw new Error("Champs requis manquants.");
        }

        // Insertion du bon de sortie
        const insertBonSql = `
          INSERT INTO bon_de_sortie_perso (
            id_personnel,
            id_motif,
            id_demandeur,
            id_client,
            id_destination,
            statut,
            id_societe,
            date_sortie,
            date_retour,
            user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const bonValues = [
          id_personnel,
          id_motif,
          id_demandeur,
          id_client,
          id_destination,
          2,
          id_societe,
          date_sortie,
          date_retour,
          user_cr
        ];

        queryPromise(connection, insertBonSql, bonValues);

        // Commit final
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation finale." });
          }

          return res.status(201).json({
            message: "Bon de sortie enregistré et validé avec succès.",
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la demande."
          });
        });
      }
    })
  })
};

//Sortie Personnel
exports.getBonSortiePersoSortie = (req, res) => {

    const q = `
            SELECT 
              bsp.id_personnel,
              bsp.id_bon_sortie, 
              bsp.date_sortie, 
              bsp.date_retour, 
              p.nom, 
              p.prenom, 
              sd.nom_service, 
              md.nom_motif_demande, 
              c.nom AS nom_client,
              d.nom_destination,
              u.nom AS user,
              tsv.nom_type_statut
            FROM bon_de_sortie_perso bsp
            INNER JOIN personnel p ON bsp.id_personnel = p.id_personnel
            INNER JOIN service_demandeur sd ON bsp.id_demandeur = sd.id_service_demandeur
            LEFT JOIN motif_demande md ON bsp.id_motif = md.id_motif_demande
            LEFT JOIN client c ON bsp.id_client = c.id_client
            LEFT JOIN destination d ON bsp.id_destination = d.id_destination
            LEFT JOIN societes s ON bsp.id_societe = bsp.id_societe
            INNER JOIN type_statut_suivi tsv ON bsp.statut = tsv.id_type_statut_suivi
            INNER JOIN utilisateur u ON bsp.user_cr = u.id_utilisateur
            WHERE bsp.statut = 2
            ORDER BY bsp.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBonSortiePersoSortie = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          id_bon_sortie,
          id_agent        
        } = req.body;

        if (!id_bon_sortie || !id_bon_sortie) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO sortie_retour_perso (
            id_bon_sortie,
            type,
            id_agent
          ) VALUES (?, ?, ?)
        `
        const values = [
          id_bon_sortie,
          'Sortie',
          id_agent
        ]

        const [insertResult] = await queryPromise(connection, insertSQL, values);
        const insertId = insertResult.insertId;

        const updateSQL = `UPDATE bon_de_sortie_perso SET statut = 13 WHERE  id_bon_sortie = ?`;

        await queryPromise(connection, updateSQL, [id_bon_sortie]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "La sortie a été enregistrée avec succès.",
            data: { id: insertId }
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

//Retour Personnel
exports.getBonSortiePersoRetour = (req, res) => {

    const q = `
            SELECT 
              bsp.id_bon_sortie, 
              bsp.id_personnel,
              bsp.date_sortie, 
              bsp.date_retour, 
              p.nom, 
              p.prenom, 
              sd.nom_service, 
              md.nom_motif_demande, 
              c.nom AS nom_client,
              d.nom_destination,
              u.nom AS user,
              tsv.nom_type_statut
            FROM bon_de_sortie_perso bsp
            INNER JOIN personnel p ON bsp.id_personnel = p.id_personnel
            INNER JOIN service_demandeur sd ON bsp.id_demandeur = sd.id_service_demandeur
            LEFT JOIN motif_demande md ON bsp.id_motif = md.id_motif_demande
            LEFT JOIN client c ON bsp.id_client = c.id_client
            LEFT JOIN destination d ON bsp.id_destination = d.id_destination
            LEFT JOIN societes s ON bsp.id_societe = bsp.id_societe
            INNER JOIN type_statut_suivi tsv ON bsp.statut = tsv.id_type_statut_suivi
            INNER JOIN utilisateur u ON bsp.user_cr = u.id_utilisateur
            WHERE bsp.statut = 13
            ORDER BY bsp.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBonSortiePersoRetour = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          id_bon_sortie,
          id_agent        
        } = req.body;

        if (!id_bon_sortie || !id_bon_sortie) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO sortie_retour_perso (
            id_bon_sortie,
            type,
            id_agent
          ) VALUES (?, ?, ?)
        `
        const values = [
          id_bon_sortie,
          'Retour',
          id_agent
        ]

        const [insertResult] = await queryPromise(connection, insertSQL, values);
        const insertId = insertResult.insertId;

        const updateSQL = `UPDATE bon_de_sortie_perso SET statut = 14 WHERE  id_bon_sortie = ?`;

        await queryPromise(connection, updateSQL, [id_bon_sortie]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "La sortie a été enregistrée avec succès.",
            data: { id: insertId }
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

//Entree/ sortie personnel
exports.getEntreeSortiePersonnel = (req, res) => {

    const q = `
        SELECT 
          sr.id_sortie_retour_perso, 
          sr.type, 
          sr.created_at, 
          p.nom,
          p.prenom,
          p.id_departement,
          d.nom_departement
        FROM sortie_retour_perso sr
          INNER JOIN 
            bon_de_sortie_perso bs ON sr.id_bon_sortie = bs.id_bon_sortie
          INNER JOIN
            personnel p ON sr.id_agent = p.id_personnel
          LEFT JOIN
            departement d ON p.id_departement = d.id_departement
        `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Véhicule en course
exports.getVehiculeCourse = (req, res) => {

    const q = `
        SELECT 
          ad.id_bande_sortie, 
          ad.date_prevue,
          ad.date_retour,
          ad.personne_bord,
          ad.commentaire,
          mfd.nom_motif_demande,
          ts.nom_type_statut,
          cv.nom_cat,
          sd.nom_service,
          l.nom_destination,
          c.nom, 
          v.immatriculation, 
          m.nom_marque
        FROM bande_sortie ad
          INNER JOIN 
            chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
          INNER JOIN 
            vehicules v ON ad.id_vehicule = v.id_vehicule
          INNER JOIN 
            marque m ON m.id_marque = v.id_marque
          LEFT JOIN 
            modeles md ON v.id_modele = md.id_modele
          INNER JOIN 
            type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
          LEFT JOIN 
          	cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
          LEFT JOIN 
            motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
          LEFT JOIN
            service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
          LEFT JOIN 
            destination l ON ad.id_destination = l.id_destination
            WHERE ad.statut = 13
          ORDER BY ad.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getVehiculeCourseOne = (req, res) => {
  const { id_bande_sortie } = req.query;

    const q = `
          SELECT 
            ad.id_bande_sortie, 
            ad.date_prevue,
            ad.date_retour,
            ad.personne_bord,
            ad.commentaire,
            mfd.nom_motif_demande,
            ts.nom_type_statut,
            cv.nom_cat AS nom_type_vehicule,
            sd.nom_service,
            l.nom_destination,
            c.nom, 
            v.immatriculation, 
            m.nom_marque,
            u.nom AS personne_signe,
            u.role,
            s.signature,
            st.nom_societe,
            st.adresse,
            st.rccm,
            st.nif,
            st.telephone,
            st.email,
            st.logo
          FROM bande_sortie ad
            INNER JOIN 
              chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
            INNER JOIN 
              vehicules v ON ad.id_vehicule = v.id_vehicule
            INNER JOIN 
            cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule 
            INNER JOIN 
              marque m ON m.id_marque = v.id_marque
            LEFT JOIN 
              modeles md ON v.id_modele = md.id_modele
            INNER JOIN 
              type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
            LEFT JOIN 
              motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
            LEFT JOIN
              service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
            LEFT JOIN 
              destination l ON ad.id_destination = l.id_destination
            LEFT JOIN 
              validation_demande vd ON ad.id_bande_sortie = vd.id_bande_sortie
            LEFT JOIN 
              utilisateur u ON vd.validateur_id = u.id_utilisateur
            LEFT JOIN 
              signature s ON u.id_utilisateur = s.userId
            LEFT JOIN 
              societes st ON ad.id_societe = st.id_societe
            WHERE ad.id_bande_sortie = ?
          GROUP BY u.id_utilisateur
          ORDER BY ad.created_at DESC
            `;

    db.query(q, [id_bande_sortie], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Sortie
exports.getSortie = (req, res) => {

    const q = `
                SELECT 
          ad.id_bande_sortie, 
          ad.date_prevue,
          ad.date_retour,
          ad.personne_bord,
          ad.commentaire,
          mfd.nom_motif_demande,
          ts.nom_type_statut,
          tv.nom_type_vehicule,
          sd.nom_service,
          l.nom_destination,
          c.nom, 
          v.immatriculation, 
          m.nom_marque,
          u.nom AS personne_signe,
          u.role
        FROM bande_sortie ad
          INNER JOIN 
            chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
          INNER JOIN 
            vehicules v ON ad.id_vehicule = v.id_vehicule
          INNER JOIN 
            marque m ON m.id_marque = v.id_marque
          LEFT JOIN 
            modeles md ON v.id_modele = md.id_modele
          INNER JOIN 
            type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
          LEFT JOIN
            type_vehicule tv ON ad.id_type_vehicule = tv.id_type_vehicule
          LEFT JOIN 
            motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
          LEFT JOIN
            service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
          LEFT JOIN 
            destination l ON ad.id_destination = l.id_destination
          LEFT JOIN 
          	validation_demande vd ON ad.id_bande_sortie = vd.id_bande_sortie
          LEFT JOIN 
          	utilisateur u ON vd.validateur_id = u.id_utilisateur
            WHERE ad.statut = 2
          GROUP BY ad.id_bande_sortie
          ORDER BY ad.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postSortie = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          id_bande_sortie,
          id_agent,
          observations
        } = req.body;

        if (!id_bande_sortie || !id_bande_sortie) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO sortie_retour (
            id_bande_sortie,
            type,
            id_agent,
            observations
          ) VALUES (?, ?, ?, ?)
        `
        const values = [
          id_bande_sortie,
          'Sortie',
          id_agent,
          observations
        ]

        const [insertResult] = await queryPromise(connection, insertSQL, values);
        const insertId = insertResult.insertId;

        const updateSQL = `UPDATE bande_sortie SET statut = 13 WHERE  id_bande_sortie = ?`;

        await queryPromise(connection, updateSQL, [id_bande_sortie]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "La sortie a été enregistrée avec succès.",
            data: { id: insertId }
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

//RETOUR
/* exports.getSortieRetour = (req, res) => {

    const q = `
            SELECT * FROM sortie_retour
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getSortieRetourOne = (req, res) => {
    const { id_bande_sortie } = req.query;

    if (!id_bande_sortie) {
        return res.status(400).json({
            error: 'Le paramètre "id_bande_sortie" est requis.',
        });
    }

    const query = `
        SELECT sr.*, 
               u.nom AS agent_nom,
               c.nom AS chauffeur_nom
        FROM sortie_retour sr
        LEFT JOIN utilisateur u ON sr.agent_id = u.id_utilisateur
        LEFT JOIN chauffeur c ON sr.chauffeur_id = c.id_chauffeur
        WHERE sr.id_bande_sortie = ?
        ORDER BY sr.date_heure ASC
    `;

    db.query(query, [id_bande_sortie], (error, results) => {
        if (error) {
            console.error('[getSortieRetourByDemande] DB error:', error);
            return res.status(500).json({
                error: "Erreur serveur lors de la récupération des données de sortie/retour.",
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: `Aucun enregistrement trouvé pour la demande ID ${id_demande}.`
            });
        }
        return res.status(200).json(results);
    });
}; */

exports.getRetour = (req, res) => {

    const q = `
        SELECT 
          ad.id_bande_sortie, 
          ad.date_prevue,
          ad.date_retour,
          ad.personne_bord,
          ad.commentaire,
          mfd.nom_motif_demande,
          ts.nom_type_statut,
          tv.nom_type_vehicule,
          sd.nom_service,
          l.nom_destination,
          c.nom, 
          v.immatriculation, 
          m.nom_marque
        FROM bande_sortie ad
          INNER JOIN 
            chauffeurs c ON  ad.id_chauffeur = c.id_chauffeur
          INNER JOIN 
            vehicules v ON ad.id_vehicule = v.id_vehicule
          INNER JOIN 
            marque m ON m.id_marque = v.id_marque
          LEFT JOIN 
            modeles md ON v.id_modele = md.id_modele
          INNER JOIN 
            type_statut_suivi ts ON ad.statut = ts.id_type_statut_suivi
          LEFT JOIN
            type_vehicule tv ON ad.id_type_vehicule = tv.id_type_vehicule
          LEFT JOIN 
            motif_demande mfd ON ad.id_motif_demande = mfd.id_motif_demande
          LEFT JOIN
            service_demandeur sd ON ad.id_demandeur = sd.id_service_demandeur
          LEFT JOIN 
            destination l ON ad.id_destination = l.id_destination
            WHERE ad.statut = 13
          ORDER BY ad.created_at DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postRetour = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          id_bande_sortie,
          type,
          date,
          id_agent,
          observations
        } = req.body;

        if (!id_bande_sortie || !id_bande_sortie) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO sortie_retour (
            id_bande_sortie,
            type,
            id_agent,
            observations
          ) VALUES (?, ?, ?, ?)
        `
        const values = [
          id_bande_sortie,
          'Retour',
          id_agent,
          observations
        ]

        const [insertResult] = await queryPromise(connection, insertSQL, values);
        const insertId = insertResult.insertId;

        const updateSQL = `UPDATE bande_sortie SET statut = 14 WHERE  id_bande_sortie = ?`;

        await queryPromise(connection, updateSQL, [id_bande_sortie]);

        const getVehiculeQuery = `
          SELECT id_vehicule
          FROM bande_sortie
          WHERE id_bande_sortie  = ?
        `;

        const [vehiculeResult] = await queryPromise(connection, getVehiculeQuery, [id_bande_sortie]);

        if (!vehiculeResult || vehiculeResult.length === 0) {
          connection.release();
          return res.status(404).json({ error: "Aucun véhicule trouvé pour ce bon de sortie." });
        }

        const idVehicule = vehiculeResult[0].id_vehicule;

        const updateDispoQuery = `
          UPDATE vehicules
          SET IsDispo = 1
          WHERE id_vehicule = ?
        `;
        await queryPromise(connection, updateDispoQuery, [idVehicule]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "La sortie a été enregistrée avec succès.",
            data: { id: insertId }
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

//Visiteur
exports.getVisiteur = (req, res) => {

  let q = `
    SELECT 
      rv.*,
      md.nom_motif_demande AS nom_motif,
      u.nom,
      rv.created_at
    FROM 
      registre_visiteur rv
    INNER JOIN 
      motif_demande md ON rv.id_motif = md.id_motif_demande
    LEFT JOIN	
      utilisateur u ON rv.user_cr = u.id_utilisateur
      ORDER BY rv.created_at DESC
  `;

  db.query(q, (error, data) => {
    if (error) {
      return res.status(500).send(error);
    }
    return res.status(200).json(data);
  });
};

exports.getVisiteurSearch = (req, res) => {
  const { search } = req.query;

  let q = `
    SELECT 
      rv.*,
      md.nom_motif_demande AS nom_motif,
      u.nom,
      rv.created_at
    FROM 
      registre_visiteur rv
    INNER JOIN 
      motif_demande md ON rv.id_motif = md.id_motif_demande
    LEFT JOIN	
      utilisateur u ON rv.user_cr = u.id_utilisateur
  `;

  const values = [];

  if (search) {
    q += `
      WHERE 
        rv.immatriculation LIKE ? OR 
        rv.nom_chauffeur LIKE ? OR 
        rv.entreprise LIKE ?
    `;
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  q += ` ORDER BY rv.created_at DESC`;

  db.query(q, values, (error, data) => {
    if (error) {
      return res.status(500).send(error);
    }
    return res.status(200).json(data);
  });
};

exports.postVisiteur = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
            immatriculation,
            type_vehicule,
            nom_chauffeur,
            proprietaire,
            id_motif,
            entreprise,
            vehicule_connu,
            user_cr
          } = req.body;

        if (!immatriculation || !nom_chauffeur) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO registre_visiteur (
            immatriculation,
            type_vehicule,
            nom_chauffeur,
            proprietaire,
            id_motif,
            entreprise,
            vehicule_connu,
            user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        const values = [
              immatriculation,
              type_vehicule,
              nom_chauffeur,
              proprietaire,
              id_motif,
              entreprise,
              vehicule_connu ? 1 : 0,
              user_cr
            ];

        await queryPromise(connection, insertSQL, values);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "Le visiteur a été enregistré avec succès.",
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

//VISITEUR PIETON
exports.getVehiculeVisiteur = (req, res) => {

    const q = `
              SELECT 
                * 
              FROM 
                visiteur_vehicules
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postVehiculeVisiteur = (req, res) => {
  db.getConnection((connErr, connection) => {
    if(connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if(trxErr) {
        connection.release();
        console.error('Erreur transaction : ', trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          immatriculation,
          type_vehicule,
          id_chauffeur,
          proprietaire,
          entreprise,
          vehicule_connu
        } = req.body;

        if (!immatriculation || !id_chauffeur) {
          throw new Error("Champs obligatoires manquants.");
        }

        const insertSQL = `
          INSERT INTO visiteur_vehicules (
            immatriculation,
            type_vehicule,
            id_chauffeur,
            proprietaire,
            entreprise,
            vehicule_connu
          ) VALUES (?, ?, ?, ?, ?, ?)
        `
        const values = [
          immatriculation,
          type_vehicule,
          id_chauffeur,
          proprietaire,
          entreprise,
          vehicule_connu
        ]

        await queryPromise(connection, insertSQL, values);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "Le visiteur a été enregistré avec succès.",
          });
        });
        
      } catch (error) {
          connection.rollback(() => {
          connection.release();
          console.error("Erreur transactionnelle :", error);
          return res.status(500).json({
            error: error.message || "Erreur lors du traitement de la sortie."
          });
        });
      }
    })
  })
};

// SORTIE VEHICULE VISITEUR
exports.getVisiteurVehiculeRetour =  async (req, res) => {

  const q = `
            SELECT 
              rv.*, 
              md.nom_motif_demande
            FROM 
              registre_visiteur rv
              INNER JOIN motif_demande md ON rv.id_motif = md.id_motif_demande
            WHERE 
              rv.date_sortie IS NULL;
            `
  db.query(q, (err, result) => {
    if(err) {
      console.error("Erreur lors de la récupération de vehicule visiteur :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }
    return res.status(200).json(result);
  })
};

exports.putVisiteurVehiculeRetour = async (req, res) => {
  const { id_registre_visiteur } = req.query;

  if (!id_registre_visiteur) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur de début de transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const sql = `
          UPDATE registre_visiteur 
          SET date_sortie = ?
          WHERE id_registre_visiteur = ?
        `;

        const params = [new Date(), id_registre_visiteur];

        await queryPromise(connection, sql, params);

        connection.commit((commitErr) => {
          connection.release(); // Toujours libérer la connexion

          if (commitErr) {
            console.error("Erreur lors du commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          return res.status(200).json({ message: "Date de sortie mise à jour avec succès." });
        });
      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur lors de la mise à jour :", error);
          return res.status(500).json({ error: error.message || "Erreur inattendue." });
        });
      }
    });
  });
};

//Liste de SORTIE & ENTREE
exports.getEntreeSortie = (req, res) => {

    const q = `
        SELECT 
        sr.id_sortie_retour, 
        sr.type, 
        sr.created_at, 
        u.nom, 
        v.immatriculation,
        m.nom_marque, 
        cv.nom_cat,
        c.nom AS nom_chauffeur
        FROM sortie_retour sr
        LEFT JOIN 
          bande_sortie bs ON sr.id_bande_sortie = bs.id_bande_sortie
        LEFT JOIN 
          vehicules v ON bs.id_vehicule = v.id_vehicule
        LEFT JOIN 
          marque m ON v.id_marque = m.id_marque
        LEFT JOIN 
          cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        LEFT JOIN 
          chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
        INNER JOIN 
          utilisateur u ON sr.id_agent = u.id_utilisateur
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEntreeSortieOne = (req, res) => {
    const { id_sortie_retour } = req.query;

    // Validation
    if (!id_sortie_retour || isNaN(id_sortie_retour)) {
        return res.status(400).json({ error: "ID de sortie/retour invalide ou manquant." });
    }

    const q = `
        SELECT 
            sr.id_sortie_retour, 
            sr.type, 
            sr.created_at, 
            u.nom AS nom_agent, 
            v.immatriculation,
            m.nom_marque, 
            cv.nom_cat,
            c.nom AS nom_chauffeur
        FROM sortie_retour sr
        LEFT JOIN bande_sortie bs ON sr.id_bande_sortie = bs.id_bande_sortie
        LEFT JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
        LEFT JOIN marque m ON v.id_marque = m.id_marque
        LEFT JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        LEFT JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
        INNER JOIN utilisateur u ON sr.id_agent = u.id_utilisateur
        WHERE sr.id_sortie_retour = ?
    `;

    db.query(q, [id_sortie_retour], (error, data) => {
        if (error) {
            console.error("Erreur lors de la récupération :", error);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        if (data.length === 0) {
            return res.status(404).json({ message: "Aucune sortie/retour trouvée avec cet ID." });
        }

        return res.status(200).json(data[0]);
    });
};