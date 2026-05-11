const { fetchHistory } = require('../utils/falcon');

class FalconService {
  
  // Récupérer l'historique d'un véhicule
  async getHistory(deviceId, startTime, endTime) {
    return await fetchHistory(deviceId, startTime, endTime);
  }
  
  // Calculer la distance totale depuis les données Falcon
  calculerDistanceTotale(falconData) {
    let distanceKm = 0;
    
    if (falconData && falconData.items) {
      for (const item of falconData.items) {
        if (item.distance && item.distance > 0) {
          distanceKm += item.distance;
        }
      }
    }
    
    return parseFloat(distanceKm.toFixed(2));
  }
  
  // Calculer le carburant consommé
  calculerCarburant(distanceKm, consommationLKm) {
    const carburant = distanceKm * consommationLKm;
    return parseFloat(carburant.toFixed(2));
  }
  
  // Calculer le coût du carburant
  calculerCoutCarburant(carburantLitres, prixParLitre = 950) {
    return parseFloat((carburantLitres * prixParLitre).toFixed(0));
  }
  
  // Vérifier si les données Falcon sont valides
  isDataValid(falconData) {
    return falconData && falconData.items && Array.isArray(falconData.items);
  }
}

module.exports = new FalconService();