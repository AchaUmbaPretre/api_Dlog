const { db } = require("./../config/database");

exports.getGeofences = (req, res) => {
    
    let q = `SELECT * FROM geofences_dlog`;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}
