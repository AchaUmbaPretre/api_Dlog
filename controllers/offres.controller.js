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

exports.postOffres = async (req, res) => {

    try {
        const q = 'INSERT INTO offres(`id_fournisseur`, `nom_offre`, `description`) VALUES(?,?,?)';

        const values = [
            req.body.id_fournisseur || 1,
            req.body.nom_offre,
            req.body.description
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Offre ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l offre :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.deleteOffres = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM offres WHERE id_offre = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }