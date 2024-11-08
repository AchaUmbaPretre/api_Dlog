const { db } = require("./../config/database");

exports.getProjetCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_projet) AS nbre_projet
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
                    LEFT JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
                    LEFT JOIN projet_client ON projet.id_projet = projet_client.id_projet
                    LEFT JOIN client ON projet_client.id_client = client.id_client
                    LEFT JOIN besoins ON projet.id_projet = besoins.id_projet
                    LEFT JOIN budgets ON projet.id_projet = budgets.id_projet
                    LEFT JOIN projet_batiment ON projet.id_projet = projet_batiment.id_projet
                    LEFT JOIN batiment ON projet_batiment.id_batiment = batiment.id_batiment
                    WHERE projet.est_supprime = 0
                    GROUP BY projet.id_projet
                    ORDER BY projet.date_creation DESC
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
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
        ct.nom_cat_tache,
        cm.nom_corps_metier,
        tg.nom_tag          

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
    LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
    LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
    LEFT JOIN tache_tags tt ON tache.id_tache = tt.id_tache
    LEFT JOIN tags tg ON tt.id_tag = tg.id_tag
    WHERE 
        tache.est_supprime = 0 AND tache.id_projet = ?
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
};

exports.getProjetOne = (req, res) => {
    const { id_projet } = req.query;

    const q = `
        SELECT 
            projet.id_projet,
            projet.nom_projet, 
            projet.description, 
            projet.date_debut, 
            projet.date_fin, 
            ts.nom_type_statut, 
            utilisateur.nom AS responsable, 
            client.nom AS nom_client,
            budgets.montant,
            batiment.nom_batiment,
            DATEDIFF(projet.date_fin, projet.date_debut) AS nbre_jour
        FROM 
            projet
            LEFT JOIN type_statut_suivi AS ts ON ts.id_type_statut_suivi = projet.statut
            LEFT JOIN utilisateur ON projet.chef_projet = utilisateur.id_utilisateur
            LEFT JOIN projet_client ON projet.id_projet = projet_client.id_projet
            LEFT JOIN client ON projet_client.id_client = client.id_client
            LEFT JOIN besoins ON projet.id_projet = besoins.id_projet
            LEFT JOIN budgets ON projet.id_projet = budgets.id_projet
            LEFT JOIN projet_batiment ON projet.id_projet = projet_batiment.id_projet
            LEFT JOIN batiment ON projet_batiment.id_batiment = batiment.id_batiment
        WHERE 
            projet.est_supprime = 0 AND projet.id_projet = ?
        GROUP BY projet.id_projet
    `;

    let totalQuery = `
        SELECT 
            COUNT(*) AS total_taches
        FROM 
            tache
        WHERE 
            tache.est_supprime = 0
    `;

    if (id_projet) {  // Vérifier si id_projet est défini
        totalQuery += ` AND tache.id_projet = ?`;
    }

    let totalQueryDoc = `
        SELECT 
            COUNT(*) AS total_doc
        FROM 
            document_projet
        WHERE 
            est_supprime = 0
    `;

    if (id_projet) {  // Vérifier si id_projet est défini
        totalQueryDoc += ` AND document_projet.id_projet = ?`;
    }

    db.query(q, [id_projet], (error, data) => {
        if (error) return res.status(500).send(error);

        // Si vous souhaitez également récupérer total_taches et total_doc, faites des requêtes supplémentaires ici
        db.query(totalQuery, [id_projet], (errorTaches, dataTaches) => {
            if (errorTaches) return res.status(500).send(errorTaches);

            db.query(totalQueryDoc, [id_projet], (errorDocs, dataDocs) => {
                if (errorDocs) return res.status(500).send(errorDocs);

                return res.status(200).json({
                    projet: data,
                    total_taches: dataTaches[0].total_taches,
                    total_doc: dataDocs[0].total_doc,
                });
            });
        });
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
    const besoins = req.body.besoins || [];
    const clients = req.body.client || [];
    const batiments = req.body.id_batiment || [];


    const qProjet = 'INSERT INTO projet (`nom_projet`, `description`, `chef_projet`, `date_debut`, `date_fin`, `statut`, `budget`) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const qBesoin = 'INSERT INTO besoins (`id_article`, `description`, `quantite`, `id_projet`) VALUES (?, ?, ?, ?)';
    const qBudget = 'INSERT INTO budgets (`montant`, `id_projet`) VALUES (?, ?)';
    const qProjet_client = 'INSERT INTO projet_client(`id_projet`,`id_client`) VALUES(?,?)';
    const qProjet_batiment = 'INSERT INTO projet_batiment(`id_projet`,`id_batiment`) VALUES(?,?)';

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

    // Insertion du projet
    db.query(qProjet, valuesProjet, (error, data) => {
        if (error) {
            console.error(error);
            return res.status(500).json(error);
        }

        const projetId = data.insertId; // Récupérer l'ID du projet inséré

        // Insertion du budget associé au projet
        db.query(qBudget, [req.body.budget, projetId], (budgetError) => {
            if (budgetError) {
                console.error(budgetError);
                return res.status(500).json(budgetError);
            }

            // Insertion des besoins
            if (besoins.length > 0) {
                besoins.forEach(besoin => {
                    if (besoin.id_article && besoin.description && besoin.quantite) {
                        const besoinValues = [
                            besoin.id_article,
                            besoin.description,
                            besoin.quantite,
                            projetId
                        ];
                        db.query(qBesoin, besoinValues, (besoinError) => {
                            if (besoinError) {
                                console.error(besoinError);
                                return res.status(500).json(besoinError);
                            }
                        });
                    }
                });
            }

            // Insertion des clients associés au projet
            if (clients.length > 0) {
                clients.forEach(clientId => {
                    const clientValues = [projetId, clientId];
                    db.query(qProjet_client, clientValues, (clientError) => {
                        if (clientError) {
                            console.error(clientError);
                            return res.status(500).json(clientError);
                        }
                    });
                });
            }

            // Insertion des bâtiments associés au projet
            if (batiments.length > 0) {
                batiments.forEach(batimentId => {
                    const batimentValues = [projetId, batimentId];
                    db.query(qProjet_batiment, batimentValues, (batimentError) => {
                        if (batimentError) {
                            console.error(batimentError);
                            return res.status(500).json(batimentError);
                        }
                    });
                });
            }

            // Réponse de succès après toutes les insertions
            res.json('Processus réussi');
        });
    });
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

exports.deletePutProjet = async (req, res) => {
    const { id_projet } = req.query;
    if (!id_projet || isNaN(id_projet)) {
        return res.status(400).json({ error: 'ID de projet fourni non valide' });
    }

    try {
        const q = "UPDATE projet SET est_supprime = 1 WHERE id_projet = ?";
      
        const values = [id_projet];

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

//Doc
exports.getProjetDoc = (req, res) => {
    const q = `
            SELECT 
                document_projet.*, 
                projet.nom_projet, 
                projet.id_projet 
            FROM document_projet
                INNER JOIN projet ON document_projet.id_projet = projet.id_projet
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getProjetDocOne = (req, res) => {
    const {	id_document } = req.query;

    const q = `SELECT * 
                    FROM 
                document_projet 
                WHERE id_document = ?`;

    db.query(q,[id_document], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDetailProjetDoc = (req, res) => {
    const {id_projet} = req.query;
    const q = `
                SELECT 
                    document_projet.*, 
                    projet.nom_projet, 
                    projet.id_projet 
                FROM document_projet
                    INNER JOIN projet ON document_projet.id_projet = projet.id_projet
                WHERE document_projet.id_projet = ${id_projet}
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postProjetDoc = async (req, res) => {
    const { id_projet, nom_document, type_document, ref } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_projet,
        nom_document,
        type_document,
        ref
    }));

    // Insertion de chaque fichier dans la base de données
    documents.forEach((doc) => {
        const query = `INSERT INTO document_projet (id_projet, nom_document, type_document, ref, chemin_document)
                       VALUES (?, ?, ?, ?, ?)`;

        db.query(query, [doc.id_projet, doc.nom_document, doc.type_document, doc.ref, doc.chemin_document], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'insertion du document:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }
        });
    });

    res.status(200).json({ message: 'Documents ajoutés avec succès' });
};

exports.putProjetDoc = async (req, res) => {
    const { id_document } = req.query;

    if (!id_document || isNaN(id_document)) {
        return res.status(400).json({ error: 'Invalid document ID provided' });
    }
    
    const { nom_document, type_document, ref } = req.body;
    if (!nom_document || !type_document) {
        return res.status(400).json({ error: 'Nom du document et type de document sont requis' });
    }

    try {
        const q = `
            UPDATE document_projet
                SET 
                    nom_document = ?,
                    type_document = ?,
                    ref = ?
                WHERE id_document = ?
        `;
      
        const values = [
            nom_document,
            type_document,
            ref,
            id_document
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Projet record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Projet record not found' });
            }

            return res.json({ message: 'Projet record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating projet:", err);
        return res.status(500).json({ error: 'Failed to update Projet record' });
    }
};

exports.putIdProjetBesoin = async (req, res) => {
    const { id_besoin } = req.query;

    const id_projet = Object.keys(req.body)[0];

    if (!id_besoin || isNaN(id_besoin)) {
        return res.status(400).json({ error: 'Invalid projet ID provided' });
    }

    try {
        const q = `
            UPDATE besoins 
                SET id_projet = ? 
            WHERE id_besoin = ?
            `;

        db.query(q,[id_projet, id_besoin], (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Projet record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Projet record not found' });
            }

            return res.json({ message: 'Projet record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating projet:", err);
        return res.status(500).json({ error: 'Failed to update Projet record' });
    }
}