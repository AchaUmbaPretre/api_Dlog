const express = require("express");
const router = express.Router();
const presence = require('./../controllers/presence.controller');

router.get('/', presence.getPresence);
router.get('/planning', presence.getPresencePlanning);
router.get('/presenceById', presence.getPresenceById);
router.post('/', presence.postPresence)

//Congé
router.get('/conge', presence.getConge);
router.post('/conge', presence.postConge)


module.exports = router;