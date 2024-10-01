const { db } = require("./../config/database");

exports.getTypes = (req, res) => {

    const q = `SELECT * FROM type_statut_suivi`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCategorie = (req, res) => {

    const q = `SELECT * FROM categories`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getArticle = (req, res) => {

    const q =   `SELECT articles.id_article, 
                    articles.nom_article, 
                    categories.nom_cat
                FROM articles
                    INNER JOIN categories ON articles.id_categorie = categories.id_categorie`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getArticleOne = (req, res) => {
    const {id_article, id_fournisseur} = req.query;

    const q =   `SELECT articles.id_article, 
                    articles.prix_unitaire, 
                    articles.nom_article, 
                    offre_article.quantite,
                    fournisseur.id_fournisseur
                FROM articles
                    INNER JOIN offre_article ON articles.id_article = offre_article.id_article
                    INNER JOIN offres ON offre_article.id_offre = offres.id_offre
                    INNER JOIN fournisseur ON offres.id_fournisseur = fournisseur.id_fournisseur
                WHERE articles.id_article = ${id_article} AND fournisseur.id_fournisseur = ${id_fournisseur}`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Batiment
exports.getBatiment = (req, res) => {

    const q = `
            SELECT batiment.*, provinces.name FROM batiment
                LEFT JOIN provinces ON batiment.ville = provinces.id
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBatimentOne = (req, res) => {
    const {id} = req.query;

    const q = `
            SELECT batiment.*, provinces.name FROM batiment
                LEFT JOIN provinces ON batiment.ville = provinces.id
                WHERE batiment.id_batiment = ?
            `;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postBatiment = async (req, res) => {

    try {
        const q = 'INSERT INTO batiment(`nom_batiment`, `site`, `ville`, `longueur`, `largeur`, `hauteur`, `surface_sol`, `surface_murs`, `metres_lineaires`) VALUES(?,?,?,?,?,?,?,?,?)';

        const values = [
            req.body.nom_batiment,
            req.body.site,
            req.body.ville,
            req.body.longueur,
            req.body.largeur,
            req.body.hauteur,
            req.body.surface_sol,
            req.body.surface_murs,
            req.body.metres_lineaires
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Batiment ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putBatiment = async (req, res) => {
    const { id_batiment } = req.query;

    // Validation de l'ID du bâtiment
    if (!id_batiment || isNaN(id_batiment)) {
        return res.status(400).json({ error: 'ID de bâtiment invalide' });
    }

    try {
        const q = `
            UPDATE batiment 
            SET 
                nom_batiment = ?,
                site = ?,
                ville = ?,
                longueur = ?,
                largeur = ?,
                hauteur = ?,
                surface_sol = ?,
                surface_murs = ?,
                metres_lineaires = ?
            WHERE id_batiment = ?
        `;

        const values = [
            req.body.nom_batiment,
            req.body.site,
            req.body.ville,
            req.body.longueur,
            req.body.largeur,
            req.body.hauteur,
            req.body.surface_sol,
            req.body.surface_murs,
            req.body.metres_lineaires,
            id_batiment
        ];

        // Exécution de la requête avec gestion des erreurs
        db.query(q, values, (error, result) => {
            if (error) {
                console.error("Erreur lors de la mise à jour du bâtiment :", error);
                return res.status(500).json({ error: 'Erreur interne lors de la mise à jour du bâtiment' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Bâtiment non trouvé' });
            }

            return res.json({ message: 'Bâtiment mis à jour avec succès' });
        });
    } catch (err) {
        console.error("Erreur lors de la mise à jour du bâtiment :", err);
        return res.status(500).json({ error: 'Erreur interne lors de la mise à jour du bâtiment' });
    }
};



//Categorie
exports.getCategorie = (req, res) => {

    const q = `
            SELECT * FROM categories
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postCategorie = async (req, res) => {

    try {
        const q = 'INSERT INTO categories(`nom_cat`) VALUES(?)';

        const values = [
            req.body.nom_cat
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Categorie ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

//Activité
exports.getActivite = (req, res) => {

    const q = `
            SELECT * FROM activite
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postActivite = async (req, res) => {
    try {
        const q = 'INSERT INTO activite(`nom_activite`) VALUES(?)';

        const values = [
            req.body.nom_activite
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Categorie ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.getCorpsMetier = (req, res) => {

    const q = `SELECT * FROM corpsmetier`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCatTache = (req, res) => {

    const q = `SELECT * FROM categorietache`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.typeStockageBins = (req, res) => {

    const q = `SELECT * FROM type_stockage_bins`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.statut_bins = (req, res) => {

    const q = `SELECT * FROM statut_bins`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};