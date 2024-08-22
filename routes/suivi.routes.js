const express = require("express");
const suiviController = require('./../controllers/suivi.controller')
const router = express.Router();

router.get('/count', suiviController.getSuiviCount)
router.get('/', suiviController.getSuivi)
router.get('/one', suiviController.getSuiviOne)
router.post('/', suiviController.postSuivi)
router.delete('/:id', suiviController.deleteSuivi)
 
module.exports = router;