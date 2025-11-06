const { db } = require("./../config/database");
const xlsx = require("xlsx");
const fs = require("fs");

exports.getCarburant = (req, res) => {

    const q = `SELECT c.id_carburant, 
                c.num_pc, 
                c.num_facture, 
                c.date_operation, 
                c.quantite_litres, 
                c.prix_unitaire, 
                c.montant_total, 
                c.compteur_km, 
                c.distance, 
                c.consommation,
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
            c.prix_unitaire, 
            c.montant_total, 
            c.compteur_km, 
            c.distance, 
            c.consommation,
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
    prix_unitaire,
    montant_total,
    id_fournisseur,
    compteur_km,
    distance,
    consommation
  } = req.body;

  try {
    const q = `
      INSERT INTO carburant (
        num_pc,
        num_facture,
        date_operation,
        id_vehicule,
        id_chauffeur,
        quantite_litres,
        prix_unitaire,
        montant_total,
        id_fournisseur,
        compteur_km,
        distance,
        consommation
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      num_pc,
      num_facture,
      date_operation,
      id_vehicule,
      id_chauffeur,
      quantite_litres,
      prix_unitaire,
      montant_total,
      id_fournisseur,
      compteur_km,
      distance,
      consommation
    ];

    await db.query(q, values);

    return res.status(201).json({ message: 'Carburant ajouté avec succès' });
  } catch (error) {
    console.error("Erreur lors de l'ajout de carburant :", error);
    return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de carburant." });
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


