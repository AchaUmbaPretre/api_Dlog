const express = require("express");
const router = express.Router();
const hikvision = require('./../controllers/hikvision.controller');

router.post('/hikvision', hikvision.startPullScheduler);

module.exports = router;