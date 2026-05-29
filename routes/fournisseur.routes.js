const express = require("express");
const router = express.Router();
const fournisseurController = require('./../controllers/fournisseur.controller');
const verifyToken = require("../midllewares/verifyToken");
const { tenantFilter } = require("../midllewares/tenant.middleware");

router.get('/count', fournisseurController.getFournisseurCount)
router.get('/',verifyToken, tenantFilter, fournisseurController.getFournisseur)
router.get('/fournisseur_activite', fournisseurController.getFournisseurActivite)
router.get('/fournisseur_activite/one', fournisseurController.getFournisseurActiviteOne)
router.post('/', fournisseurController.postFournisseur)
router.delete('/:id', fournisseurController.deleteFournisseur)
 
module.exports = router;