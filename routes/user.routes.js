const express = require("express");
const router = express.Router();
const  userController = require('./../controllers/user.controller');

router.get('/count', userController.getUserCount)
router.get('/', userController.getUsers)
router.get('/one', userController.getUserOne)
router.post('/', userController.registerUser)
router.put('/', userController.putUser)
router.put('/one', userController.putUserOne)
router.delete('/:id', userController.deleteUser)
router.get('/password_forgot', userController.detailForgot)
 
module.exports = router;