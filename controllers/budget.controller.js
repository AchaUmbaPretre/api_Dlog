const { db } = require("./../config/database");
const util = require('util');

exports.getBudgetCount = (req, res) => {
    
    let q = `
    SELECT COUNT(id_budget) AS nbre_budget
    FROM budget 
    `;
     
    db.query(q, params, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getBudget = (req, res) => {

    const q = `SELECT budget.*, offres.nom_offre, fournisseur.nom_fournisseur FROM budget
                    INNER JOIN offres ON budget.id_offre = offres.id_offre
                    INNER JOIN articles ON budget.article = articles.id_article
                    INNER JOIN fournisseur ON offres.id_fournisseur = fournisseur.id_fournisseur`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBudgetOne = (req, res) => {
    const { id_budget } = req.query;

    const q = `
            SELECT budget.*, fournisseur.nom_fournisseur, articles.nom_article FROM budget
                    INNER JOIN fournisseur ON fournisseur.id_fournisseur = budget.fournisseur
                    INNER JOIN articles ON budget.article = articles.id_article
                WHERE budget.id_budget =${id_budget}
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postBudget = async (req, res) => {
    try {
        const q = 'INSERT INTO budget(`id_tache`, `id_controle`,`id_projet`, `article`, `quantite_demande`, `quantite_validee`, `prix_unitaire`, `montant`, `id_offre`) VALUES( ?, ?, ?, ?, ?, ?, ?, ?)';

        const values = [
            req.body.id_tache,
            req.body.id_controle,
            req.body.id_projet,
            req.body.article,
            req.body.quantite_demande,
            req.body.quantite_validee,
            req.body.prix_unitaire,
            req.body.montant,
            req.body.id_offre
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Tâche personne ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

const query = util.promisify(db.query).bind(db);

exports.putBudget = async (req, res) => {
    const { id_budget, quantite_validee } = req.body;

    const queryStr = `
        UPDATE budget 
        SET quantite_validee = ?
        WHERE id_budget = ?
    `;

    const values = [quantite_validee, id_budget];

    try {
        const results = await query(queryStr, values);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Enregistrement de contrôle non trouvé' });
        }

        return res.json({ message: 'Quantité validée mise à jour avec succès' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la quantité validée :", error);
        return res.status(500).json({ error: 'Échec de la mise à jour de la quantité validée' });
    }
};






exports.deleteBudget = (req, res) => {
    const {id} = req.params;
  
    const q = "DELETE FROM budget WHERE id_budget = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }