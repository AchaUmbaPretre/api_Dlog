const missionService = require('../services/mission.service');
const { queryAsync } = require('./../config/database');

//TYPE Mission
exports.getTypeMission = async (req, res) => {
  try {
    
    const mission = await queryAsync(`
      SELECT tm.*
      FROM type_mission tm
    `,);
    
    if (mission.length === 0) {
      return res.status(404).json({ error: 'Aucun type de Mission trouvé' });
    }
    
    res.json(mission);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DÉMARRER
exports.demarrer = async (req, res) => {
  try {
    const { id_bande_sortie } = req.body;
    
    if (!id_bande_sortie) {
      return res.status(400).json({ error: 'id_bande_sortie requis' });
    }
    
    const result = await missionService.demarrer(id_bande_sortie);
    res.json({ message: 'Course démarrée', data: result });
    
  } catch (error) {
    console.error('Erreur demarrer:', error);
    res.status(500).json({ error: error.message });
  }
};

// TERMINER
exports.terminer = async (req, res) => {
  try {
    const { id_bande_sortie } = req.body;
    
    if (!id_bande_sortie) {
      return res.status(400).json({ error: 'id_bande_sortie requis' });
    }
    
    const result = await missionService.terminer(id_bande_sortie);
    res.json({ message: 'Course terminée', data: result });
    
  } catch (error) {
    console.error('Erreur terminer:', error);
    res.status(500).json({ error: error.message });
  }
};

// MISSION COMPLET (synchronisation manuelle)
exports.missionComplet = async (req, res) => {
  try {
    const result = await missionService.traiterMissionsSansDistance();
    res.json(result);
    
  } catch (error) {
    console.error('Erreur missionComplet:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les détails d'une mission
exports.getMission = async (req, res) => {
  try {
    const { id } = req.params;
    
    const mission = await queryAsync(`
      SELECT bs.*, v.immatriculation, v.consommation
      FROM bande_sortie bs
      JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE bs.id_bande_sortie = ?
    `, [id]);
    
    if (mission.length === 0) {
      return res.status(404).json({ error: 'Mission non trouvée' });
    }
    
    res.json(mission[0]);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Démarrer l'approche client
exports.startApproche = async (req, res) => {
  try {
    const { id_bande_sortie } = req.body;

    
    if (!id_bande_sortie) {
      return res.status(400).json({ error: 'id_bande_sortie requis' });
    }
    
    const result = await missionService.startApproche(id_bande_sortie);
    res.json({ message: 'Approche démarrée', data: result });
    
  } catch (error) {
    console.log(error.message)
    console.error('Erreur startApproche:', error);
    res.status(500).json({ error: error.message });
  }
};

// Terminer l'approche client et calculer distance
exports.endApproche = async (req, res) => {
  try {
    const { id_bande_sortie } = req.body;
    
    if (!id_bande_sortie) {
      return res.status(400).json({ error: 'id_bande_sortie requis' });
    }
    
    const result = await missionService.endApproche(id_bande_sortie);
    res.json({ message: 'Approche terminée', data: result });
    
  } catch (error) {
    console.error('Erreur endApproche:', error);
    res.status(500).json({ error: error.message });
  }
};