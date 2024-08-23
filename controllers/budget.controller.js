const { db } = require("./../config/database");

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

    const q = `SELECT * FROM budget`;

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
        SELECT *
            FROM budget 
        WHERE budget.id_budget =${id_budget}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postBudget = async (req, res) => {
    try {
        const q = 'INSERT INTO budget(`id_tache`, `id_controle`, `article`, `quantite_demande`, `quantite_validee`, `prix_unitaire`, `montant`, `fournisseur`) VALUES( ?, ?, ?, ?, ?, ?, ?, ?)';

        const values = [
            req.body.id_tache,
            req.body.id_controle,
            req.body.article,
            req.body.quantite_demande,
            req.body.quantite_validee,
            req.body.prix_unitaire,
            req.body.montant,
            req.body.fournisseur
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Tâche personne ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
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