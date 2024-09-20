const { db } = require("./../config/database");

exports.getEquipement = (req, res) => {

    const q = `
                SELECT * FROM equipments
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getEquipement = (req, res) => {

    const q = `
                SELECT * FROM equipments
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};