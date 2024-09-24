const express = require("express");
const router = express.Router();
const typesController = require('./../controllers/type.controller');

router.get('/', typesController.getTypes)
router.get('/article', typesController.getArticle)
router.get('/articleOne', typesController.getArticleOne)

//Batiment
router.get('/batiment', typesController.getBatiment)
router.get('/batiment/one', typesController.getBatimentOne)
router.post('/batiment', typesController.postBatiment)

//Categorie
router.get('/categorie', typesController.getCategorie)
router.post('/categorie', typesController.postCategorie)

//Activite
router.get('/activite', typesController.getActivite)
router.post('/activite', typesController.postActivite)

module.exports = router;