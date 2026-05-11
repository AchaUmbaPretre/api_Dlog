const { queryAsync } = require('../config/database');

// DÉMARRER
app.post('/api/chauffeur/demarrer', async (req, res) => {
  const { id_bande_sortie } = req.body;
  
  await queryAsync(`
    UPDATE bande_sortie 
    SET sortie_time = NOW(), statut_mission = 'en_cours'
    WHERE id_bande_sortie = ?
  `, [id_bande_sortie]);
  
  res.json({ message: 'Course démarrée' });
});

// TERMINER
app.post('/api/chauffeur/terminer', async (req, res) => {
  const { id_bande_sortie } = req.body;
  
  await queryAsync(`
    UPDATE bande_sortie 
    SET retour_time = NOW(), statut_mission = 'terminee'
    WHERE id_bande_sortie = ?
  `, [id_bande_sortie]);
  
  res.json({ message: 'Course terminée' });
});