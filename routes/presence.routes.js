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

//Congé
router.get('/conge', presence.getConge);
router.post('/conge', presence.postConge);

//Absence
router.get('/absence', presence.getAbsence);
router.post('/absence', presence.postAbsence);

module.exports = router;