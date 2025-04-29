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
router.post('/type_reparation', charroiController.postTypeReparation)

//Statut véhicule
router.get('/statut_vehicule', charroiController.getStatutVehicule)

//Réparation
router.get('/reparation', charroiController.getReparation)
router.get('/reparationOne', charroiController.getReparationOne)
router.post('/reparation', charroiController.postReparation)
router.post('/delete_reparation', charroiController.deleteReparation)

//Carateristique Rep
router.get('/carateristique_rep', charroiController.getCarateristiqueRep)

//Inspection generale
router.post('/inspection_gens', charroiController.getInspectionGen)
router.get('/inspection_gen_resume', charroiController.getInspectionResume)
router.post('/inspection_gen', upload.any(), charroiController.postInspectionGen)

//Sub Inspection
router.get('/sub_inspection_gen', charroiController.getSubInspection)
router.get('/sub_inspection_genOneV', charroiController.getSubInspectionOneV)
router.get('/sub_inspection_genOne', charroiController.getSubInspectionOne)
router.put('/sub_inspection_gen', upload.any(), charroiController.putInspectionGen)
router.post('/delete_inspection', charroiController.deleteInspectionGen)

//Validation inspection
router.get('/inspection_validation', charroiController.getValidationInspection)
router.post('/inspection_validation', charroiController.postValidationInspection)

//Suivi inspection
router.get('/suivi_inspections', charroiController.getSuiviInspection)
router.post('/suivi_inspections', charroiController.postSuiviInspection)

//Suivi réparation
router.get('/suivi_reparation', charroiController.getSuiviReparation)
router.get('/suivi_reparationOne', charroiController.getSuiviReparationOne)
router.post('/suivi_reparation', charroiController.postSuiviReparation)


//Evaluation
router.get('/evaluation', charroiController.getEvaluation)

//Document réparation
router.get('/document_reparation', charroiController.getDocumentReparation)
router.post('/document_reparation',upload.array('chemin_document', 10), charroiController.postDocumentReparation)

//Piece
router.get('/cat_piece', charroiController.getCatPiece)
router.get('/piece', charroiController.getPiece)
router.get('/pieceOne', charroiController.getPieceOne)
router.post('/piece', charroiController.postPiece)

//TRACKING GEN
router.get('/tracking_gen', charroiController.getTrackingGen)

//Log inspection
router.get('/log_inspection', charroiController.getLogInspection)

//Document inspection
router.get('/document_inspection', charroiController.getDocumentInspection)

//Historique
router.get('/historique', charroiController.getHistorique)

module.exports = router;