const express = require("express");
const router = express.Router();
const presence = require('./../controllers/presence.controller');

router.get('/', presence.getPresence);
router.get('/planning', presence.getPresencePlanning);
router.get('/month', presence.getMonthlyPresenceReport);
router.get('/lateEarly', presence.getLateEarlyLeaveReport);
router.get('/hrglobal', presence.getHRGlobalReport);
router.get('/presenceById', presence.getPresenceById);
router.post('/', presence.postPresence)

router.post("/attendance-adjustments", presence.postAttendanceAdjustment);
router.put('/validation-adjustments', presence.validateAttendanceAdjustment);

//Congé
router.get('/conge', presence.getConge);
router.post('/conge', presence.postConge);
router.put('/validation_conge', presence.validateConge);

//Absence
router.get('/absence', presence.getAbsence);
router.get('/absence_type', presence.getAbsenceType);
router.post('/absence', presence.postAbsence);

module.exports = router;