const express = require("express");
const router = express.Router();
const loginChauffeurController = require('./../controllers/chauffeur.controller');
const { queryAsync } = require("../config/database");

router.post('/login', loginChauffeurController.loginChauffeur);

// Vérifier token (middleware)
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requis' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [id_chauffeur] = decoded.split(':');
    
    const chauffeurs = await queryAsync(`
      SELECT id_chauffeur, nom, prenom, statut 
      FROM chauffeurs 
      WHERE id_chauffeur = ?
    `, [id_chauffeur]);
    
    if (chauffeurs.length === 0) {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }
    
    req.chauffeur = chauffeurs[0];
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

router.get('/profil', verifyToken, loginChauffeurController.profilChauffeur);
router.get('/missions', verifyToken, loginChauffeurController.missionChauffeurById);
router.post('/position', verifyToken, loginChauffeurController.envoyerPosition);

module.exports = router;
