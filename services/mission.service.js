const { queryAsync } = require('../config/database');
const falconService = require('./falcon.service');

class MissionService {
  
  // Démarrer une mission
  async demarrer(id_bande_sortie) {
    console.log('bs', id_bande_sortie)
    const result = await queryAsync(`
      UPDATE bande_sortie 
      SET sortie_time = NOW(), statut_mission = 'en_cours'
      WHERE id_bande_sortie = ?
    `, [id_bande_sortie]);
    
    return { id_bande_sortie, statut: 'en_cours' };
  }
  
  // Terminer une mission
  async terminer(id_bande_sortie) {
    const result = await queryAsync(`
      UPDATE bande_sortie 
      SET retour_time = NOW(), statut_mission = 'terminee'
      WHERE id_bande_sortie = ?
    `, [id_bande_sortie]);
    
    return { id_bande_sortie, statut: 'terminee' };
  }
  
  // Récupérer les missions terminées sans distance
  async getMissionsSansDistance(limit = 10) {
    const missions = await queryAsync(`
      SELECT bs.id_bande_sortie, bs.sortie_time, bs.retour_time, 
             v.id_capteur, v.consommation_carburant
      FROM bande_sortie bs
      JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE bs.statut_mission = 'terminee'
        AND bs.distance_km IS NULL
        AND v.id_capteur IS NOT NULL
        AND bs.sortie_time IS NOT NULL
        AND bs.retour_time IS NOT NULL
      LIMIT ?
    `, [limit]);
    
    return missions;
  }
  
  // Mettre à jour distance et carburant
  async updateDistanceCarburant(id_bande_sortie, distanceKm, carburantLitres) {
    await queryAsync(`
      UPDATE bande_sortie 
      SET distance_km = ?, carburant_litres = ?
      WHERE id_bande_sortie = ?
    `, [distanceKm, carburantLitres, id_bande_sortie]);
  }
  
  // Traiter toutes les missions sans distance
  async traiterMissionsSansDistance() {
    const missions = await this.getMissionsSansDistance();
    
    if (missions.length === 0) {
      return { traitees: 0, erreurs: 0, details: [] };
    }
    
    const results = [];
    
    for (const mission of missions) {
      try {
        // Appeler Falcon
        const falconData = await falconService.getHistory(
          mission.id_capteur, 
          mission.sortie_time, 
          mission.retour_time
        );
        
        // Calculer distance
        const distanceKm = falconService.calculerDistanceTotale(falconData);
        
        // Calculer carburant
        const consommation = mission.consommation || 0.12;
        const carburantLitres = falconService.calculerCarburant(distanceKm, consommation);
        
        // Mettre à jour
        await this.updateDistanceCarburant(mission.id_bande_sortie, distanceKm, carburantLitres);
        
        results.push({
          id_bande_sortie: mission.id_bande_sortie,
          distance_km: distanceKm,
          carburant_litres: carburantLitres,
          status: 'ok'
        });
        
      } catch (error) {
        results.push({
          id_bande_sortie: mission.id_bande_sortie,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    return {
      traitees: results.filter(r => r.status === 'ok').length,
      erreurs: results.filter(r => r.status === 'error').length,
      details: results
    };
  }

    // Démarrer l'approche client
  async startApproche(id_bande_sortie) {
    await queryAsync(`
      UPDATE bande_sortie 
      SET approche_start_time = NOW()
      WHERE id_bande_sortie = ?
    `, [id_bande_sortie]);
    
    return { id_bande_sortie, approche_start_time: new Date() };
  }
  
  // Terminer l'approche client et calculer distance avec Falcon
  async endApproche(id_bande_sortie) {
    // 1. Récupérer les infos de la mission
    const mission = await queryAsync(`
      SELECT bs.id_vehicule, bs.approche_start_time, v.id_capteur, v.consommation_carburant
      FROM bande_sortie bs
      JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE bs.id_bande_sortie = ?
    `, [id_bande_sortie]);
    
    if (mission.length === 0) {
      throw new Error('Mission non trouvée');
    }
    
    const data = mission[0];
    const startTime = data.approche_start_time;
    const endTime = new Date();
    
    // 2. Appeler Falcon pour récupérer la distance entre startTime et endTime
    const falconData = await falconService.getHistory(
      data.id_capteur,
      startTime,
      endTime
    );
    
    // 3. Calculer distance et carburant
    const distanceKm = falconService.calculerDistanceTotale(falconData);
    const consommation = data.consommation_carburant || 0.12;
    const carburantLitres = falconService.calculerCarburant(distanceKm, consommation);
    
    // 4. Mettre à jour la bande_sortie
    await queryAsync(`
      UPDATE bande_sortie 
      SET approche_end_time = NOW(),
          distance_approche_km = ?,
          carburant_approche_litres = ?
      WHERE id_bande_sortie = ?
    `, [distanceKm, carburantLitres, id_bande_sortie]);
    
    return {
      id_bande_sortie,
      distance_approche_km: distanceKm,
      carburant_approche_litres: carburantLitres,
      approche_start_time: startTime,
      approche_end_time: endTime
    };
  }
}

module.exports = new MissionService();