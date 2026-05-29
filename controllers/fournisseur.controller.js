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
    const { tenantId, isSuperAdmin } = req;
    
    let q;
    let params = [];
    
    if (isSuperAdmin) {
        q = `
            SELECT 
                f.*,
                p.capital as province_nom
            FROM fournisseur f
            LEFT JOIN provinces p ON f.id_ville = p.id
            ORDER BY f.nom ASC
        `;
    } else if (tenantId) {
        q = `
            SELECT 
                f.*,
                p.capital as province_nom
            FROM fournisseur f
            LEFT JOIN provinces p ON f.id_ville = p.id
            WHERE f.tenant_id = ?
            ORDER BY f.nom ASC
        `;
        params = [tenantId];
    } else {
        return res.status(200).json([]);
    }
    
    db.query(q, params, (error, data) => {
        if (error) {
            console.error('Erreur getFournisseur:', error);
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

exports.getFournisseurActiviteOne = async (req, res) => {
  try {
    const { id_activite } = req.query;

    // Validation d’entrée
    if (!id_activite) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'id_activite' est requis."
      });
    }

    const query = `
      SELECT 
        f.id_fournisseur, 
        a.nom_activite, 
        f.nom_fournisseur, 
        f.telephone, 
        f.email, 
        f.adresse, 
        f.pays
      FROM activite_fournisseur AS af
      LEFT JOIN fournisseur AS f 
        ON af.id_fournisseur = f.id_fournisseur
      LEFT JOIN provinces AS p 
        ON f.ville = p.id
      LEFT JOIN activite AS a 
        ON af.id_activite = a.id_activite
      WHERE af.id_activite = ?
    `;

    db.query(query, [id_activite], (err, data) => {
      if (err) {
        console.error("Erreur SQL :", err);
        return res.status(500).json({
          success: false,
          message: "Erreur lors de la récupération des fournisseurs.",
          error: err.message
        });
      }

      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Aucun fournisseur trouvé pour cette activité."
        });
      }

      return res.status(200).json(data);
    });

  } catch (error) {
    console.error("Erreur serveur :", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue.",
      error: error.message
    });
  }
};

exports.postFournisseur = async (req, res) => {
    const { nom_activite } = req.body;
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id;
    
    if (!tenantId && !isSuperAdmin) {
        return res.status(403).json({ error: 'Non autorisé à créer un fournisseur' });
    }
    
    const finalTenantId = tenantId;
    
    const q = `
        INSERT INTO fournisseur 
        (nom_fournisseur, telephone, email, adresse, ville, pays, tenant_id, created_by, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
        req.body.nom_fournisseur,
        req.body.telephone,
        req.body.email,
        req.body.adresse,
        req.body.ville,
        req.body.pays,
        finalTenantId,
        currentUserId
    ];
    
    db.query(q, values, (error, data) => {
        if (error) {
            console.error('Erreur insertion fournisseur:', error);
            return res.status(500).send(error);
        }
        
        const fournisseurId = data.insertId;
        
        if (nom_activite && nom_activite.length > 0) {
            const qActivite = 'INSERT INTO activite_fournisseur (id_fournisseur, id_activite) VALUES (?, ?)';
            
            const promises = nom_activite.map(item => {
                return new Promise((resolve, reject) => {
                    db.query(qActivite, [fournisseurId, item], (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });
            });
            
            Promise.all(promises)
                .then(() => {
                    res.status(201).json({ 
                        message: 'Fournisseur et activités ajoutés avec succès',
                        data: { id_fournisseur: fournisseurId, tenant_id: finalTenantId }
                    });
                })
                .catch(err => {
                    console.error('Erreur activités:', err);
                    res.status(500).json({ error: "Erreur lors de l'ajout des activités." });
                });
        } else {
            res.status(201).json({ 
                message: 'Fournisseur ajouté avec succès',
                data: { id_fournisseur: fournisseurId, tenant_id: finalTenantId }
            });
        }
    });
};

exports.deleteFournisseur = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM fournisseur WHERE id_fournisseur = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }