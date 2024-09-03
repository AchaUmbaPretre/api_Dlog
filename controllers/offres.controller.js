const { db } = require("./../config/database");

exports.getOffre = (req, res) => {

    const q = `
    SELECT 
        offres.*, fournisseur.nom_fournisseur
    FROM 
        offres
    INNER JOIN fournisseur ON offres.id_fournisseur = fournisseur.id_fournisseur
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDetailDoc = (req, res) => {
    const {id_offre} = req.query;
    const q = `
                SELECT documents_offre.*, offres.nom_offre, offres.id_offre FROM documents_offre 
            INNER JOIN offres ON documents_offre.id_offre = offres.id_offre
            WHERE offres.id_offre = ${id_offre}
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getOffreDetailOne = (req, res) => {
    const {id_offre} = req.query;

    const q = `
            SELECT 
                o.nom_offre,
                p.nom_article,
                op.prix,
                op.quantite
                FROM 
                offre_article op
            JOIN 
                offres o ON op.id_offre = o.id_offre
            JOIN 
                articles p ON op.id_article = p.id_article
            WHERE
                o.id_offre = ${id_offre}

    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getOffreArticleOne = (req, res) => {
    const { id_offre } = req.query;

    // Préparez la requête SQL
    const query = `
        SELECT offre_article.id_offre_article, offre_article.id_offre, offre_article.id_article, offre_article.prix, articles.nom_article
        FROM offre_article 
        LEFT JOIN articles ON offre_article.id_article = articles.id_article
        WHERE offre_article.id_offre = ?
    `;

    // Exécutez la requête SQL
    db.query(query, [id_offre || null], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        return res.status(200).json(results);
    });
};


exports.postOffres = (req, res) => {
    const articles = req.body.articles;

    const q = 'INSERT INTO offres(`id_fournisseur`, `nom_offre`, `description`) VALUES(?,?,?)';
    const qOffre_article = 'INSERT INTO offre_article(`id_offre`,`id_article`,`prix`) VALUES(?,?,?)';

    const values = [
        req.body.id_fournisseur || 1,
        req.body.nom_offre,
        req.body.description
    ];
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Erreur de connexion :', err);
            return res.status(500).json({ error: "Une erreur s'est produite lors de la connexion à la base de données." });
        }

        // Commencez la transaction
        connection.beginTransaction((err) => {
            if (err) {
                console.error('Erreur lors du début de la transaction :', err);
                connection.release();
                return res.status(500).json({ error: "Une erreur s'est produite lors du début de la transaction." });
            }

            // Insérez l'offre
            connection.query(q, values, (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Erreur lors de l\'ajout de l\'offre :', err);
                        connection.release();
                        res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de l'offre." });
                    });
                }

                const insertID = result.insertId;

                // Insérez les articles
                const insertArticleQueries = articles.map(article => {
                    const articleValues = [
                        insertID,
                        article.id_article,
                        article.prix
                    ];

                    return new Promise((resolve, reject) => {
                        connection.query(qOffre_article, articleValues, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                });

                Promise.all(insertArticleQueries)
                    .then(() => {
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('Erreur lors de la validation de la transaction :', err);
                                    connection.release();
                                    res.status(500).json({ error: "Une erreur s'est produite lors de la validation de la transaction." });
                                });
                            }
                            connection.release();
                            res.status(201).json({ message: 'Offre ajoutée avec succès' });
                        });
                    })
                    .catch((error) => {
                        connection.rollback(() => {
                            console.error('Erreur lors de l\'ajout des articles :', error);
                            connection.release();
                            res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des articles." });
                        });
                    });
            });
        });
    });
};


exports.postArticle = async (req, res) => {
    const articles = req.body.articles;

    try {
        const qInsertArticle = 'INSERT INTO articles(`nom_article`, `id_categorie`) VALUES(?,?)';

        for (let article of articles) {
            const articleValues = [
                article.nom_article,
                article.id_categorie
            ];

            await new Promise((resolve, reject) => {
                db.query(qInsertArticle, articleValues, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(); 
                });
            });
        }

        return res.status(201).json({ message: 'Articles ajoutés avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'ajout des articles :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des articles." });
    }
};


exports.postOffresArticle = async (req, res) => {
    const articles = req.body.articles;
    const id_offre = req.body.id_offre;

    try {
        const qInsertArticle = 'INSERT INTO articles(`nom_article`, `prix_unitaire`, `id_categorie`) VALUES(?,?,?)';
        const qInsertOffreArticle = 'INSERT INTO offre_article(`id_offre`,`id_article`,`prix`) VALUES(?,?,?)';

        for (let article of articles) {
            const articleValues = [
                article.nom_article,
                article.prix_unitaire,
                article.id_categorie
            ];

            await new Promise((resolve, reject) => {
                db.query(qInsertArticle, articleValues, (err, result) => {
                    if (err) {
                        return reject(err);
                    }

                    const insertID = result.insertId;  // Récupération de l'ID de l'article inséré
                    const offreArticleValues = [
                        id_offre,
                        insertID,
                        article.quantite
                    ];

                    db.query(qInsertOffreArticle, offreArticleValues, (err) => {
                        if (err) {
                            return reject(err);
                        }

                        resolve();
                    });
                });
            });
        }

        return res.status(201).json({ message: 'Articles ajoutés avec succès' });

    } catch (error) {
        console.error('Erreur lors de l\'ajout des articles :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des articles." });
    }
};

exports.postOffresDoc = async (req, res) => {
    const { id_offre, nom_document, type_document } = req.body;

    const chemin_document = req.file.path.replace(/\\/g, '/'); // Chemin du fichier avec les séparateurs corrects

    if (!chemin_document || !nom_document || !type_document || !id_offre) {
        return res.status(400).json({ message: 'Some required fields are missing' });
    }

    const query = `INSERT INTO documents_offre (id_offre, nom_document, type_document, chemin_document)
                   VALUES (?, ?, ?, ?)`;

    db.query(query, [id_offre, nom_document, type_document, chemin_document], (err, result) => {
      if (err) {
        console.error('Error inserting document:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      res.status(200).json({ message: 'Document added successfully', documentId: result.insertId });
    });
};

exports.deleteOffres = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM offres WHERE id_offre = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }