const express = require("express");
const router = express.Router();
const besoinsController = require('./../controllers/besoins.controller');

router.get('/count', besoinsController.getBesoinCount)
router.get('/', besoinsController.getBesoin)
router.get('/one', besoinsController.getBesoinOne)
router.post('/', besoinsController.postBesoins)
router.delete('/:id', besoinsController.deleteBesoins)
module.exports = router;