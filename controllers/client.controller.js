const { db } = require("./../config/database");

// ðŸ“¦ Petite helper function pour convertir mysql en Promises
function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }

exports.getClientId = (req, res) => {

    const q = `SELECT c.id_client FROM client AS c`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getClientCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
    SELECT COUNT(id_client) AS nbre_client
    FROM client 
    WHERE est_supprime = 0
    `;

    const params = [];

    if (searchValue) {
        q += ` AND (nom_client LIKE ?)`;
        params.push(`%${searchValue}%`, `%${searchValue}%`);
    }
     
    db.query(q, params, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

// Version simplifiée utilisant le middleware tenantFilter
exports.getClients = (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    
    let q;
    let params = [];
    
    if (isSuperAdmin) {
        // Super Admin voit TOUS les clients
        q = `
            SELECT 
                c.id_client, 
                c.nom, 
                c.adresse, 
                c.telephone, 
                c.email, 
                c.tenant_id,
                p.capital as province_nom,
                tc.nom_type as type_client_nom
            FROM client c
            LEFT JOIN provinces p ON c.ville = p.id
            LEFT JOIN type_client tc ON c.id_type_client = tc.id_type_client
            ORDER BY c.nom ASC
        `;
    } else if (tenantId) {
        // Admin ou User voit uniquement les clients de son tenant
        q = `
            SELECT 
                c.id_client, 
                c.nom, 
                c.adresse, 
                c.telephone, 
                c.email, 
                c.tenant_id,
                p.capital as province_nom,
                tc.nom_type as type_client_nom
            FROM client c
            LEFT JOIN provinces p ON c.ville = p.id
            LEFT JOIN type_client tc ON c.id_type_client = tc.id_type_client
            WHERE c.tenant_id = ?
            ORDER BY c.nom ASC
        `;
        params = [tenantId];
    } else {
        return res.status(200).json([]);
    }
    
    db.query(q, params, (error, data) => {
        if (error) {
            console.error('Erreur getClients:', error);
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getClientPermission = (req, res) => {
    const { userId } = req.query; // VÃ©rifiez si vous recevez bien userId dans req.query

    if (!userId) {
        return res.status(400).json({ message: "L'ID utilisateur est requis." });
    }

    const query = `
        SELECT 
            client.id_client, client.nom, client.adresse, client.telephone, client.email, 
            provinces.capital, type_client.nom_type
        FROM client
        LEFT JOIN provinces ON client.ville = provinces.id
        LEFT JOIN type_client ON client.id_type_client = type_client.id_type_client
        LEFT JOIN user_client uc ON client.id_client = uc.id_client
        WHERE client.est_supprime = 0 
        AND uc.can_view = 1 
        AND uc.id_user = ?;
    `;

    db.query(query, [userId], (error, data) => {
        if (error) {
            console.error("Erreur lors de la rÃ©cupÃ©ration des clients :", error);
            return res.status(500).json({ message: "Erreur serveur", error });
        }
        return res.status(200).json(data);
    });
};

exports.getClientResume = (req, res) => {

    const q = `
        SELECT 
            COUNT(CASE WHEN client.id_type_client = 1 THEN 1 END) AS Externe,
            COUNT(CASE WHEN client.id_type_client = 2 THEN 1 END) AS Interne,
            COUNT(DISTINCT client.id_client) AS nbre_client
        FROM client
        LEFT JOIN type_client tc ON client.id_type_client = tc.id_type_client
        WHERE client.est_supprime = 0
        GROUP BY tc.id_type_client
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getClientOne = (req, res) => {
    const id_client = req.query.id_client;
    const q = `
        SELECT client.*
            FROM client 
        WHERE est_supprime = 0 AND client.id_client =${id_client}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postClient = async (req, res) => {
    try {
        const checkClientQuery = 'SELECT COUNT(*) AS count FROM client WHERE nom = ?';
        const insertClientQuery = 'INSERT INTO client(`nom`, `adresse`, `ville`, `pays`, `telephone`, `email`, `id_type_client`) VALUES(?,?,?,?,?,?,?)';

        const { nom, telephone, adresse, ville, pays, email, id_type_client } = req.body;  // Ajout de `pays` ici

        const clientCheckResult = await new Promise((resolve, reject) => {
            db.query(checkClientQuery, [nom], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        const count = clientCheckResult[0].count;
        if (count > 0) {
            return res.status(400).json({ error: 'Le client existe dÃ©jÃ  avec ce nom.' });
        }

        await new Promise((resolve, reject) => {
            db.query(insertClientQuery, [nom, adresse, ville, pays, telephone, email, id_type_client], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        return res.json('Processus rÃ©ussi');
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du client." });
    }
};

exports.putClient = async (req, res) => {
    const { id_client } = req.query;
    const { nom, adresse, ville, pays, email, id_type_client } = req.body;

    if (!id_client || isNaN(id_client)) {
        return res.status(400).json({ error: 'Invalid client ID provided' });
    }

    try {

        const q = `
            UPDATE client 
            SET 
                nom = ?,
                adresse = ?,
                ville = ?,
                pays = ?,
                email = ?,
                id_type_client = ?
            WHERE id_client = ?
        `;
      
        const values = [nom, adresse, ville, pays, email,id_type_client, id_client];

        db.query(q, values, (error, result) => {
            if (error) {
                console.error("Erreur lors de la mise Ã  jour de client :", error);
                return res.status(500).json({ error: 'Erreur interne lors de la mise Ã  jour de client' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Client non trouvÃ©' });
            }

            return res.json({ message: 'Client mis Ã  jour avec succÃ¨s' });
        });
    } catch (err) {
        console.error("Error updating client:", err);
        return res.status(500).json({ error: 'Failed to update client record' });
    }
}

exports.deleteUpdatedClient = (req, res) => {
    const { id } = req.query;
  
    const q = "UPDATE client SET est_supprime = 1 WHERE id_client = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
  }

exports.deleteClient = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM client WHERE id_client = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }



exports.getProvince = (req, res) => {

    const q = `SELECT p.id, p.name, p.capital, p.id_pays AS id_parent, pays.nom_pays FROM provinces p
                INNER JOIN pays ON pays.id_pays = p.id_pays
    `;
    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProvinceOne = (req, res) => {
    const {id} = req.query;

    const q = `SELECT * FROM provinces WHERE id = ?`;
    
    db.query(q, [id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProvinceClientOne = (req, res) => {
    const {id_client} = req.query;

    const q = `SELECT p.* FROM provinces p
                    INNER JOIN declaration_super ds ON ds.id_ville = p.id
                    WHERE ds.id_client = ?
                    GROUP BY p.id`;
    
    db.query(q, [id_client], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProvinceClient = (req, res) => {

    const q = `SELECT p.* FROM provinces p
                    INNER JOIN declaration_super ds ON ds.id_ville = p.id
                    WHERE ds.id_ville = p.id
                    GROUP BY p.id
                `;
    
    db.query(q , (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postProvince = (req, res) => {
    db.getConnection((connErr, connection) => {
        if(connErr) {
            console.error("Erreur de connexion DB : ", connErr)
            return res.status(500).json({ error: "Connexion Ã  la base de donnÃ©es Ã©chouÃ©e." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                console.error("Erreur transaction : ", trxErr)
                return res.status(500).json({ error: "Impossible de dÃ©marrer la transaction." });
            }

            try {
                const { name, code_ville, id_pays } = req.body;

                if (!id_pays) {
                    throw new Error("Champs obligatoires manquants.");   
                }

                const insertSql = `
                    INSERT INTO provinces (
                    name,
                    code_ville,
                    id_pays
                    ) VALUES (?, ?, ?)
                `
                const values = [
                    name,
                    code_ville,
                    id_pays
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
                    message: "La province a Ã©tÃ© enregistrÃ©e avec succÃ¨s.",
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

exports.getClientType = (req, res) => {

    const q = `SELECT * FROM type_client
    `;
    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};