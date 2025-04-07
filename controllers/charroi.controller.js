const { db } = require("./../config/database");
const util = require('util');
const query = util.promisify(db.query).bind(db);

exports.getCatVehicule = (req, res) => {

    const q = `SELECT * FROM cat_vehicule`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getMarque = (req, res) => {

    const q = `SELECT * FROM marque`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


exports.getModele = (req, res) => {
    const { id_marque } = req.query;

    const q = `SELECT * FROM modeles WHERE id_marque = ?`;

    db.query(q, [id_marque], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


exports.getDisposition = (req, res) => {

    const q = `SELECT * FROM disposition_cylindre`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};