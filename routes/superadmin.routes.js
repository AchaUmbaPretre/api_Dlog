const express = require("express");
const superAdminController = require('./../controllers/superadmin.controller')
const router = express.Router();

router.get('/', superAdminController.getAdmins)
router.post('/', superAdminController.createAdmin)
router.put('/update_superadmin', superAdminController.updateAdminPermissions)
router.delete('/', superAdminController.deleteAdmin)

module.exports = router;