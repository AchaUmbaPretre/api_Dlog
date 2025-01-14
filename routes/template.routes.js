const express = require("express");
const templateController = require("../controllers/template.controller");
const router = express.Router();

router.get('/count', templateController.getTemplateCount)
router.get('/', templateController.getTemplate)
router.get('/5derniers', templateController.getTemplate5Derniers);
router.get('/2mois_precedents', templateController.getTemplateDeuxPrecedent);
router.get('/one', templateController.getTemplateOne)
router.post('/', templateController.postTemplate)
router.put('/statut', templateController.putTemplateStatut)
router.put('/template_update_delete', templateController.deleteUpdateTemplate)
router.put('/template_update', templateController.putTemplate)

//Type d'occupation
router.get('/type_occupation', templateController.getTypeOccupation)
router.get('/objet_facture', templateController.getObjetFacture)


//Déclaration superficie
router.get('/declaration_count', templateController.getDeclarationCount)
router.post('/declaration_superficies', templateController.getDeclaration)
router.post('/declaration_superficies_client_OneAll', templateController.getDeclarationClientOneAll)
router.get('/declaration_superficies_5derniers', templateController.getDeclaration5derniers)
router.get('/declaration_superficie/one', templateController.getDeclarationOne);
router.get('/declaration_superficie/oneClient', templateController.getDeclarationOneClient)
router.post('/declaration_superficie', templateController.postDeclaration)
router.put('/declaration_superficie_delete', templateController.deleteUpdateDeclaration)
router.put('/declaration_superficie', templateController.putDeclaration)

//Contrat
router.get('/contrat', templateController.getContrat)
router.get('/contratOne', templateController.getContratClientOne)
router.post('/contrat', templateController.postContrat)

//Type contrat
router.get('/type_contrat', templateController.getContratTypeContrat)

//Rapport
router.post('/rapport_facture', templateController.getRapportFacture)
router.get('/rapport_ville', templateController.getRapportVille)
router.get('/rapport_manutentation', templateController.getRapportManutention)
router.post('/rapport_entreposage', templateController.getRapportEntreposage)

module.exports = router;