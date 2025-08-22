const util = require('util'); // Importer util
const { db } = require("./../config/database");

const query = util.promisify(db.query).bind(db);

exports.getControleCount = (req, res) => {
    
    let q = `
    SELECT COUNT(id_controle) AS nbre_controle
    FROM controle_de_base 
    WHERE est_supprime = 0
    `;

    db.query(q,(error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getControle = (req, res) => {

    const q = `
            SELECT 
            c.id_departement,
            c.controle_de_base, 
            c.id_controle,
            d.nom_departement AS departement, 
            format.nom_format AS format, 
            client.nom AS nom_client, 
            frequence.nom AS frequence, 
            utilisateur.nom AS responsable 
        FROM controle_de_base AS c
            INNER JOIN departement AS d ON c.id_departement = d.id_departement
            INNER JOIN format ON c.id_format = format.id_format
            INNER JOIN controle_client AS cl ON c.id_controle = cl.id_controle
            INNER JOIN client ON cl.id_client = client.id_client
            INNER JOIN frequence ON c.id_frequence = frequence.id_frequence
            INNER JOIN controle_responsable AS cr ON c.id_controle = cr.id_controle
            LEFT JOIN utilisateur ON cr.id_responsable = utilisateur.id_utilisateur
        WHERE c.est_supprime = 0;

    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getControleOne = (req, res) => {
    const {id_controle} = req.query;

    const q = `
        SELECT c.*, cl.id_client, utilisateur.id_utilisateur AS responsable FROM controle_de_base AS c
INNER JOIN controle_client AS cl ON c.id_controle = cl.id_controle
INNER JOIN controle_responsable AS cr ON c.id_controle = cr.id_controle
LEFT JOIN utilisateur ON cr.id_responsable = utilisateur.id_utilisateur
        WHERE c.est_supprime = 0 AND c.id_controle =${id_controle}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postControle = async (req, res) => {
    const { id_departement, id_format, controle_de_base, id_frequence, id_client, responsable } = req.body;

    if (!id_departement || !id_format || !controle_de_base || !id_frequence || !id_client || id_client.length === 0 || !responsable || responsable.length === 0) {
        return res.status(400).json({ error: 'Tous les champs sont requis. Il doit y avoir au moins un client et un responsable.' });
    }

    const controleQuery = `
        INSERT INTO controle_de_base 
        (id_departement, id_format, controle_de_base, id_frequence) 
        VALUES (?, ?, ?, ?)
    `;

    const clientQuery = `
        INSERT INTO controle_client 
        (id_controle, id_client) 
        VALUES (?, ?)
    `;

    const responsableQuery = `
        INSERT INTO controle_responsable 
        (id_controle, id_responsable) 
        VALUES (?, ?)
    `;

    try {
        // Insérer le contrôle de base
        const result = await query(controleQuery, [id_departement, id_format, controle_de_base, id_frequence]);
        const controleId = result.insertId;

        // Insérer les clients associés au contrôle
        await Promise.all(id_client.map((clientId) => {
            return query(clientQuery, [controleId, clientId]);
        }));

        // Insérer les responsables associés au contrôle
        await Promise.all(responsable.map((responsable) => {
            return query(responsableQuery, [controleId, responsable]);
        }));

        res.status(200).json({ message: 'Contrôle ajouté avec succès avec plusieurs clients et responsables.' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du contrôle :', error);
        res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du contrôle." });
    }
}; 

exports.putControle = async (req, res) => {
    const { id_controle } = req.query;
    const { id_departement, id_format, controle_de_base, id_frequence, id_client, responsable } = req.body;

    if (!id_controle || isNaN(id_controle)) {
        return res.status(400).json({ error: 'ID de contrôle invalide fourni' });
    }

    if (!id_departement || !id_format || !controle_de_base || !id_frequence || !id_client || !responsable) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Convertir en tableau si ce n'est pas déjà un tableau
    const clientArray = Array.isArray(id_client) ? id_client : [id_client];
    const responsableArray = Array.isArray(responsable) ? responsable : [responsable];

    const updateControleQuery = `
        UPDATE controle_de_base 
        SET id_departement = ?, id_format = ?, controle_de_base = ?, id_frequence = ?
        WHERE id_controle = ?
    `;

    const deleteClientQuery = `DELETE FROM controle_client WHERE id_controle = ?`;
    const insertClientQuery = `INSERT INTO controle_client (id_controle, id_client) VALUES (?, ?)`;

    const deleteResponsableQuery = `DELETE FROM controle_responsable WHERE id_controle = ?`;
    const insertResponsableQuery = `INSERT INTO controle_responsable (id_controle, id_responsable) VALUES (?, ?)`;

    try {
        // Mettre à jour le contrôle de base
        await query(updateControleQuery, [id_departement, id_format, controle_de_base, id_frequence, id_controle]);

        // Supprimer les anciens clients associés au contrôle
        await query(deleteClientQuery, [id_controle]);

        // Insérer les nouveaux clients associés au contrôle
        await Promise.all(clientArray.map((clientId) => {
            return query(insertClientQuery, [id_controle, clientId]);
        }));

        // Supprimer les anciens responsables associés au contrôle
        await query(deleteResponsableQuery, [id_controle]);

        // Insérer les nouveaux responsables associés au contrôle
        await Promise.all(responsableArray.map((responsableId) => {
            return query(insertResponsableQuery, [id_controle, responsableId]);
        }));

        res.status(200).json({ message: 'Contrôle mis à jour avec succès avec plusieurs clients et responsables.' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du contrôle :', error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la mise à jour du contrôle." });
    }
};

/* exports.putControle = async (req, res) => {
    const {id_controle} = req.query;
    const { id_departement, id_format, controle_de_base, id_frequence, responsable } = req.body;

    if (!id_controle || isNaN(id_controle)) {
        return res.status(400).json({ error: 'ID de contrôle invalide fourni' });
    }

    if (!id_departement || !id_format || !controle_de_base || !id_frequence || !responsable) {
        return res.status(400).json({ error: 'Tous les champs requis doivent être fournis.' });
    }

    const query = `
        UPDATE controle_de_base 
        SET 
            id_departement = ?,
            id_format = ?,
            controle_de_base = ?,
            id_frequence = ?
        WHERE id_controle = ?
    `;

    const values = [id_departement, id_format, controle_de_base, id_frequence, id_controle];

    try {
        db.query(query, values, (error, data)=>{

            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Controle record not found' });
            }
            return res.json({ message: 'Enregistrement de contrôle mis à jour avec succès' });
        })
    } catch (error) {
        console.error("Erreur lors de la mise à jour du contrôle :", error);
        return res.status(500).json({ error: 'Échec de la mise à jour de l\'enregistrement de contrôle' });
    }
}; */

exports.deleteUpdatedControle = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE controle_de_base SET est_supprime = 1 WHERE id_controle = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
  };

exports.deleteControle = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM controle_de_base WHERE id_controle = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  };