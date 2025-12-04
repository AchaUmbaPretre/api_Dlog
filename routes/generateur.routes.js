const express = require("express");
const generateurController = require('../controllers/generateur.controller')
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

//Type generateur
router.get('/type_generateur', generateurController.getTypeGenerateur);
router.post('/type_generateur', generateurController.postTypeGenerateur);

//Marque générateur
router.get('/marque_generateur', generateurController.getMarqueGenerateur);
router.post('/marque_generateur', generateurController.postMarqueGenerateur);

//Modele générateur
router.get('/modele_generateur', generateurController.getModeleGenerateur);
router.get('/modele_generateur/one', generateurController.getModeleGenerateurOne);
router.post('/modele_generateur', generateurController.postModeleGenerateur);

//Refroidissement
router.get('/refroidissement', generateurController.getRefroidissement);

//Generateur
router.get('/', generateurController.getGenerateur)
router.get('/one', generateurController.getGenerateurOne)
router.post('/', upload.array('img', 10), generateurController.postGenerateur)
 
//Plein generateur
router.get('/plein_generateur', generateurController.getPleinGenerateur)
router.get('/plein_generateur/one', generateurController.getPleinGenerateurOne)
router.post('/plein_generateur', generateurController.postPleinGenerateur)
router.put('/plein_generateur', generateurController.putPleinGenerateur)

module.exports = router;