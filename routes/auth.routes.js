const express = require("express");
const authController = require("../controllers/auth.controller");
const router = express.Router();

router.post('/register',authController.registerController )
router.post('/login', authController.loginController)
router.post('/logout', authController.logout);

//Auth
router.post('/detail_forgot', authController.detailForgot)
router.put('/password_reset/:id', authController.updateUser)

module.exports = router;