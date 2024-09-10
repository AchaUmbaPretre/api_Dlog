const express = require("express");
const router = express.Router();
const projetController = require('./../controllers/projet.controller')

router.get('/count', projetController.getProjetCount)
router.get('/', projetController.getProjet)
router.get('/onef', projetController.getProjetOneF)
router.get('/one', projetController.getProjetOne)
router.get('/projetTache', projetController.getProjetTache)
router.post('/', projetController.postProjetBesoin)

router.put('/', projetController.putProjet)
router.put('/est_supprime', projetController.deletePutProjet)
router.delete('/:id', projetController.deleteProjet)

//Suivi projet
router.post('/suivi_projet', projetController.postSuiviProjet)
 
module.exports = router;