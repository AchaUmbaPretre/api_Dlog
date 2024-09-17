const { db } = require("./../config/database");

exports.getFrequenceCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_frequence) AS nbre_frequence
        FROM frequence
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getFrequence = (req, res) => {

    const q = `
    SELECT 
        *
    FROM frequence
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getFrequenceOne = (req, res) => {
    const {id_frequence} = req.query;

    const q = `
        SELECT *
            FROM frequence
        WHERE id_frequence =${id_frequence}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postFrequence = async (req, res) => {
    try {
        const q = 'INSERT INTO frequence(`nom`, `intervalle`, `unite`, `date_debut`, `date_fin`) VALUES(?,?,?,?,?)';

        const values = [
            req.body.nom,
            req.body.intervalle,
            req.body.unite,
            req.body.date_debut,
            req.body.date_fin
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Frequence ajoutée avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};


exports.deleteFrequence = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM frequence WHERE id_frequence = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }

  exports.putFrequence = (req, res) => {
    const {id_frequence} = req.query;
    if (!id_frequence || isNaN(id_frequence)) {
        return res.status(400).json({ error: 'Invalid Frequence ID provided' });
    }


    try {
        const q = `
            UPDATE tache 
            SET 
                nom_tache = ?,
                description = ?,
                statut = ?,
                date_debut = ?,
                date_fin = ?,
                priorite = ?,
                id_departement = ?,
                id_client = ?,
                id_frequence = ?,
                responsable_principal = ?,
                id_demandeur = ?,
                id_batiment = ?,
                id_ville = ?
            WHERE id_tache = ?
        `;
      
        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            id_tache
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Tache record not found' });
            }
            return res.json({ message: 'Tache record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
  }