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

exports.getFournisseurActivite = (req, res) => {

    const q = `
            SELECT fournisseur.id_fournisseur, activite.nom_activite, fournisseur.nom_fournisseur, fournisseur.telephone, fournisseur.email, fournisseur.adresse, fournisseur.pays FROM activite_fournisseur
        LEFT JOIN fournisseur ON activite_fournisseur.id_fournisseur = fournisseur.id_fournisseur
        LEFT JOIN provinces ON fournisseur.ville = provinces.id
        LEFT JOIN activite ON activite_fournisseur.id_activite = activite.id_activite
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};



exports.postFournisseur = async (req, res) => {
    const { nom_activite } = req.body;

    try {
        const q = 'INSERT INTO fournisseur(`nom_fournisseur`, `telephone`, `email`, `adresse`, `ville`, `pays`) VALUES(?,?,?,?,?,?)';
        const qActivite = 'INSERT INTO activite_fournisseur(`id_fournisseur`, `id_activite`) VALUES(?,?)';

        const values = [
            req.body.nom_fournisseur,
            req.body.telephone,
            req.body.email,
            req.body.adresse,
            req.body.ville,
            req.body.pays
        ];

        db.query(q, values, (error, data) => {
            if (error) {
                return res.status(500).send(error);
            }

            const fournisseurId = data.insertId;

            const insertFournisseurQueries = nom_activite.map(item => {
                return new Promise((resolve, reject) => {
                    db.query(qActivite, [fournisseurId, item], (error, result) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result);
                    });
                });
            });

            Promise.all(insertFournisseurQueries)
                .then(() => {
                    return res.status(201).json({ message: 'Fournisseur et activités ajoutés avec succès' });
                })
                .catch(err => {
                    console.error('Erreur lors de l\'ajout des activités:', err);
                    return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des activités." });
                });
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau fournisseur:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du fournisseur." });
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