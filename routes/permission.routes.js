const express = require("express");
const { menusAll, permissions, putPermission, menusAllOne, getPermissionTache, postPermissionTache} = require("../controllers/permission.controller");
const router = express.Router();

router.get('/addOne', menusAllOne)
router.get('/add', menusAll)
router.get('/one', permissions)
router.put('/update/:userId/permissions/add/:optionId', putPermission)

//Permission tache
router.get('/permission_tache', getPermissionTache)
router.post('/permission_tache', postPermissionTache)

module.exports = router;