const { db } = require("./../config/database");

exports.getFormat = (req, res) => {

    const q = `
    SELECT 
        *
    FROM format
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postFormat = async (req, res) => {
    try {
        const q = 'INSERT INTO format(`nom_format`, `description` VALUES(?,?)';

        const values = [
            req.body.nom_format,
            req.body.description
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Format ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.deleteFormat = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM format WHERE id_format = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }
