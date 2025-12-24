const express = require("express");
const router = express.Router();
const multer = require('multer');
const sortieEamFmpController = require('./../controllers/sortieEamFmp.controller');

router.get('/eam', sortieEamFmpController.getSortieEam);
router.get('/fmp', sortieEamFmpController.getSortieFmp);
router.get('/smr', sortieEamFmpController.getSMR);
router.get('/reconciliation', sortieEamFmpController.getReconciliation);

router.post('/eam_post', sortieEamFmpController.postEamDocPhysique);
router.post('/fmp_post', sortieEamFmpController.postFmpDocPhysique);

module.exports = router;
