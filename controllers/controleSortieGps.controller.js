const { queryAsync } = require('../config/database');
const rapprochementService = require('../services/controleSortieGps.service');

exports.getStatistique =async (req, res) => {
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
};

// Récupérer les contrôles du jour
exports.getControleBsGps = async (req, res) => {
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
};

// Récupérer uniquement les sorties sans bon
exports.getSortiesSansBon = async (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter = date || new Date().toISOString().split('T')[0];
    
    const rows = await queryAsync(`
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
};

// Régulariser une sortie sans bon /regulariser/:id
exports.postRegulariser = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_bon_sortie, commentaire, user_id } = req.body;
    
    await rapprochementService.regulariser(id, id_bon_sortie, commentaire, user_id);
    
    res.json({ success: true, message: 'Sortie régularisée avec succès' });
    
  } catch (error) {
    console.error('Erreur régularisation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};