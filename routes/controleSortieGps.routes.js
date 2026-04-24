const express = require('express');
const router = express.Router();
const rapprochementService = require('../services/controleSortieGps.service');

router.get('/statistiques', async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await rapprochementService.getStatistiques(date);
    
    res.json({
      success: true,
      ...stats
    });
    
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer les contrôles du jour
router.get('/controles', async (req, res) => {
  try {
    const { date } = req.query;
    const controles = await rapprochementService.getControles(date);
    
    res.json({
      success: true,
      data: controles
    });
    
  } catch (error) {
    console.error('Erreur récupération contrôles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer uniquement les sorties sans bon
router.get('/sorties-sans-bon', async (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter = date || new Date().toISOString().split('T')[0];
    
    const [rows] = await db.query(`
      SELECT 
        cs.*,
        bs.numero_bon_sortie,
        c.nom as chauffeur_nom,
        c.telephone
      FROM controle_sorties cs
      LEFT JOIN bande_sortie bs ON cs.bon_id = bs.id_bande_sortie
      LEFT JOIN chauffeur c ON bs.id_chauffeur = c.id_chauffeur
      WHERE cs.statut = 'SORTIE_SANS_BON'
        AND DATE(cs.created_at) = ?
      ORDER BY cs.gps_heure DESC
    `, [dateFilter]);
    
    res.json({ success: true, data: rows });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Régulariser une sortie sans bon
router.post('/regulariser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_bon_sortie, commentaire, user_id } = req.body;
    
    await rapprochementService.regulariser(id, id_bon_sortie, commentaire, user_id);
    
    res.json({ success: true, message: 'Sortie régularisée avec succès' });
    
  } catch (error) {
    console.error('Erreur régularisation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;