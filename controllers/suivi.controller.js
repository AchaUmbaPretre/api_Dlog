const { db } = require("./../config/database");

exports.getSuiviCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_suivi_controle) AS nbre_suivi
        FROM suivi_controle_de_base
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getSuivi = (req, res) => {

    const q = `
            SELECT d.nom_departement AS nom_departement, s.commentaires, s.date_suivi, type.nom_type_statut AS statut FROM suivi_controle_de_base AS s
        INNER JOIN controle_de_base AS c ON s.id_controle = c.id_controle
        INNER JOIN departement AS d ON c.id_departement = d.id_departement
        INNER JOIN type_statut_suivi AS type ON s.status = type.id_type_statut_suivi
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getSuiviOne = (req, res) => {
    const {id_suivi} = req.query;

    const q = `
        SELECT sc.id_suivi_controle, sc.id_controle, sc.commentaires, sc.date_suivi, ts.nom_type_statut, u.nom, CASE 
            WHEN sc.est_termine = 0 THEN 'Non' 
            ELSE 'Oui' 
                END AS est_termine FROM suivi_controle_de_base AS sc
        INNER JOIN utilisateur AS u ON sc.effectue_par = u.id_utilisateur
        INNER JOIN type_statut_suivi AS ts ON sc.status = ts.id_type_statut_suivi
                WHERE sc.id_controle =${id_suivi}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getSuiviTacheOne = (req, res) => {
    const {id_tache} = req.query;

    const q = `
        SELECT 
            suivi_tache.*, 
            type_statut_suivi.nom_type_statut,
            CASE 
        WHEN suivi_tache.est_termine = 0 THEN 'Non' 
        ELSE 'Oui' 
            END AS est_termine,
            utilisateur.nom, 
            tache.nom_tache
        FROM 
            suivi_tache
        INNER JOIN 
            utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
        INNER JOIN 
            tache ON suivi_tache.id_tache = tache.id_tache
        INNER JOIN 
            type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getSuiviTacheOneV = (req, res) => {
    const {id_tache} = req.query;

    const q = `
                SELECT 
            suivi_tache.*, 
            type_statut_suivi.nom_type_statut,
            CASE 
        WHEN suivi_tache.est_termine = 0 THEN 'Non' 
        ELSE 'Oui' 
            END AS est_termine,
            utilisateur.nom, 
            tache.nom_tache
        FROM 
            suivi_tache
        INNER JOIN 
            utilisateur ON suivi_tache.effectue_par = utilisateur.id_utilisateur
        INNER JOIN 
            tache ON suivi_tache.id_tache = tache.id_tache
        INNER JOIN 
            type_statut_suivi ON suivi_tache.status = type_statut_suivi.id_type_statut_suivi
            WHERE suivi_tache.id_tache = ?
        `;
     
    db.query(q,[id_tache], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postSuivi = async (req, res) => {

    try {
        const q = 'INSERT INTO suivi_controle_de_base(`id_controle`, `status`, `commentaires`, `effectue_par`, `est_termine`) VALUES(?,?,?,?,?)';

        const values = [
            req.body.id_controle,
            req.body.status,
            req.body.commentaires,
            req.body.effectue_par,
            req.body.est_termine
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Suivi ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.postSuiviTache = async (req, res) => {
    try {
        const qTache = 'UPDATE tache SET statut = ? WHERE id_tache = ?';
        const q = 'INSERT INTO suivi_tache(`id_tache`, `status`, `commentaire`, `pourcentage_avancement`, `effectue_par`, `est_termine`) VALUES(?,?,?,?,?,?)';

        const values = [
            req.body.id_tache,
            req.body.status,
            req.body.commentaire,
            req.body.pourcentage_avancement,
            req.body.effectue_par,
            req.body.est_termine ? 1 : 0
        ];

        // Insertion du suivi de tâche
        const insertSuiviTache = new Promise((resolve, reject) => {
            db.query(q, values, (error, data) => {
                if (error) {
                    return reject(error); // En cas d'erreur, on rejette
                }
                resolve(data);
            });
        });

        // Mise à jour du statut de la tâche
        const updateTacheStatut = new Promise((resolve, reject) => {
            db.query(qTache, [req.body.status, req.body.id_tache], (error, data) => {
                if (error) {
                    return reject(error); // En cas d'erreur, on rejette
                }
                resolve(data);
            });
        });

        // Exécution des promesses
        await insertSuiviTache;
        await updateTacheStatut;

        // Si tout se passe bien
        return res.status(201).json({ message: 'Suivi de tâche ajouté avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.deleteSuivi = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM suivi_controle_de_base WHERE id_suivi_controle = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }