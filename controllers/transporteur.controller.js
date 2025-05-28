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
    const q = `SELECT v.id_ville, v.nom_ville, v.id_province AS id_parent, p.name FROM villes v
INNER JOIN provinces p ON v.id_province = p.id`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.postVille = (req, res) => {
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
                const { nom_ville, id_province } = req.body;

                if (!nom_ville) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                const insertSql = `
                    INSERT INTO villes (
                    nom_ville,
                    id_province
                    ) VALUES (?, ?)
                `
                const values = [
                    nom_ville, 
                    id_province
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
                    message: "La ville a été enregistrée avec succès.",
                    data: { id: insertId }
                });
                });

            } catch (error) {
                connection.rollback(() => {
                connection.release();
                console.error("Erreur pendant la transaction :", error);
                return res.status(500).json({
                    error: error.message || "Une erreur est survenue lors de l'enregistrement.",
                });
                });
            }
        })
    })
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

exports.getLocaliteOne = (req, res) => {
    const { id_localite } = req.query;

    const q = `SELECT l.id_localite, l.nom_localite, l.id_ville  FROM localite l
                    INNER JOIN villes v ON l.id_ville = v.id_ville
                   WHERE l.id_localite = ?`;

    db.query(q, [id_localite], (error, data) => {
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

exports.putLocalite = (req, res) => {
    const { id_localite, nom_localite, id_ville } = req.body;

    if( !id_localite || !nom_localite || !id_ville ) {
        return res.status(400).json({ error: "Champs requis manquants." });
    }

    db.getConnection((connErr, connection) => {
        if(connErr) {
            console.error("Erreur de connexion DB :", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const sql = `
                    UPDATE localite 
                    SET nom_localite = ?, id_ville = ?
                    WHERE id_localite = ?
                `;

                const params = [nom_localite, id_ville, id_localite];

                await queryPromise(connection, sql, params);

                connection.commit((commitErr) => {
                    if (commitErr) {
                        console.error("Erreur lors du commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors du commit." });
                    }
                    return res.status(200).json({ message: "Localité mise à jour avec succès." });
                })

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur lors de la mise à jour :", error);
                    return res.status(500).json({ error: error.message || "Erreur inattendue." });
                });
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

exports.postPays = (req, res) => {
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
                const { nom_pays } = req.body;

                if (!nom_pays) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                const insertSql = `
                    INSERT INTO pays (
                    nom_pays
                    ) VALUES (?)
                `
                const values = [
                    nom_pays
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
                    message: "Le pays a été enregistré avec succès.",
                    data: { id: insertId }
                });
                });

            } catch (error) {
                connection.rollback(() => {
                connection.release();
                console.error("Erreur pendant la transaction :", error);
                return res.status(500).json({
                    error: error.message || "Une erreur est survenue lors de l'enregistrement.",
                });
                });
            }
        })
    })
}

