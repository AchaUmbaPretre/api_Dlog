const express = require("express");
const router = express.Router();
const geofencesController = require('./../controllers/geofences.controller')

router.get('/', geofencesController.getGeofences)
router.post('/', geofencesController.postGeofences)
router.put('/', geofencesController.updateGeofences)


module.exports = router;