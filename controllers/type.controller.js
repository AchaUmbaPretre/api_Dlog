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
        const q = 'INSERT INTO batiment(`nom_batiment`, `site`, `ville`, `longueur`, `largeur`, `hauteur`, `surface_sol`, `surface_murs`, `metres_lineaires`) VALUES(?,?,?)';

        const values = [
            req.body.nom_batiment,
            req.body.site,
            req.body.ville,
            
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Batiment ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
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