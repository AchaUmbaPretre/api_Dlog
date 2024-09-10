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
                    budgets.montant,
                    batiment.nom_batiment
                FROM 
                projet
                    LEFT JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
                    INNER JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                    LEFT JOIN client ON projet.client = client.id_client
                    LEFT JOIN besoins ON projet.id_projet = besoins.id_projet
                    LEFT JOIN budgets ON projet.id_projet = budgets.id_projet
                    LEFT JOIN batiment ON projet.id_batiment = batiment.id_batiment
                    GROUP BY projet.id_projet
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
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    INNER JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client ON client.id_client = controle_client.id_client
    LEFT JOIN departement ON utilisateur.id_utilisateur = departement.responsable
    LEFT JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    LEFT JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
    WHERE cb.id_controle = ?
GROUP BY 
    tache.id_tache
`;

    db.query(q,[id_projet], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProjetOneF = (req, res) => {
    const {id_projet} = req.query;

    const q = `
                SELECT 
                    *
                    FROM 
                projet
                WHERE projet.id_projet = ${id_projet}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

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
                    utilisateur.nom AS responsable, 
                    client.nom,
                    budgets.montant,
                    batiment.nom_batiment
                FROM 
                projet
                    INNER JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
                    INNER JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                    INNER JOIN client ON projet.client = client.id_client
                    INNER JOIN besoins ON projet.id_projet = besoins.id_projet
                    LEFT JOIN budgets ON projet.id_projet = budgets.id_projet
                    LEFT JOIN batiment ON projet.id_batiment = batiment.id_batiment
                WHERE projet.id_projet = ${id_projet}
                GROUP BY projet.id_projet
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

    const besoins = req.body.besoins;

    if (!Array.isArray(besoins)) {
        return res.status(400).json({ error: "Le format des besoins est incorrect. Il doit s'agir d'un tableau." });
    }

    try {
        const qProjet = 'INSERT INTO projet (`nom_projet`, `description`, `chef_projet`, `date_debut`, `date_fin`, `statut`, `budget`, `client`, `id_batiment`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const qBesoin = 'INSERT INTO besoins (`id_article`,`description`, `quantite`, `id_projet`) VALUES (?, ?, ?, ?)';
        const qBudget = 'INSERT INTO budgets (`montant`, `id_projet`) VALUES (?, ?)';

        const valuesProjet = [
            req.body.nom_projet,
            req.body.description,
            req.body.chef_projet,
            req.body.date_debut,
            req.body.date_fin,
            req.body.statut || 1,
            req.body.budget,
            req.body.client,
            req.body.id_batiment
        ];

        db.query(qProjet, valuesProjet, (error, data) => {
            if (error) {
                console.error(error);
                return res.status(500).json(error);
            }

            const projetId = data.insertId; // Récupérer l'ID du projet inséré

            // Insertion du budget associé au projet
            const budgetValues = [
                req.body.budget,
                projetId
            ];

            db.query(qBudget, budgetValues, (budgetError) => {
                if (budgetError) {
                    console.error(budgetError);
                    return res.status(500).json(budgetError);
                }

                // Boucle sur chaque besoin pour insertion
                besoins.forEach(besoin => {
                    const besoinValues = [
                        besoin.id_article,
                        besoin.description,
                        besoin.quantite,
                        projetId
                    ];

                    db.query(qBesoin, besoinValues, (selectError) => {
                        if (selectError) {
                            console.error(selectError);
                            return res.status(500).json(selectError);
                        }
                    });
                });

                res.json('Processus réussi');
            });
        });
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

exports.putProjet = async (req, res) => {
    const { id_projet } = req.query;
    const statut = req.body.statut || 1;
    const { nom_projet, description, chef_projet, date_debut, date_fin, budget, client, id_batiment } = req.body;

    if (!id_projet || isNaN(id_projet)) {
        return res.status(400).json({ error: 'ID de projet fourni non valide' });
    }

    try {
        const q = `
            UPDATE projet 
            SET 
                nom_projet = ?,
                description = ?,
                chef_projet = ?,
                date_debut = ?,
                date_fin = ?,
                statut = ?,
                budget = ?,
                client = ?,
                id_batiment = ?
            WHERE id_projet = ?
        `;
      
        const values = [nom_projet, description, chef_projet, date_debut, date_fin, statut, budget, client, id_batiment, id_projet];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Projet record not found' });
            }
            return res.json({ message: 'Projet record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating projet:", err);
        return res.status(500).json({ error: 'Failed to update projet record' });
    }
}

exports.deleteProjet = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM projet WHERE id_projet = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }