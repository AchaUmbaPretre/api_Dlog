const express = require("express");
const router = express.Router();
const geofencesController = require('./../controllers/geofences.controller')

router.get('/cat_geofence', geofencesController.getCatGeofences)
router.get('/get_geofence_falcon', geofencesController.getGeofencesFalcon)
router.get('/', geofencesController.getGeofencesDlog)
router.post('/', geofencesController.postGeofences)
router.put('/', geofencesController.updateGeofences)

module.exports = router;