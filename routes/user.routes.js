const express = require("express");
const router = express.Router();
const  userController = require('./../controllers/user.controller');

router.get('/count', userController.getUserCount)
router.get('/', userController.getUsers)
router.get('/one', userController.getUserOne)
router.post('/', userController.registerUser)
router.put('/', userController.putUser)

router.delete('/:id', userController.deleteUser)
 
module.exports = router;