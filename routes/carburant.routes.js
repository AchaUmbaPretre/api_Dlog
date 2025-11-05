const express = require("express");
const carburantController = require('./../controllers/carburant.controller')
const router = express.Router();

router.get('/', carburantController.getCarburant);
router.get('/one', carburantController.getCarburantOne)
router.post('/', carburantController.postCarburant);

module.exports = router;