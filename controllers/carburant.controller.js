const { db, queryAsync } = require("./../config/database");
const xlsx = require("xlsx");
const fs = require("fs");
const { promisify } = require("util");
const query = promisify(db.query).bind(db);
const moment = require('moment');

exports.getVehiculeCarburant = (req, res) => {

    const q = `SELECT 
                vc.*, tc.nom_type_carburant
                FROM vehicule_carburant vc
                LEFT JOIN type_carburant tc ON vc.id_type_carburant = tc.id_type_carburant

            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getVehiculeCarburantOne = (req, res) => {
  const { id_vehicule_carburant } = req.query;

    if(!id_vehicule_carburant) {
       return res.status(400).json({message: 'Paramètres manquants.'})
    }
    const q = `SELECT 
                *
                FROM vehicule_carburant
              WHERE id_vehicule_carburant = ?
            `;

    db.query(q, [id_vehicule_carburant], (error, data) => {
        if (error) {
          return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postVehiculeCarburant = async (req, res) => {
  const { nom_marque, nom_modele, num_serie, immatriculation, compteur, id_type_carburant } = req.body;

  if (!nom_marque) {
    return res.status(400).json({ message: "Paramètres manquants." });
  }

  try {
    // Étape 1 : Récupérer le dernier id_enregistrement
    const getLastId = () => {
      return new Promise((resolve, reject) => {
        const query = "SELECT MAX(id_enregistrement) AS lastId FROM vehicule_carburant";
        db.query(query, (err, result) => {
          if (err) return reject(err);
          const lastId = result[0]?.lastId || 0;
          resolve(lastId);
        });
      });
    };

    const lastId = await getLastId();
    const nextId = lastId + 1;

    // Étape 2 : Insertion du nouveau véhicule
    const insertVehicule = () => {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO vehicule_carburant 
          (id_enregistrement, nom_marque, nom_modele, num_serie, immatriculation, compteur, id_type_carburant)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [nextId, nom_marque, nom_modele, num_serie, immatriculation, compteur, id_type_carburant];

        db.query(query, values, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    };

    await insertVehicule();

    return res.status(201).json({
      message: "L'opération a réussi avec succès.",
      id_enregistrement: nextId,
    });
  } catch (error) {
    console.error("Erreur lors de l'insertion :", error);
    return res.status(500).json({
      message: "Erreur serveur lors de l'enregistrement du véhicule.",
    });
  }
};

exports.putVehiculeCarburant = async (req, res) => {

  try {
    const { id_vehicule_carburant } = req.query;
    const { nom_marque, nom_modele, num_serie, immatriculation, compteur, id_type_carburant } = req.body;

    if (!id_vehicule_carburant) {
      return res.status(400).json({ message: "Paramètres manquants (id_vehicule_carburant)." });
    }

    const q = `UPDATE vehicule_carburant 
               SET nom_marque = ?, nom_modele = ?, num_serie = ?, immatriculation = ?, compteur = ?, id_type_carburant = ? 
               WHERE id_vehicule_carburant = ?`;
    const values = [nom_marque, nom_modele, num_serie, immatriculation, compteur, id_type_carburant, id_vehicule_carburant];

    db.query(q, values, (error, data) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du véhicule.' });
      }
      if (data.affectedRows === 0) {
        return res.status(404).json({ error: 'Véhicule non trouvé.' });
      }
      return res.json({ message: 'Véhicule mis à jour avec succès.' });
    });
  } catch (error) {
    console.error("Error updating vehicule:", error);
    return res.status(500).json({ error: 'Échec de la mise à jour du véhicule.' });
  }
};

exports.putRelierVehiculeCarburant = async (req, res) => {
  try {
    const { id_vehicule } = req.query;
    const { id_enregistrement } = req.body;

    if (!id_vehicule || !id_enregistrement) {
      return res.status(400).json({ message: "Paramètres manquants (id_vehicule ou id_capteur)." });
    }

    // 1️⃣ Supprimer l'ancien lien avec ce capteur
    const q1 = "UPDATE vehicules SET id_carburant_vehicule = NULL WHERE id_carburant_vehicule = ?";
    await new Promise((resolve, reject) => {
      db.query(q1, [id_enregistrement], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2️⃣ Lier le nouveau véhicule
    const q2 = "UPDATE vehicules SET id_carburant_vehicule = ? WHERE id_vehicule = ?";
    await new Promise((resolve, reject) => {
      db.query(q2, [id_enregistrement, id_vehicule], (err, result) => {
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

//Carburant 
/* exports.getCarburant = (req, res) => {
  const { vehicules = [], dateRange = [] } = req.body;

  let where = "WHERE c.est_supprime = 0";
  const params = [];

  if (Array.isArray(vehicules) && vehicules.length > 0) {
    const placeholders = vehicules.map(() => "?").join(",");
    where += ` AND c.id_vehicule IN (${placeholders})`;
    params.push(...vehicules);
  }

  if (Array.isArray(dateRange) && dateRange.length === 2) {
    where += ` AND c.date_operation BETWEEN ? AND ?`;
    params.push(dateRange[0], dateRange[1]);
  }

  const q = `
    SELECT 
      c.id_carburant, 
      c.num_pc, 
      c.num_facture, 
      c.date_operation, 
      c.quantite_litres, 
      c.compteur_km, 
      c.distance, 
      c.consommation,
      c.prix_cdf,
      c.prix_usd,
      c.montant_total_cdf,
      c.montant_total_usd,
      c.commentaire,
      ve.id_vehicule,
      mar.nom_marque,
      modl.modele AS nom_modele,
      ve.immatriculation,
      ch.nom AS nom_chauffeur,
      ch.prenom AS prenom,
      f.nom_fournisseur,
      cv.abreviation,
      u.nom AS createur
    FROM carburant c
    LEFT JOIN vehicules ve ON c.id_vehicule = ve.id_carburant_vehicule
    LEFT JOIN marque mar ON ve.id_marque = mar.id_marque
    LEFT JOIN modeles modl ON ve.id_modele = modl.id_modele
    LEFT JOIN cat_vehicule cv ON ve.id_cat_vehicule = cv.id_cat_vehicule
    LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
    LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
    LEFT JOIN utilisateur u ON c.user_cr = u.id_utilisateur
    ${where}
    ORDER BY c.date_operation DESC;
  `;

  db.query(q, params, (error, data) => {
    if (error) {
      return res.status(500).json(error);
    }
    return res.status(200).json(data);
  });
}; */

exports.getCarburant = (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { vehicules = [], dateRange = [] } = req.body;
    
    let where = "WHERE c.est_supprime = 0";
    const params = [];
    
    if (!isSuperAdmin && tenantId) {
        where += ` AND ve.tenant_id = ?`;
        params.push(tenantId);
    }
    
    if (vehicules.length > 0) {
        const placeholders = vehicules.map(() => "?").join(",");
        where += ` AND c.id_vehicule IN (${placeholders})`;
        params.push(...vehicules);
    }
    
    // Filtre par date
    if (dateRange.length === 2) {
        where += ` AND c.date_operation BETWEEN ? AND ?`;
        params.push(dateRange[0], dateRange[1]);
    }
    
    const q = `
        SELECT 
            c.id_carburant, 
            c.num_pc, 
            c.num_facture, 
            c.date_operation, 
            c.quantite_litres, 
            c.compteur_km, 
            c.distance, 
            c.consommation,
            c.prix_cdf,
            c.prix_usd,
            c.montant_total_cdf,
            c.montant_total_usd,
            c.commentaire,
            ve.id_vehicule,
            mar.nom_marque,
            modl.modele AS nom_modele,
            ve.immatriculation,
            ch.nom AS nom_chauffeur,
            ch.prenom AS prenom,
            f.nom_fournisseur,
            cv.abreviation,
            u.nom AS createur
        FROM carburant c
        LEFT JOIN vehicules ve ON c.id_vehicule = ve.id_vehicule
        LEFT JOIN marque mar ON ve.id_marque = mar.id_marque
        LEFT JOIN modeles modl ON ve.id_modele = modl.id_modele
        LEFT JOIN cat_vehicule cv ON ve.id_cat_vehicule = cv.id_cat_vehicule
        LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
        LEFT JOIN utilisateur u ON c.user_cr = u.id_utilisateur
        ${where}
        ORDER BY c.date_operation DESC
    `;
    
    db.query(q, params, (error, data) => {
        if (error) {
            console.error('Erreur getCarburant:', error);
            return res.status(500).json(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantLimitThree = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { id_vehicule } = req.query;

    if (!id_vehicule) {
        return res.status(400).json({ message: "Paramètre manquant : id_vehicule." });
    }

    try {
        // Vérifier l'accès au véhicule si non Super Admin
        if (!isSuperAdmin && tenantId) {
            const checkQuery = `SELECT id_vehicule FROM vehicules WHERE id_vehicule = ? AND tenant_id = ?`;
            const vehicule = await queryAsync(checkQuery, [id_vehicule, tenantId]);
            
            if (vehicule.length === 0) {
                return res.status(403).json({ message: "Vous n'avez pas accès à ce véhicule." });
            }
        }
        
        const query = `
            SELECT 
                c.id_carburant, 
                c.num_pc, 
                c.num_facture, 
                c.date_operation, 
                c.quantite_litres,
                c.compteur_km, 
                c.distance, 
                c.consommation,
                c.prix_cdf,
                c.prix_usd,
                c.montant_total_cdf,
                c.montant_total_usd,
                c.commentaire,
                v.id_vehicule,
                mar.nom_marque,
                modl.modele AS nom_modele,
                v.immatriculation,
                ch.nom AS nom_chauffeur,
                ch.prenom AS prenom,
                f.nom_fournisseur,
                u.nom AS createur
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
            LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
            LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
            LEFT JOIN utilisateur u ON c.user_cr = u.id_utilisateur
            WHERE c.est_supprime = 0 AND c.id_vehicule = ?
            ORDER BY c.id_carburant DESC
            LIMIT 3
        `;
        
        const results = await queryAsync(query, [id_vehicule]);
        
        return res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.error("Erreur SQL:", error);
        return res.status(500).json({ message: "Erreur lors de la récupération des carburants.", error: error.message });
    }
};

exports.getCarburantLimitTen = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { id_vehicule } = req.query;

    try {
        const where = ["c.est_supprime = 0"];
        const params = [];

        if (id_vehicule) {
            // Vérifier l'accès au véhicule
            if (!isSuperAdmin && tenantId) {
                const checkQuery = `SELECT id_vehicule FROM vehicules WHERE id_vehicule = ? AND tenant_id = ?`;
                const vehicule = await queryAsync(checkQuery, [id_vehicule, tenantId]);
                if (vehicule.length === 0) {
                    return res.status(403).json({ message: "Vous n'avez pas accès à ce véhicule" });
                }
            }
            where.push("c.id_vehicule = ?");
            params.push(id_vehicule);
        }

        if (!isSuperAdmin && tenantId) {
            where.push("v.tenant_id = ?");
            params.push(tenantId);
        }

        const whereClause = "WHERE " + where.join(" AND ");

        const q = `
            SELECT 
                c.id_carburant, 
                c.num_pc, 
                c.num_facture, 
                c.date_operation, 
                c.quantite_litres,
                c.compteur_km, 
                c.distance, 
                c.consommation,
                c.prix_cdf,
                c.prix_usd,
                c.montant_total_cdf,
                c.montant_total_usd,
                c.commentaire,
                v.id_vehicule,
                mar.nom_marque,
                modl.modele AS nom_modele,
                v.immatriculation,
                ch.nom AS nom_chauffeur,
                ch.prenom AS prenom,
                f.nom_fournisseur,
                u.nom AS createur
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
            LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
            LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
            LEFT JOIN utilisateur u ON c.user_cr = u.id_utilisateur
            ${whereClause}
            ORDER BY c.id_carburant DESC
            LIMIT 5
        `;

        const data = await queryAsync(q, params);
        return res.status(200).json(data);
    } catch (error) {
        console.error("Erreur getCarburantLimitTen:", error);
        return res.status(500).json({ message: "Erreur SQL", error: error.message });
    }
};

exports.getCarburantOne = (req, res) => {
    const { id_vehicule, id_carburant } = req.query;


    const where = [];
    const params = [];

    if (id_vehicule) {
        where.push("id_vehicule = ?");
        params.push(id_vehicule);
    }

    if (id_carburant) {
        where.push("id_carburant = ?");
        params.push(id_carburant);
    }

    if (where.length === 0) {
        return res.status(400).json({ message: "Vous devez fournir 'id_vehicule' ou 'id_carburant'." });
    }

    const whereClause = "WHERE " + where.join(" AND ");

    const q = `SELECT c.*, ch.nom AS nom_chauffeur, 
                  f.nom_fournisseur, tc.nom_type_carburant, 
                  mar.nom_marque, modl.modele AS nom_modele, 
                  u.nom AS user_createur,
                  cat.abreviation
                FROM carburant c
                  LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
                  LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
                  LEFT JOIN type_carburant tc ON c.id_type_carburant = tc.id_type_carburant
                  LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule
                  LEFT JOIN marque mar ON v.id_marque = mar.id_marque
                  LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
                  LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule
                  LEFT JOIN utilisateur u ON c.user_cr = u.id_utilisateur ${whereClause}`;

      db.query(q, params, (error, data) => {
          if (error) {
              return res.status(500).json({ message: "Erreur SQL", error: error.sqlMessage });
          }
          if (!data.length) {
              return res.status(404).json({ message: "Aucune donnée trouvée." });
          }
          return res.status(200).json(data);
      });
  };

/* exports.postCarburant = async (req, res) => {
  const {
    num_pc,
    num_facture,
    date_operation,
    id_vehicule,
    id_chauffeur,
    quantite_litres,
    id_fournisseur,
    id_type_carburant,
    compteur_km,
    commentaire,
    user_cr,
    force
  } = req.body;

  try {
    // 1. VALIDATION DES CHAMPS OBLIGATOIRES
    if (!id_vehicule || !compteur_km || !quantite_litres || !id_type_carburant) {
      return res.status(400).json({
        error: "Les champs 'id_vehicule', 'id_type_carburant', 'quantite_litres' et 'compteur_km' sont obligatoires."
      });
    }

    // 2. PRIX CARBURANT
    const priceResult = await query(
      `SELECT prix_cdf, taux_usd
       FROM prix_carburant
       WHERE id_type_carburant = ?
       ORDER BY date_effective DESC, id_prix_carburant DESC
       LIMIT 1`,
      [id_type_carburant]
    );

    if (!priceResult.length) {
      return res.status(400).json({ error: "Aucun prix carburant défini." });
    }

    let { prix_cdf, taux_usd } = priceResult[0];

    // Si taux non valide → récup taux général
    if (!taux_usd || taux_usd <= 1) {
      const tauxResult = await query(`
        SELECT taux_usd
        FROM prix_carburant
        WHERE taux_usd > 1
        ORDER BY date_effective DESC, id_prix_carburant DESC
        LIMIT 1
      `);
      taux_usd = tauxResult?.[0]?.taux_usd || 2200;
    }

    // 3. DERNIER COMPTEUR
    const [lastCarburant] = await query(
      `SELECT compteur_km, date_operation
       FROM carburant
       WHERE id_vehicule = ?
       ORDER BY date_operation DESC, id_carburant DESC
       LIMIT 1`,
      [id_vehicule]
    );

    const compteur_precedent = lastCarburant?.compteur_km || 0;

    // 4. VEHICULE + CATEGORIE
    const [vehicule] = await query(
      `SELECT v.capacite_reservoir, v.id_cat_vehicule, c.nom_cat, c.abreviation
       FROM vehicules v
       LEFT JOIN cat_vehicule c ON v.id_cat_vehicule = c.id_cat_vehicule
       WHERE v.id_vehicule = ?`,
      [id_vehicule]
    );

    const capacite_max = vehicule?.capacite_reservoir || 0;
    const cat_nom = vehicule?.nom_cat || "Inconnu";
    const cat_abrev = vehicule?.abreviation || "N/A";

    // 5. CALCULS
    const distance_parcourue = compteur_km - compteur_precedent;

    const consommation_100km =
      distance_parcourue > 0
        ? parseFloat(((quantite_litres * 100) / distance_parcourue).toFixed(2))
        : 0;

    const montant_total_cdf = parseFloat((quantite_litres * prix_cdf).toFixed(2));
    const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));
    const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

    // 6. ALERTES
    const alertes = [];

    // ⚠️ KM incohérent → Demande confirmation
    if (compteur_precedent > 0 && compteur_km < compteur_precedent && !force) {
      return res.status(409).json({
        askConfirmation: true,
        message: `Le nouveau kilométrage (${compteur_km}) est inférieur au dernier (${compteur_precedent}). Voulez-vous enregistrer quand même ?`
      });
    }

    // Capacité réservoir dépassée
    if (quantite_litres > capacite_max && capacite_max > 0) {
      alertes.push({
        type_alerte: "Capacité dépassée",
        message: `Quantité (${quantite_litres} L) > capacité (${capacite_max} L).`,
        niveau: "Critical"
      });
    }

    // Date incohérente
    if (lastCarburant && new Date(date_operation) < new Date(lastCarburant.date_operation)) {
      alertes.push({
        type_alerte: "Date incohérente",
        message: `Date plein (${date_operation}) < dernier plein (${lastCarburant.date_operation}).`,
        niveau: "Warning"
      });
    }

    // Distance incohérente
    if (distance_parcourue <= 0) {
      alertes.push({
        type_alerte: "Distance incohérente",
        message: `Distance (${distance_parcourue} km) invalide.`,
        niveau: "Critical"
      });
    }

    if (distance_parcourue > 1000) {
      alertes.push({
        type_alerte: "Distance excessive",
        message: `Distance inhabituelle (${distance_parcourue} km).`,
        niveau: "Warning"
      });
    }

    // 7. SEUILS CONSOMMATION
    let minConso = 5, maxConso = 50;

    switch (cat_abrev) {
      case "SUV":
        [minConso, maxConso] = [5, 15];
        break;
      case "< 7,5 T":
      case "> 7,5 T":
      case "> 20T":
        [minConso, maxConso] = [20, 45];
        break;
      case "Bus":
        [minConso, maxConso] = [25, 60];
        break;
      case "2Roues":
        [minConso, maxConso] = [2, 8];
        break;
      case "Agri":
      case "Engin":
        [minConso, maxConso] = [10, 80];
        break;
    }

    if (consommation_100km < minConso || consommation_100km > maxConso) {
      alertes.push({
        type_alerte: "Consommation anormale",
        message: `Consommation ${consommation_100km} L/100km hors norme (${minConso}-${maxConso}).`,
        niveau: "Warning"
      });
    }

    // 8. ALERTE CRITIQUE → BLOCAGE
    const alerteCritique = alertes.find(a => a.niveau === "Critical");

    if (alerteCritique && !(compteur_precedent > 0 && compteur_km < compteur_precedent && force)) {
      return res.status(400).json({
        error: "Données incohérentes détectées.",
        alertes
      });
    }

    // 9. INSERTION EN BD
    const insertResult = await query(
      `INSERT INTO carburant (
        num_pc, num_facture, date_operation, id_vehicule, id_chauffeur,
        quantite_litres, prix_cdf, prix_usd, montant_total_cdf, montant_total_usd,
        id_fournisseur, id_type_carburant, compteur_km, distance, consommation,
        commentaire, user_cr, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        num_pc || null,
        num_facture || null,
        moment(date_operation).format("YYYY-MM-DD"),
        id_vehicule,
        id_chauffeur || null,
        quantite_litres,
        prix_cdf,
        prix_usd,
        montant_total_cdf,
        montant_total_usd,
        id_fournisseur || null,
        id_type_carburant,
        compteur_km,
        distance_parcourue,
        consommation_100km,
        commentaire || null,
        user_cr
      ]
    );

    // 10. ENREGISTREMENT DES ALERTES
    for (const a of alertes) {
      await query(
        `INSERT INTO alertes_charroi
         (vehicule_id, type_alerte, message, niveau, status, created_at)
         VALUES (?, ?, ?, ?, 'Ouverte', NOW())`,
        [id_vehicule, a.type_alerte, a.message, a.niveau]
      );
    }

    // 11. REPONSE
    return res.status(201).json({
      message: "Plein carburant enregistré avec succès.",
      data: {
        id: insertResult.insertId,
        prix_cdf,
        prix_usd,
        taux_usd,
        distance_parcourue,
        consommation_100km,
        montant_total_cdf,
        montant_total_usd,
        categorie: cat_nom,
        alertes_detectees: alertes.length,
        details_alertes: alertes
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de carburant :", error);
    return res.status(500).json({
      error: `Une erreur s'est produite lors de l'enregistrement du plein de carburant.`
    });
  }
}; */

exports.postCarburant = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id;
    
    if (!isSuperAdmin && !tenantId) {
      return res.status(403).json({ error: 'Non autorisé à ajouter un plein carburant' });
    }
    
    const {
        num_pc,
        num_facture,
        date_operation,
        id_vehicule,
        id_chauffeur,
        quantite_litres,
        id_fournisseur,
        id_type_carburant,
        compteur_km,
        commentaire,
        user_cr,
        force
    } = req.body;

    try {
        // 1. VALIDATION DES CHAMPS OBLIGATOIRES
        if (!id_vehicule || !compteur_km || !quantite_litres || !id_type_carburant) {
            return res.status(400).json({
                error: "Les champs 'id_vehicule', 'id_type_carburant', 'quantite_litres' et 'compteur_km' sont obligatoires."
            });
        }

        // 🔥 Vérifier que le véhicule appartient au tenant
        const vehiculeCheck = await query(
            `SELECT v.capacite_reservoir, v.id_cat_vehicule, v.tenant_id, c.nom_cat, c.abreviation
             FROM vehicules v
             LEFT JOIN cat_vehicule c ON v.id_cat_vehicule = c.id_cat_vehicule
             WHERE v.id_vehicule = ? ${!isSuperAdmin ? 'AND v.tenant_id = ?' : ''}`,
            !isSuperAdmin ? [id_vehicule, tenantId] : [id_vehicule]
        );

        if (!vehiculeCheck.length) {
            return res.status(404).json({ error: "Véhicule non trouvé ou n'appartient pas à votre société" });
        }

        const vehicule = vehiculeCheck[0];
        const capacite_max = vehicule?.capacite_reservoir || 0;
        const cat_nom = vehicule?.nom_cat || "Inconnu";
        const cat_abrev = vehicule?.abreviation || "N/A";

        // 2. PRIX CARBURANT
        const priceResult = await query(
            `SELECT prix_cdf, taux_usd
             FROM prix_carburant
             WHERE id_type_carburant = ?
             ORDER BY date_effective DESC, id_prix_carburant DESC
             LIMIT 1`,
            [id_type_carburant]
        );

        if (!priceResult.length) {
            return res.status(400).json({ error: "Aucun prix carburant défini." });
        }

        let { prix_cdf, taux_usd } = priceResult[0];

        if (!taux_usd || taux_usd <= 1) {
            const tauxResult = await query(`
                SELECT taux_usd
                FROM prix_carburant
                WHERE taux_usd > 1
                ORDER BY date_effective DESC, id_prix_carburant DESC
                LIMIT 1
            `);
            taux_usd = tauxResult?.[0]?.taux_usd || 2200;
        }

        // 3. DERNIER COMPTEUR
        const [lastCarburant] = await query(
            `SELECT compteur_km, date_operation
             FROM carburant
             WHERE id_vehicule = ?
             ORDER BY date_operation DESC, id_carburant DESC
             LIMIT 1`,
            [id_vehicule]
        );

        const compteur_precedent = lastCarburant?.compteur_km || 0;

        // 4. CALCULS
        const distance_parcourue = compteur_km - compteur_precedent;
        const consommation_100km = distance_parcourue > 0
            ? parseFloat(((quantite_litres * 100) / distance_parcourue).toFixed(2))
            : 0;

        const montant_total_cdf = parseFloat((quantite_litres * prix_cdf).toFixed(2));
        const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));
        const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

        // 5. ALERTES
        const alertes = [];

        if (compteur_precedent > 0 && compteur_km < compteur_precedent && !force) {
            return res.status(409).json({
                askConfirmation: true,
                message: `Le nouveau kilométrage (${compteur_km}) est inférieur au dernier (${compteur_precedent}). Voulez-vous enregistrer quand même ?`
            });
        }

        if (quantite_litres > capacite_max && capacite_max > 0) {
            alertes.push({
                type_alerte: "Capacité dépassée",
                message: `Quantité (${quantite_litres} L) > capacité (${capacite_max} L).`,
                niveau: "Critical"
            });
        }

        if (lastCarburant && new Date(date_operation) < new Date(lastCarburant.date_operation)) {
            alertes.push({
                type_alerte: "Date incohérente",
                message: `Date plein (${date_operation}) < dernier plein (${lastCarburant.date_operation}).`,
                niveau: "Warning"
            });
        }

        if (distance_parcourue <= 0) {
            alertes.push({
                type_alerte: "Distance incohérente",
                message: `Distance (${distance_parcourue} km) invalide.`,
                niveau: "Critical"
            });
        }

        if (distance_parcourue > 1000) {
            alertes.push({
                type_alerte: "Distance excessive",
                message: `Distance inhabituelle (${distance_parcourue} km).`,
                niveau: "Warning"
            });
        }

        // 6. SEUILS CONSOMMATION
        let minConso = 5, maxConso = 50;

        switch (cat_abrev) {
            case "SUV": [minConso, maxConso] = [5, 15]; break;
            case "< 7,5 T":
            case "> 7,5 T":
            case "> 20T": [minConso, maxConso] = [20, 45]; break;
            case "Bus": [minConso, maxConso] = [25, 60]; break;
            case "2Roues": [minConso, maxConso] = [2, 8]; break;
            case "Agri":
            case "Engin": [minConso, maxConso] = [10, 80]; break;
        }

        if (consommation_100km < minConso || consommation_100km > maxConso) {
            alertes.push({
                type_alerte: "Consommation anormale",
                message: `Consommation ${consommation_100km} L/100km hors norme (${minConso}-${maxConso}).`,
                niveau: "Warning"
            });
        }

        const alerteCritique = alertes.find(a => a.niveau === "Critical");
        if (alerteCritique && !(compteur_precedent > 0 && compteur_km < compteur_precedent && force)) {
            return res.status(400).json({
                error: "Données incohérentes détectées.",
                alertes
            });
        }

        // 7. INSERTION EN BD avec tenant_id
        const insertResult = await query(
            `INSERT INTO carburant (
                num_pc, num_facture, date_operation, id_vehicule, id_chauffeur,
                quantite_litres, prix_cdf, prix_usd, montant_total_cdf, montant_total_usd,
                id_fournisseur, id_type_carburant, compteur_km, distance, consommation,
                commentaire, user_cr, tenant_id, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                num_pc || null,
                num_facture || null,
                moment(date_operation).format("YYYY-MM-DD"),
                id_vehicule,
                id_chauffeur || null,
                quantite_litres,
                prix_cdf,
                prix_usd,
                montant_total_cdf,
                montant_total_usd,
                id_fournisseur || null,
                id_type_carburant,
                compteur_km,
                distance_parcourue,
                consommation_100km,
                commentaire || null,
                user_cr || currentUserId,
                tenantId,           // 🔥 tenant_id automatique
                currentUserId       // 🔥 created_by
            ]
        );

        // 8. ENREGISTREMENT DES ALERTES
        for (const a of alertes) {
            await query(
                `INSERT INTO alertes_charroi
                 (vehicule_id, type_alerte, message, niveau, status, tenant_id, created_at)
                 VALUES (?, ?, ?, ?, 'Ouverte', ?, NOW())`,
                [id_vehicule, a.type_alerte, a.message, a.niveau, tenantId]
            );
        }

        return res.status(201).json({
            message: "Plein carburant enregistré avec succès.",
            data: {
                id: insertResult.insertId,
                prix_cdf,
                prix_usd,
                taux_usd,
                distance_parcourue,
                consommation_100km,
                montant_total_cdf,
                montant_total_usd,
                categorie: cat_nom,
                tenant_id: tenantId,
                alertes_detectees: alertes.length,
                details_alertes: alertes
            }
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de carburant :", error);
        return res.status(500).json({
            error: `Une erreur s'est produite lors de l'enregistrement du plein de carburant.`
        });
    }
};

exports.updateCarburant = async (req, res) => {
  const {
    id_carburant,
    num_pc,
    num_facture,
    date_operation,
    id_vehicule,
    id_chauffeur,
    quantite_litres,
    id_fournisseur,
    id_type_carburant,
    compteur_km,
    commentaire,
    user_cr,
    force
  } = req.body;

  try {
    if (!id_carburant) {
      return res.status(400).json({ error: "ID carburant manquant." });
    }

    if (!id_vehicule || !compteur_km || !quantite_litres || !id_type_carburant) {
      return res.status(400).json({
        error: "Les champs 'id_vehicule', 'id_type_carburant', 'quantite_litres' et 'compteur_km' sont obligatoires.",
      });
    }

    //Prix carburant le plus récent
    const priceResult = await query(`
      SELECT prix_cdf, taux_usd
      FROM prix_carburant
      WHERE id_type_carburant = ?
      ORDER BY date_effective DESC, id_prix_carburant DESC
      LIMIT 1
    `, [id_type_carburant]);

    if (!priceResult?.length)
      return res.status(400).json({ error: "Aucun prix carburant défini." });

    let { prix_cdf, taux_usd } = priceResult[0];

    if (!taux_usd || taux_usd <= 1) {
      const tauxResult = await query(`
        SELECT taux_usd
        FROM prix_carburant
        WHERE taux_usd > 1
        ORDER BY date_effective DESC, id_prix_carburant DESC
        LIMIT 1
      `);
      taux_usd = tauxResult?.[0]?.taux_usd || 2200;
    }

    //Dernier compteur (autre plein)
    const [lastCarburant] = await query(
      `SELECT compteur_km, date_operation
       FROM carburant
       WHERE id_vehicule = ? AND id_carburant != ?
       ORDER BY date_operation DESC, id_carburant DESC
       LIMIT 1`,
      [id_vehicule, id_carburant]
    );

    const compteur_precedent = lastCarburant?.compteur_km || 0;

    //Informations du véhicule
    const [vehicule] = await query(
      `SELECT v.capacite_reservoir, v.id_cat_vehicule, c.nom_cat, c.abreviation
       FROM vehicules v
       LEFT JOIN cat_vehicule c ON v.id_cat_vehicule = c.id_cat_vehicule
       WHERE v.id_vehicule = ?`,
      [id_vehicule]
    );

    const capacite_max = vehicule?.capacite_reservoir || 0;
    const cat_nom = vehicule?.nom_cat || "Inconnu";
    const cat_abrev = vehicule?.abreviation || "N/A";

    //Calculs généraux
    const distance_parcourue = compteur_km - compteur_precedent;
    const consommation_100km =
      distance_parcourue > 0
        ? parseFloat(((quantite_litres * 100) / distance_parcourue).toFixed(2))
        : 0;

    const montant_total_cdf = parseFloat((quantite_litres * prix_cdf).toFixed(2));
    const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));
    const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

    //Alertes
    const alertes = [];

    if (compteur_precedent > 0 && compteur_km < compteur_precedent && !force) {
      return res.status(409).json({
        askConfirmation: true,
        message: `Le nouveau kilométrage (${compteur_km}) est inférieur au dernier (${compteur_precedent}). Voulez-vous enregistrer quand même ?`,
      });
    }

    if (quantite_litres > capacite_max && capacite_max > 0) {
      alertes.push({
        type_alerte: "Capacité dépassée",
        message: `Quantité (${quantite_litres} L) > capacité réservoir (${capacite_max} L)`,
        niveau: "Critical",
      });
    }

    if (lastCarburant && new Date(date_operation) < new Date(lastCarburant.date_operation)) {
      alertes.push({
        type_alerte: "Date incohérente",
        message: `Date du plein (${date_operation}) < dernier plein (${lastCarburant.date_operation})`,
        niveau: "Warning",
      });
    }

    if (distance_parcourue <= 0) {
      alertes.push({
        type_alerte: "Distance nulle ou négative",
        message: `Distance = ${distance_parcourue} km`,
        niveau: "Critical",
      });
    }

    if (distance_parcourue > 1000) {
      alertes.push({
        type_alerte: "Distance excessive",
        message: `Distance inhabituelle (${distance_parcourue} km).`,
        niveau: "Warning",
      });
    }

    //Seuils par catégorie
    let minConso = 5, maxConso = 80;

    switch (cat_abrev) {
      case "SUV":
        [minConso, maxConso] = [5, 15];
        break;
      case "< 7,5 T":
      case "> 7,5 T":
      case "> 20T":
        [minConso, maxConso] = [20, 45];
        break;
      case "Bus":
        [minConso, maxConso] = [25, 60];
        break;
      case "2Roues":
        [minConso, maxConso] = [2, 8];
        break;
      case "Agri":
      case "Engin":
        [minConso, maxConso] = [10, 80];
        break;
      default:
        [minConso, maxConso] = [5, 50];
    }

    if (consommation_100km < minConso || consommation_100km > maxConso) {
      alertes.push({
        type_alerte: "Consommation anormale",
        message: `Consommation ${consommation_100km} L/100km hors norme (${minConso}-${maxConso}).`,
        niveau: "Warning",
      });
    }

    //Blocage si alerte critique *hors force*
    const alerteCritique = alertes.find((a) => a.niveau === "Critical");

    if (alerteCritique && !(compteur_precedent > 0 && compteur_km < compteur_precedent && force)) {
      return res.status(400).json({
        error: "Données incohérentes détectées.",
        alertes,
      });
    }

    //Mise à jour
    await query(
      `UPDATE carburant SET
        num_pc = ?, num_facture = ?, date_operation = ?, id_vehicule = ?, id_chauffeur = ?,
        quantite_litres = ?, prix_cdf = ?, prix_usd = ?, montant_total_cdf = ?, montant_total_usd = ?,
        id_fournisseur = ?, id_type_carburant = ?, compteur_km = ?, distance = ?, consommation = ?,
        commentaire = ?, user_cr = ?
      WHERE id_carburant = ?`,
      [
        num_pc || null,
        num_facture || null,
        date_operation || new Date(),
        id_vehicule,
        id_chauffeur || null,
        quantite_litres,
        prix_cdf,
        prix_usd,
        montant_total_cdf,
        montant_total_usd,
        id_fournisseur || null,
        id_type_carburant,
        compteur_km,
        distance_parcourue,
        consommation_100km,
        commentaire || null,
        user_cr,
        id_carburant
      ]
    );

    // 9️⃣ Journalisation des alertes
    for (const a of alertes) {
      await query(
        `INSERT INTO alertes_charroi (vehicule_id, type_alerte, message, niveau, status, created_at)
         VALUES (?, ?, ?, ?, 'Ouverte', NOW())`,
        [id_vehicule, a.type_alerte, a.message, a.niveau]
      );
    }

    // 🔟 Réponse
    return res.status(200).json({
      message: "✔️ Plein carburant mis à jour avec succès.",
      data: {
        id_carburant,
        prix_cdf,
        prix_usd,
        taux_usd,
        distance_parcourue,
        consommation_100km,
        montant_total_cdf,
        montant_total_usd,
        alertes_detectees: alertes.length,
        details_alertes: alertes,
      },
    });

  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du carburant :", error);
    return res.status(500).json({
      error: "Erreur interne durant la mise à jour du plein.",
      details: error.message,
    });
  }
};

exports.deleteCarburant = async(req, res) => {
  try {
    const {id_carburant} = req.query;
    
    if(!id_carburant) {
      return res.status(400).json({ message: "Paramètre 'id_carburant' manquant."})
    }
    const q = 'UPDATE carburant SET est_supprime = 1 WHERE id_carburant= ?';
    db.query(q, [id_carburant], (error, result) => {
      if(error) {
        console.error("Erreur de requête de base de données:", err)
      }
        
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Carburant introuvable." });
      }
      return res.status(200).json({ message: "Carburant supprimé avec succès." });
    })
  } catch (error) {
    console.error("Erreur inattendue:", error);
    return res.status(500).json({ message: "Une erreur inattendue s'est produite." });
  }
};

exports.postCarburantVehiculeExcel = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier téléchargé" });
    }

    const filePath = req.files[0].path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const query = `
      INSERT INTO vehicule_carburant (
        id_enregistrement,
        nom_marque,
        nom_modele,
        num_serie,
        immatriculation
      ) VALUES (?, ?, ?, ?, ?)
    `;

    for (const row of sheetData) {
      const values = [
        row["ID ENREGISTREMENT"],
        row["Actifs::Article"],
        row["Actifs::Modèle"],
        row["Actifs::Numéro de série"],
        row["Numero PLAQUE"],
      ];

      // Vérifier si déjà existant avant insertion
      if (values[0]) {
        db.query(
          "SELECT id_enregistrement FROM vehicule_carburant WHERE id_enregistrement = ?",
          [values[0]],
          (err, result) => {
            if (err) return console.error("Erreur SELECT :", err);

            if (result.length === 0) {
              // Si non trouvé, insérer
              db.query(query, values, (error) => {
                if (error) console.error("Erreur INSERT :", error);
              });
            } else {
              console.log(`ID ${values[0]} déjà existant, ignoré.`);
            }
          }
        );
      }
    }

    fs.unlinkSync(filePath);
    return res.status(201).json({ message: "Importation terminée (doublons ignorés)." });
  } catch (error) {
    console.error("Erreur lors de l'importation :", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

exports.postCarburantExcel = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier téléchargé." });
    }

    const filePath = req.files[0].path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const query = `
      INSERT INTO carburant (
        num_pc,
        num_facture,
        date_operation,
        id_vehicule,
        quantite_litres,
        montant_total,
        compteur_km,
        distance,
        consommation,
        commentaire
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertPromises = sheetData.map(row => {
      let date_operation = null;
      const rawDate = row["DATE"];

      // ✅ Cas 1 : Excel a stocké une vraie date (nombre, ex: 45966)
      if (typeof rawDate === "number") {
        const parsed = xlsx.SSF.parse_date_code(rawDate);
        if (parsed) {
          const year = parsed.y;
          const month = String(parsed.m).padStart(2, "0");
          const day = String(parsed.d).padStart(2, "0");
          date_operation = `${year}-${month}-${day} 00:00:00`;
        }
      }

      // ✅ Cas 2 : format texte "22/02/2024"
      else if (typeof rawDate === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [day, month, year] = rawDate.split("/");
        date_operation = `${year}-${month}-${day} 00:00:00`;
      }


      const values = [
        row["N° PIECE DE CAISSE"] || null,
        row["N° FACTURE"] || null,
        date_operation || null,
        row["ID ENREGISTREMENT"] || null,
        row["LITRAGE"] || null,
        row["PRIX CARBURANT"] || null,
        row["KM 1"] || null,
        row["DISTANCE PARCOURUE"] || null,
        row["CONSOMMATION AU 100"] || null,
        row["CHAUFFEUR"] || null,
      ];

      return new Promise((resolve, reject) => {
        db.query(query, values, (error) => {
          if (error) {
            console.error("Erreur INSERT :", error);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });

    await Promise.allSettled(insertPromises);
    fs.unlinkSync(filePath);

    return res.status(201).json({ message: "Importation terminée avec succès." });

  } catch (error) {
    console.error("Erreur lors de l'importation :", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

exports.postCarburantCorrectionExcel = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier téléchargé." });
    }

    const filePath = req.files[0].path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const updateQuery = `
      UPDATE carburant
      SET compteur_km = ?
      WHERE id_vehicule = ? 
        AND DATE(date_operation) = ?
    `;

    const promises = sheetData.map(row => {
      const km2 = row["KIM2"];
      const idVehicule = row["ID ENREGISTREMENT"];

      let dateOperation = null;
      const rawDate = row["DATE"];

      // Conversion date Excel -> MySQL
      if (typeof rawDate === "number") {
        const parsed = xlsx.SSF.parse_date_code(rawDate);
        dateOperation = `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;
      } else if (typeof rawDate === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [day, month, year] = rawDate.split("/");
        dateOperation = `${year}-${month}-${day}`;
      }

      return new Promise((resolve, reject) => {
        db.query(updateQuery, [km2, idVehicule, dateOperation], (err) => {
          if (err) {
            console.error("Erreur UPDATE:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    await Promise.all(promises);
    fs.unlinkSync(filePath);

    return res.json({ message: "Correction massive KM2 appliquée avec succès." });

  } catch (error) {
    console.error("Erreur correction:", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

//Prix carburant
exports.getCarburantPrice = async (req, res) => {

    const q = `SELECT 
                pc.*, 
                tc.nom_type_carburant 
              FROM prix_carburant pc
              LEFT JOIN type_carburant tc ON pc.id_type_carburant = tc.id_type_carburant
              `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.getCarburantPriceLimit = async (req, res) => {
  const { id_type_carburant } = req.query;

  try {
    if (!id_type_carburant) {
      return res.status(400).json({
        error: "Le paramètre 'id_type_carburant' est obligatoire."
      });
    }

    const q = `
      SELECT 
        prix_cdf,
        taux_usd,
        date_effective,
        id_type_carburant
      FROM prix_carburant
      WHERE id_type_carburant = ?
      ORDER BY date_effective DESC, id_prix_carburant DESC
      LIMIT 1
    `;

    db.query(q, [id_type_carburant], (error, results) => {
      if (error) {
        return res.status(500).json({
          error: "Erreur lors de la récupération du prix carburant.",
          details: error
        });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          error: "Aucun prix trouvé pour ce type de carburant."
        });
      }

      return res.status(200).json(results[0]); // retourne un seul objet
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erreur interne du serveur.",
      details: err
    });
  }
};
  
exports.postCarburantPrice = async (req, res) => {
    const {
        date_effective,
        id_type_carburant,
        prix_cdf,
        taux_usd
    } = req.body;

    try {
        const q = `INSERT INTO prix_carburant (
                    date_effective,
                    id_type_carburant,
                    prix_cdf,
                    taux_usd
                ) VALUES (?, ?, ?, ?)`;

                const values = [
                    date_effective,
                    id_type_carburant,
                    prix_cdf,
                    taux_usd
                ]
            await db.query(q, values);
            return res.status(201).json({ message: 'Le prix du carburant ajouté avec succès' });
    } catch (error) {
        console.error("Erreur lors de l'ajout du prix du carburant :", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du prix carburant." });
    }
};

//ALERT
exports.getAlertCarburant = (req, res) => {

    const q = `SELECT 
                *
                FROM alertes_charroi WHERE status = 'Ouverte'
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.putAlertCarburantIsRead = (req, res) => {
    const { id_alerte } = req.query;
    if(!id_alerte) {
      return res.status(400).json({ error: 'Invalid ALERT ID provided' });
    }
    const q = `UPDATE SET status = 'Fermée' WHERE id_alerte = ?
            `;

    db.query(q, [id_alerte], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

// Rapport global carburant
exports.rapportCarburantAll = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { date_debut, date_fin } = req.query;
    
    if (!date_debut || !date_fin) {
        return res.status(400).json({ message: "Période requise" });
    }

    try {
        // 🔥 Condition tenant pour toutes les requêtes
        let tenantCondition = "";
        let params = [date_debut, date_fin];
        
        if (!isSuperAdmin && tenantId) {
            tenantCondition = ` AND v.tenant_id = ?`;
            params.push(tenantId);
        }

        // === 1️⃣ Résumé global ===
        const resumeQuery = `
            SELECT 
                COUNT(*) AS total_pleins,
                SUM(quantite_litres) AS total_litres,
                SUM(montant_total_cdf) AS total_cdf,
                SUM(montant_total_usd) AS total_usd,
                ROUND(AVG(consommation), 2) AS conso_moyenne
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            WHERE c.date_operation BETWEEN ? AND ? ${!isSuperAdmin ? 'AND v.tenant_id = ?' : ''}
        `;
        const resumeParams = !isSuperAdmin ? [date_debut, date_fin, tenantId] : [date_debut, date_fin];
        const resume = await query(resumeQuery, resumeParams);

        // === 2️⃣ Détails par véhicule ===
        const parVehiculeQuery = `
            SELECT 
                v.immatriculation,
                mar.nom_marque,
                modl.modele AS nom_modele,
                SUM(c.quantite_litres) AS total_litres,
                SUM(c.montant_total_cdf) AS total_cdf,
                SUM(c.montant_total_usd) AS total_usd,
                ROUND(AVG(c.consommation), 2) AS conso_moyenne
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
            WHERE c.date_operation BETWEEN ? AND ? ${!isSuperAdmin ? 'AND v.tenant_id = ?' : ''}
            GROUP BY v.id_vehicule
            ORDER BY MAX(c.date_operation) DESC
        `;
        const parVehiculeParams = !isSuperAdmin ? [date_debut, date_fin, tenantId] : [date_debut, date_fin];
        const parVehicule = await query(parVehiculeQuery, parVehiculeParams);

        // === 3️⃣ Coût hebdomadaire ===
        const coutHebdoQuery = `
            SELECT 
                YEARWEEK(c.date_operation, 1) AS semaine,
                COALESCE(SUM(c.montant_total_cdf), 0) AS total_cdf,
                COALESCE(SUM(c.montant_total_usd), 0) AS total_usd,
                COALESCE(SUM(c.consommation), 0) AS total_consom
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            WHERE c.date_operation BETWEEN ? AND ? ${!isSuperAdmin ? 'AND v.tenant_id = ?' : ''}
            GROUP BY YEARWEEK(c.date_operation, 1)
            ORDER BY semaine ASC
        `;
        const coutHebdoParams = !isSuperAdmin ? [date_debut, date_fin, tenantId] : [date_debut, date_fin];
        const coutHebdo = await query(coutHebdoQuery, coutHebdoParams);

        // === 4️⃣ Répartition par catégorie de véhicule ===
        const repartitionQuery = `
            SELECT 
                cat.abreviation,
                cat.nom_cat,
                SUM(c.quantite_litres) AS total_litres
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule = cat.id_cat_vehicule
            WHERE c.date_operation BETWEEN ? AND ? ${!isSuperAdmin ? 'AND v.tenant_id = ?' : ''}
            GROUP BY cat.id_cat_vehicule
        `;
        const repartitionParams = !isSuperAdmin ? [date_debut, date_fin, tenantId] : [date_debut, date_fin];
        const repartition = await query(repartitionQuery, repartitionParams);

        // === 5️⃣ Alertes depuis alertes_charroi ===
        const alertesQuery = `
            SELECT 
                a.id_alerte,
                v.immatriculation,
                a.type_alerte,
                a.message,
                a.niveau,
                a.status,
                a.created_at
            FROM alertes_charroi a
            LEFT JOIN vehicules v ON a.vehicule_id = v.id_vehicule
            WHERE a.created_at BETWEEN ? AND ? ${!isSuperAdmin ? 'AND a.tenant_id = ?' : ''}
            ORDER BY a.created_at DESC
            LIMIT 10
        `;
        const alertesParams = !isSuperAdmin ? [date_debut, date_fin, tenantId] : [date_debut, date_fin];
        const alertes = await query(alertesQuery, alertesParams);

        return res.status(200).json({
            periode: { date_debut, date_fin },
            resume: resume[0] || { total_pleins: 0, total_litres: 0, total_cdf: 0, total_usd: 0, conso_moyenne: 0 },
            graphiques: { parVehicule, coutHebdo, repartition },
            detailVehicules: parVehicule,
            alertes
        });

    } catch (error) {
        console.error("Erreur rapportCarburantAll :", error);
        res.status(500).json({ error: error.message });
    }
};

exports.rapportCarburantConsomGen = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { period } = req.query;

    const daysMap = {
        "7jours": 7,
        "30jours": 30,
        "90jours": 90,
        "180jours": 180,
        "360jours": 360,
    };

    const days = daysMap[period] || 360;
    const periodFilter = `c.date_operation >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
    
    // 🔥 Condition tenant pour filtrer les données
    const tenantCondition = !isSuperAdmin && tenantId ? ` AND v.tenant_id = ${tenantId}` : "";

    try {
        // 1. DETAILS SIEGE KIN (site_id = 1)
        const sqlDetailSiegeKin = await query(`
            SELECT 
                c.id_carburant,
                v.immatriculation, 
                v.id_vehicule AS id_enregistrement, 
                mar.nom_marque, 
                modl.modele AS nom_modele, 
                ch.nom AS chauffeur_nom, 
                ch.prenom AS chauffeur_prenom, 
                s.nom_site, 
                s.id_site, 
                tc.nom_type_carburant,
                COUNT(DISTINCT v.id_vehicule) AS nbre_vehicule,
                COUNT(c.id_carburant) AS total_pleins,
                SUM(c.compteur_km) AS total_kilometrage, 
                SUM(c.quantite_litres) AS total_litres 
            FROM carburant c 
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
            LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
            LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
            LEFT JOIN sites s ON sv.id_site = s.id_site 
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            WHERE s.id_site = 1 
            AND ${periodFilter}
            ${tenantCondition}
            GROUP BY v.id_vehicule
        `);

        // 2. VEHICULE INFO (tous véhicules)
        const sqlVehiculeInfo = await query(`
            SELECT 
                c.id_carburant,
                v.immatriculation, 
                v.id_vehicule AS id_enregistrement, 
                mar.nom_marque, 
                modl.modele AS nom_modele, 
                ch.nom AS chauffeur_nom, 
                ch.prenom AS chauffeur_prenom, 
                s.nom_site, 
                s.id_site, 
                tc.nom_type_carburant,
                COUNT(DISTINCT v.id_vehicule) AS nbre_vehicule,
                COUNT(c.id_carburant) AS total_pleins,
                SUM(c.compteur_km) AS total_kilometrage, 
                SUM(c.quantite_litres) AS total_litres 
            FROM carburant c 
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
            LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
            LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
            LEFT JOIN sites s ON sv.id_site = s.id_site 
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            WHERE ${periodFilter}
            ${tenantCondition}
            GROUP BY v.id_vehicule
        `);

        // 3. SIEGE KIN PAR TYPE CARBURANT
        const sqlSiegeKinTypeCarburant = await query(`
            SELECT 
                tc.nom_type_carburant,
                COUNT(DISTINCT v.id_vehicule) AS nbre_vehicule,
                COUNT(c.id_carburant) AS total_pleins,
                SUM(c.compteur_km) AS total_kilometrage, 
                SUM(c.quantite_litres) AS total_litres 
            FROM carburant c 
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
            LEFT JOIN sites s ON sv.id_site = s.id_site 
            WHERE s.id_site = 1 
            AND ${periodFilter}
            ${tenantCondition}
            GROUP BY s.id_site, v.id_type_carburant
        `);

        // 4. TOUS SITES
        const sqlMesSites = await query(`
            SELECT 
                s.nom_site, 
                s.id_site, 
                COUNT(DISTINCT v.id_vehicule) AS nbre_vehicule,
                COUNT(c.id_carburant) AS total_pleins,
                SUM(c.compteur_km) AS total_kilometrage, 
                SUM(c.quantite_litres) AS total_litres 
            FROM carburant c 
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
            INNER JOIN sites s ON sv.id_site = s.id_site 
            WHERE ${periodFilter}
            ${tenantCondition}
            GROUP BY s.id_site
        `);

        // 5. SITES AVEC PROVINCES ET ZONES
        const sqlSitesAll = await query(`
            SELECT 
                s.nom_site, 
                s.id_site,
                p.name AS province,
                z.NomZone AS zone,
                COUNT(DISTINCT v.id_vehicule) AS nbre_vehicule,
                COUNT(c.id_carburant) AS total_pleins,
                SUM(c.compteur_km) AS total_kilometrage, 
                SUM(c.quantite_litres) AS total_litres 
            FROM carburant c 
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
            INNER JOIN sites s ON sv.id_site = s.id_site 
            LEFT JOIN zones z ON s.IdZone = z.id
            LEFT JOIN provinces p ON s.IdVille = p.id
            WHERE ${periodFilter}
            ${tenantCondition}
            GROUP BY s.id_site
        `);

        // 6. CONSO PAR MOIS ET TYPE CARBURANT
        const sqlConsomTypeCarburant = await query(`
            SELECT
                YEAR(c.date_operation) AS annee,
                MONTH(c.date_operation) AS mois,
                SUM(c.quantite_litres) AS total_conso,
                tc.nom_type_carburant
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            WHERE YEAR(c.date_operation) = YEAR(CURDATE()) 
            AND ${periodFilter}
            ${tenantCondition}
            GROUP BY YEAR(c.date_operation), MONTH(c.date_operation), v.id_type_carburant, tc.nom_type_carburant
            ORDER BY annee DESC, mois DESC
        `);

        // 7. CONSO PAR ANNEE ET TYPE CARBURANT
        const sqlConsomYearTypeCarburant = await query(`
            SELECT
                YEAR(c.date_operation) AS annee,
                SUM(c.quantite_litres) AS total_conso,
                tc.nom_type_carburant
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            WHERE YEAR(c.date_operation) = YEAR(CURDATE()) 
            AND ${periodFilter}
            ${tenantCondition}
            GROUP BY YEAR(c.date_operation), v.id_type_carburant, tc.nom_type_carburant
            ORDER BY annee DESC
        `);

        return res.status(200).json({
            periode: { jours: days, filtre: period },
            sqlDetailSiegeKin,
            sqlVehiculeInfo,
            sqlMesSites,
            sqlSitesAll,
            sqlSiegeKinTypeCarburant,
            sqlConsomTypeCarburant,
            sqlConsomYearTypeCarburant
        });

    } catch (error) {
        console.error("Erreur rapportCarburantConsomGen :", error);
        res.status(500).json({ error: error.message });
    }
};

//ANNEE ET MOIS
exports.getCarburantMois = (req, res) => {
    const { annee } = req.query;

    const q = `
        SELECT 
            MONTH(c.date_operation) AS mois
        FROM carburant c
        WHERE YEAR(c.date_operation) = ?
        GROUP BY MONTH(c.date_operation)
        ORDER BY MONTH(c.date_operation) DESC
    `;

    db.query(q, [annee], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantAnnee = (req, res) => {

    const q = `
            SELECT 
                YEAR(c.date_operation) AS annee
                FROM carburant c
            GROUP BY YEAR(c.date_operation)
            ORDER BY YEAR(c.date_operation) DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

//Rapport par periode cat
exports.getRapportCatPeriode = (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { month, id_vehicule, id_site, date_start, date_end, cat } = req.query;

    if (!month && !(date_start && date_end)) {
        return res.status(400).json({
            message: "Vous devez fournir 'month' ou bien 'date_start' et 'date_end'.",
        });
    }

    const where = [];
    const params = [];

    // Période
    if (month && !(date_start && date_end)) {
        where.push("DATE_FORMAT(c.date_operation, '%Y-%m') = ?");
        params.push(month);
    }
    if (date_start && date_end) {
        where.push("DATE(c.date_operation) BETWEEN ? AND ?");
        params.push(date_start, date_end);
    }

    // Filtres
    if (cat) {
        where.push("cat.id_cat_vehicule = ?");
        params.push(cat);
    }
    if (id_vehicule) {
        where.push("c.id_vehicule = ?");
        params.push(id_vehicule);
    }
    if (id_site) {
        where.push("s.id_site = ?");
        params.push(id_site);
    }

    // Tenant filter
    if (!isSuperAdmin && tenantId) {
        where.push("v.tenant_id = ?");
        params.push(tenantId);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const q = `
        SELECT 
            DATE(c.date_operation) AS date_jour,
            COUNT(c.id_carburant) AS total_pleins,
            SUM(c.compteur_km) AS total_kilometrage,
            SUM(c.quantite_litres) AS total_litres,
            SUM(c.consommation) AS total_consom,
            SUM(c.distance) AS total_distance,
            SUM(c.montant_total_cdf) AS total_total_cdf,
            SUM(c.montant_total_usd) AS total_total_usd,
            ROUND(SUM(c.distance) / NULLIF(SUM(c.quantite_litres), 0), 2) AS conso_aux_100km,
            cat.nom_cat AS categorie_nom
        FROM carburant c
        LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN cat_vehicule cat ON cat.id_cat_vehicule = v.id_cat_vehicule
        LEFT JOIN sites_vehicule sv ON sv.id_vehicule = v.id_vehicule
        LEFT JOIN sites s ON s.id_site = sv.id_site
        ${whereClause}
        GROUP BY DATE(c.date_operation), cat.id_cat_vehicule
        ORDER BY date_jour ASC
    `;

    db.query(q, params, (error, data) => {
        if (error) {
            console.error("Erreur SQL getRapportCatPeriode:", error);
            return res.status(500).json({
                message: "Erreur SQL lors de la récupération",
                error: error.sqlMessage,
            });
        }

        if (!data || !data.length) {
            return res.status(200).json([]);
        }

        // Formater les données
        const formattedData = data.map(row => ({
            date_jour: moment(row.date_jour).toISOString(),
            total_pleins: row.total_pleins || 0,
            total_kilometrage: row.total_kilometrage || 0,
            total_litres: row.total_litres || 0,
            total_consom: row.total_consom || 0,
            total_distance: row.total_distance || 0,
            total_total_cdf: row.total_total_cdf || 0,
            total_total_usd: row.total_total_usd || 0,
            categorie_nom: row.categorie_nom || 'Non catégorisé'
        }));

        res.status(200).json(formattedData);
    });
};

exports.getRapportVehiculePeriode = (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    let { period, vehicule, site, cat } = req.body;

    // Si des filtres sont envoyés depuis le composant RapportPeriodeFiltrage
    const filters = req.body.filters || req.body;

    try {
        if (typeof period === "string") {
            period = JSON.parse(period);
        }
    } catch (e) {
        // Si period n'existe pas, on continue
    }

    const months = period?.mois?.map(Number) || filters?.mois || [];
    const years = period?.annees?.map(Number) || filters?.annees || [];
    const where = [];
    const params = [];

    // 🔥 Tenant filter
    if (!isSuperAdmin && tenantId) {
        where.push("v.tenant_id = ?");
        params.push(tenantId);
    }

    // Filtres
    if (vehicule?.length || filters?.vehicule?.length) {
        const vehiculeIds = vehicule || filters?.vehicule || [];
        where.push(`c.id_vehicule IN (${vehiculeIds.map(() => "?").join(",")})`);
        params.push(...vehiculeIds);
    }
    if (site?.length || filters?.site?.length) {
        const siteIds = site || filters?.site || [];
        where.push(`s.id_site IN (${siteIds.map(() => "?").join(",")})`);
        params.push(...siteIds);
    }
    if (cat?.length || filters?.cat?.length) {
        const catIds = cat || filters?.cat || [];
        where.push(`cat.id_cat_vehicule IN (${catIds.map(() => "?").join(",")})`);
        params.push(...catIds);
    }
    if (months.length) {
        where.push(`MONTH(c.date_operation) IN (${months.map(() => "?").join(",")})`);
        params.push(...months);
    }
    if (years.length) {
        where.push(`YEAR(c.date_operation) IN (${years.map(() => "?").join(",")})`);
        params.push(...years);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    // Requête avec les alias attendus par le frontend
    const q = `
        SELECT 
            v.immatriculation,
            mar.nom_marque,
            modl.modele AS nom_modele,
            c.id_vehicule,
            cat.nom_cat,
            MONTH(c.date_operation) AS Mois,
            YEAR(c.date_operation) AS Année,
            COUNT(c.id_carburant) AS total_pleins,
            SUM(c.quantite_litres) AS total_litres,
            SUM(c.montant_total_cdf) AS total_cdf,
            SUM(c.montant_total_usd) AS total_usd,
            ROUND(AVG(c.consommation), 2) AS conso_moyenne,
            SUM(c.consommation) AS total_consom,
            SUM(c.distance) AS total_distance,
            SUM(c.compteur_km) AS total_kilometrage
        FROM carburant c 
        LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN marque mar ON v.id_marque = mar.id_marque
        LEFT JOIN modeles modl ON v.id_modele = modl.id_modele
        LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule = cat.id_cat_vehicule
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        LEFT JOIN sites s ON sv.id_site = s.id_site 
        ${whereClause}
        GROUP BY c.id_vehicule, cat.id_cat_vehicule, MONTH(c.date_operation), YEAR(c.date_operation)
        ORDER BY Année DESC, Mois DESC
    `;

    db.query(q, params, (error, data) => {
        if (error) {
            console.error("Erreur SQL getRapportVehiculePeriode:", error);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération", 
                error: error.sqlMessage 
            });
        }

        // S'assurer que les champs sont au bon format
        const formattedData = data.map(row => ({
            ...row,
            Mois: row.Mois,
            Année: row.Année,
            nom_marque: row.nom_marque,
            immatriculation: row.immatriculation,
            id_vehicule: row.id_vehicule,
            total_pleins: row.total_pleins || 0,
            total_litres: row.total_litres || 0,
            total_cdf: row.total_cdf || 0,
            total_usd: row.total_usd || 0,
            conso_moyenne: row.conso_moyenne || 0,
            total_consom: row.total_consom || 0,
            total_distance: row.total_distance || 0,
            total_kilometrage: row.total_kilometrage || 0
        }));

        return res.status(200).json({ data: formattedData });
    });
};

exports.getRapportCarbMonth = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    let { period, vehicule, cat, type_carb, site } = req.body;

    try {
        if (typeof period === "string") {
            period = JSON.parse(period);
        }
    } catch (e) {
        return res.status(400).json({ message: "Format 'period' invalide" });
    }

    const months = period?.mois?.map(Number) || [];
    const years = period?.annees?.map(Number) || [];
    const where = [];
    const params = [];

    if (!isSuperAdmin && tenantId) {
        where.push("v.tenant_id = ?");
        params.push(tenantId);
    }

    if (vehicule?.length) {
        where.push(`c.id_vehicule IN (${vehicule.map(() => "?").join(",")})`);
        params.push(...vehicule);
    }
    if (site?.length) {
        where.push(`sv.id_site IN (${site.map(() => "?").join(",")})`);
        params.push(...site);
    }
    if (cat?.length) {
        where.push(`cat.id_cat_vehicule IN (${cat.map(() => "?").join(",")})`);
        params.push(...cat);
    }
    if (type_carb?.length) {
        where.push(`v.id_type_carburant IN (${type_carb.map(() => "?").join(",")})`);
        params.push(...type_carb);
    }
    if (months.length) {
        where.push(`MONTH(c.date_operation) IN (${months.map(() => "?").join(",")})`);
        params.push(...months);
    }
    if (years.length) {
        where.push(`YEAR(c.date_operation) IN (${years.map(() => "?").join(",")})`);
        params.push(...years);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const q = `
        SELECT 
            YEAR(c.date_operation) AS annee,
            MONTH(c.date_operation) AS mois,
            DATE_FORMAT(c.date_operation, '%M %Y') AS periode,
            SUM(c.consommation) AS consommation_totale,
            SUM(c.quantite_litres) AS total_litres,
            SUM(c.montant_total_cdf) AS total_cdf,
            SUM(c.montant_total_usd) AS total_usd,
            COUNT(c.id_carburant) AS total_pleins
        FROM carburant c
        LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule = cat.id_cat_vehicule
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule
        LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
        ${whereClause}
        GROUP BY annee, mois
        ORDER BY annee DESC, mois DESC
    `;

    const data = await queryAsync(q, params);

    if (!data.length) {
        return res.status(404).json({ message: "Aucune donnée trouvée" });
    }

    return res.status(200).json({
        success: true,
        data: data,
        meta: { tenant_id: !isSuperAdmin ? tenantId : null }
    });
};

exports.getCarburantByMonthYear = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { mois, annee } = req.query;

    if (!mois || !annee) {
        return res.status(400).json({ message: "Paramètres mois et année requis." });
    }

    const moisNum = parseInt(mois);
    const anneeNum = parseInt(annee);

    try {
        let q = `
            SELECT 
                c.id_carburant, 
                c.quantite_litres, 
                c.date_operation, 
                c.distance, 
                c.consommation, 
                c.montant_total_cdf, 
                c.montant_total_usd,
                c.compteur_km,
                mar.nom_marque,
                v.immatriculation,
                tc.nom_type_carburant,
                cat.abreviation
            FROM carburant c
            LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
            LEFT JOIN marque mar ON v.id_marque = mar.id_marque
            LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule = cat.id_cat_vehicule
            LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
            WHERE MONTH(c.date_operation) = ?
            AND YEAR(c.date_operation) = ?
            AND c.est_supprime = 0
        `;
        
        let params = [moisNum, anneeNum];

        if (!isSuperAdmin && tenantId) {
            q += ` AND v.tenant_id = ?`;
            params.push(tenantId);
        }

        q += ` ORDER BY c.date_operation ASC`;

        const result = await queryAsync(q, params);

        return res.status(200).json({
            success: true,
            data: result,
            meta: {
                mois: moisNum,
                annee: anneeNum,
                tenant_id: !isSuperAdmin ? tenantId : null
            }
        });
    } catch (err) {
        console.error("Erreur getCarburantByMonthYear:", err);
        return res.status(500).json({ message: err.message });
    }
};

exports.getDashboardCarburant = async (req, res) => {
  try {
    const { periode = '30j', date_debut, date_fin } = req.query;
    
    let startDate, endDate, previousStartDate, previousEndDate;
    
    endDate = moment().endOf('day');
    
    // Définir la période actuelle
    switch(periode) {
      case '7j':
        startDate = moment().subtract(7, 'days').startOf('day');
        previousStartDate = moment(startDate).subtract(7, 'days');
        break;
        
      case '90j':
        startDate = moment().subtract(90, 'days').startOf('day');
        previousStartDate = moment(startDate).subtract(90, 'days');
        break;
        
      case '1y':
        startDate = moment().subtract(1, 'year').startOf('day');
        previousStartDate = moment(startDate).subtract(1, 'year');
        break;
        
      case '30j':
      default:
        startDate = moment().subtract(30, 'days').startOf('day');
        previousStartDate = moment(startDate).subtract(30, 'days');
        break;
    }
    
    // Dates personnalisées
    if (date_debut && date_fin) {
      startDate = moment(date_debut).startOf('day');
      endDate = moment(date_fin).endOf('day');
      
      const diffDays = endDate.diff(startDate, 'days');
      previousStartDate = moment(startDate).subtract(diffDays, 'days');
      previousEndDate = moment(startDate).subtract(1, 'days').endOf('day');
    } else {
      previousEndDate = moment(startDate).subtract(1, 'seconds');
    }
    
    // 1. Requête des KPI principaux
    const kpiQuery = `
      SELECT 
        -- Période actuelle
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN montant_total_usd END), 0) AS depenses_actuelles,
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN quantite_litres END), 0) AS volume_actuel,
        COUNT(CASE WHEN date_operation BETWEEN ? AND ? THEN 1 END) AS ravitaillements_actuels,
        COALESCE(AVG(CASE WHEN date_operation BETWEEN ? AND ? THEN prix_usd END), 0) AS prix_moyen_actuel,
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN montant_total_usd END), 0) / 
          NULLIF(COUNT(CASE WHEN date_operation BETWEEN ? AND ? THEN 1 END), 0) AS cout_moyen_actuel,
        
        -- Période précédente
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN montant_total_usd END), 0) AS depenses_precedentes,
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN quantite_litres END), 0) AS volume_precedent,
        COUNT(CASE WHEN date_operation BETWEEN ? AND ? THEN 1 END) AS ravitaillements_precedents,
        COALESCE(AVG(CASE WHEN date_operation BETWEEN ? AND ? THEN prix_usd END), 0) AS prix_moyen_precedent,
        COALESCE(SUM(CASE WHEN date_operation BETWEEN ? AND ? THEN montant_total_usd END), 0) / 
          NULLIF(COUNT(CASE WHEN date_operation BETWEEN ? AND ? THEN 1 END), 0) AS cout_moyen_precedent
      FROM carburant
      WHERE est_supprime = 0
    `;
    
    const kpiParams = [
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      startDate.format('YYYY-MM-DD HH:mm:ss'), endDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss'),
      previousStartDate.format('YYYY-MM-DD HH:mm:ss'), previousEndDate.format('YYYY-MM-DD HH:mm:ss')
    ];
    
    const kpiResult = await queryAsync(kpiQuery, kpiParams);
    const kpi = kpiResult[0];
    
    // Calcul des variations
    const calculateVariation = (current, previous) => {
      if (!previous || previous == 0) return 0;
      return parseFloat(((current - previous) / previous * 100).toFixed(1));
    };
    
    // 2. Évolution des dépenses (12 derniers mois)
    const evolutionQuery = `
      SELECT 
        DATE_FORMAT(date_operation, '%Y-%m') AS mois,
        DATE_FORMAT(date_operation, '%b') AS mois_label,
        ROUND(COALESCE(SUM(montant_total_usd), 0), 2) AS depenses_mois,
        ROUND(COALESCE(SUM(quantite_litres), 0), 2) AS volume_mois,
        LAG(ROUND(COALESCE(SUM(montant_total_usd), 0), 2)) OVER (ORDER BY DATE_FORMAT(date_operation, '%Y-%m')) AS depenses_mois_prec
      FROM carburant
      WHERE est_supprime = 0
        AND date_operation >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(date_operation, '%Y-%m'), DATE_FORMAT(date_operation, '%b')
      ORDER BY mois
    `;
    
    const evolutionResult = await queryAsync(evolutionQuery);
    
    // 3. Répartition par type de carburant
    const repartitionQuery = `
      SELECT 
        COALESCE(tc.nom_type_carburant, 'Non défini') AS type_carburant,
        ROUND(SUM(c.quantite_litres), 0) AS volume_litres,
        ROUND(SUM(c.montant_total_usd), 2) AS montant_usd,
        ROUND(SUM(c.quantite_litres) * 100.0 / NULLIF(SUM(SUM(c.quantite_litres)) OVER(), 0), 1) AS pourcentage_volume,
        COUNT(*) AS nombre_transactions,
        -- Calcul de la tendance avec gestion des NULL
        COALESCE(
          ROUND(
            CASE 
              WHEN SUM(CASE WHEN c.date_operation >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN c.quantite_litres ELSE 0 END) = 0 
                OR SUM(CASE WHEN c.date_operation BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN c.quantite_litres ELSE 0 END) = 0
              THEN 0
              ELSE (
                (SUM(CASE WHEN c.date_operation >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN c.quantite_litres ELSE 0 END) -
                SUM(CASE WHEN c.date_operation BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN c.quantite_litres ELSE 0 END)) * 100.0 /
                NULLIF(SUM(CASE WHEN c.date_operation BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN c.quantite_litres ELSE 0 END), 0)
              )
            END, 1
          ), 0
        ) AS tendance_pct
      FROM carburant c
      LEFT JOIN type_carburant tc ON c.id_type_carburant = tc.id_type_carburant
      WHERE c.est_supprime = 0
        AND c.date_operation >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY tc.id_type_carburant, tc.nom_type_carburant
      ORDER BY pourcentage_volume DESC
    `;
    
    const repartitionResult = await queryAsync(repartitionQuery);
    
    // 4. Top 5 véhicules consommateurs
    const topVehiculesQuery = `
      SELECT 
        v.immatriculation,
        m.nom_marque AS marque,
        model.modele AS modele,
        ROUND(SUM(c.quantite_litres), 0) AS total_litres,
        ROUND(SUM(c.montant_total_usd), 2) AS total_depenses,
        COUNT(*) AS nombre_pleins,
        ROUND(AVG(c.consommation), 2) AS consommation_moyenne,
        ROUND(SUM(c.montant_total_usd) / NULLIF(SUM(c.quantite_litres), 0), 2) AS prix_moyen_litre
      FROM carburant c
      LEFT JOIN vehicules v ON c.id_vehicule = v.id_vehicule
      LEFT JOIN marque m ON m.id_marque = v.id_marque
      LEFT JOIN modeles model ON v.id_modele = model.id_modele
      WHERE c.est_supprime = 0
        AND c.date_operation BETWEEN ? AND ?
      GROUP BY c.id_vehicule, v.immatriculation, v.id_marque, v.id_modele
      ORDER BY total_litres DESC
      LIMIT 5
    `;
    
    const topVehiculesResult = await queryAsync(topVehiculesQuery, [
      startDate.format('YYYY-MM-DD HH:mm:ss'), 
      endDate.format('YYYY-MM-DD HH:mm:ss')
    ]);
    
    // 5. Dépenses journalières
    const depensesJournalieresQuery = `
      SELECT 
        DATE(date_operation) AS date,
        DATE_FORMAT(date_operation, '%d/%m') AS date_label,
        ROUND(COALESCE(SUM(montant_total_usd), 0), 2) AS depenses,
        ROUND(COALESCE(SUM(quantite_litres), 0), 2) AS volume,
        COUNT(*) AS operations,
        ROUND(COALESCE(SUM(montant_total_usd), 0) / NULLIF(COUNT(*), 0), 2) AS moyen_par_operation
      FROM carburant
      WHERE est_supprime = 0
        AND date_operation BETWEEN ? AND ?
      GROUP BY DATE(date_operation)
      ORDER BY date
    `;
    
    const depensesJournalieresResult = await queryAsync(depensesJournalieresQuery, [
      startDate.format('YYYY-MM-DD HH:mm:ss'),
      endDate.format('YYYY-MM-DD HH:mm:ss')
    ]);
    
    // 6. Statistiques par fournisseur
    const statsFournisseurQuery = `
      SELECT 
        f.nom_fournisseur,
        COUNT(*) AS nombre_operations,
        ROUND(SUM(c.quantite_litres), 0) AS total_litres,
        ROUND(SUM(c.montant_total_usd), 2) AS total_depenses,
        ROUND(AVG(c.prix_usd), 3) AS prix_moyen_litre
      FROM carburant c
      LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
      WHERE c.est_supprime = 0
        AND c.date_operation BETWEEN ? AND ?
      GROUP BY c.id_fournisseur, f.nom_fournisseur
      ORDER BY total_depenses DESC
      LIMIT 5
    `;
    
    const statsFournisseurResult = await queryAsync(statsFournisseurQuery, [
      startDate.format('YYYY-MM-DD HH:mm:ss'),
      endDate.format('YYYY-MM-DD HH:mm:ss')
    ]);
    
    const response = {
      success: true,
      data: {
        periode: {
          debut: startDate.format('YYYY-MM-DD HH:mm:ss'),
          fin: endDate.format('YYYY-MM-DD HH:mm:ss'),
          libelle: periode,
          jours: endDate.diff(startDate, 'days') + 1
        },
        
        // KPI principaux
        kpi: {
          depenses: {
            valeur: parseFloat(kpi.depenses_actuelles),
            valeur_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.depenses_actuelles),
            tendance: calculateVariation(kpi.depenses_actuelles, kpi.depenses_precedentes),
            positif: calculateVariation(kpi.depenses_actuelles, kpi.depenses_precedentes) >= 0,
            valeur_precedente: parseFloat(kpi.depenses_precedentes),
            valeur_precedente_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.depenses_precedentes)
          },
          volume: {
            valeur: parseInt(kpi.volume_actuel),
            valeur_formatee: new Intl.NumberFormat('fr-FR').format(kpi.volume_actuel) + ' L',
            tendance: calculateVariation(kpi.volume_actuel, kpi.volume_precedent),
            positif: calculateVariation(kpi.volume_actuel, kpi.volume_precedent) >= 0,
            valeur_precedente: parseInt(kpi.volume_precedent),
            valeur_precedente_formatee: new Intl.NumberFormat('fr-FR').format(kpi.volume_precedent) + ' L'
          },
          ravitaillements: {
            valeur: parseInt(kpi.ravitaillements_actuels),
            valeur_formatee: new Intl.NumberFormat('fr-FR').format(kpi.ravitaillements_actuels),
            tendance: calculateVariation(kpi.ravitaillements_actuels, kpi.ravitaillements_precedents),
            positif: calculateVariation(kpi.ravitaillements_actuels, kpi.ravitaillements_precedents) >= 0,
            valeur_precedente: parseInt(kpi.ravitaillements_precedents),
            valeur_precedente_formatee: new Intl.NumberFormat('fr-FR').format(kpi.ravitaillements_precedents)
          },
          coutMoyen: {
            valeur: parseFloat(kpi.cout_moyen_actuel),
            valeur_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.cout_moyen_actuel),
            tendance: calculateVariation(kpi.cout_moyen_actuel, kpi.cout_moyen_precedent),
            positif: calculateVariation(kpi.cout_moyen_actuel, kpi.cout_moyen_precedent) >= 0,
            valeur_precedente: parseFloat(kpi.cout_moyen_precedent),
            valeur_precedente_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.cout_moyen_precedent)
          },
          prixMoyenLitre: {
            valeur: parseFloat(kpi.prix_moyen_actuel),
            valeur_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.prix_moyen_actuel) + '/L',
            tendance: calculateVariation(kpi.prix_moyen_actuel, kpi.prix_moyen_precedent),
            positif: calculateVariation(kpi.prix_moyen_actuel, kpi.prix_moyen_precedent) <= 0,
            valeur_precedente: parseFloat(kpi.prix_moyen_precedent),
            valeur_precedente_formatee: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.prix_moyen_precedent) + '/L'
          }
        },
        
        // Évolution mensuelle
        evolution: {
          labels: evolutionResult.map(item => item.mois_label),
          depenses: evolutionResult.map(item => parseFloat(item.depenses_mois)),
          depenses_prec: evolutionResult.map(item => item.depenses_mois_prec ? parseFloat(item.depenses_mois_prec) : null),
          volume: evolutionResult.map(item => parseFloat(item.volume_mois))
        },
        
        // Répartition par carburant
        repartition: repartitionResult.map(item => ({
          id: item.type_carburant,
          name: item.type_carburant,
          volume: item.volume_litres,
          volume_formate: new Intl.NumberFormat('fr-FR').format(item.volume_litres) + ' L',
          montant: item.montant_usd,
          montant_formate: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(item.montant_usd),
          pourcentage: item.pourcentage_volume,
          transactions: item.nombre_transactions,
          tendance: item.tendance_pct,
          tendance_formate: `${item.tendance_pct > 0 ? '+' : ''}${item.tendance_pct}%`,
          tendance_positive: item.tendance_pct >= 0,
          color: getCarburantColor(item.type_carburant)
        })),
        
        // Top véhicules
        topVehicules: topVehiculesResult.map(item => ({
          immatriculation: item.immatriculation,
          vehicule: `${item.marque || ''} ${item.modele || ''}`.trim(),
          litres: item.total_litres,
          litres_formate: new Intl.NumberFormat('fr-FR').format(item.total_litres) + ' L',
          depenses: item.total_depenses,
          depenses_formate: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(item.total_depenses),
          nombre_pleins: item.nombre_pleins,
          consommation: item.consommation_moyenne,
          prix_moyen_litre: item.prix_moyen_litre
        })),
        
        // Analyse journalière
        analyseJournaliere: depensesJournalieresResult.map(item => ({
          ...item,
          depenses_formate: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(item.depenses),
          volume_formate: new Intl.NumberFormat('fr-FR').format(item.volume) + ' L'
        })),
        
        // Statistiques fournisseurs
        topFournisseurs: statsFournisseurResult.map(item => ({
          ...item,
          total_depenses_formate: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(item.total_depenses),
          total_litres_formate: new Intl.NumberFormat('fr-FR').format(item.total_litres) + ' L'
        })),
        
        // Résumé global
        resume: {
          total_litres: parseInt(kpi.volume_actuel),
          total_depenses: parseFloat(kpi.depenses_actuelles),
          nombre_pleins: parseInt(kpi.ravitaillements_actuels),
          cout_moyen_litre: parseFloat((kpi.depenses_actuelles / kpi.volume_actuel).toFixed(3)) || 0,
          cout_moyen_litre_formate: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(kpi.depenses_actuelles / kpi.volume_actuel) + '/L',
          jours_analyse: endDate.diff(startDate, 'days') + 1,
          operations_par_jour: parseFloat((kpi.ravitaillements_actuels / (endDate.diff(startDate, 'days') + 1)).toFixed(1))
        }
      },
      message: "Données du dashboard carburant récupérées avec succès"
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des données carburant :", error);
    return res.status(500).json({
      success: false,
      error: "Erreur interne lors de la récupération des données",
      message: error.message
    });
  }
};

function getCarburantColor(type) {
  const colors = {
    'Diesel': '#3A5FCD',
    'Essence': '#2BA4C6',
    'Sans Plomb': '#FF8C42',
    'Super': '#FF8C42',
    'Gazole': '#3A5FCD',
    'GPL': '#8B5CF6',
    'Gaz': '#8B5CF6',
    'Éthanol': '#10B981',
    'E85': '#10B981',
    'Non défini': '#9CA3AF'
  };
  return colors[type] || '#6B7280';
}