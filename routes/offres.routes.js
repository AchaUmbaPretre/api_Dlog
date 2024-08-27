const express = require("express");
const offreController = require('./../controllers/offres.controller')
const router = express.Router();

router.get('/', offreController.getOffre)
router.get('/detail', offreController.getOffreDetailOne)
router.get('/one_offre', offreController.getOffreArticleOne)
router.post('/article', offreController.postOffresArticle)
router.post('/', offreController.postOffres)
router.delete('/:id', offreController.deleteOffres)
 
module.exports = router;