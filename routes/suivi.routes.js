const express = require("express");
const suiviController = require('./../controllers/suivi.controller')
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

router.get('/count', suiviController.getSuiviCount)
router.get('/', suiviController.getSuivi)
router.get('/one', suiviController.getSuiviOne)
router.get('/suiviTacheUne', suiviController.getSuiviTacheUn)
router.get('/suiviTacheOne', suiviController.getSuiviTacheOne)
router.get('/suiviTacheOneV', suiviController.getSuiviTacheOneV)
router.post('/', suiviController.postSuivi)
router.post('/suiviTache', suiviController.postSuiviTache)
router.delete('/:id', suiviController.deleteSuivi)
router.put('/est_supprime', suiviController.deleteUpdatedSuiviTache)
router.get('/doc', suiviController.getDocGeneral)
router.post('/doc',upload.array('chemin_document', 10), suiviController.postDocGeneral)

router.get('/tracking_all_one', suiviController.getSuiviAllNbre)

module.exports = router;