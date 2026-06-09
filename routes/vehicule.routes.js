const express = require("express");
const vehiculeController = require('./../controllers/vehicule.controller');
const { tenantFilter } = require("../midllewares/tenant.middleware");
const verifyToken = require("../midllewares/verifyToken");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');     
const { verifierLimiteVehicules } = require("../midllewares/limiteVehicule.middleware");

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


router.get('/', verifyToken, tenantFilter, vehiculeController.getVehicule)
router.get('/vehicule_count', vehiculeController.getVehiculeCount)
router.get('/vehicule_dispo', vehiculeController.getVehiculeDispo)
router.get('/vehicule_occupe', vehiculeController.getVehiculeOccupe)

router.put('/vehicule/rend_dispo', vehiculeController.rendreVehiculeDispo)

router.get('/vehicule/one', vehiculeController.getVehiculeOne)
router.post('/vehicule', verifyToken, tenantFilter, verifierLimiteVehicules, upload.array('img', 10), vehiculeController.postVehicule)
router.put('/vehicule', vehiculeController.putVehicule);
router.put('/vehicule_estSupprime', vehiculeController.deleteVehicule);
router.put('/vehicule_falcon', vehiculeController.putRelierVehiculeFalcon)


module.exports = router;