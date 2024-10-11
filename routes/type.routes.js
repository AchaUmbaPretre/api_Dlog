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
router.put('/batiment/update', typesController.putBatiment)
router.put('/batiment/update_delete', typesController.deleteUpdatedBatiment)

//Categorie
router.get('/categorie', typesController.getCategorie)
router.post('/categorie', typesController.postCategorie)

//Activite
router.get('/activite', typesController.getActivite)
router.post('/activite', typesController.postActivite)

//Categorie corps metier
router.get('/corps_metier',typesController.getCorpsMetier)
router.get('/corps_metier/one',typesController.getCorpsMetierOne)
router.post('/corps_metier',typesController.postCorpsMetier)
router.put('/corps_metier_update', typesController.putCorpsMetier)
router.get('/cat_tache',typesController.getCatTache)
router.get('/cat_tache/one',typesController.getCatTacheOne)
router.post('/cat_tache/post',typesController.postCatTache)
router.put('/cat_tache_put',typesController.putCatTache)

//Statut Bin
router.get('/type_bin',typesController.typeStockageBins)
router.get('/statut_bin',typesController.statut_bins)


module.exports = router;