const express = require("express");
const vehiculeController = require('./../controllers/vehicule.controller');
const { tenantFilter } = require("../midllewares/tenant.middleware");
const verifyToken = require("../midllewares/verifyToken");
const router = express.Router();

router.get('/', verifyToken, tenantFilter, vehiculeController.getVehicule)

module.exports = router;