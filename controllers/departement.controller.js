const { db } = require("./../config/database");

exports.getDepartementCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
        SELECT 
            COUNT(id_client) AS nbre_client
        FROM departement
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

exports.getDepartement = (req, res) => {

    const q = `
    SELECT 
        departement.*
    FROM departement
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDepartementOne = (req, res) => {
    const {id_departement} = req.query;

    const q = `
        SELECT departement.*
            FROM departement 
        WHERE departement.id_departement =${id_departement}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postDepartement = async (req, res) => {
    try {
        const checkDeparteQuery = 'SELECT COUNT(*) AS count FROM departement WHERE nom_departement = ?';
        const checkCodeQuery = 'SELECT COUNT(*) AS count FROM departement WHERE code = ?';
        const insertDeparteQuery = 'INSERT INTO departement(`nom_departement`, `description`, `code`, `responsable`, `telephone`, `email`) VALUES(?,?,?,?,?,?)';

        const { nom_departement, description, responsable, telephone, email } = req.body;

        if (!nom_departement ) {
            return res.status(400).json({ error: 'Tous les champs requis doivent être fournis.' });
        }

        const [departeCheckResult] = await new Promise((resolve, reject) => {
            db.query(checkDeparteQuery, [nom_departement], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        const count = departeCheckResult.count;
        if (count > 0) {
            return res.status(400).json({ error: 'Un département existe déjà avec ce nom.' });
        }

        let newId = await new Promise((resolve, reject) => {
            db.query('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_NAME = "departement"', (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0].AUTO_INCREMENT);
                }
            });
        });

        let code;
        let unique = false;

        while (!unique) {
            code = String(newId).padStart(4, '0');

            const [codeCheckResult] = await new Promise((resolve, reject) => {
                db.query(checkCodeQuery, [code], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });

            if (codeCheckResult.count === 0) {
                unique = true;
            } else {
                // Incrémenter l'ID pour générer un nouveau code
                newId++;
            }
        }

        // Insertion du nouveau département avec le code généré
        await new Promise((resolve, reject) => {
            db.query(insertDeparteQuery, [nom_departement, description, code, responsable, telephone, email], (error, results) => {
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
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du département." });
    }
};

exports.putDepartement = async (req, res) => {
    const { id_departement } = req.query;
    const { nom_departement, description, code, responsable, telephone, email } = req.body;

    if (!id_departement || isNaN(id_departement)) {
        return res.status(400).json({ error: 'Invalid department ID provided' });
    }

    try {
        const q = `
            UPDATE departement 
            SET 
                nom_departement = ?,
                description = ?,
                code = ?,
                responsable = ?,
                telephone = ?,
                email = ?
            WHERE id_departement = ?
        `;
      
        const values = [nom_departement, description, code, responsable, telephone, email, id_departement];

        const [result] = await db.query(q, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department record not found' });
        }

        return res.json({ message: 'Department record updated successfully' });
    } catch (err) {
        console.error("Error updating department:", err);
        return res.status(500).json({ error: 'Failed to update department record' });
    }
}

exports.deleteDepartement = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM departement WHERE id_departement = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }