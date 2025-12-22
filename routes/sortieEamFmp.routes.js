const express = require("express");
const router = express.Router();
const multer = require('multer');
const sortieEamFmpController = require('./../controllers/sortieEamFmp.controller');

router.get('/eam', sortieEamFmpController.getSortieEam)
router.get('/fmp', sortieEamFmpController.getSortieFmp)

module.exports = router;
