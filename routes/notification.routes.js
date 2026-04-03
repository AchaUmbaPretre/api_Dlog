// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const notification = require('./../controllers/notification.controller');
const { authorize } = require("../midllewares/authorize");

// Routes existantes
router.post('/register',authorize('attendance.events.read'), notification.postNotifications);
router.delete('/unregister', notification.DesactiveToken);

// Nouvelles routes
router.post('/send-to-user', notification.sendToUser);
router.post('/send-to-many', notification.sendToMany);
router.post('/send-to-all', notification.sendToAll);
router.post('/send-absence-reminder', notification.sendAbsenceReminder);

module.exports = router;