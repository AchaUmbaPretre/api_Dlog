const express = require("express");
const router = express.Router();
const presence = require('./../controllers/presence.controller');
const { authorize } = require("../midllewares/authorize");

router.get('/', presence.getPresence);
router.get('/planning', authorize('attendance.events.read'), presence.getPresencePlanning);
router.get('/month', presence.getMonthlyPresenceReport);
router.get('/lateEarly', presence.getLateEarlyLeaveReport);
router.get('/hrglobal', presence.getHRGlobalReport);
router.get('/presenceById', presence.getPresenceById);
router.post('/', presence.postPresence);
router.post('/hikvision', presence.postPresenceFromHikvision);

//Attendance-adjustments
router.get('/attendance-adjustments', presence.getAttendanceAdjustment);
router.post("/attendance-adjustments", presence.postAttendanceAdjustment);
router.put('/validation-adjustments', presence.validateAttendanceAdjustment);

//Congé
router.get('/conge', authorize('attendance.events.read'), presence.getConge);
router.post('/conge', presence.postConge);
router.put('/validation_conge', presence.validateConge);

//Absence
router.get('/absence', presence.getAbsence);
router.get('/absence_type', presence.getAbsenceType);
router.post('/absence', presence.postAbsence);
router.put('/absence-validation', presence.putAbsenceValidation);

//JOUR FERIE
router.get('/jour-ferie', presence.getJourFerie);
router.post('/jour-ferie', presence.postJourFerie);

//TERMINAL
router.get('/terminal', presence.getTerminal);
router.post('/terminal', presence.postTerminal);

//USER TERMINAL
router.get('/user-terminal', presence.getUserTerminal);
router.get('/user-terminalById', presence.getUserTerminalById);
router.post('/user-terminal', presence.postUserTerminal);
router.delete('/user-terminal', presence.deleteUserTerminal);

module.exports = router;