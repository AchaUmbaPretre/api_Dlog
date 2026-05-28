const missionService = require('../services/mission.service');

async function syncFalcon() {
  
  try {
    const result = await missionService.traiterMissionsSansDistance();
    
    
    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        if (detail.status === 'ok') {
          console.log(`   - Mission ${detail.id_bande_sortie}: ${detail.distance_km} km, ${detail.carburant_litres} L`);
        } else {
          console.log(`   - Mission ${detail.id_bande_sortie}: ERREUR - ${detail.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
  }
  
}

// Le plus simple : juste ça dans app.js
setInterval(() => {
  syncFalcon();
}, 60 * 60 * 1000); // 1 heure

module.exports = { syncFalcon };