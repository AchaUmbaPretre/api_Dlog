const express = require("express");
const router = express.Router();
const  userController = require('./../controllers/user.controller');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require("../midllewares/verifyToken");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = uuidv4() + ext;
        cb(null, filename);
    }
});

const upload = multer({ storage });

router.get('/count', userController.getUserCount)
router.get('/', userController.getUsers)
router.get('/one', userController.getUserOne)
router.post('/', userController.registerUser)
router.put('/', userController.putUser)
router.put('/one', userController.putUserOne)
router.delete('/:id', userController.deleteUser)
 
//Signature
router.get('/signature', userController.getSignature);
router.post('/signature', upload.any(),userController.postSignature);

//Société
router.get('/societe', userController.getSociete);
router.get('/societeOne', userController.getSocieteOne);
router.post('/societe', upload.any(),userController.postSociete);

//Personnel
router.get('/personnel', userController.getPersonnel);
router.post('/personnel', userController.postPersonnel);

//Visiteur pieton
router.get('/pieton', userController.getVisiteurPieton);
router.post('/pieton', userController.postVisiteurPieton);

//Visiteur pieton Retour
router.get('/pieton_retour', userController.getVisiteurPietonRetour);
router.put('/pieton_retour', userController.putVisiteurPietonRetour);

module.exports = router;