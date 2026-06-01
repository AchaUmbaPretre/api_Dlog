const express = require("express");
const router = express.Router();
const reparationController = require('./../controllers/reparation.controller');
const multer = require('multer');
const path = require('path');

//Controle technique
router.get('/controle_technique', reparationController.getControleTechnique)
router.post('/controle_technique', reparationController.postControlTechnique)

module.exports = router;