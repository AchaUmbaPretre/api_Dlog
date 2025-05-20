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
    const q = `SELECT 
                    l.*,
                    COALESCE(
                        pr.name,
                        pro.name,
                        vl.nom_ville,
                        pa.nom_pays
                    	) AS parent

                    FROM localisation l
                    
                    LEFT JOIN provinces pr ON l.type_loc = 'ville' AND l.id_parent = pr.id
                    LEFT JOIN provinces pro ON l.type_loc = 'commune' AND l.id_parent = pro.id
                    LEFT JOIN villes vl ON l.type_loc = 'localité' AND l.id_parent = vl.id_ville
                    LEFT JOIN pays pa ON l.type_loc = 'province' AND l.id_parent = pa.id_pays
                    
                    ORDER BY l.niveau ASC
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getLocalisationOne = (req, res) => {
    const { id_localisation } = req.query;

    const q = `SELECT 
                    l.*,
                    COALESCE(
                        pr.name,
                        pro.name,
                        vl.nom_ville,
                        pa.nom_pays
                    	) AS parent

                    FROM localisation l
                    
                    LEFT JOIN provinces pr ON l.type_loc = 'ville' AND l.id_parent = pr.id
                    LEFT JOIN provinces pro ON l.type_loc = 'commune' AND l.id_parent = pro.id
                    LEFT JOIN villes vl ON l.type_loc = 'localité' AND l.id_parent = vl.id_ville
                    LEFT JOIN pays pa ON l.type_loc = 'province' AND l.id_parent = pa.id_pays
                    WHERE l.id_localisation = ?
                    ORDER BY l.niveau ASC
                `;

    db.query(q, [id_localisation], (error, data) => {
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
                const { nom, type_loc, id_parent, commentaire } = req.body;

                if (!type_loc || !nom) {
                    throw new Error("Certains champs obligatoires sont manquants ou invalides.");
                }

                let niveau;
                switch (type_loc) {
                    case 'pays':
                        niveau = 0;
                        break;
                    case 'province':
                        niveau = 1;
                        break;
                    case 'ville':
                        niveau = 2;
                        break;
                    case 'commune':
                        niveau = 2;
                        break;
                    case 'localité':
                        niveau = 3;
                        break;
                    case 'site':
                        niveau = 4;
                        break;
                    default:
                        throw new Error("Type de localisation inconnu.");
                }

                const insertQuery = `
                    INSERT INTO localisation (nom, type_loc, id_parent, commentaire, niveau)
                    VALUES (?, ?, ?, ?, ?)
                `;
                const values = [nom, type_loc, id_parent, commentaire, niveau];

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

exports.putLocalisation = (req, res) => {
    const { id_localisation, nom, type_loc, id_parent, commentaire } = req.body;

    if (!id_localisation || !nom || !type_loc) {
        return res.status(400).json({ error: "Champs requis manquants." });
    }

    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur de connexion DB :", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if (trxErr) {
                connection.release();
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const sql = `
                    UPDATE localisation 
                    SET nom = ?, type_loc = ?, id_parent = ?, commentaire = ? 
                    WHERE id_localisation = ?
                `;
                const params = [nom, type_loc, id_parent || null, commentaire || null, id_localisation];

                await queryPromise(connection, sql, params);

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur lors du commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors du commit." });
                    }
                    return res.status(200).json({ message: "Localisation mise à jour avec succès." });
                });
            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur lors de la mise à jour :", error);
                    return res.status(500).json({ error: error.message || "Erreur inattendue." });
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
    const q = `SELECT c.id_commune, c.nom_commune, c.id_province AS id_parent  FROM commune c`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getVille = (req, res) => {
    const q = `SELECT v.id_ville, v.nom_ville, v.id_province AS id_parent FROM villes v`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getLocalite = (req, res) => {
    const q = `SELECT l.id_localite, l.nom_localite, l.id_ville AS id_parent, v.nom_ville FROM localite l
                    INNER JOIN villes v ON l.id_ville = v.id_ville`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.postLocalite = (req, res) => {
    db.getConnection((connErr, connection) => {
        if(connErr) {
            console.error("Erreur de connexion DB : ", connErr)
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                console.error("Erreur transaction : ", trxErr)
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const { nom_localite, id_ville } = req.body;

                if (!nom_localite || !id_ville) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                const insertSql = `
                    INSERT INTO localite (
                    nom_localite, id_ville
                    ) VALUES (?, ?)
                `
                const values = [
                    nom_localite,
                    id_ville
                ]

                const [insertResult] = await queryPromise(connection, insertSql, values);
                const insertId = insertResult.insertId;

            connection.commit((commitErr) => {
                connection.release();
                if (commitErr) {
                    console.error("Erreur commit :", commitErr);
                    return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
                }

                return res.status(201).json({
                    message: "Localité enregistrée avec succès.",
                    data: { id: insertId }
                });
                });

            } catch (error) {
                
            }
        })
    })
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