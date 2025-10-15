const express = require("express");
const router = express.Router();
const webhookController = require('./../controllers/webhook.controller')

router.post('/falcon', webhookController.postWebhook)

module.exports = router;