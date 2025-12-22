const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

exports.getSortieEam = (req, res) => {
    const q = `
        SELECT * FROM sortie_eam
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

}