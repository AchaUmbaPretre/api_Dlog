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
                    articles.prix_unitaire, 
                    articles.nom_article, 
                    offre_article.quantite 
                FROM articles
                    INNER JOIN offre_article ON articles.id_article = offre_article.id_article`;

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