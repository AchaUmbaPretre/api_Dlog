const express = require("express");
const router = express.Router();
const multer = require('multer');
const sortieEamFmpController = require('./../controllers/sortieEamFmp.controller');

router.get('/eam', sortieEamFmpController.getSortieEam);
router.get('/fmp', sortieEamFmpController.getSortieFmp);
router.get('/smr', sortieEamFmpController.getSMR);
router.get('/reconciliation', sortieEamFmpController.getReconciliation);

module.exports = router;
