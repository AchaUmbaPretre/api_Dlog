const { db } = require("./../config/database");
const util = require('util');
const query = util.promisify(db.query).bind(db);

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

    const q = `
                SELECT budget.id_budget, budget.quantite_demande, budget.quantite_validee, budget.prix_unitaire, budget.montant,budget.montant_valide, budget.date_creation, offres.nom_offre, fournisseur.nom_fournisseur, articles.nom_article, projet.nom_projet FROM budget
                    INNER JOIN offres ON budget.id_offre = offres.id_offre
                    INNER JOIN articles ON budget.article = articles.id_article
                    INNER JOIN fournisseur ON offres.id_fournisseur = fournisseur.id_fournisseur
                    INNER JOIN projet ON budget.id_projet = projet.id_projet
                    WHERE budget.est_supprime = 0
                `;

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
            SELECT budget.id_budget, budget.quantite_demande, budget.quantite_validee, budget.prix_unitaire, budget.montant,budget.montant_valide, budget.date_creation, offres.nom_offre, fournisseur.nom_fournisseur, articles.nom_article, projet.nom_projet FROM budget
                    INNER JOIN offres ON budget.id_offre = offres.id_offre
                    INNER JOIN articles ON budget.article = articles.id_article
                    LEFT JOIN fournisseur ON offres.id_fournisseur = fournisseur.id_fournisseur
                    INNER JOIN projet ON budget.id_projet = projet.id_projet
                WHERE budget.est_supprime = 0 AND budget.id_budget =${id_budget}
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postBudget = async (req, res) => {
    try {
        const q = 'INSERT INTO budget(`id_tache`, `id_controle`,`id_projet`, `article`, `quantite_demande`, `quantite_validee`, `prix_unitaire`, `montant`, `id_offre`,`montant_valide`, `user_cr`) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const qProjet = "UPDATE projet SET statut = 7 WHERE id_projet = ?";

        const values = [
            req.body.id_tache,
            req.body.id_controle,
            req.body.id_projet,
            req.body.article,
            req.body.quantite_demande,
            req.body.quantite_validee,
            req.body.prix_unitaire,
            req.body.montant,
            req.body.id_offre,
            req.body.montant_valide,
            req.body.user_cr
        ];
         
        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
            }
            else{
                db.query(qProjet,[req.body.id_projet], (errorProjet, dataProjet) => {
                    if(errorProjet) {
                        console.log(errorProjet)
                    }
                    return res.status(201).json({ message: 'Tâche personne ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
                })            }
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.putBudget = async (req, res) => {
    const { id_projet, montant } = req.body;

    const queryStr = `
        UPDATE budget 
        SET montant = ?
        WHERE id_projet = ?
    `;

    const values = [montant, id_projet];

    try {
        const results = await query(queryStr, values);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Modification de budget non effectuée' });
        }

        return res.json({ message: 'Budget mise à jour avec succès' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la quantité validée :", error);
        return res.status(500).json({ error: 'Échec de la mise à jour de la quantité validée' });
    }
};

exports.deleteUpdateBudget = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE budget SET est_supprime = 1 WHERE id_budget = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
        
      return res.json(data);
    });
  };

exports.deleteBudget = (req, res) => {
    const {id} = req.params;
  
    const q = "DELETE FROM budget WHERE id_budget = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }