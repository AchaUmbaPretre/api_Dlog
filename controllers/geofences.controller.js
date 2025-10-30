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
    
    let q = `SELECT * FROM geofences_dlog`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postGeofences = async (req, res) => {
  console.log(req.body);

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
    const { id_geo_dlog } = req.query;
    const {
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id = null,
      zone_parent_id = null,
      description = null,
      latitude,
      longitude,
      actif = 0,
    } = req.body;

    // Vérification de l'ID
    if (!id_geo_dlog) {
      return res.status(400).json({ error: "L'identifiant du geofence est requis." });
    }

    // Validation des champs obligatoires
    if (!falcon_id || !nom_falcon || !nom || !type_geofence) {
      return res.status(400).json({
        error: "Les champs falcon_id, nom_falcon, nom et type_geofence sont obligatoires.",
      });
    }

    const query = `
      UPDATE geofences_dlog
      SET falcon_id = ?, 
          nom_falcon = ?, 
          nom = ?, 
          type_geofence = ?, 
          client_id = ?, 
          zone_parent_id = ?, 
          description = ?, 
          latitude = ?,
          longitude = ?,
          actif = ?, 
          update_at = CURRENT_TIMESTAMP
      WHERE id_geo_dlog = ?
    `;

    const values = [
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id,
      zone_parent_id,
      description,
      latitude,
      longitude,
      actif,
      id_geo_dlog,
    ];

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Aucun geofence trouvé avec cet identifiant." });
    }

    return res.status(200).json({
      message: "Geofence mis à jour avec succès.",
      data: {
        id_geo_dlog,
        falcon_id,
        nom_falcon,
        nom,
        type_geofence,
        client_id,
        zone_parent_id,
        description,
        latitude,
        longitude,
        rayon_metre,
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