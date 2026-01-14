const express = require("express");
const router = express.Router();
const presence = require('./../controllers/presence.controller');
const { authorize } = require("../midllewares/authorize");

router.get('/', authorize('attendance.events.read'), presence.getPresence);
router.get('/planning', authorize('attendance.events.read'), presence.getPresencePlanning);
router.get('/month', presence.getMonthlyPresenceReport);
router.get('/lateEarly', presence.getLateEarlyLeaveReport);
router.get('/hrglobal', presence.getHRGlobalReport);
router.get('/presenceById', presence.getPresenceById);
router.post('/', presence.postPresence)

//Congé
router.get('/conge', presence.getConge);
router.post('/conge', presence.postConge)


module.exports = router;