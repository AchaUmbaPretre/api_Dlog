const { db } = require("./../config/database");

exports.getTacheCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
        SELECT 
            COUNT(id_tache) AS nbre_tache
        FROM tache
            WHERE est_supprime = 0
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

    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    WHERE 
        tache.est_supprime = 0 `;

    // Ajout de conditions dynamiques pour les filtres
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    query += ` GROUP BY tache.id_tache ORDER BY tache.date_creation DESC;`;

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getAllTache = (req, res) => {
    const { id_tache } = req.query;

    const tacheIds = id_tache.split(',').map(Number);

    const q = `SELECT 
                t1.id_tache, 
                t1.nom_tache, 
                t1.description, 
                t1.date_debut, 
                t1.date_fin,
                t1.priorite,
                t1.id_tache_parente,
                typeC.nom_type_statut AS statut, 
                client.nom AS nom_client, 
                frequence.nom AS frequence, 
                utilisateur.nom AS owner, 
                provinces.name AS ville, 
                departement.nom_departement AS departement,
                cb.controle_de_base,
                cb.id_controle,
                DATEDIFF(t1.date_fin, t1.date_debut) AS nbre_jour,
                t2.nom_tache AS sous_tache,
                t2.description AS sous_tache_description,
                ts1.nom_type_statut AS sous_tache_statut,
                t2.date_debut AS sous_tache_dateDebut,
                t2.date_fin AS sous_tache_dateFin,
                suivi_tache.id_suivi,
                suivi_tache.commentaire AS suivi_commentaire,
                suivi_tache.pourcentage_avancement AS suivi_pourcentage_avancement
            FROM 
            tache t1
                LEFT JOIN type_statut_suivi AS typeC ON t1.statut = typeC.id_type_statut_suivi
                LEFT JOIN client ON t1.id_client = client.id_client
                INNER JOIN frequence ON t1.id_frequence = frequence.id_frequence
                LEFT JOIN utilisateur ON t1.responsable_principal = utilisateur.id_utilisateur
                LEFT JOIN provinces ON t1.id_ville = provinces.id
                LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
                LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
                LEFT JOIN departement ON t1.id_departement = departement.id_departement  
                LEFT JOIN tache t2 ON t1.id_tache = t2.id_tache_parente 
                LEFT JOIN suivi_tache ON t1.id_tache = suivi_tache.id_tache
                LEFT JOIN type_statut_suivi ts1 ON t2.statut = ts1.id_type_statut_suivi
            WHERE 
                t1.est_supprime = 0 AND t1.id_tache IN (?)
            GROUP BY 
                    t1.id_tache,t2.id_tache
            ORDER BY 
                t1.date_creation DESC;

        `;

    db.query(q, [tacheIds], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


exports.getTacheDoc = (req, res) => {
    const q = `
                SELECT tache_documents.*, tache.nom_tache, tache.id_tache, tache.nom_tache FROM tache_documents
            INNER JOIN tache ON tache_documents.id_tache = tache.id_tache
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDetailTacheDoc = (req, res) => {
    const {id_tache} = req.query;
    const q = `
                SELECT tache_documents.*, tache.nom_tache, tache.id_tache FROM tache_documents
            INNER JOIN tache ON tache_documents.id_tache = tache.id_tache
            WHERE tache_documents.id_tache = ${id_tache}
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTacheOneV = (req, res) => {
    const {id_tache} = req.query;

    const q = `
            SELECT 
                *
            FROM 
                tache
                WHERE tache.id_tache =${id_tache}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getTacheOne = (req, res) => {
    const {id_tache} = req.query;

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
                departement.nom_departement AS departement,
                cb.controle_de_base,
                cb.id_controle,
                DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
            FROM 
                tache
            LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
            LEFT JOIN client ON tache.id_client = client.id_client
            INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
            LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
            LEFT JOIN provinces ON tache.id_ville = provinces.id
            LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
            LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
            LEFT JOIN departement ON tache.id_departement = departement.id_departement  -- Utilisation de tache.id_departement
                WHERE 
            tache.id_tache = ?
            GROUP BY tache.id_tache
        `;
     
    db.query(q,[id_tache], (error, data) => {
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
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    INNER JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client ON client.id_client = controle_client.id_client
    LEFT JOIN departement ON utilisateur.id_utilisateur = departement.responsable
    LEFT JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    LEFT JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
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
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_tache_parente`, `id_departement`,`id_client`, `id_frequence`,`id_control`,`id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`,`id_batiment`, `id_ville`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_tache_parente,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_control,
            req.body.id_projet,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            req.body.doc
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
            }
            else{
                return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
            }
        })
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
                id_departement = ?,
                id_client = ?,
                id_frequence = ?,
                responsable_principal = ?,
                id_demandeur = ?,
                id_batiment = ?,
                id_ville = ?
            WHERE id_tache = ?
        `;
      
        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            id_tache
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Tache record not found' });
            }
            return res.json({ message: 'Tache record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

exports.putTachePriorite = async (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }

    const priorite = Object.keys(req.body)[0];

    if (!priorite) {
        return res.status(400).json({ error: 'No priorite value provided' });
    }

    try {
        const q = `
            UPDATE tache
            SET 
                priorite = ?
            WHERE id_tache = ?
        `;

        const values = [
            priorite,
            id_tache
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Priority record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Priority record not found' });
            }

            return res.json({ message: 'Priority record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating priority:", err);
        return res.status(500).json({ error: 'Failed to update Priority record' });
    }
};

exports.deleteUpdateTache = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE tache SET est_supprime = 1 WHERE id_tache = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
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
exports.getTacheDocOne = (req, res) => {
    const {id_tache_document} = req.query;

    const q = `SELECT * FROM tache_documents WHERE id_tache_document = ?`;

    db.query(q,[id_tache_document], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
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
  
exports.putTacheDoc = async (req, res) => {
    const { id_tache_document } = req.query;

    if (!id_tache_document || isNaN(id_tache_document)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }
    
    const { nom_document, type_document } = req.body;
    if (!nom_document || !type_document) {
        return res.status(400).json({ error: 'Nom du document et type de document sont requis' });
    }

    try {
        const q = `
            UPDATE tache_documents
            SET 
                nom_document = ?,
                type_document = ?
            WHERE id_tache_document = ?
        `;
      
        const values = [
            nom_document,
            type_document,
            id_tache_document
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Tache record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Tache record not found' });
            }

            return res.json({ message: 'Tache record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
};
