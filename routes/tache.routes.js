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
router.get('/tache_doc', tacheController.getTacheDoc)
router.post('/', tacheController.getTache)
router.get('/all_tache', tacheController.getAllTache)
router.get('/detail_tache_doc', tacheController.getDetailTacheDoc)
router.get('/oneV', tacheController.getTacheOneV)
router.get('/one', tacheController.getTacheOne)
router.get('/controleTacheOne', tacheController.getTacheControleOne)
router.post('/', tacheController.postTache)
router.put('/', tacheController.putTache)
router.put('/supprime_put', tacheController.deleteUpdateTache)
router.put('/priorite', tacheController.putTachePriorite)
router.delete('/:id', tacheController.deleteTache)

//Tache personne
router.get('/tache_personne', tacheController.getTachePersonne)
router.get('/tache_doc/one', tacheController.getTacheDocOne)
router.post('/tache_personne', tacheController.postTachePersonnne)
router.post('/tache_doc', upload.single('chemin_document'), tacheController.postTacheDoc);
router.delete('/tache_personne', tacheController.deleteTachePersonne)
router.put('/tache_doc', upload.single('chemin_document'),tacheController.putTacheDoc);

module.exports = router;