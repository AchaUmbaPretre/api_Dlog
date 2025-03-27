const { db } = require("./../config/database");

exports.getRapport = (req, res) => {

    const q = `SELECT * FROM rapport_special`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.getRapportOne = (req, res) => {
    const { rapport } = req.query;

    const q = `SELECT * FROM rapport_special WHERE 	id_rapport_special = ?`

    db.query(q, [rapport], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}