const express = require("express");
const transporteur = require('./../controllers/transporteur.controller')
const router = express.Router();

router.get('/localisation', transporteur.getLocalisation);
router.get('/localisation/one', transporteur.getLocalisationOne);
router.post('/localisation', transporteur.postLocalisation);
router.put('/localisation', transporteur.putLocalisation);

router.get('/type_localisation', transporteur.getTypeLocalisation);
router.get('/commune', transporteur.getCommune);
router.get('/ville', transporteur.getVille);
router.get('/localite', transporteur.getLocalite);
router.post('/localite', transporteur.postLocalite);
router.put('/localite', transporteur.putLocalite);
router.get('/pays', transporteur.getPays);

module.exports = router;