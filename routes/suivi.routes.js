const express = require("express");
const suiviController = require('./../controllers/suivi.controller')
const router = express.Router();

router.get('/count', suiviController.getSuiviCount)
router.get('/', suiviController.getSuivi)
router.get('/one', suiviController.getSuiviOne)
router.get('/suiviTacheOne', suiviController.getSuiviTacheOne)
router.get('/suiviTacheOneV', suiviController.getSuiviTacheOneV)
router.post('/', suiviController.postSuivi)
router.post('/suiviTache', suiviController.postSuiviTache)
router.delete('/:id', suiviController.deleteSuivi)
 
module.exports = router;