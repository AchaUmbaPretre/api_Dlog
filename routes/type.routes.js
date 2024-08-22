const express = require("express");
const router = express.Router();
const typesController = require('./../controllers/type.controller');

router.get('/', typesController.getTypes)

module.exports = router;