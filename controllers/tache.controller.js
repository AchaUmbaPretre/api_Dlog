const { db } = require("./../config/database");

exports.getTacheCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
        SELECT 
            COUNT(id_tache) AS nbre_tache
        FROM tache
        `;

    const params = [];

    if (searchValue) {
        q += ` AND (nom_tache LIKE ?)`;
        params.push(`%${searchValue}%`, `%${searchValue}%`);
    }
     
    db.query(q, params, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getTache = (req, res) => {

    const q = `SELECT 
    tache.id_tache, 
    tache.description, 
    tache.date_debut, 
    tache.date_fin,
    tache.nom_tache, 
    typeC.nom_type_statut AS statut, 
    client.nom AS nom_client, 
    frequence.nom AS frequence, 
    utilisateur.nom AS owner, 
    provinces.name AS ville, 
    COALESCE(departement.nom_departement, dp_ac.nom_departement) AS departement, 
    cb.controle_de_base,
    cb.id_controle,
    DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
FROM 
    tache
    INNER JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    INNER JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    INNER JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_de_base ON client.id_client = controle_de_base.id_client
    LEFT JOIN departement ON utilisateur.id_utilisateur = departement.responsable
    INNER JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    INNER JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
GROUP BY 
    tache.id_tache;
`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTacheOne = (req, res) => {
    const {id_tache} = req.query;

    const q = `
        SELECT tache.*
            FROM tache 
        WHERE tache.id_tache =${id_tache}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getTacheControleOne = (req, res) => {
    const {id_controle} = req.query;

    const q = `
        SELECT 
    tache.id_tache, 
    tache.description, 
    tache.date_debut, 
    tache.date_fin,
    tache.nom_tache, 
    typeC.nom_type_statut AS statut, 
    client.nom AS nom_client, 
    frequence.nom AS frequence, 
    utilisateur.nom AS owner, 
    provinces.name AS ville, 
    COALESCE(departement.nom_departement, dp_ac.nom_departement) AS departement, 
    cb.controle_de_base,
    cb.id_controle,
    DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
FROM 
    tache
    INNER JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    INNER JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    INNER JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_de_base ON client.id_client = controle_de_base.id_client
    LEFT JOIN departement ON utilisateur.id_utilisateur = departement.responsable
    INNER JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    INNER JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
    WHERE cb.id_controle = ${id_controle}
GROUP BY 
    tache.id_tache
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postTache = async (req, res) => {
    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_client`, `id_frequence`,`id_control`, `id_point_supervision`, `responsable_principal`, `id_ville`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_control,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_ville,
            req.body.doc
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putTache = async (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }

    try {
        const q = `
            UPDATE tache 
            SET 
                nom_tache = ?,
                description = ?,
                statut = ?,
                date_debut = ?,
                date_fin = ?,
                priorite = ?,
                id_frequence = ?,
                id_control = ?,
                id_point_supervision = ?,
                responsable_principal
            WHERE id_departement = ?
        `;
      
        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_frequence,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            id_tache
        ];

        const [result] = await db.query(q, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department record not found' });
        }

        return res.json({ message: 'Tache record updated successfully' });
    } catch (err) {
        console.error("Error updating department:", err);
        return res.status(500).json({ error: 'Failed to update department record' });
    }
}

exports.deleteTache = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM tache WHERE id_tache = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }


  //Tacha personne
exports.getTachePersonne = (req, res) => {

    const q = `SELECT * FROM tache_personne`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postTachePersonnne = async (req, res) => {
    try {
        const q = 'INSERT INTO tache_personne(`id_user`, `id_tache`, `date_assigne`) VALUES(?,?,?)';

        const values = [
            req.body.id_user ,
            req.body.id_tache,
            req.body.date_assigne
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Tâche personne ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.postTacheDoc = async (req, res) => {
    const { id_tache, nom_document, type_document } = req.body;

    const chemin_document = req.file.path.replace(/\\/g, '/');

    if (!chemin_document || !nom_document || !type_document || !id_tache) {
        return res.status(400).json({ message: 'Some required fields are missing' });
    }

    const query = `INSERT INTO tache_documents (id_tache, nom_document, type_document, chemin_document)
                   VALUES (?, ?, ?, ?)`;

    db.query(query, [id_tache, nom_document, type_document, chemin_document], (err, result) => {
      if (err) {
        console.error('Error inserting document:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      res.status(200).json({ message: 'Document added successfully', documentId: result.insertId });
    });
};

exports.deleteTachePersonne = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM tache_personne WHERE id_tache_personne = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }