const express = require("express");
const formatController = require('../controllers/format.controller')
const router = express.Router();

router.get('/', formatController.getFormat)
router.post('/', formatController.postFormat)
router.delete('/:id', formatController.deleteFormat)
 
module.exports = router;