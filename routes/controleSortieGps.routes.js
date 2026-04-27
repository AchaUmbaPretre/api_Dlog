const express = require('express');
const router = express.Router();
const controleSortieGpsControlle = require('./../controllers/controleSortieGps.controller');

router.get('/statistiques', controleSortieGpsControlle.getStatistique);

router.get('/controles', controleSortieGpsControlle.getControleBsGps);

router.get('/sorties-sans-bon', controleSortieGpsControlle.getSortiesSansBon);

router.post('/regulariser/:id', controleSortieGpsControlle.postRegulariser);

module.exports = router;