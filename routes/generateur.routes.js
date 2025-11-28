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

router.get('/', generateurController.getGenerateur)
router.get('/one', generateurController.getGenerateurOne)
router.post('/', upload.array('img', 10), generateurController.postGenerateur)
 
module.exports = router;