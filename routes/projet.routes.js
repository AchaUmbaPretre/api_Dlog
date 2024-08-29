const express = require("express");
const router = express.Router();
const projetController = require('./../controllers/projet.controller')

router.get('/count', projetController.getProjetCount)
router.get('/', projetController.getProjet)
router.get('/one', projetController.getProjetOne)
router.get('/projetTache', projetController.getProjetTache)

router.post('/', projetController.postProjet)
router.post('/suivi_projet', projetController.postSuiviProjet)
router.delete('/:id', projetController.deleteProjet)
 
module.exports = router;