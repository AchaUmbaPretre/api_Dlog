const { db } = require("./../config/database");

exports.getGeofences = (req, res) => {
    
    let q = `SELECT * FROM geofences_dlog`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postGeofences = async (req, res) => {
  try {
    const {
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id = null,
      zone_parent_id = null,
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
      (falcon_id, nom_falcon, nom, type_geofence, client_id, zone_parent_id, description, actif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      falcon_id,
      nom_falcon,
      nom,
      type_geofence,
      client_id,
      zone_parent_id,
      description,
      actif,
    ];

    await db.query(query, values);

    return res.status(201).json({
      message: "Geofence ajouté avec succès",
      data: { falcon_id, nom_falcon, nom, type_geofence, client_id, zone_parent_id, actif },
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