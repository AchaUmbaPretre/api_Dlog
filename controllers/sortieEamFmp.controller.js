const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

exports.getSortieEam = (req, res) => {
    const q = `
        SELECT 
            s.*,
            COUNT(*) AS total_sorties,
            MAX(s.transanction_date) AS last_transaction_date
        FROM sortie_eam s
        GROUP BY s.part, s.smr_ref
        ORDER BY last_transaction_date DESC
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

}