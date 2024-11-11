const express = require("express");
const templateController = require("../controllers/template.controller");
const router = express.Router();

router.get('/count', templateController.getTemplateCount)
router.get('/', templateController.getTemplate)
router.get('/5derniers', templateController.getTemplate5Derniers)
router.get('/one', templateController.getTemplateOne)
router.post('/', templateController.postTemplate)
router.put('/statut', templateController.putTemplateStatut)
router.put('/template_delete', templateController.deleteUpdateTemplate)

//Type d'occupation
router.get('/type_occupation', templateController.getTypeOccupation)
router.get('/objet_facture', templateController.getObjetFacture)


//Déclaration superficie
router.get('/declaration_count', templateController.getDeclarationCount)
router.post('/declaration_superficies', templateController.getDeclaration)
router.get('/declaration_superficie/one', templateController.getDeclarationOne)
router.post('/declaration_superficie', templateController.postDeclaration)
router.put('/declaration_superficie_delete', templateController.deleteUpdateDeclaration)

module.exports = router;