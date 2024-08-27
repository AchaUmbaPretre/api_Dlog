const express = require("express");
const offreController = require('./../controllers/offres.controller')
const router = express.Router();

router.get('/', offreController.getOffre)
router.post('/', offreController.postOffres)
router.delete('/:id', offreController.deleteOffres)
 
module.exports = router;