const express = require("express");
const transporteur = require('./../controllers/transporteur.controller')
const router = express.Router();

router.get('/localisation', transporteur.getLocalisation);
router.post('/localisation', transporteur.postLocalisation);

router.get('/type_localisation', transporteur.getTypeLocalisation);
router.get('/commune', transporteur.getCommune);
router.get('/ville', transporteur.getVille);
router.get('/localite', transporteur.getLocalite);
router.get('/site_loc', transporteur.getSiteLoc);
router.get('/pays', transporteur.getPays);

module.exports = router;