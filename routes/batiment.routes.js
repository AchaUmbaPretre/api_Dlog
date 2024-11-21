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
router.get('/equipement/oneV', batimentController.getEquipementOneV)
router.post('/equipement', batimentController.postEquipement)
router.put('/equipement_update', batimentController.putEquipement)

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
router.get('/bins/oneV', batimentController.getBinsOneV)
router.post('/bins', batimentController.postBins)
router.put('/bins_delete', batimentController.deleteUpdatedBins)
router.put('/bins_put', batimentController.putBins)

//Adresse
router.get('/adresse', batimentController.getAdresse)

//Maintenance Bins
router.get('/maintenance_bins', batimentController.getMaintenanceBin)
router.get('/maintenance_bins/one', batimentController.getMaintenanceBinOne)
router.post('/maintenance_bins', batimentController.postMaintenanceBin)

//Bureau
router.get('/bureau', batimentController.getBureaux)
router.get('/bureau/oneV', batimentController.getBureauxOneV)
router.get('/bureau/one', batimentController.getBureauxOne)
router.post('/bureau', batimentController.postBureaux)
router.put('/bureau_put', batimentController.putBureaux)
router.put('/bureau_delete', batimentController.deleteUpdateBureaux)


//Niveau batiment
router.get('/niveau_count', batimentController.getNiveauCount)
router.get('/niveaau_batiment', batimentController.getNiveau)
router.get('/niveau_batiment/one', batimentController.getNiveauOne)
router.get('/niveau_batiment/oneV', batimentController.getNiveauOneV)
router.post('/niveaau_batiment', batimentController.postNiveau)
router.put('/niveau_batiment_put', batimentController.putNiveau)
router.put('/niveau_batiment_delete', batimentController.deleteUpdateNiveau)

//Denomination batiment
router.get('/denomination_count', batimentController.getDenominationCount)
router.get('/denomination', batimentController.getDenomination)
router.get('/denomination/oneV', batimentController.getDenominationOneV)
router.get('/denomination/one', batimentController.getDenominationOne)
router.post('/denomination', batimentController.postDenomination)
router.put('/denomination_update', batimentController.putDenomination)
router.put('/denomination_delete', batimentController.deleteUpdateDenomination)

//WHSE FACT
router.get('/whse_fact', batimentController.getWHSE_FACT)
router.get('/whse_fact/one', batimentController.getWHSE_FACT_ONE)
router.post('/whse_fact', batimentController.postWHSE_FACT)

//Instruction
router.get('/inspections', batimentController.getInspection)
router.get('/inspectionsOneV', batimentController.getInspectionOneV)
router.get('/inspectionsOne', batimentController.getInspectionOne)
router.post('/inspections_post', upload.array('files', 10), batimentController.postInspections)
router.post('/inspections_post_apres', upload.array('files', 10), batimentController.postInspectionsApre)
router.put('/inspection_update',batimentController.putInspections)
router.put('/inspection_delete',batimentController.deleteUpdateInspections)

//Type instruction
router.get('/instruction_type', batimentController.getTypeInstruction)
router.get('/type_photo', batimentController.getType_photo)

//Categrie inspection
router.get('/cat_inspection', batimentController.getCatInspection)
router.get('/cat_inspectionOne', batimentController.getCatInspectionOne)
router.post('/cat_inspection', batimentController.postCatInspection)
router.put('/cat_inspection', batimentController.putCatInspection)
router.delete('/cat_inspection/:id', batimentController.deleteCatInspection)

module.exports = router;