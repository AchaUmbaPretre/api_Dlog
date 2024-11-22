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

router.get('/count_chart', tacheController.getTacheChart)
router.get('/tache_filter_chart', tacheController.getTacheFilter)

router.get('/count', tacheController.getTacheCount)
router.get('/tache_doc', tacheController.getTacheDoc)
router.post('/tache', tacheController.getTache)
router.post('/tache_permissionAll', tacheController.getTachePermiAll)
router.get('/all_tache', tacheController.getAllTache)
router.get('/detail_tache_doc', tacheController.getDetailTacheDoc)
router.get('/oneV', tacheController.getTacheOneV)
router.get('/one', tacheController.getTacheOne)
router.get('/controleTacheOne', tacheController.getTacheControleOne)
router.post('/', tacheController.postTache)
router.put('/', tacheController.putTache)
router.put('/put_desc', tacheController.putTacheDesc)
router.put('/supprime_put', tacheController.deleteUpdateTache)
router.put('/priorite', tacheController.putTachePriorite)
router.delete('/:id', tacheController.deleteTache)

//Tache personne
router.get('/tache_personne', tacheController.getTachePersonne)
router.get('/tache_doc/one', tacheController.getTacheDocOne)
router.post('/tache_personne', tacheController.postTachePersonnne)
router.post('/tache_doc', upload.array('chemin_document', 10), tacheController.postTacheDoc);
router.post('/tache_doc_excel', upload.array('chemin_document', 10), tacheController.postTacheExcel);
router.delete('/tache_personne', tacheController.deleteTachePersonne)
router.put('/tache_doc', upload.single('chemin_document'),tacheController.putTacheDoc);

//Tag
router.post('/post_tag', tacheController.postTag)

//Search
router.get('/get_search', tacheController.getSearch)

//Projet Tache
router.post('/projet_tache', tacheController.postTacheProjet)
router.put('/projet_associe', tacheController.putProjetAssocie)

module.exports = router;