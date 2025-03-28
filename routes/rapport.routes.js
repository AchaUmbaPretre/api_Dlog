const express = require("express");
const router = express.Router();
const rapportController = require('./../controllers/rapport.controller')


router.get('/', rapportController.getRapport)
router.get('/one', rapportController.getRapportOne)
router.post('/', rapportController.postRapport)

router.get('/contrat_rapport', rapportController.getContratRapport)
router.post('/contrat_rapport', rapportController.postContratRapport)

module.exports = router;