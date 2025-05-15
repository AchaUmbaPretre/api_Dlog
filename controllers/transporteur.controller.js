const { db } = require("./../config/database");

// 📦 Petite helper function pour convertir mysql en Promises
function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }

exports.getLocalisation = (req, res) => {
    const q = `SELECT * FROM localisation`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.postLocalisation = (req, res) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur connexion DB :", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if (trxErr) {
                connection.release();
                console.error("Erreur transaction :", trxErr);
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const { id_loc, nom, type_loc, id_parent, niveau } = req.body;

                if (!nom || !type_loc || !id_parent || !niveau) {
                    throw new Error("Certains champs obligatoires sont manquants ou invalides.");
                }

                const insertQuery = `
                    INSERT INTO localisation (id_loc, nom, type_loc, id_parent, niveau)
                    VALUES (?, ?, ?, ?, ?)
                `;
                const values = [id_loc, nom, type_loc, id_parent, niveau];

                const [mainResult] = await queryPromise(connection, insertQuery, values);
                const insertLocalisationId = mainResult.insertId;

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation des données." });
                    }

                    return res.status(201).json({
                        message: "Localisation enregistrée avec succès.",
                        data: { id: insertLocalisationId }
                    });
                });

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur transactionnelle :", error);
                    return res.status(500).json({
                        error: error.message || "Erreur inattendue lors du traitement."
                    });
                });
            }
        });
    });
};

//Type de localisation
exports.getTypeLocalisation = (req, res) => {
    const q = `SELECT * FROM type_localisation`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getCommune = (req, res) => {
    const q = `SELECT * FROM commune`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getVille = (req, res) => {
    const q = `SELECT * FROM villes`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getLocalite = (req, res) => {
    const q = `SELECT * FROM localite`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getSiteLoc = (req, res) => {
    const q = `SELECT * FROM site_loc`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}


exports.getPays = (req, res) => {
    const q = `SELECT * FROM pays`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}