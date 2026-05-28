const { queryAsync } = require("./../config/database");
const moment = require('moment');

exports.getVehicule = async (req, res) => {
  // Maintenant ces valeurs viennent directement du token
  const { tenantId, isSuperAdmin } = req;
  const user = req.user;
  
  try {
    let query;
    let params = [];
    
    if (isSuperAdmin) {
      query = `
        SELECT v.*, 
               marque.nom_marque, 
               modeles.modele, 
               cv.nom_cat 
        FROM vehicules v
        INNER JOIN marque ON v.id_marque = marque.id_marque
        LEFT JOIN modeles ON v.id_modele = modeles.id_modele
        INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        WHERE v.est_supprime = 0
      `;
    } else if (tenantId) {
      query = `
        SELECT v.*, 
               marque.nom_marque, 
               modeles.modele, 
               cv.nom_cat 
        FROM vehicules v
        INNER JOIN marque ON v.id_marque = marque.id_marque
        LEFT JOIN modeles ON v.id_modele = modeles.id_modele
        INNER JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
        WHERE v.est_supprime = 0 AND v.tenant_id = ?
      `;
      params = [tenantId];
    } else {
      return res.status(200).json({
        message: 'Aucun véhicule disponible',
        data: []
      });
    }
    
    const vehicules = await queryAsync(query, params);
    
    console.log(`📊 ${vehicules.length} véhicules trouvés`);
    
    return res.status(200).json({
      message: 'Liste des véhicules récupérés avec succès',
      data: vehicules,
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({
      error: error.message
    });
  }
};