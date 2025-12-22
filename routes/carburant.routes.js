const express = require("express");
const carburantController = require('./../controllers/carburant.controller')
const router = express.Router();

const multer = require('multer');
const fs = require('fs');
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

//Carburant vehicule
router.get('/vehicule_carburant', carburantController.getVehiculeCarburant);
router.get('/vehicule_carburantOne', carburantController.getVehiculeCarburantOne);
router.post('/vehicule_carburant', carburantController.postVehiculeCarburant);
router.put('/vehicule_carburant', carburantController.putVehiculeCarburant);
router.put('/relier_vehiculeCarburant', carburantController.putRelierVehiculeCarburant)

router.post('/', carburantController.getCarburant);
router.get('/limit_three', carburantController.getCarburantLimitThree);
router.get('/limit_ten', carburantController.getCarburantLimitTen);
router.get('/one', carburantController.getCarburantOne);
router.post('/post_carburant', carburantController.postCarburant);
router.put('/', carburantController.updateCarburant)
router.put('/delete', carburantController.deleteCarburant)

//Carburant vehicule  excel
router.post('/carburant_vehicule_excel', upload.array('chemin_document', 10), carburantController.postCarburantVehiculeExcel);

//Carburant excel
router.post('/carburant_excel', upload.array('chemin_document', 10), carburantController.postSortiefmpExcel);

//Prix carburant
router.get('/carburant_prix', carburantController.getCarburantPrice);
router.get('/carburant_prix_limit', carburantController.getCarburantPriceLimit);
router.post('/carburant_prix', carburantController.postCarburantPrice);

//Alert 
router.get('/alert_carburant', carburantController.getAlertCarburant);
router.put('/alert_carburant', carburantController.putAlertCarburantIsRead)

//Rapport carburant
router.get('/rapport_carburant', carburantController.rapportCarburantAll);
router.get('/rapport_consom_gen', carburantController.rapportCarburantConsomGen);

router.get('/mois', carburantController.getCarburantMois);
router.get('/annee', carburantController.getCarburantAnnee)

//Rapport par periode cat
router.get('/rapport_periode_cat', carburantController.getRapportCatPeriode);
router.post('/rapport_periode_vehicule', carburantController.getRapportVehiculePeriode);
router.post('/rapport_Carburant_Month', carburantController.getRapportCarbMonth);
router.get('/by-month', carburantController.getCarburantByMonthYear);

module.exports = router;