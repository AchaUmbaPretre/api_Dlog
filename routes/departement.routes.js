const express = require("express");
const departementController = require('./../controllers/departement.controller')
const router = express.Router();

router.get('/count', departementController.getDepartementCount)
router.get('/', departementController.getDepartement)
router.get('/one', departementController.getDepartementOne)
router.post('/', departementController.postDepartement)
router.put('/', departementController.putDepartement)

router.delete('/:id', departementController.deleteDepartement)
 
module.exports = router;