const express = require("express");
const offreController = require('./../controllers/offres.controller')
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

router.get('/', offreController.getOffre)
router.get('/offre_doc', offreController.getOffreDoc)
router.get('/detailOffre', offreController.getDetailDoc)
router.get('/detail', offreController.getOffreDetailOne)
router.get('/one_offre', offreController.getOffreArticleOne)
router.post('/article', offreController.postOffresArticle)
router.post('/articles', offreController.postArticle)
router.post('/doc', upload.single('chemin_document'), offreController.postOffresDoc);
router.post('/', offreController.postOffres)
router.delete('/:id', offreController.deleteOffres)
 
module.exports = router;