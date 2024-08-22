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

    const q = `SELECT tache.id_tache, tache.description, tache.date_debut, tache.date_fin,tache.nom_tache, typeC.nom_type_statut AS statut, client.nom AS nom_client, frequence.nom AS frequence, utilisateur.nom AS owner, provinces.name AS ville FROM tache
                    INNER JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
                    INNER JOIN client ON tache.id_client = client.id_client
                    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
                    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
                    INNER JOIN provinces ON tache.id_ville = provinces.id
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

exports.postTache = async (req, res) => {
    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_client`, `id_frequence`, `id_point_supervision`, `responsable_principal`, `id_ville`) VALUES(?,?,?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_ville
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