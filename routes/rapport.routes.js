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
router.get('/contrat_parametre/one', rapportController.getParametreRapportOne)
router.get('/contrat_parametreContratCat', rapportController.getParametreContratCat)


//Element contrat
router.get('/element_contrat', rapportController.getElementContrat)
router.get('/element_contratCat', rapportController.getElementContratCat)
router.post('/element_contrat', rapportController.postElementContrat)

//Etiquette
router.get('/etiquette', rapportController.getEtiquette)
router.post('/etiquette', rapportController.postEtiquette)

//Contrat
router.get('/contrat_rapport', rapportController.getContratRapport)
router.get('/contrat_rapportClient', rapportController.getContratRapportClient)
router.get('/contrat_rapportClientOne', rapportController.getContratRapportClientOne)
router.post('/contrat_rapport', rapportController.postContratRapport)

router.get('/declarationTemplate', rapportController.getDeclarationTemplateOne)
router.get('/cloture', rapportController.getClotureRapport)
router.post('/cloture', rapportController.postClotureRapport)
router.post('/cloture_simple', rapportController.postClotureRapportSimple)

//Rapport de bon
router.get('/rapport_bon_global', rapportController.getRapportBonGlobal)
router.get('/rapport_performance', rapportController.getRapportPerformanceBon)
router.get('/rapport_statut_principaux', rapportController.getStatutsPrincipaux)
router.get('/rapport_indicateurs_log', rapportController.getRapportKpi)

module.exports = router;