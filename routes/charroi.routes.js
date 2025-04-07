const express = require("express");
const router = express.Router();
const charroiController = require('./../controllers/charroi.controller');


router.get('/cat_vehicule', charroiController.getCatVehicule)
router.get('/marque', charroiController.getMarque)
router.get('/modele', charroiController.getModele)
router.get('/disposition', charroiController.getDisposition)
router.get('/couleur', charroiController.getCouleur)

module.exports = router;