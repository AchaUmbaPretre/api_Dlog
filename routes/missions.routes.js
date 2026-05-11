const express = require('express');
const router = express.Router();
const missionController = require('../controllers/mission.controller');

// Routes publiques
router.post('/demarrer', missionController.demarrer);
router.post('/terminer', missionController.terminer);
router.get('/mission-complet', missionController.missionComplet);
router.get('/:id', missionController.getMission);

module.exports = router;