const express = require("express");
const router = express.Router();
const eventController = require('./../controllers/event.controller');

router.get('/', eventController.getEvent);
router.get('/raw_report', eventController.getRawReport);
router.post('/', eventController.postEvent);

module.exports = router;