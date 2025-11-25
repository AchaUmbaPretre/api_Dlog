const { db } = require("./../config/database");
const xlsx = require("xlsx");
const fs = require("fs");
const { resolve } = require("path");
const { promisify } = require("util");
const query = promisify(db.query).bind(db);


//Vehicule carburant
exports.getVehiculeCarburant = (req, res) => {

    const q = `SELECT 
                *
                FROM vehicule_carburant
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postVehiculeCarburant = async (req, res) => {
  const { nom_marque, nom_modele, num_serie, immatriculation } = req.body;

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
          (id_enregistrement, nom_marque, nom_modele, num_serie, immatriculation)
          VALUES (?, ?, ?, ?, ?)
        `;
        const values = [nextId, nom_marque, nom_modele, num_serie, immatriculation];

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
exports.getCarburant = (req, res) => {

    const q = `SELECT c.id_carburant, 
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
                v.id_enregistrement,
                v.nom_marque,
                v.nom_modele,
                v.immatriculation,
                ch.nom AS nom_chauffeur,
                ch.prenom AS prenom,
                f.nom_fournisseur,
                cv.abreviation
                FROM carburant c
                LEFT JOIN vehicule_carburant v ON c.id_vehicule = v.id_enregistrement
                LEFT JOIN vehicules ve ON c.id_vehicule = ve.id_carburant_vehicule
                LEFT JOIN cat_vehicule cv ON ve.id_cat_vehicule = cv.id_cat_vehicule
                LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
                LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
                ORDER BY c.date_operation DESC;
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantLimitTen = (req, res) => {
  const { id_vehicule } = req.query;

  // Déclaration des variables pour le WHERE dynamique
  const where = [];
  const params = [];

  if (id_vehicule) {
    where.push("c.id_vehicule = ?");
    params.push(id_vehicule);
  }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

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
        v.id_enregistrement,
        v.nom_marque,
        v.nom_modele,
        v.immatriculation,
        ch.nom AS nom_chauffeur,
        ch.prenom AS prenom,
        f.nom_fournisseur,
        c.id_vehicule
    FROM carburant c
    LEFT JOIN vehicule_carburant v ON c.id_vehicule = v.id_enregistrement
    LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
    LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
    ${whereClause}
    ORDER BY c.id_carburant DESC
    LIMIT 10
  `;

  db.query(q, params, (error, data) => {
    if (error) {
      return res.status(500).json({ message: "Erreur SQL", error: error.sqlMessage });
    }
    return res.status(200).json(data);
  });
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

    const q = `SELECT * FROM carburant ${whereClause}`;

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


exports.postCarburant = async (req, res) => {
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
    force
  } = req.body;

  try {
    if (!id_vehicule || !compteur_km || !quantite_litres) {
      return res.status(400).json({
        error: "Les champs 'id_vehicule', 'quantite_litres' et 'compteur_km' sont obligatoires.",
      });
    }

    // 1️⃣ Prix carburant le plus récent
    const priceResult = await query(`
      SELECT prix_cdf, taux_usd
      FROM prix_carburant
      ORDER BY date_effective DESC, id_prix_carburant DESC
      LIMIT 1
    `);
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

    // 2️⃣ Dernier compteur du véhicule
    const [lastCarburant] = await query(
      `SELECT compteur_km, date_operation
       FROM carburant
       WHERE id_vehicule = ?
       ORDER BY date_operation DESC, id_carburant DESC
       LIMIT 1`,
      [id_vehicule]
    );
    const compteur_precedent = lastCarburant?.compteur_km || 0;

    // 3️⃣ Infos du véhicule + catégorie
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

    // 4️⃣ Calculs
    const distance_parcourue = compteur_km - compteur_precedent;
    const consommation_100km =
      distance_parcourue > 0
        ? parseFloat(((quantite_litres * 100) / distance_parcourue).toFixed(2))
        : 0;

    const montant_total_cdf = parseFloat((quantite_litres * prix_cdf).toFixed(2));
    const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));
    const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

    // 5️⃣ Alertes dynamiques
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
        message: `Quantité (${quantite_litres} L) supérieure à la capacité du réservoir (${capacite_max} L).`,
        niveau: "Critical",
      });
    }

    if (lastCarburant && new Date(date_operation) < new Date(lastCarburant.date_operation)) {
      alertes.push({
        type_alerte: "Date incohérente",
        message: `La date du plein (${date_operation}) est antérieure au dernier plein (${lastCarburant.date_operation}).`,
        niveau: "Warning",
      });
    }

    if (distance_parcourue <= 0) {
      alertes.push({
        type_alerte: "Distance nulle ou négative",
        message: `Distance calculée (${distance_parcourue} km) incohérente.`,
        niveau: "Critical",
      });
    }

    if (distance_parcourue > 1000) {
      alertes.push({
        type_alerte: "Distance excessive",
        message: `Distance inhabituelle (${distance_parcourue} km) entre deux pleins.`,
        niveau: "Warning",
      });
    }

    // 6️⃣ Seuils de consommation par catégorie
    let minConso = 5, maxConso = 80;
    switch (cat_abrev) {
      case "SUV": // Voitures
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
        message: `Consommation ${consommation_100km} L/100km hors norme pour catégorie ${cat_nom} (${minConso}-${maxConso}).`,
        niveau: "Warning",
      });
    }

    // 7. Si alerte critique → option : bloquer l’enregistrement
    const alerteCritique = alertes.find((a) => a.niveau === "Critical");

      // Seules les autres alertes critiques bloquent — pas KM incohérent si force=1
      if (
        alerteCritique &&
        !(compteur_precedent > 0 && compteur_km < compteur_precedent && force)
      ) {
        return res.status(400).json({
          error: "Données incohérentes détectées.",
          alertes: alertes,
        });
      }


    // 8️. Enregistrement du plein
    const insertResult = await query(
      `INSERT INTO carburant (
        num_pc, num_facture, date_operation, id_vehicule, id_chauffeur,
        quantite_litres, prix_cdf, prix_usd, montant_total_cdf, montant_total_usd,
        id_fournisseur, id_type_carburant, compteur_km, distance, consommation, commentaire, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
    return res.status(201).json({
      message: "✅ Plein carburant enregistré avec succès.",
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
        details_alertes: alertes,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de carburant :", error);
    return res.status(500).json({
      error: `"Une erreur s'est produite lors de l'enregistrement du plein de carburant." ${error}`,
    });
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

      console.log("DATE ORIGINE:", rawDate, "→ CONVERTIE:", date_operation);

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

    const q = `
        SELECT 
        * 
        FROM 
            prix_carburant
        ORDER BY date_effective DESC LIMIT 1
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
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
  try {
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ message: "Période requise" });
    }

    // === 1️⃣ Résumé global ===
    const resume = await query(`
      SELECT 
        COUNT(*) AS total_pleins,
        SUM(quantite_litres) AS total_litres,
        SUM(montant_total_cdf) AS total_cdf,
        SUM(montant_total_usd) AS total_usd,
        ROUND(AVG(consommation), 2) AS conso_moyenne
      FROM carburant
      WHERE date_operation BETWEEN ? AND ?
    `, [date_debut, date_fin]);

    // === 2️⃣ Détails par véhicule ===
    const parVehicule = await query(`
      SELECT 
        vc.immatriculation,
        vc.nom_marque,
        SUM(c.quantite_litres) AS total_litres,
        SUM(c.montant_total_cdf) AS total_cdf,
        SUM(c.montant_total_usd) AS total_usd,
        ROUND(AVG(c.consommation), 2) AS conso_moyenne
      FROM carburant c
      JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement
      WHERE c.date_operation BETWEEN ? AND ?
      GROUP BY vc.id_enregistrement
      ORDER BY MAX(c.date_operation) DESC
    `, [date_debut, date_fin]);

    // === 3️⃣ Coût hebdomadaire ===
    const coutHebdo = await query(`
      SELECT 
          YEARWEEK(date_operation, 1) AS semaine,
          COALESCE(SUM(montant_total_cdf), 0) AS total_cdf,
          COALESCE(SUM(montant_total_usd), 0) AS total_usd
      FROM carburant
      WHERE date_operation BETWEEN ? AND ?
      GROUP BY YEARWEEK(date_operation, 1)
      ORDER BY semaine ASC

    `, [date_debut, date_fin]);

    // === 4️⃣ Répartition par catégorie de véhicule ===
    const repartition = await query(`
      SELECT 
        cat.abreviation,
        SUM(c.quantite_litres) AS total_litres
      FROM carburant c
      JOIN vehicule_carburant vc ON vc.id_enregistrement = c.id_vehicule
      JOIN vehicules v ON v.id_carburant_vehicule = vc.id_enregistrement
      JOIN cat_vehicule cat ON cat.id_cat_vehicule = v.id_cat_vehicule
      GROUP BY cat.id_cat_vehicule
    `, [date_debut, date_fin]);

    // === 5️⃣ Alertes depuis alertes_charroi ===
    const alertes = await query(`
      SELECT 
        a.id_alerte,
        vc.immatriculation,
        a.type_alerte,
        a.message,
        a.niveau,
        a.status,
        a.created_at
      FROM alertes_charroi a
      JOIN vehicule_carburant vc ON vc.id_enregistrement = a.vehicule_id
      WHERE a.created_at BETWEEN ? AND ?
      ORDER BY a.created_at DESC
      LIMIT 10
    `, [date_debut, date_fin]);

    // === 6️⃣ Retour JSON complet ===
    return res.status(200).json({
      periode: { date_debut, date_fin },
      resume: resume[0],
      graphiques: { parVehicule, coutHebdo, repartition },
      detailVehicules: parVehicule,
      alertes
    });

  } catch (error) {
    console.error("Erreur rapportCarburantAll :", error);
    res.status(500).json(error);
  }
};

