const express = require("express");
const router = express.Router();
const rapportController = require('./../controllers/rapport.controller')
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

router.get('/', rapportController.getRapport)
router.get('/one', rapportController.getRapportOne)
router.post('/', rapportController.postRapport)

module.exports = router;