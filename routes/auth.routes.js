const express = require("express");
const authController = require("../controllers/auth.controller");
const router = express.Router();

router.post('/register',authController.registerController )
router.post('/login', authController.loginController)
router.post('/logout', authController.logout);

//Auth
router.get('/password_forgot', authController.detailForgot)
router.put('/password_reset', authController.updateUser)

module.exports = router;