const express = require("express");
const router = express.Router();
const eventController = require('./../controllers/event.controller');

router.get('/vehicule_alert', eventController.getAlertVehicule)
router.put('/vehicule_alert', eventController.markAlertAsRead)

router.get('/', eventController.getEvent);
router.get('/rapport_day', eventController.getRapportDay);
router.get('/raw_report', eventController.getRawReport);
router.post('/', eventController.postEvent);

//Connectivity
router.get('/connectivity', eventController.getConnectivity)

module.exports = router;