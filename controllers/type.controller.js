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

exports.getCategorieOne = (req, res) => {
    const {id} = req.query;

    const q = `SELECT * FROM categories WHERE id_categorie = ?`;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.putCategorie = async (req, res) => {
    const { id } = req.query;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid corps ID provided' });
    }

    try {
        const q = `
            UPDATE categories
            SET 
                nom_cat = ?
            WHERE id_categorie = ?
        `;
      
        const values = [
            req.body.nom_cat,
            id
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Corps record not found' });
            }
            return res.json({ message: 'Corps record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating corps:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

exports.getArticle = (req, res) => {

    const q =   `SELECT articles.id_article, 
                    articles.nom_article, 
                    categories.nom_cat
                FROM articles
                    INNER JOIN categories ON articles.id_categorie = categories.id_categorie
                WHERE articles.est_supprime = 0
                    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getArticleOneV = (req, res) => {
    const {id_article} = req.query;

    const q =   `SELECT *
                FROM articles
                WHERE id_article = ${id_article}`;

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

exports.putArticle = async (req, res) => {
    const { id_article } = req.query;

    if (!id_article || isNaN(id_article)) {
        return res.status(400).json({ error: 'ID de Article invalide' });
    }

    try {
        const q = `
            UPDATE articles 
            SET 
                nom_article = ?,
                id_categorie = ?
            WHERE id_article = ?
        `;

        const values = [
            req.body.nom_article,
            req.body.id_categorie,
            id_article
        ];

        // Exécution de la requête avec gestion des erreurs
        db.query(q, values, (error, result) => {
            if (error) {
                console.error("Erreur lors de la mise à jour d'article :", error);
                return res.status(500).json({ error: 'Erreur interne lors de la mise à jour d article' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Article non trouvé' });
            }
            return res.json({ message: 'Article mis à jour avec succès' });
        });
    } catch (err) {
        console.error("Erreur lors de la mise à jour d'article :", err);
        return res.status(500).json({ error: 'Erreur interne lors de la mise à jour d article' });
    }
};

//Batiment
exports.getBatimentCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
        SELECT 
            COUNT(id_batiment) AS nbre_batiment
        FROM batiment
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
exports.getBatiment = (req, res) => {

    const q = `
            SELECT batiment.*, provinces.name, sb.nom_status_batiment FROM batiment
                LEFT JOIN provinces ON batiment.ville = provinces.id
                LEFT JOIN status_batiment sb ON batiment.statut_batiment = sb.id_status_batiment
                WHERE batiment.est_supprime = 0
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
            SELECT batiment.*, provinces.name, sb.nom_status_batiment FROM batiment
                LEFT JOIN provinces ON batiment.ville = provinces.id
                LEFT JOIN status_batiment sb ON batiment.statut_batiment = sb.id_status_batiment
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
        const q = 'INSERT INTO batiment(`nom_batiment`, `site`, `ville`, `longueur`, `largeur`, `hauteur`, `surface_sol`, `surface_murs`, `metres_lineaires`, `type_batiment`, `statut_batiment`) VALUES(?,?,?,?,?,?,?,?,?,?,?)';

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
            req.body.type_batiment,
            req.body.statut_batiment
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
                metres_lineaires = ?,
                type_batiment = ?,
                statut_batiment = ?

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
            req.body.type_batiment,
            req.body.statut_batiment,
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

exports.deleteUpdatedBatiment = (req, res) => {
    const { id } = req.query;
  
    const q = "UPDATE batiment SET est_supprime = 1 WHERE id_batiment = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
  }


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

exports.getCorpsMetierOne = (req, res) => {
    const {id_corps} = req.query;

    const q = `SELECT * FROM corpsmetier WHERE 	id_corps_metier = ?`;

    db.query(q,[id_corps], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postCorpsMetier = async (req, res) => {

    try {
        const q = 'INSERT INTO corpsmetier(`nom_corps_metier`) VALUES(?)';

        const values = [
            req.body.nom_corps_metier
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'corps de metier ajouté avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du corps metier:', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putCorpsMetier = async (req, res) => {
    const { id_corps } = req.query;

    if (!id_corps || isNaN(id_corps)) {
        return res.status(400).json({ error: 'Invalid corps ID provided' });
    }

    try {
        const q = `
            UPDATE corpsmetier 
            SET 
                nom_corps_metier = ?
            WHERE id_corps_metier = ?
        `;
      
        const values = [
            req.body.nom_corps_metier,
            id_corps
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Corps record not found' });
            }
            return res.json({ message: 'Corps record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating corps:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

exports.getCatTache = (req, res) => {

    const q = `SELECT * FROM categorietache`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Categorie Tache
exports.getCatTacheOne = (req, res) => {
    const {id} = req.query;

    const q = `SELECT * FROM categorietache WHERE id_cat_tache = ?`;

    db.query(q,[id], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postCatTache = async (req, res) => {

    try {
        const q = 'INSERT INTO categorietache(`nom_cat_tache`) VALUES(?)';

        const values = [
            req.body.nom_cat_tache
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'categoriea ete ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de nouvelle categorie:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putCatTache = async (req, res) => {
    const { id } = req.query;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid corps ID provided' });
    }

    try {
        const q = `
            UPDATE categorietache 
            SET 
                nom_cat_tache = ?
            WHERE id_cat_tache = ?
        `;
      
        const values = [
            req.body.nom_cat_tache,
            id
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Corps record not found' });
            }
            return res.json({ message: 'Corps record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating corps:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

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

exports.statusBatiment = (req, res) => {

    const q = `SELECT * FROM status_batiment`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};