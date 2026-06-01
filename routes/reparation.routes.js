const express = require("express");
const router = express.Router();
const reparationController = require('./../controllers/reparation.controller');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');     
const { tenantFilter } = require("../midllewares/tenant.middleware");
const verifyToken = require("../midllewares/verifyToken");

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

//Type de reparation
router.get('/type_reparation', reparationController.getTypeReparation)
router.post('/type_reparation', reparationController.postTypeReparation)

//Controle technique
router.get('/controle_technique', verifyToken, tenantFilter, reparationController.getControleTechnique)
router.post('/controle_technique', verifyToken, tenantFilter, reparationController.postControlTechnique)

//Réparation
router.get('/', verifyToken, tenantFilter, reparationController.getReparation)
router.get('/reparationOneV', reparationController.getReparationOneV)
router.get('/reparationOne', reparationController.getReparationOne)
router.post('/', verifyToken, tenantFilter, reparationController.postReparation)
router.post('/delete_reparation', verifyToken, tenantFilter, reparationController.deleteReparation)
router.put('/', reparationController.putReparation)

//Reparation image
router.get('/reparation_image', verifyToken, tenantFilter, reparationController.getReparationImage)
router.post('/reparation_image', verifyToken, tenantFilter, upload.any(), reparationController.postReparationImage)

//Suivi réparation
router.get('/suivi_reparation', reparationController.getSuiviReparation)
router.get('/suivi_reparationOne', reparationController.getSuiviReparationOne)
router.post('/suivi_reparation', reparationController.postSuiviReparation)
router.put('/suivi_reparation', reparationController.putSuiviReparation)


//Document réparation
router.get('/document_reparation', reparationController.getDocumentReparation)
router.post('/document_reparation',upload.array('chemin_document', 10), reparationController.postDocumentReparation)

module.exports = router;