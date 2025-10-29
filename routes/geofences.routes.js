const express = require("express");
const router = express.Router();
const geofencesController = require('./../controllers/geofences.controller')

router.get('/', geofencesController.getGeofences)

module.exports = router;