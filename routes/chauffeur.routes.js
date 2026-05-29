const express = require("express");
const router = express.Router();
const loginChauffeurController = require('./../controllers/chauffeur.controller');
const verifyTokenChauffeur = require("../midllewares/verifyTokenChauffeur");
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');     
const verifyToken = require("../midllewares/verifyToken");
const { tenantFilter } = require("../midllewares/tenant.middleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = uuidv4() + ext;
        cb(null, filename);
    }
});

const upload = multer({ storage });

router.post('/login', loginChauffeurController.loginChauffeur);
router.get('/profil', verifyTokenChauffeur, loginChauffeurController.profilChauffeur);

router.get('/chauffeur_count', verifyToken, tenantFilter, loginChauffeurController.getChauffeurCount)
router.get('/', verifyToken, tenantFilter, loginChauffeurController.getChauffeur)
router.post('/', upload.array('profil', 10), verifyToken, tenantFilter, loginChauffeurController.postChauffeur)

router.get('/missions', verifyTokenChauffeur, loginChauffeurController.missionChauffeurById);
router.post('/position', verifyTokenChauffeur, loginChauffeurController.envoyerPosition);

module.exports = router;
