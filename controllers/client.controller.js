const { db } = require("./../config/database");

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

exports.getClients = (req, res) => {

    const q = `
    SELECT 
        client.id_client, client.nom, client.adresse, client.telephone, client.email, provinces.capital, type_client.nom_type
    FROM client
        LEFT JOIN provinces ON client.ville = provinces.id
        LEFT JOIN type_client ON client.id_type_client = type_client.id_type_client
    WHERE client.est_supprime = 0
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
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
            return res.status(400).json({ error: 'Le client existe déjà avec ce nom.' });
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

        return res.json('Processus réussi');
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
                console.error("Erreur lors de la mise à jour de client :", error);
                return res.status(500).json({ error: 'Erreur interne lors de la mise à jour de client' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Client non trouvé' });
            }

            return res.json({ message: 'Client mis à jour avec succès' });
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

    const q = `SELECT * FROM provinces
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