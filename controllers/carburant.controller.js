const { db } = require("./../config/database");


exports.getCarburant = (req, res) => {

    const q = `SELECT * FROM carburant`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getCarburantOne = (req, res) => {
    const { id_vehicule } = req.query;

    const q = `SELECT * FROM carburant WHERE id_vehicule = ?`;

    db.query(q, [id_vehicule], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postCarburant = async (req, res) => {
    const { num_pc, num_facture, date_operation, id_vehicule, id_chauffeur, quantite_litres, prix_unitaire, montant_total, id_fournisseur, compteur_km } = req.body;
    try {
        const q = 'INSERT INTO carburant(`num_pc`, `num_facture`, `date_operation`, `id_vehicule`, `id_chauffeur`, `quantite_litres`, `prix_unitaire`, `montant_total`, `id_fournisseur`, `compteur_km`)VALUES(?,?)';

        const values = [
            num_pc, 
            num_facture, 
            date_operation, 
            id_vehicule, 
            id_chauffeur, 
            quantite_litres, 
            prix_unitaire, 
            montant_total, 
            id_fournisseur, 
            compteur_km
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Carburant ajouté avec succès'});
    } catch (error) {
        console.error('Erreur lors de l\'ajout de carburant :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de carburant." });
    }
};
