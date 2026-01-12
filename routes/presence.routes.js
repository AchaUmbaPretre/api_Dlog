const express = require("express");
const router = express.Router();
const presence = require('./../controllers/presence.controller');

router.get('/', presence.getPresence);
router.get('/presenceById', presence.getPresenceById);
router.post('/', presence.postPresence)

module.exports = router;