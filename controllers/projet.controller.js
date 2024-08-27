const { db } = require("./../config/database");

exports.getProjetCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_projet) AS nbre_proejet
        FROM projet
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getProjet = (req, res) => {

    const q = `
            SELECT 
                projet.id_projet,
                projet.nom_projet, 
                projet.description, 
                projet.date_debut, 
                projet.date_fin, 
                ts.nom_type_statut, 
                utilisateur.nom AS responsable, 
                client.nom 
            FROM 
            projet
                INNER JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
                INNER JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                INNER JOIN client ON projet.client = client.id_client
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProjetOne = (req, res) => {
    const {id_projet} = req.query;

    const q = `
            SELECT 
                projet.id_projet,
                projet.nom_projet, 
                projet.description, 
                projet.date_debut, 
                projet.date_fin, 
                ts.nom_type_statut, 
                utilisateur.nom, 
                client.nom 
            FROM 
            projet
                INNER JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
                INNER JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                INNER JOIN client ON projet.client = client.id_client
                WHERE projet.id_projet = ${id_projet}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postProjet = async (req, res) => {

    try {
        const q = 'INSERT INTO projet(`nom_projet`, `description`, `chef_projet`, `date_debut`, `date_fin`, `statut`, `budget`, `client`) VALUES(?,?,?,?,?,?,?,?)';

        const values = [
            req.body.nom_projet,
            req.body.description,
            req.body.chef_projet ,
            req.body.date_debut,
            req.body.date_fin ,
            req.body.statut || 1,
            req.body.budget,
            req.body.client 
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Projet ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.postSuiviProjet = async (req, res) => {

    try {
        const q = 'INSERT INTO projet_suivi(`id_projet`, `date_suivi`, `id_utilisateur`, `statut`, `commentaires`, `pourcentage_completion`, `image_url`) VALUES(?,?,?,?,?,?,?)';

        const values = [
            req.body.id_projet,
            req.body.date_suivi,
            req.body.id_utilisateur,
            req.body.statut,
            req.body.commentaires,
            req.body.pourcentage_completion,
            req.body.image_url
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Suivi de tache ajouté avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.deleteProjet = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM projet WHERE id_projet = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }