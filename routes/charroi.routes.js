const express = require("express");
const router = express.Router();
const charroiController = require('./../controllers/charroi.controller');
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

router.get('/cat_vehicule', charroiController.getCatVehicule)
router.get('/marque', charroiController.getMarque)
router.post('/marque', charroiController.postMarque)

router.get('/modeleAll', charroiController.getModeleAll)
router.get('/modele', charroiController.getModele)
router.post('/modele', charroiController.postModele)

router.get('/disposition', charroiController.getDisposition)
router.get('/couleur', charroiController.getCouleur)
router.get('/type_carburant', charroiController.getTypeCarburant)
router.get('/pneus', charroiController.getTypePneus)
router.get('/lubrifiant', charroiController.getLubrifiant)

//Vehicule
router.get('/vehicule_count', charroiController.getVehiculeCount)
router.get('/vehicule', charroiController.getVehicule)
router.get('/vehicule/one', charroiController.getVehiculeOne)
router.post('/vehicule', upload.array('img', 10), charroiController.postVehicule)
router.put('/vehicule', charroiController.putVehicule)
router.put('/vehicule_estSupprime', charroiController.deleteVehicule)

//Chauffeur
router.get('/chauffeur_count', charroiController.getChauffeurCount)
router.get('/chauffeur', charroiController.getChauffeur)
router.post('/chauffeur', upload.array('profil', 10), charroiController.postChauffeur)

//Permis
router.get('/permis', charroiController.getCatPermis)

//Sexe
router.get('/sexe', charroiController.getEtatCivil)

//Type fonction
router.get('/type_fonction', charroiController.getTypeFonction)

//Sites
router.get('/site', charroiController.getSites)
router.post('/site', charroiController.postSites)

//Affectation
router.get('/affectation', charroiController.getAffectation)
router.post('/affectation', charroiController.postAffectation)

//Controle technique
router.get('/controle_technique', charroiController.getControleTechnique)
router.post('/controle_technique', charroiController.postControlTechnique)

//Type de reparation
router.get('/type_reparation', charroiController.getTypeReparation)

//Statut véhicule
router.get('/statut_vehicule', charroiController.getStatutVehicule)

//Réparation
router.get('/reparation', charroiController.getReparation)
router.post('/reparation', charroiController.postReparation)

//Carateristique Rep
router.get('/carateristique_rep', charroiController.getCarateristiqueRep)

//Inspection generale
router.get('/inspection_gen', charroiController.getInspectionGen)
router.post('/inspection_gen', upload.any(), charroiController.postInspectionGen)

//Sub Inspection
router.get('/sub_inspection_gen', charroiController.getInspectionGen)


module.exports = router;