const { queryAsync } = require("./../config/database");
const moment = require('moment');

exports.getVehicule = async (req, res) => {
  const { tenantId, isSuperAdmin } = req;
  const user = req.user;
  
  try {
    let query;
    let params = [];
    
    if (isSuperAdmin) {
      query = `
        SELECT v.*, 
               marque.nom_marque, 
               modeles.modele, 
               cv.nom_cat 
        FROM vehicules v
        INNER JOIN marque ON v.id_marque = marque.id_marque
        LEFT JOIN modeles ON v.id_modele = modeles.id_modele
        INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        WHERE v.est_supprime = 0
      `;
    } else if (tenantId) {
      query = `
        SELECT v.*, 
               marque.nom_marque, 
               modeles.modele, 
               cv.nom_cat 
        FROM vehicules v
        INNER JOIN marque ON v.id_marque = marque.id_marque
        LEFT JOIN modeles ON v.id_modele = modeles.id_modele
        LEFT JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        WHERE v.est_supprime = 0 AND v.tenant_id = ?
      `;
      params = [tenantId];
    } else {
      return res.status(200).json({
        message: 'Aucun véhicule disponible',
        data: []
      });
    }
    
    const vehicules = await queryAsync(query, params);
        
    return res.status(200).json({
      message: 'Liste des véhicules récupérés avec succès',
      data: vehicules,
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      error: error.message
    });
  }
};

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

exports.getVehiculeOccupe = (req, res) => {

    const q = `
        SELECT 
          v.id_vehicule, 
          v.immatriculation, 
          m.nom_marque, 
          mo.modele, 
          cv.nom_cat, 
          c.nom AS nom_chauffeur,
          ad1.created_at
        FROM vehicules v
        INNER JOIN marque m ON v.id_marque = m.id_marque
        LEFT JOIN modeles mo ON v.id_modele = mo.id_modele
        INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        INNER JOIN (
            SELECT ad1.id_vehicule, ad1.id_chauffeur, ad1.date_prevue, ad1.created_at
            FROM affectation_demande ad1
            INNER JOIN (
                SELECT id_vehicule, MAX(created_at) AS max_created
                FROM affectation_demande
                GROUP BY id_vehicule
            ) last_affect ON ad1.id_vehicule = last_affect.id_vehicule AND ad1.created_at = last_affect.max_created
        ) ad1 ON v.id_vehicule = ad1.id_vehicule
        INNER JOIN chauffeurs c ON ad1.id_chauffeur = c.id_chauffeur
        WHERE v.IsDispo = 0;`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.rendreVehiculeDispo = (req, res) => {
  const { id_vehicule } = req.query;

  if (!id_vehicule || isNaN(id_vehicule)) {
    return res.status(400).json({ error: 'ID du véhicule fourni non valide' });
  }

  try {
    const q = `
      UPDATE vehicules
      SET IsDispo = 1
      WHERE id_vehicule = ?
    `;

    db.query(q, [id_vehicule], (error, result) => {
      if (error) {
        console.error('Erreur SQL:', error);
        return res.status(500).json({ error: 'Impossible de rendre le véhicule disponible' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Véhicule non trouvé' });
      }

      return res.json({ message: 'Véhicule rendu disponible avec succès' });
    });
  } catch (err) {
    console.error('Erreur serveur:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
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
                v.id_capteur,
                v.name_capteur,
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
            id_client,
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
                id_transmission, id_climatisation, pneus, valeur_acquisition, lubrifiant_moteur, id_etat, id_client, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Préparation des valeurs à insérer
        const values = [
            immatriculation, numero_ordre, id_marque, id_modele, variante, num_chassis,  
            annee_fabrication, annee_circulation, id_cat_vehicule, id_type_permis_vehicule, img,
            longueur, largeur, hauteur, poids, id_couleur, capacite_carburant, capacite_radiateur,
            capacite_carter, nbre_place, nbre_portes, nbre_moteur, cylindre, nbre_cylindre, disposition_cylindre, 
            id_type_carburant, regime_moteur_vehicule, consommation_carburant, turbo, date_service, km_initial, nbre_chev,
            id_transmission, id_climatisation, pneus, valeur_acquisition, lubrifiant_moteur, id_etat, id_client, user_cr
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

exports.putRelierVehiculeFalcon = async (req, res) => {
  try {
    const { id_vehicule } = req.query;
    const { id_capteur, name_capteur } = req.body;

    if (!id_vehicule || !id_capteur) {
      return res.status(400).json({ message: "Paramètres manquants (id_vehicule ou id_capteur)." });
    }

    // 1️⃣ Supprimer l'ancien lien avec ce capteur
    const q1 = "UPDATE vehicules SET id_capteur = NULL, name_capteur = NULL WHERE id_capteur = ?";
    await new Promise((resolve, reject) => {
      db.query(q1, [id_capteur], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2️⃣ Lier le nouveau véhicule
    const q2 = "UPDATE vehicules SET id_capteur = ?, name_capteur = ? WHERE id_vehicule = ?";
    await new Promise((resolve, reject) => {
      db.query(q2, [id_capteur, name_capteur, id_vehicule], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return res.status(200).json({ message: "Véhicule relié/mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    return res.status(500).json({ message: "Erreur inattendue côté serveur." });
  }
};