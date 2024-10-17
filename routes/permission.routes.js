const express = require("express");
const { menusAll, permissions, putPermission, menusAllOne} = require("../controllers/permission.controller");
const router = express.Router();


router.get('/addOne', menusAllOne)
router.get('/add', menusAll)
router.get('/one', permissions)
router.put('/update/:userId/permissions/add/:optionId', putPermission)

module.exports = router;