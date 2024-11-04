const express = require("express");
const templateController = require("../controllers/template.controller");
const router = express.Router();

router.get('/templace', templateController.getTemplate)
router.get('/template/one', templateController.getTemplateOne)
router.post('/template', templateController.postTemplate)

module.exports = router;