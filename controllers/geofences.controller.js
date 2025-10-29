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

