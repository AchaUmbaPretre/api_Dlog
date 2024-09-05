const { db } = require("./../config/database");
const cheerio = require('cheerio'); // Ajoutez cheerio pour le parsing HTML

exports.getBesoinCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_besoin) AS nbre_besoin
        FROM besoins
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getBesoin = (req, res) => {

    const q = `
                SELECT besoins.*, articles.nom_article, projet.nom_projet FROM besoins
                    INNER JOIN articles ON besoins.id_article = articles.id_article
                    INNER JOIN projet ON besoins.id_projet = projet.id_projet
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getBesoinOne = (req, res) => {
    const {id_besoin} = req.query;

    const q = `
                SELECT besoins.*, articles.nom_article, projet.nom_projet FROM besoins
                    INNER JOIN articles ON besoins.id_article = articles.id_article
                    INNER JOIN projet ON besoins.id_projet = projet.id_projet
                WHERE besoins.id_projet = ${id_besoin}
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postBesoins = async (req, res) => {

    try {
        const q = 'INSERT INTO besoins(`description`, `quantite`) VALUES(?, ?)';

        const values = [
            req.body.description,
            req.body.quantite 
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Besoins ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.deleteBesoins = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM besoins WHERE id_besoin = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }