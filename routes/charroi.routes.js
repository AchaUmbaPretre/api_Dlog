const express = require("express");
const router = express.Router();
const charroiController = require('./../controllers/charroi.controller');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');     
const { tenantFilter } = require("../midllewares/tenant.middleware");
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

//Site vehicule
router.post('/site_vehicule', charroiController.postSiteVehicule)

//Permis
router.get('/permis', charroiController.getCatPermis)

//Sexe
router.get('/sexe', charroiController.getEtatCivil)

//Type fonction
router.get('/type_fonction', charroiController.getTypeFonction)

//Destination
router.get('/destination', charroiController.getDestination)
router.post('/destination', charroiController.postDestination)


//Affectation
router.get('/affectation', charroiController.getAffectation)
router.post('/affectation', charroiController.postAffectation)

//Sites
router.get('/site', charroiController.getSites)
router.post('/site', charroiController.postSites)

//site affectation
router.get('/site_user', charroiController.getSitesUser)
router.post('/site_user', charroiController.postSitesUser)

//Zones
router.get('/zone', charroiController.getZones)
router.get('/zoneById', charroiController.getZonesById)
router.post('/zone', charroiController.postZones)
router.put('/zone', charroiController.updateZone)

//Statut véhicule
router.get('/statut_vehicule', charroiController.getStatutVehicule)

//Carateristique Rep
router.get('/carateristique_rep', charroiController.getCarateristiqueRep)

//Inspection generale
router.post('/inspection_gens', verifyToken, tenantFilter, charroiController.getInspectionGen)
router.get('/inspection_gen_resume', verifyToken, tenantFilter, charroiController.getInspectionResume)
router.post('/inspection_gen', upload.any(), verifyToken, tenantFilter, charroiController.postInspectionGen)
router.post('/put_inspection_gen_image', upload.any(), verifyToken, tenantFilter, charroiController.putInspectionImage)

//Sub Inspection
router.get('/sub_inspection_gen', charroiController.getSubInspection)
router.get('/sub_inspection_genOneV', charroiController.getSubInspectionOneV)
router.get('/sub_inspection_genOne', charroiController.getSubInspectionOne)
router.put('/sub_inspection_gen', upload.any(), verifyToken, tenantFilter, charroiController.putInspectionGen)
router.post('/delete_inspection', verifyToken, tenantFilter, charroiController.deleteInspectionGen)

//Validation inspection
router.get('/inspection_validation', verifyToken, tenantFilter, charroiController.getValidationInspection)
router.post('/inspection_validation', verifyToken, tenantFilter, charroiController.postValidationInspection)

//Suivi inspection
router.get('/suivi_inspections', charroiController.getSuiviInspection)
router.post('/suivi_inspections', charroiController.postSuiviInspection)

//Evaluation
router.get('/evaluation', charroiController.getEvaluation)

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

//Reclamation
router.get('/reclamation', charroiController.getReclamation)
router.get('/reclamationOne', charroiController.getReclamationOne)
router.post('/reclamation', charroiController.postReclamation)

router.get('/serviceDemadeur', charroiController.getServiceDemandeur)
router.post('/serviceDemadeur', charroiController.postServiceDemandeur)

router.get('/type_vehicule', charroiController.getTypeVehicule)
router.get('/motif', charroiController.getMotif)

//Validation demande
router.get('/validation_demande', charroiController.getValidationDemande)
router.get('/validation_demandeOne', charroiController.getValidationDemandeOne)
router.post('/validation_demande', upload.any(), charroiController.postValidationDemande)

//Affectation
router.get('/demande_vehicule', charroiController.getDemandeVehicule)
router.get('/demande_vehiculeUserOne', charroiController.getDemandeVehiculeUserOne)
router.get('/demande_vehiculeOne', charroiController.getDemandeVehiculeOne)
router.post('/demande_vehicule', charroiController.postDemandeVehicule)
router.put('/demande_vehicule', charroiController.putDemandeVehicule)
router.put('/demande_vehiculeVue', charroiController.putDemandeVehiculeVue)
router.put('/demande_vehiculeAnnuler', charroiController.putDemandeVehiculeAnnuler)
router.put('/demande_vehicule_retour', charroiController.putDemandeVehiculeRetour)


//Affectation
router.get('/affectation_demande', charroiController.getAffectationDemande)
router.get('/affectation_demandeOne', charroiController.getAffectationDemandeOne)
router.post('/affectation_demande', charroiController.postAffectationDemande)

//Bande de sortie
router.get('/bande_sortie', charroiController.getBandeSortie)
router.get('/bande_sortie_unique', charroiController.getBandeSortieUnique)
router.get('/bande_sortieOne', charroiController.getBandeSortieOne)
router.post('/bande_sortie', charroiController.postBandeSortie)
router.put('/bande_sortie_est_supprime', charroiController.putSupprimeBandeSortie)
router.put('/bande_sortie_annuler', charroiController.putBandeSortieAnnuler)
router.put('/bon_update_date', charroiController.putBonSortieDate)

//Bon de sortie du personnel
router.get('/bon_sortie', charroiController.getBonSortiePerso)
router.get('/bon_sortieOne_perso', charroiController.getBonSortiePersoOne)
router.post('/bon_sortie_perso', charroiController.postBonSortiePerso)

//Sortie personnel
router.get('/bon_sortie_sortie', charroiController.getBonSortiePersoSortie)
router.post('/bon_sortie_sortie', charroiController.postBonSortiePersoSortie)

//Retour personnel
router.get('/bon_sortie_retour', charroiController.getBonSortiePersoRetour)
router.post('/bon_sortie_retour', charroiController.postBonSortiePersoRetour)

//ENTREE ET SORTIE PERSONNEL
router.get('/entree_sortie_personnel', charroiController.getEntreeSortiePersonnel )

//Véhicule en Course 
router.get('/vehicule_course', charroiController.getVehiculeCourse)
router.get('/vehicule_courseOne', charroiController.getVehiculeCourseOne)

//Sortie véhicule
router.get('/sortie_vehicule', charroiController.getSortie)
router.post('/sortie_vehicule', charroiController.postSortie)

//Retour véhicule
router.get('/retour_vehicule', charroiController.getRetour)
router.post('/retour_vehicule', charroiController.postRetour)

//Visiteur
router.get('/visiteur_vehicule', charroiController.getVisiteur)
router.get('/visiteur_vehicule_search', charroiController.getVisiteurSearch)
router.post('/visiteur_vehicule', charroiController.postVisiteur)

//Visiteur Retour
router.get('/visiteur_retour', charroiController.getVisiteurVehiculeRetour);
router.put('/visiteur_retour', charroiController.putVisiteurVehiculeRetour);

//Sortie exceptionnelle
router.get('/sortie_vehicule_exceptionnel', charroiController.getSortieExceptionnelle)
router.post('/sortie_vehicule_exceptionnel', charroiController.postSortieExceptionnel)

//Retour exceptionnelle
router.get('/retour_vehicule_exceptionnel', charroiController.getRetourExceptionnelle)
router.post('/retour_vehicule_exceptionnel', charroiController.postRetourExceptionnel)


//Liste de sortie et entree
router.get('/sortie_entree', charroiController.getEntreeSortie)
router.get('/sortie_entreeOne', charroiController.getEntreeSortieOne)

//Info sortie & retour
router.get('/info_sortie_retour', charroiController.getInfoSortieRetour)

//Notification push
router.post('/savePushToken', charroiController.savePushToken);

module.exports = router;