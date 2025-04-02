const express = require("express");
const router = express.Router();
const rapportController = require('./../controllers/rapport.controller')


router.get('/', rapportController.getRapport)
router.get('/one', rapportController.getRapportOne)
router.post('/', rapportController.postRapport)

//Categorie rapport
router.get('/cat_rapport', rapportController.getCatRapport)

//Parametre
router.get('/contrat_parametre', rapportController.getParametreRapport)
router.post('/contrat_parametre', rapportController.postParametreRapport)

//Element contrat
router.get('/element_contrat', rapportController.getElementContrat)
router.post('/element_contrat', rapportController.postElementContrat)

//Etiquette
router.get('/etiquette', rapportController.getElementContrat)
router.post('/etiquette', rapportController.postElementContrat)

//Contrat
router.get('/contrat_rapport', rapportController.getContratRapport)
router.post('/contrat_rapport', rapportController.postContratRapport)

router.get('/declarationTemplate', rapportController.getDeclarationTemplateOne)
router.get('/cloture', rapportController.getClotureRapport)
router.post('/cloture', rapportController.postClotureRapport)
router.post('/cloture_simple', rapportController.postClotureRapportSimple)

module.exports = router;