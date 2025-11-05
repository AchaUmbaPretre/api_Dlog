const express = require("express");
const router = express.Router();
const fournisseurController = require('./../controllers/fournisseur.controller')

router.get('/count', fournisseurController.getFournisseurCount)
router.get('/', fournisseurController.getFournisseur)
router.get('/fournisseur_activite', fournisseurController.getFournisseurActivite)
router.get('/fournisseur_activite/one', fournisseurController.getFournisseurActiviteOne)
router.post('/', fournisseurController.postFournisseur)
router.delete('/:id', fournisseurController.deleteFournisseur)
 
module.exports = router;