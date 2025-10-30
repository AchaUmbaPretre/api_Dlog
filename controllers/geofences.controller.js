const util = require('util');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);
const dotenv = require('dotenv');
dotenv.config();
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Exécution chaque jour à minuit (24h)
const INTERVAL_MS = 1 * 60 * 1000; // toutes les 5 minutes

const fetchAndSyncGeofences = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "falconeyesolutions.com",
      port: 80,
      path: `/api/get_geofences?lang=fr&user_api_hash=${process.env.api_hash}`,
      method: "GET",
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = "";

      proxyRes.on("data", (chunk) => {
        data += chunk;
      });

      proxyRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.items || !parsed.items.geofences) {
            return reject(new Error("Format de données invalide"));
          }

          const geofences = parsed.items.geofences;
          const insertQuery = `
            INSERT INTO geofences (
              id_geofence, name, coordinates, polygon_color, type, speed_limit, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              coordinates = VALUES(coordinates),
              polygon_color = VALUES(polygon_color),
              type = VALUES(type),
              speed_limit = VALUES(speed_limit),
              created_at = VALUES(created_at),
              updated_at = VALUES(updated_at)
          `;

          let count = 0;
          geofences.forEach((g) => {
            let coords;
            try {
              coords = JSON.parse(g.coordinates);
            } catch {
              coords = [];
            }

            db.query(
              insertQuery,
              [
                g.id,
                g.name,
                JSON.stringify(coords),
                g.polygon_color || null,
                g.type || null,
                g.speed_limit || null,
                g.created_at || null,
                g.updated_at || null,
              ],
              (err) => {
                if (err) console.error("Erreur insertion/màj:", err);
                else count++;
              }
            );
          });

          resolve(`✅ ${count} geofences synchronisées.`);
        } catch (e) {
          reject(e);
        }
      });
    });

    proxyReq.on("error", (err) => reject(err));
    proxyReq.end();
  });
};

setInterval(() => {
  fetchAndSyncGeofences()
    .then((msg) => console.log("[AutoSync]", msg))
    .catch((err) => console.error("[AutoSync] Erreur:", err.message));
}, INTERVAL_MS);

// Lancer une première synchro au démarrage
fetchAndSyncGeofences()
  .then((msg) => console.log("[InitSync]", msg))
  .catch((err) => console.error("[InitSync] Erreur:", err.message));

exports.getCatGeofences = (req, res) => {
    
    let q = `SELECT * FROM catgeofence`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getGeofencesFalcon = (req, res) => {
    
    let q = `SELECT * FROM geofences`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};


exports.getGeofencesDlog = (req, res) => {
    
    let q = `SELECT 
                gd.*,
                cat.nom_catGeofence,
                c.nom AS nom_client,
                d.nom_destination
                FROM geofences_dlog gd
                INNER JOIN catgeofence cat ON cat.id_catGeofence = gd.type_geofence
                LEFT JOIN client c ON c.id_client = gd.client_id
                LEFT JOIN destination d ON d.id_destination = gd.destination_id
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getGeofencesDlogOne = async (req, res) => {
  try {
    const { id_geo_dlog } = req.query;

    // ✅ Validation des paramètres
    if (!id_geo_dlog) {
      return res.status(400).json({
        error: "Le paramètre 'id_geo_dlog' est obligatoire.",
      });
    }

    const query = `
      SELECT *
      FROM geofences_dlog AS gd
      WHERE gd.id_geo_dlog = ?
      LIMIT 1
    `;

    // 🔹 Exécution de la requête avec promise
    const [data] = await db.promise().query(query, [id_geo_dlog]);

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: `Aucun geofence trouvé avec l'id_geo_dlog = ${id_geo_dlog}.`,
      });
    }

    // ✅ Réponse réussie
    return res.status(200).json({
      message: "Geofence récupéré avec succès.",
      data: data[0],
    });
  } catch (error) {
    console.error("❌ Erreur getGeofencesDlogOne:", error);
    return res.status(500).json({
      error: "Une erreur est survenue lors de la récupération du geofence.",
      details: error.message,
    });
  }
};

exports.postGeofences = async (req, res) => {

  try {
    const {
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id = null,
      destination_id = null,
      description = null,
      actif = 0,
    } = req.body;

    // Validation de base
    if (!falcon_id || !nom_falcon || !nom || !type_geofence) {
      return res
        .status(400)
        .json({ error: "Les champs obligatoires sont manquants." });
    }

    const query = `
      INSERT INTO geofences_dlog
      (falcon_id, nom_falcon, nom, type_geofence, client_id, destination_id, description, actif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id,
      destination_id,
      description,
      actif,
    ];

    await db.query(query, values);

    return res.status(201).json({
      message: "✅ Geofence ajouté avec succès",
      data: {
        falcon_id,
        nom_falcon,
        nom,
        type_geofence,
        client_id,
        description,
        actif,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du geofence:", error);
    return res.status(500).json({
      error: "Une erreur s'est produite lors de l'ajout du geofence.",
      details: error.message,
    });
  }
};

exports.updateGeofences = async (req, res) => {
  try {
    const {
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id = null,
      destination_id = null,
      description = null,
      actif = 0,
    } = req.body;

    // Vérification du falcon_id
    if (!falcon_id) {
      return res.status(400).json({ error: "Le falcon_id est obligatoire." });
    }

    // Validation des champs obligatoires
    if (!nom_falcon || !nom || !type_geofence) {
      return res.status(400).json({
        error: "Les champs nom_falcon, nom et type_geofence sont obligatoires.",
      });
    }

    const updateQuery = `
      UPDATE geofences_dlog
      SET nom_falcon = ?, 
          nom = ?, 
          type_geofence = ?, 
          client_id = ?, 
          destination_id = ?, 
          description = ?,
          actif = ?, 
          update_at = CURRENT_TIMESTAMP
      WHERE falcon_id = ?
    `;

    const values = [
      nom_falcon,
      nom,
      type_geofence,
      client_id,
      destination_id,
      description,
      actif,
      falcon_id
    ];

    const query = util.promisify(db.query).bind(db);
    const result = await query(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Aucun geofence trouvé avec ce falcon_id." });
    }

    return res.status(200).json({
      message: "Geofence mis à jour avec succès.",
      data: {
        falcon_id,
        nom_falcon,
        nom,
        type_geofence,
        client_id,
        destination_id,
        description,
        actif,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du geofence:", error);
    return res.status(500).json({
      error: "Une erreur s'est produite lors de la mise à jour du geofence.",
      details: error.message,
    });
  }
};

