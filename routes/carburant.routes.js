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


router.get('/', carburantController.getCarburant);
router.get('/limit_ten', carburantController.getCarburantLimitTen);
router.get('/one', carburantController.getCarburantOne)
router.post('/', carburantController.postCarburant);

//Carburant vehicule  excel
router.post('/carburant_vehicule_excel', upload.array('chemin_document', 10), carburantController.postCarburantVehiculeExcel);

//Carburant excel
router.post('/carburant_excel', upload.array('chemin_document', 10), carburantController.postCarburantExcel);

module.exports = router;