const express = require("express");
const router = express.Router();
const  tacheController = require('./../controllers/tache.controller');

router.get('/count', tacheController.getTacheCount)
router.get('/', tacheController.getTache)
router.get('/One', tacheController.getTacheOne)
router.get('/controleTacheOne', tacheController.getTacheControleOne)
router.post('/', tacheController.postTache)
router.put('/', tacheController.putTache)

router.delete('/:id', tacheController.deleteTache)


//Tache personne
router.get('/tache_personne', tacheController.getTachePersonne)
router.post('/tache_personne', tacheController.postTachePersonnne)
router.delete('/tache_personne', tacheController.deleteTachePersonne)
module.exports = router;