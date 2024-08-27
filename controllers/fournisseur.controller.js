const { db } = require("./../config/database");

exports.getFournisseurCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_fournisseur) AS nbre_fournisseur
        FROM fournisseur
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getFournisseur = (req, res) => {

    const q = `
            SELECT * FROM fournisseur
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


exports.postFournisseur = async (req, res) => {

    try {
        const q = 'INSERT INTO fournisseur(`nom_fournisseur`, `telephone`, `email`, `adresse`, `ville`, `pays`) VALUES(?,?,?,?,?,?)';

        const values = [
            req.body.nom_fournisseur,
            req.body.telephone,
            req.body.email,
            req.body.adresse,
            req.body.ville,
            req.body.pays 
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Projet ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.deleteFournisseur = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM fournisseur WHERE id_fournisseur = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }