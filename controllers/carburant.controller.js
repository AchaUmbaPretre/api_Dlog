const { db } = require("./../config/database");

exports.getCarburant = (req, res) => {

    const q = `SELECT c.id_carburant, 
                c.num_pc, 
                c.num_facture, 
                c.date_operation, 
                c.quantite_litres, 
                c.prix_unitaire, 
                c.montant_total, 
                c.compteur_km, 
                c.distance, 
                c.consommation,
                v.id_vehicule,
                v.immatriculation,
                ch.nom AS nom_chauffeur,
                ch.prenom AS prenom,
                f.nom_fournisseur
                FROM carburant c
                INNER JOIN vehicules v ON c.id_vehicule = v.id_vehicule
                INNER JOIN fournisseur f ON c.id_fournisseur = f.id_fournisseur
                LEFT JOIN chauffeurs ch ON c.id_chauffeur = ch.id_chauffeur
            `;

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
  const {
    num_pc,
    num_facture,
    date_operation,
    id_vehicule,
    id_chauffeur,
    quantite_litres,
    prix_unitaire,
    montant_total,
    id_fournisseur,
    compteur_km,
    distance,
    consommation
  } = req.body;

  try {
    const q = `
      INSERT INTO carburant (
        num_pc,
        num_facture,
        date_operation,
        id_vehicule,
        id_chauffeur,
        quantite_litres,
        prix_unitaire,
        montant_total,
        id_fournisseur,
        compteur_km,
        distance,
        consommation
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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
      compteur_km,
      distance,
      consommation
    ];

    await db.query(q, values);

    return res.status(201).json({ message: 'Carburant ajouté avec succès' });
  } catch (error) {
    console.error("Erreur lors de l'ajout de carburant :", error);
    return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de carburant." });
  }
};
