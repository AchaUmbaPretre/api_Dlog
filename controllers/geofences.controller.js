const { db } = require("./../config/database");

exports.getGeofences = (req, res) => {
    
    let q = `SELECT * FROM geofences_dlog`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postGeofences = async (req, res) => {
    const { falcon_id, nom_falcon, nom, type_geofence, client_id, zone_parent_id, description, actif } = req.body;

    try {
        const q = 'INSERT INTO geofences_dlog(`falcon_id`, `nom_falcon`, `nom`, `type_geofence`, `client_id`, `zone_parent_id`, `description`, `actif`) VALUES(?,?,?,?,?,?,?,?)';

        const values = [
            falcon_id, 
            nom_falcon, 
            nom, 
            type_geofence, 
            client_id, 
            zone_parent_id, 
            description, 
            actif
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Projet ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};