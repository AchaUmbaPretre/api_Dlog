const express = require("express");
const router = express.Router();
const notification = require('./../controllers/notification.controller');

router.post('/register', notification.postNotifications);
router.delete('/unregister', notification.DesactiveToken);

module.exports = router;