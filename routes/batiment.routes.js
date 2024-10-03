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
router.get('/doc', batimentController.getBatimentDoc)
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

//Entrepot
router.get('/entrepot', batimentController.getEntrepot)
router.get('/entrepot/one', batimentController.getEntrepotOne)
router.get('/entrepot/oneV', batimentController.getEntrepotOneV)
router.post('/entrepot', batimentController.postEntrepot)
router.put('/entrepot_put', batimentController.putEntrepot)
//BINS
router.get('/bins', batimentController.getBins)
router.get('/bins/one', batimentController.getBinsOne)
router.post('/bins', batimentController.postBins)

//Maintenance Bins
router.get('/maintenance_bins', batimentController.getMaintenanceBin)
router.get('/maintenance_bins/one', batimentController.getMaintenanceBinOne)
router.post('/maintenance_bins', batimentController.postMaintenanceBin)

//Bureau
router.get('/bureau', batimentController.getBureaux)
router.get('/bureau/one', batimentController.getBureauxOne)
router.post('/bureau', batimentController.postBureaux)


module.exports = router;