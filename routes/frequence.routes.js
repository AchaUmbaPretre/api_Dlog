const express = require("express");
const frequenceController = require('./../controllers/frequence.controller')
const router = express.Router();

router.get('/count', frequenceController.getFrequenceCount)
router.get('/', frequenceController.getFrequence)
router.get('/one', frequenceController.getFrequenceOne)
router.post('/', frequenceController.postFrequence)
router.delete('/:id', frequenceController.deleteFrequence)
 
module.exports = router;