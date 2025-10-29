const { db } = require("./../config/database");

exports.getGeofences = (req, res) => {
    
    let q = `SELECT * FROM geofences_dlog`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postGeofences = async (req, res) => {
  const {
    falcon_id,
    nom_falcon,
    nom,
    type_geofence,
    client_id,
    zone_parent_id,
    description,
    actif,
  } = req.body;

  try {
    // 1. Validation des champs requis
    if (!falcon_id || !nom_falcon || !type_geofence) {
      return res.status(400).json({
        error: "Les champs 'falcon_id', 'nom_falcon' et 'type_geofence' sont obligatoires.",
      });
    }

    //2. Vérifier si cette geofence Falcon existe déjà
    const [existing] = await db.query(
      "SELECT id FROM geofences_dlog WHERE falcon_id = ? LIMIT 1",
      [falcon_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Cette geofence existe déjà dans la base DLOG.",
      });
    }

    //3. Insertion dans la base
    const q = `
      INSERT INTO geofences_dlog (
        falcon_id,
        nom_falcon,
        nom,
        type_geofence,
        client_id,
        zone_parent_id,
        description,
        actif,
        date_sync
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      falcon_id,
      nom_falcon,
      nom || nom_falcon,
      type_geofence,
      client_id || null,
      zone_parent_id || null,
      description || null,
      actif ?? 1,
    ];

    await db.query(q, values);

    //4. Réponse claire
    return res.status(201).json({
      message: "✅ Geofence ajoutée avec succès dans DLOG.",
      data: {
        falcon_id,
        nom_falcon,
        nom_personnalise: nom || nom_falcon,
        type_geofence,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de l’ajout de la geofence:", error);
    return res.status(500).json({
      error: "Une erreur s'est produite lors de l'ajout de la geofence.",
      details: error.message,
    });
  }
};
