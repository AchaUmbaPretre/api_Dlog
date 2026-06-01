const express = require("express");
const router = express.Router();
const reparationController = require('./../controllers/reparation.controller');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');     

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

//Controle technique
router.get('/controle_technique', reparationController.getControleTechnique)
router.post('/controle_technique', reparationController.postControlTechnique)

//Réparation
router.get('/reparation', reparationController.getReparation)
router.get('/reparationOneV', reparationController.getReparationOneV)
router.get('/reparationOne', reparationController.getReparationOne)
router.post('/reparation', reparationController.postReparation)
router.post('/delete_reparation', reparationController.deleteReparation)
router.put('/reparation', reparationController.putReparation)

//Reparation image
router.get('/reparation_image', reparationController.getReparationImage)
router.post('/reparation_image', upload.any(), reparationController.postReparationImage)

module.exports = router;