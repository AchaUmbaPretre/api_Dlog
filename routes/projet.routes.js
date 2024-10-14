const express = require("express");
const router = express.Router();
const projetController = require('./../controllers/projet.controller')
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

router.get('/count', projetController.getProjetCount)
router.get('/', projetController.getProjet)
router.get('/onef', projetController.getProjetOneF)
router.get('/one', projetController.getProjetOne)
router.get('/projetTache', projetController.getProjetTache)
router.post('/', projetController.postProjetBesoin)

router.put('/', projetController.putProjet)
router.put('/est_supprime', projetController.deletePutProjet)
router.delete('/:id', projetController.deleteProjet)

//Suivi projet
router.post('/suivi_projet', projetController.postSuiviProjet)

//Doc
router.get('/projet_doc', projetController.getProjetDoc)
router.get('/projet_doc/one', projetController.getProjetDocOne)
router.get('/detail_projet_doc', projetController.getDetailProjetDoc)
router.post('/projet_doc', upload.array('chemin_document', 10), projetController.postProjetDoc);
router.put('/projet_doc', upload.single('chemin_document'), projetController.putProjetDoc);

 
module.exports = router;