const { queryAsync } = require('../config/database');
const { fetchHistory } = require('../utils/falcon');

// DÉMARRER
exports.demarrer = async (req, res) => {
  const { id_bande_sortie } = req.body;
  
  await queryAsync(`
    UPDATE bande_sortie 
    SET sortie_time = NOW(), statut_mission = 'en_cours'
    WHERE id_bande_sortie = ?
  `, [id_bande_sortie]);
  
  res.json({ message: 'Course démarrée' });
};


// TERMINER  
exports.terminer = async (req, res) => {
  const { id_bande_sortie } = req.body;
  
  await queryAsync(`
    UPDATE bande_sortie 
    SET retour_time = NOW(), statut_mission = 'terminee'
    WHERE id_bande_sortie = ?
  `, [id_bande_sortie]);
  
  res.json({ message: 'Course terminée' });
};

exports.missionComplet = async (req, res) => {
  try {
    // 1. Récupérer les missions terminées sans distance
    const missions = await queryAsync(`
      SELECT bs.id_bande_sortie, bs.sortie_time, bs.retour_time, v.id_falcon, v.consommation
      FROM bande_sortie bs
      JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE bs.statut_mission = 'terminee'
        AND bs.distance_km IS NULL
        AND v.id_falcon IS NOT NULL
        AND bs.sortie_time IS NOT NULL
        AND bs.retour_time IS NOT NULL
      LIMIT 10
    `);

    if (missions.length === 0) {
      return res.json({ message: 'Aucune mission à traiter', missions: [] });
    }

    const results = [];

    for (const mission of missions) {
      try {
        // 2. Appeler Falcon entre sortie_time et retour_time
        const falconData = await fetchHistory(mission.id_falcon, mission.sortie_time, mission.retour_time);
        
        // 3. Calculer la distance totale
        let distanceKm = 0;
        
        if (falconData && falconData.items) {
          for (const item of falconData.items) {
            if (item.distance && item.distance > 0) {
              distanceKm += item.distance;
            }
          }
        }
        
        // 4. Calculer le carburant
        const consommation = mission.consommation || 0.12; // 12L/100km par défaut
        const carburantLitres = distanceKm * consommation;
        
        // 5. Mettre à jour la mission
        await queryAsync(`
          UPDATE bande_sortie 
          SET distance_km = ?, carburant_litres = ?
          WHERE id_bande_sortie = ?
        `, [distanceKm, carburantLitres, mission.id_bande_sortie]);
        
        results.push({
          id_bande_sortie: mission.id_bande_sortie,
          distance_km: distanceKm,
          carburant_litres: carburantLitres,
          status: 'ok'
        });
        
        console.log(`✅ Mission ${mission.id_bande_sortie}: ${distanceKm} km, ${carburantLitres} L`);
        
      } catch (error) {
        console.error(`❌ Erreur mission ${mission.id_bande_sortie}:`, error.message);
        results.push({
          id_bande_sortie: mission.id_bande_sortie,
          error: error.message,
          status: 'error'
        });
      }
      
      // Pause pour éviter de surcharger l'API Falcon
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({
      message: 'Traitement terminé',
      traitees: results.filter(r => r.status === 'ok').length,
      erreurs: results.filter(r => r.status === 'error').length,
      details: results
    });
    
  } catch (error) {
    console.error('Erreur globale:', error);
    res.status(500).json({ error: error.message });
  }
};
