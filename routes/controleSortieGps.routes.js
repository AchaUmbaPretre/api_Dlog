const express = require('express');
const router = express.Router();
const rapprochementService = require('../services/controleSortieGps.service');
const controleSortieGpsControlle = require('./../controllers/controleSortieGps.controller')
router.get('/statistiques', controleSortieGpsControlle.getStatistique);

// Récupérer les contrôles du jour
router.get('/controles', controleSortieGpsControlle.getControleBsGps);

// Récupérer uniquement les sorties sans bon
router.get('/sorties-sans-bon', controleSortieGpsControlle.getSortiesSansBon);

// Régulariser une sortie sans bon
router.post('/regulariser/:id', controleSortieGpsControlle.postRegulariser);

module.exports = router;