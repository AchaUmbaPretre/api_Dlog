const express = require("express");
const router = express.Router();
const loginChauffeurController = require('./../controllers/chauffeur.controller');
const verifyTokenChauffeur = require("../midllewares/verifyTokenChauffeur");

router.post('/login', loginChauffeurController.loginChauffeur);
router.get('/profil', verifyTokenChauffeur, loginChauffeurController.profilChauffeur);
router.get('/missions', verifyTokenChauffeur, loginChauffeurController.missionChauffeurById);
router.post('/position', verifyTokenChauffeur, loginChauffeurController.envoyerPosition);

module.exports = router;
