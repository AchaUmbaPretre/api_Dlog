const express = require("express");
const router = express.Router();
const  controlleController = require('./../controllers/controle.controller');

router.get('/count', controlleController.getControleCount)
router.get('/', controlleController.getControle)
router.get('/clientOne', controlleController.getControleOne)
router.post('/', controlleController.postControle)
router.put('/', controlleController.putControle)
router.delete('/:id', controlleController.deleteControle)


module.exports = router;