const express = require("express");
const router = express.Router();
const typesController = require('./../controllers/type.controller');

router.get('/', typesController.getTypes)
router.get('/categorie', typesController.getCategorie)
router.get('/article', typesController.getArticle)
router.get('/articleOne', typesController.getArticleOne)

module.exports = router;