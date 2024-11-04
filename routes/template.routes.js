const express = require("express");
const templateController = require("../controllers/template.controller");
const router = express.Router();

router.get('/', templateController.getTemplate)
router.get('/one', templateController.getTemplateOne)
router.post('/', templateController.postTemplate)

//Type d'occupation
router.get('/type_occupation', templateController.getTypeOccupation)


module.exports = router;