const { db } = require("./../config/database");
const cheerio = require('cheerio'); // Ajoutez cheerio pour le parsing HTML

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
                    client.nom,
                    budgets.montant
                FROM 
                projet
                    INNER JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
                    INNER JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                    INNER JOIN client ON projet.client = client.id_client
                    INNER JOIN besoins ON projet.id_projet = besoins.id_projet
                    INNER JOIN budgets ON besoins.id_besoin = budgets.id_besoin
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProjetTache = (req, res) => {
    const {id_projet} = req.query;

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
    LEFT JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    LEFT JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
    WHERE tache.id_projet = ${id_projet}
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

exports.postProjetBesoin = (req, res) => {

    try {
                    // Requête pour insérer le projet
        const qProjet = 'INSERT INTO projet (`nom_projet`, `description`, `chef_projet`, `date_debut`, `date_fin`, `statut`, `budget`, `client`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const qBesoin = 'INSERT INTO besoins (`description`, `id_projet`) VALUES (?, ?)';
        const qBudget = 'INSERT INTO budgets (`montant`, `id_besoin`) VALUES (?, ?)';

            const valuesProjet = [
                req.body.nom_projet,
                req.body.description,
                req.body.chef_projet,
                req.body.date_debut,
                req.body.date_fin,
                req.body.statut || 1,
                req.body.budget,
                req.body.client
            ];

            db.query(qProjet, valuesProjet, (error, data) => {
                if (error) {
                    console.log(error);
                    res.status(500).json(error);
                  }
                  else{
                    const projetId = data.insertId;
                    db.query(qBesoin, [req.body.description, projetId], (selectError, selectData) =>{
                        if (selectError) {
                            console.log(selectError);
                            res.status(500).json(selectError);
                          }
                        else{
                            const besoinId = selectData.insertId;
                            db.query(qBudget, [req.body.budget,besoinId], (budgetError,budgetData) => {
                                if(budgetError){
                                    onsole.log(selectError);
                                    res.status(500).json(selectError);
                                }
                                else {
                                    res.json('Processus réussi');
                                  }
                            })

                        }
                    })
                  }
            } )
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
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