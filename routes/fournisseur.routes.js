const express = require("express");
const router = express.Router();
const fournisseurController = require('./../controllers/fournisseur.controller')

router.get('/count', fournisseurController.getFournisseurCount)
router.get('/', fournisseurController.getFournisseur)
router.post('/', fournisseurController.postFournisseur)
router.delete('/:id', fournisseurController.deleteFournisseur)
 
module.exports = router;