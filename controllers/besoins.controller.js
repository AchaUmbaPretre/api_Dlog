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
                SELECT besoins.description, besoins.quantite, articles.nom_article, projet.nom_projet, projet.id_projet, client.nom FROM besoins
                    LEFT JOIN articles ON besoins.id_article = articles.id_article
                    LEFT JOIN projet ON besoins.id_projet = projet.id_projet
                    LEFT JOIN client ON projet.client =client.id_client
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

exports.getBesoinInactif = (req, res) => {

    const q = `
                SELECT besoins.*, articles.nom_article, projet.nom_projet 
                    FROM besoins
                    INNER JOIN articles ON besoins.id_article = articles.id_article
                    LEFT JOIN projet ON besoins.id_projet = projet.id_projet
                    WHERE besoins.id_projet = 0;
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postBesoins = (req, res) => {

    try {
        const q = 'INSERT INTO besoins(`id_article`,`description`,`id_client`, `quantite`, `priorite`, `id_projet`, `id_batiment`, `personne`) VALUES(?,?,?,?,?,?,?,?)';

        const values = [
            req.body.id_article,
            req.body.description,
            req.body.id_client,
            req.body.quantite,
            req.body.priorite,
            req.body.id_projet,
            req.body.id_batiment,
            req.body.personne
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Besoin record not found' });
            }

            return res.status(201).json({ message: 'Besoins ajouté avec succès'});
        })
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

  //Besoin client

exports.getBesoinClientOne = (req, res) => {
    const {id_projet} = req.query;

    const q = `
                SELECT bc.id_besoin_client, bc.id_besoin,bc.quantite,
                    articles.nom_article,
                    projet.nom_projet,
                    projet.description,
                    client.nom
                FROM besoin_client AS bc
                    INNER JOIN besoins ON bc.id_besoin = besoins.id_besoin
                    INNER JOIN articles ON besoins.id_article = articles.id_article
                    INNER JOIN Projet ON besoins.id_projet = projet.id_projet
                    INNER JOIN client ON bc.id_client = client.id_client
                WHERE besoins.id_projet = ${id_projet}
            `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}
exports.postBesoinsClient = async (req, res) => {

    try {
        const q = 'INSERT INTO besoin_client(`id_besoin`,`id_client`,`quantite`, `id_batiment`) VALUES(?,?,?,?)';

        const values = [
            req.body.id_besoin,
            req.body.id_client,
            req.body.quantite,
            req.body.id_batiment,
            req.body.ville
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Besoin record not found' });
            }

            return res.status(201).json({ message: 'Besoins ajouté avec succès'});
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout du nouveau projet:', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};