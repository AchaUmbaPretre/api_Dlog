const express = require("express");
const offreController = require('./../controllers/offres.controller')
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'public/uploads/' });

router.get('/', offreController.getOffre)
router.get('/detail', offreController.getOffreDetailOne)
router.get('/one_offre', offreController.getOffreArticleOne)
router.post('/article', offreController.postOffresArticle)
router.post('/doc', upload.single('chemin_document'), offreController.postOffresDoc);
router.post('/', offreController.postOffres)
router.delete('/:id', offreController.deleteOffres)
 
module.exports = router;