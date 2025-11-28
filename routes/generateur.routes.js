const express = require("express");
const generateurController = require('../controllers/generateur.controller')
const router = express.Router();

router.get('/', generateurController.getGenerateur)
router.get('/one', generateurController.getGenerateurOne)
router.post('/', generateurController.postGenerateur)
 
module.exports = router;