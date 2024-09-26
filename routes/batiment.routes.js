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

//Batiment Doc
router.get('/doc/one1', batimentController.getBatimentDocOne1)
router.get('/doc/one', batimentController.getBatimentDocOne)
router.post('/doc', upload.array('chemin_document', 10), batimentController.postBatimentDoc)
router.put('/doc', upload.single('chemin_document'),batimentController.putBatimentDoc);


//Maintenance
router.get('/maintenance', batimentController.getMaintenance)
router.get('/maintenance/one', batimentController.getMaintenanceOne)
router.post('/maintenance', batimentController.postMaintenance)


//TYPE D'EQUIPEMENT
router.get('/type_equipement', batimentController.getTypeEquipement)
router.get('/statut_equipement', batimentController.getStatutEquipement)
router.get('/statut_maintenance', batimentController.getStatutMaintenance)

//stocks_equipements
router.get('/stock', batimentController.getStockEquipement)
router.get('/stock/one', batimentController.getStockEquipementOne)
router.post('/stock', batimentController.postStockEquipement)
router.put('/stock', batimentController.putStockEquipement)

//Tableau de bord
router.get('/rapport', batimentController.getRapport)
router.get('/rapport/one', batimentController.getRapportOne)
router.get('/tableau_bord/one', batimentController.getTableauBordOne)

module.exports = router;