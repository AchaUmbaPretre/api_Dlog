const express = require("express");
const router = express.Router();
const  tacheController = require('./../controllers/tache.controller');

router.get('/count', tacheController.getTacheCount)
router.get('/', tacheController.getTache)
router.get('/One', tacheController.getTacheOne)
router.post('/', tacheController.postTache)
router.put('/', tacheController.putTache)

router.delete('/:id', tacheController.deleteTache)
 
module.exports = router;