const express = require("express");
const batimentController = require('./../controllers/batiment.controller')
const router = express.Router();
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

//equipement
router.get('/equipement', batimentController.getEquipement)
router.get('/equipement/one', batimentController.getEquipementOne)
router.post('/equipement', batimentController.postEquipement)

//BatimentPlans
router.get('/plans', batimentController.getBatimentPlans)
router.get('/plans/one', batimentController.getBatimentPlansOne)
router.post('/plans', upload.array('chemin_document', 10), batimentController.postBatimentPlans)

//Maintenance
router.get('/maintenance', batimentController.getMaintenance)
router.get('/maintenance/one', batimentController.getMaintenanceOne)
router.post('/maintenance', batimentController.postMaintenance)


//TYPE D'EQUIPEMENT
router.get('/type_equipement', batimentController.getTypeEquipement)
router.get('/statut_equipement', batimentController.getStatutEquipement)
router.get('/statut_maintenance', batimentController.getStatutMaintenance)


module.exports = router;