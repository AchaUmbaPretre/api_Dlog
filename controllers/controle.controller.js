const { db } = require("./../config/database");

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
}

exports.getControle = (req, res) => {

    const q = `
    SELECT 
        c.id_departement,
        c.controle_de_base, 
        c.id_controle,
        d.nom_departement AS departement, 
        format.nom_format AS format, 
        client.nom 	AS nom_client, frequence.nom AS frequence, 
        utilisateur.nom AS responsable 
    FROM controle_de_base AS c
        INNER JOIN departement AS d ON c.id_departement = d.id_departement
        INNER JOIN format ON c.id_format = format.id_format
        INNER JOIN client ON c.id_client = client.id_client
        INNER JOIN frequence ON c.id_frequence = frequence.id_frequence
        INNER JOIN utilisateur ON c.responsable = utilisateur.id_utilisateur
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
        SELECT *
            FROM controle_de_base 
        WHERE est_supprime = 0 AND id_controle =${id_controle}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postControle = async (req, res) => {
    const { id_departement, id_client, id_format, controle_de_base, id_frequence, responsable } = req.body; 

    if (!id_departement || !id_client || !id_format || !controle_de_base || !id_frequence || !responsable) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const query = `
        INSERT INTO controle_de_base 
        (id_departement, id_client, id_format, controle_de_base, id_frequence, responsable) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.query(query, [id_departement, id_client, id_format, controle_de_base, id_frequence, responsable]);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de contrôle :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du contrôle." });
    }
};


exports.putControle = async (req, res) => {
    const { id_controle, id_departement, id_client, id_format, controle_de_base, id_frequence, responsable } = req.body;

    if (!id_controle || isNaN(id_controle)) {
        return res.status(400).json({ error: 'ID de contrôle invalide fourni' });
    }

    if (!id_departement || !id_client || !id_format || !controle_de_base || !id_frequence || !responsable) {
        return res.status(400).json({ error: 'Tous les champs requis doivent être fournis.' });
    }

    const query = `
        UPDATE controle_de_base 
        SET 
            id_departement = ?,
            id_client = ?,
            id_format = ?,
            controle_de_base = ?,
            id_frequence = ?,
            responsable = ?
        WHERE id_controle = ?
    `;

    const values = [id_departement, id_client, id_format, controle_de_base, id_frequence, responsable, id_controle];

    try {
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Enregistrement de contrôle non trouvé' });
        }

        return res.json({ message: 'Enregistrement de contrôle mis à jour avec succès' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du contrôle :", error);
        return res.status(500).json({ error: 'Échec de la mise à jour de l\'enregistrement de contrôle' });
    }
};


exports.deleteControle = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM controle_de_base WHERE id_controle = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }