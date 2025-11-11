const { db } = require("./../config/database");
const xlsx = require("xlsx");
const fs = require("fs");
const { resolve } = require("path");
const { promisify } = require("util");


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
                f.nom_fournisseur
                FROM carburant c
                LEFT JOIN vehicule_carburant v ON c.id_vehicule = v.id_enregistrement
                LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
                LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
                ORDER BY c.date_operation DESC
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantLimitTen = (req, res) => {
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
            f.nom_fournisseur
        FROM carburant c
        LEFT JOIN vehicule_carburant v ON c.id_vehicule = v.id_enregistrement
        LEFT JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
        LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
        ORDER BY c.id_carburant DESC
        LIMIT 10
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantOne = (req, res) => {
    const { id_vehicule } = req.query;

    const q = `SELECT * FROM carburant WHERE id_vehicule = ?`;

    db.query(q, [id_vehicule], (error, data) => {
        if (error) {
            return res.status(500).send(error);
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
    compteur_km,
    commentaire,
  } = req.body;

  try {
    // ✅ Vérification des champs obligatoires
    if (!id_vehicule || !compteur_km || !quantite_litres) {
      return res.status(400).json({
        error:
          "Les champs 'id_vehicule', 'quantite_litres' et 'compteur_km' sont obligatoires.",
      });
    }

    // Utilisation de promisify pour async/await
    const query = promisify(db.query).bind(db);

    // 1️⃣ Récupération du dernier prix carburant
    const priceResult = await query(`
      SELECT prix_cdf, taux_usd
      FROM prix_carburant
      ORDER BY date_effective DESC, id_prix_carburant DESC
      LIMIT 1
    `);

    if (!priceResult || priceResult.length === 0) {
      return res.status(400).json({
        error: "Aucun prix carburant trouvé. Veuillez le définir dans le panneau admin.",
      });
    }

    let { prix_cdf, taux_usd } = priceResult[0];

    // 2️⃣ Si taux_usd est invalide, récupérer le dernier taux valide
    if (!taux_usd || taux_usd <= 1) {
      const tauxResult = await query(`
        SELECT taux_usd
        FROM prix_carburant
        WHERE taux_usd > 1
        ORDER BY date_effective DESC, id_prix_carburant DESC
        LIMIT 1
      `);
      taux_usd = tauxResult?.[0]?.taux_usd || 2200; // fallback ultime
    }

    // 3️⃣ Dernier compteur du véhicule
    const compteurResult = await query(
      `SELECT compteur_km FROM carburant WHERE id_vehicule = ? ORDER BY date_operation DESC, id_carburant DESC LIMIT 1`,
      [id_vehicule]
    );
    const compteur_precedent = compteurResult?.[0]?.compteur_km || 0;

    // 4️⃣ Calculs automatiques
    const distance_parcourue = compteur_km - compteur_precedent;
    const consommation_100km =
      distance_parcourue > 0
        ? parseFloat(((quantite_litres * 100) / distance_parcourue).toFixed(2))
        : 0;

    const montant_total_cdf = parseFloat((quantite_litres * prix_cdf).toFixed(2));
    const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));
    const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

    // 5️⃣ Insertion dans la base
    const insertQuery = `
      INSERT INTO carburant (
        num_pc,
        num_facture,
        date_operation,
        id_vehicule,
        id_chauffeur,
        quantite_litres,
        prix_cdf,
        prix_usd,
        montant_total_cdf,
        montant_total_usd,
        id_fournisseur,
        compteur_km,
        distance,
        consommation,
        commentaire,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const insertValues = [
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
      compteur_km,
      distance_parcourue,
      consommation_100km,
      commentaire || null,
    ];

    const insertResult = await query(insertQuery, insertValues);

    // 6️⃣ Réponse API
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
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de carburant :", error);
    return res.status(500).json({
      error: "Une erreur s'est produite lors de l'enregistrement du plein de carburant.",
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

    const q = `SELECT * FROM prix_carburant`;

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
        prix_cdf,
        taux_usd
    } = req.body;

    try {
        const q = `INSERT INTO prix_carburant (
                    date_effective,
                    prix_cdf,
                    taux_usd
                ) VALUES (?, ?, ?)`;

                const values = [
                    date_effective,
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