exports.rapportCarburantConsomGen = async (req, res) => {
  try {
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

    // 1. MES DETAILS SIEGE KIN
    const sqlDetailSiegeKin = await query(`
      SELECT 
        c.id_carburant,
        vc.immatriculation, 
        vc.id_enregistrement, 
        vc.nom_marque, 
        vc.nom_modele, 
        ch.nom AS chauffeur_nom, 
        ch.prenom AS chauffeur_prenom, 
        s.nom_site, 
        s.id_site, 
        tc.nom_type_carburant,
        COUNT(DISTINCT vc.id_enregistrement) AS nbre_vehicule,
        COUNT(c.id_carburant) AS total_pleins,
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        LEFT JOIN sites s ON sv.id_site = s.id_site 
        LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
      WHERE s.id_site = 1
      AND ${periodFilter}
      GROUP BY vc.id_enregistrement
    `);

    //2. VEHICULE INFO
      const sqlVehiculeInfo = await query(`
      SELECT 
        c.id_carburant,
        vc.immatriculation, 
        vc.id_enregistrement, 
        vc.nom_marque, 
        vc.nom_modele, 
        ch.nom AS chauffeur_nom, 
        ch.prenom AS chauffeur_prenom, 
        s.nom_site, 
        s.id_site, 
        tc.nom_type_carburant,
        COUNT(DISTINCT vc.id_enregistrement) AS nbre_vehicule,
        COUNT(c.id_carburant) AS total_pleins,
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        LEFT JOIN sites s ON sv.id_site = s.id_site 
        LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
        WHERE ${periodFilter}
      GROUP BY vc.id_enregistrement
    `);

    // 3. MES SIETES KIN TYPE CARBURANT 
    const sqlSiegeKinTypeCarburant = await query(`
      SELECT 
        tc.nom_type_carburant,
        COUNT(DISTINCT vc.id_enregistrement) AS nbre_vehicule,
        COUNT(c.id_carburant) AS total_pleins,
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        LEFT JOIN sites s ON sv.id_site = s.id_site 
      WHERE s.id_site = 1 AND ${periodFilter}
      GROUP BY s.id_site, v.id_type_carburant
    `);

    // 4. MES SITES (GROUP BY SITE)
    const sqlMesSites = await query(`
      SELECT 
        s.nom_site, 
        s.id_site, 
        COUNT(DISTINCT vc.id_enregistrement) AS nbre_vehicule,
        COUNT(c.id_carburant) AS total_pleins,
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        INNER JOIN sites s ON sv.id_site = s.id_site 
      WHERE ${periodFilter}
      GROUP BY s.id_site
    `);

    const sqlSitesAll = await query(`
      SELECT 
        s.nom_site, 
        s.id_site,
        p.name AS province,
        z.NomZone AS zone,
        COUNT(DISTINCT vc.id_enregistrement) AS nbre_vehicule,
        COUNT(c.id_carburant) AS total_pleins,
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        INNER JOIN sites s ON sv.id_site = s.id_site 
        LEFT JOIN zones z ON s.IdZone = z.id
        LEFT JOIN provinces p ON s.IdVille = p.id
      WHERE ${periodFilter}
      GROUP BY s.id_site
    `);

    const sqlConsomTypeCarburant = await query(`
      SELECT
        YEAR(c.date_operation) AS annee,
        MONTH(c.date_operation) AS mois,
        SUM(c.quantite_litres) AS total_conso,
        tc.nom_type_carburant
      FROM
          carburant c
          LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement
          LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule
          INNER JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
        WHERE
          YEAR(c.date_operation) = YEAR(CURDATE()) AND ${periodFilter}  -- Filtre pour l'année en cours
        GROUP BY
          YEAR(c.date_operation),
          MONTH(c.date_operation),
          v.id_type_carburant,
          tc.nom_type_carburant
        ORDER BY
          annee DESC, mois DESC
      `);

    const sqlConsomYearTypeCarburant = await query(`
      SELECT
          YEAR(c.date_operation) AS annee,
          SUM(c.quantite_litres) AS total_conso,
          tc.nom_type_carburant
        FROM
            carburant c
            LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement
            LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule
            INNER JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant
          WHERE
            YEAR(c.date_operation) = YEAR(CURDATE()) AND ${periodFilter}  -- Filtre pour l'année en cours
          GROUP BY
            YEAR(c.date_operation),
            v.id_type_carburant,
            tc.nom_type_carburant
          ORDER BY
            annee DESC
    `);

    return res.status(200).json({
      sqlDetailSiegeKin,
      sqlVehiculeInfo,
      sqlMesSites,
      sqlSitesAll,
      sqlSiegeKinTypeCarburant,
      sqlConsomTypeCarburant,
      sqlConsomYearTypeCarburant
    });

  } catch (error) {
    console.error("Erreur rapportCarburant :", error);
    res.status(500).json(error);
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
  const { month, id_vehicule, id_site, date_start, date_end, cat } = req.query;

  // Validation
  if (!month && !(date_start && date_end)) {
    return res.status(400).json({
      message: "Vous devez fournir 'month' ou bien 'date_start' et 'date_end'.",
    });
  }

  // Construction dynamique du WHERE
  const where = [];
  const params = [];

  // Filtre mensuel si pas de période
  if (month && !(date_start && date_end)) {
    where.push("DATE_FORMAT(c.date_operation, '%Y-%m') = ?");
    params.push(month);
  }

  // Filtre période
  if (date_start && date_end) {
    where.push("DATE(c.date_operation) BETWEEN ? AND ?");
    params.push(date_start, date_end);
  }

  // Catégorie
  if (cat) {
    where.push("cat.id_cat_vehicule = ?");
    params.push(cat);
  }

  // Véhicule
  if (id_vehicule) {
    where.push("c.id_vehicule = ?");
    params.push(id_vehicule);
  }

  // Site
  if (id_site) {
    where.push("s.id_site = ?");
    params.push(id_site);
  }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  // 🔥 Requête SQL corrigée
  const q = `
    SELECT 
      DATE(c.date_operation) AS date_jour,
      COUNT(c.id_carburant) AS total_pleins,
      SUM(c.compteur_km) AS total_kilometrage,
      SUM(c.quantite_litres) AS total_litres,
      SUM(c.consommation) AS total_consom,
      SUM(c.distance) AS total_distance,
      SUM(c.montant_total_cdf) AS total_total_cdf,
      SUM(c.montant_total_usd) AS total_total_usd
    FROM carburant c
      LEFT JOIN vehicule_carburant vc ON vc.id_enregistrement = c.id_vehicule
      LEFT JOIN vehicules v ON v.id_carburant_vehicule = vc.id_enregistrement
      LEFT JOIN cat_vehicule cat ON cat.id_cat_vehicule = v.id_cat_vehicule
      LEFT JOIN sites_vehicule sv ON sv.id_vehicule = v.id_vehicule
      LEFT JOIN sites s ON s.id_site = sv.id_site
      LEFT JOIN type_carburant tc ON tc.id_type_carburant = v.id_type_carburant
    ${whereClause}
    GROUP BY date_jour
    ORDER BY date_jour
  `;

  db.query(q, params, (error, data) => {
    if (error) {
      return res.status(500).json({
        message: "Erreur SQL lors de la récupération",
        error: error.sqlMessage,
      });
    }

    if (!data || !data.length) {
      return res.status(404).json({
        message: "Aucune donnée trouvée pour les paramètres fournis.",
      });
    }

    res.status(200).json(data);
  });
};

exports.getRapportVehiculePeriode = (req, res) => {
  let { period, vehicule, site, cat } = req.body;

  try {
    if (typeof period === "string") {
      period = JSON.parse(period);
    }
  } catch (e) {
    return res.status(400).json({ message: "Format 'period' invalide" });
  }

  let months = [];
  let years = [];

  if (period?.mois?.length) {
    months = period.mois.map(Number);
  }

  if (period?.annees?.length) {
    years = period.annees.map(Number);
  }

  // Base WHERE
  let where = "WHERE 1=1";
  let params = [];

  if (vehicule && Array.isArray(vehicule) && vehicule.length > 0 ) {
    const escapedVehicules = vehicule.map(c => db.escape(c)).join(',');
    where += ` AND c.id_vehicule IN (${escapedVehicules})`;
    params.push(escapedVehicules);
  }

  if (site && Array.isArray(site) && site.length > 0) {
      const escapedSites = site.map(s => db.escape(s)).join(',');
      where += ` AND s.id_site IN (${escapedSites})`;
  }

  if (cat && Array.isArray(cat) && cat.length > 0) {
      const escapedSites = cat.map(s => db.escape(s)).join(',');
      where += ` AND cat.id_cat_vehicule IN (${escapedSites})`;
  }

  // Filtres mois
  if (Array.isArray(months) && months.length > 0) {
    const escapedMonths = months.map(m => db.escape(m)).join(",");
    where += ` AND MONTH(c.date_operation) IN (${escapedMonths})`;
  }

  // Filtres années
  if (Array.isArray(years) && years.length > 0) {
    const escapedYears = years.map(y => db.escape(y)).join(",");
    where += ` AND YEAR(c.date_operation) IN (${escapedYears})`;
  }

  // Requête finale
  const q = `
SELECT 
        vc.nom_marque,
        vc.immatriculation,
        c.id_vehicule,
        cat.nom_cat,
        MONTH(c.date_operation) AS Mois,
        YEAR(c.date_operation) AS Année,
        COUNT(c.id_carburant) AS total_pleins, 
        SUM(c.compteur_km) AS total_kilometrage, 
        SUM(c.quantite_litres) AS total_litres, 
        SUM(c.consommation) AS total_consom, 
        SUM(c.distance) AS total_distance, 
        SUM(c.montant_total_cdf) AS total_total_cdf, 
        SUM(c.montant_total_usd) AS total_total_usd 
      FROM carburant c 
        LEFT JOIN vehicule_carburant vc ON c.id_vehicule = vc.id_enregistrement 
        LEFT JOIN vehicules v ON vc.id_enregistrement = v.id_carburant_vehicule 
        LEFT JOIN cat_vehicule cat ON v.id_cat_vehicule = cat.id_cat_vehicule
        LEFT JOIN sites_vehicule sv ON v.id_vehicule = sv.id_vehicule 
        LEFT JOIN sites s ON sv.id_site = s.id_site 
        LEFT JOIN type_carburant tc ON v.id_type_carburant = tc.id_type_carburant 
        ${where}
      GROUP BY c.id_vehicule, cat.id_cat_vehicule, MONTH(c.date_operation), YEAR(c.date_operation)
      ORDER BY MONTH(c.date_operation);
    `;

  db.query(q, params, (error, data) => {
    if (error) {
      console.error("Erreur SQL", error);
      return res.status(500).json({
        message: "Erreur lors de la récupération",
        error: error.sqlMessage,
      });
    }

    if (!data.length) {
      return res.status(404).json({
        message: "Aucune donnée trouvée pour les paramètres fournis.",
      });
    }

    return res.status(200).json(data);
  });
};