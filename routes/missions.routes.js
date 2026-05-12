const express = require('express');
const router = express.Router();
const missionController = require('../controllers/mission.controller');

// Routes publiques
router.post('/demarrer', missionController.demarrer);
router.post('/terminer', missionController.terminer);
router.get('/mission-complet', missionController.missionComplet);
router.get('/:id', missionController.getMission);

router.post('/approche/start', missionController.startApproche);
router.post('/approche/end', missionController.endApproche);
module.exports = router;