exports.getModeTransport = (req, res) => {
    const q = `SELECT * FROM mode_transport`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTypeTarif = (req, res) => {
    const q = `SELECT * FROM type_tarif`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTransporteur = (req, res) => {
    const q = `SELECT * FROM transporteur`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTrajet = (req, res) => {
    const q = `SELECT 
                    t.id_trajet,
                    CONCAT(l.nom, ' → ', l2.nom) AS depart_destination,
                
                    CONCAT(
                        GROUP_CONCAT(ld.nom ORDER BY s.ordre SEPARATOR ' → '),
                        ' → ',
                        (
                        SELECT lz.nom
                        FROM segment_trajet st
                        JOIN localisation lz ON lz.id_localisation = st.id_destination
                        WHERE st.id_trajet = t.id_trajet
                        ORDER BY st.ordre DESC
                        LIMIT 1
                        )
                    ) AS itineraire_complet,
                    MIN(s.date_depart) AS date_depart,
                    MAX(s.date_arrivee) AS date_arrivee,
                    SUM(s.distance_km) AS distance,
                    SUM(s.prix) AS total,

                    GROUP_CONCAT(DISTINCT mt.nom_mode ORDER BY mt.nom_mode SEPARATOR ', ') AS modes_transport,
                    
                    DATEDIFF(MAX(s.date_arrivee), MIN(s.date_depart)) + 1 AS duree_jours

                FROM trajets t

                    JOIN segment_trajet s ON t.id_trajet = s.id_trajet
                    JOIN localisation l ON t.id_depart = l.id_localisation
                    JOIN localisation l2 ON t.id_arrive = l2.id_localisation
                    JOIN localisation ld ON ld.id_localisation = s.id_depart
                    JOIN mode_transport mt ON s.mode_transport = mt.id_mode_transport

                    GROUP BY t.id_trajet, l.nom, l2.nom;
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTrajetOneV = (req, res) => {
    const { id_trajet } = req.query;

    if(!id_trajet) {
        return res.status(400).json({error: "L'identifiant de la trajet est requis"})
    }

    const q = 
        `
         SELECT t.id_trajet, t.id_depart, t.id_arrive, t.user_cr, s.*
                FROM trajets t
                    JOIN segment_trajet s ON t.id_trajet = s.id_trajet
                    WHERE s.id_trajet = ?
                `;

    db.query(q, [id_trajet], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTrajetOne = (req, res) => {
    const { id_trajet } = req.query;

    const q = `SELECT 
                    t.id_trajet,
                    CONCAT(l.nom, ' → ', l2.nom) AS depart_destination,
                
                    CONCAT(
                        GROUP_CONCAT(ld.nom ORDER BY s.ordre SEPARATOR ' → '),
                        ' → ',
                        (
                        SELECT lz.nom
                        FROM segment_trajet st
                        JOIN localisation lz ON lz.id_localisation = st.id_destination
                        WHERE st.id_trajet = t.id_trajet
                        ORDER BY st.ordre DESC
                        LIMIT 1
                        )
                    ) AS itineraire_complet,
                    MIN(s.date_depart) AS date_depart,
                    MAX(s.date_arrivee) AS date_arrivee,
                    SUM(s.distance_km) AS distance,
                    SUM(s.prix) AS total,

                    GROUP_CONCAT(DISTINCT mt.nom_mode ORDER BY mt.nom_mode SEPARATOR ', ') AS modes_transport,
                    
                    DATEDIFF(MAX(s.date_arrivee), MIN(s.date_depart)) + 1 AS duree_jours

                FROM trajets t

                    JOIN segment_trajet s ON t.id_trajet = s.id_trajet
                    JOIN localisation l ON s.id_depart = l.id_localisation
                    JOIN localisation l2 ON s.id_destination = l2.id_localisation
                    JOIN localisation ld ON ld.id_localisation = s.id_depart
                    JOIN mode_transport mt ON s.mode_transport = mt.id_mode_transport
                    WHERE s.id_trajet = ?
                    GROUP BY s.id_segment
                `;

    db.query(q, [id_trajet], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.postTrajet = (req, res) => {
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
                const { id_depart, id_arrive, user_cr, segment } = req.body;
                
                if (!id_depart || !id_arrive) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                if (!Array.isArray(segment) || segment.length === 0) {
                    throw new Error("Au moins un segment est requis.");
                }

                segment.forEach((s, index) => {
                    if (!s.ordre || !s.id_depart || !s.id_arrive || !s.date_depart || !s.date_arrivee) {
                        throw new Error(`Données incomplètes pour le segment ${index + 1}.`);
                    }
                });

                const insertSql = `
                    INSERT INTO trajets (
                    id_depart,
                    id_arrive,
                    user_cr
                    ) VALUES (?, ?, ?)
                `
                const values = [
                    id_depart,
                    id_arrive,
                    user_cr
                ]

                const [insertResult] = await queryPromise(connection, insertSql, values);
                const insertId = insertResult.insertId;

                const insertSegmentSql = `
                    INSERT INTO segment_trajet (
                    id_trajet,
                    ordre,
                    id_depart,
                    id_destination,
                    date_depart,
                    date_arrivee,
                    distance_km,
                    mode_transport,
                    prix
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `
                await Promise.all(segment.map((seg) =>
                    queryPromise(connection, insertSegmentSql, [insertId, seg.ordre, seg.id_depart, seg.id_arrive, seg.date_depart, seg.date_arrivee, seg.distance_km, seg.mode_transport, seg.prix ])
                ))

            connection.commit((commitErr) => {
                connection.release();
                if (commitErr) {
                    console.error("Erreur commit :", commitErr);
                    return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
                }

                return res.status(201).json({
                    message: "Trajet enregistré avec succès.",
                    data: { id: insertId }
                });
 
            });

            } catch (error) {
                connection.rollback(() => {
                connection.release();
                console.error("Erreur pendant la transaction :", error);
                return res.status(500).json({
                    error: error.message || "Une erreur est survenue lors de l'enregistrement.",
                });
                });
            }
        })
    })
}

exports.putTrajet = (req, res) => {
    const { id_trajet } = req.query;

    if (!id_trajet) {
        return res.status(400).json({ error: "L'identifiant du trajet est requis." });
    }

    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur de connexion DB : ", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if (trxErr) {
                connection.release();
                console.error("Erreur transaction : ", trxErr);
                return res.status(500).json({ error: "Impossible de démarrer la transaction." });
            }

            try {
                const { id_depart, id_arrive, user_cr, segment } = req.body;

                if (!id_depart || !id_arrive) {
                    throw new Error("Champs obligatoires manquants.");
                }

                if (!Array.isArray(segment) || segment.length === 0) {
                    throw new Error("Au moins un segment est requis.");
                }

                segment.forEach((s, index) => {
                    if (!s.ordre || !s.id_depart || !s.id_arrive || !s.date_depart || !s.date_arrivee) {
                        throw new Error(`Données incomplètes pour le segment ${index + 1}.`);
                    }
                });

                const updateTrajetSql = `
                    UPDATE trajets
                    SET id_depart = ?, id_arrive = ?, user_cr = ?
                    WHERE id_trajet = ?
                `;
                await queryPromise(connection, updateTrajetSql, [id_depart, id_arrive, user_cr, id_trajet]);

                // Suppression des anciens segments du trajet
                const deleteSegmentSql = `DELETE FROM segment_trajet WHERE id_trajet = ?`;
                await queryPromise(connection, deleteSegmentSql, [id_trajet]);

                // Insertion des nouveaux segments
                const insertSegmentSql = `
                    INSERT INTO segment_trajet (
                        id_trajet,
                        ordre,
                        id_depart,
                        id_destination,
                        date_depart,
                        date_arrivee,
                        distance_km,
                        mode_transport,
                        prix
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await Promise.all(segment.map((seg) =>
                    queryPromise(connection, insertSegmentSql, [
                        id_trajet,
                        seg.ordre,
                        seg.id_depart,
                        seg.id_arrive,
                        seg.date_depart,
                        seg.date_arrivee,
                        seg.distance_km,
                        seg.mode_transport,
                        seg.prix
                    ])
                ));

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
                    }

                    return res.status(200).json({
                        message: "Trajet mis à jour avec succès.",
                        data: { id: id_trajet }
                    });
                });

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur pendant la transaction :", error);
                    return res.status(500).json({
                        error: error.message || "Une erreur est survenue lors de la mise à jour.",
                    });
                });
            }
        });
    });
};
