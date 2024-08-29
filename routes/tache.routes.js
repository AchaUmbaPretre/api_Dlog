const express = require("express");
const router = express.Router();
const  tacheController = require('./../controllers/tache.controller');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

router.get('/count', tacheController.getTacheCount)
router.get('/', tacheController.getTache)
router.get('/detail_tache_doc', tacheController.getDetailTacheDoc)
router.get('/one', tacheController.getTacheOne)
router.get('/controleTacheOne', tacheController.getTacheControleOne)
router.post('/', tacheController.postTache)
router.put('/', tacheController.putTache)

router.delete('/:id', tacheController.deleteTache)


//Tache personne
router.get('/tache_personne', tacheController.getTachePersonne)
router.post('/tache_personne', tacheController.postTachePersonnne)
router.post('/tache_doc', upload.single('chemin_document'), tacheController.postTacheDoc);
router.delete('/tache_personne', tacheController.deleteTachePersonne)
module.exports = router;