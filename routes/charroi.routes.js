const express = require("express");
const router = express.Router();
const charroiController = require('./../controllers/charroi.controller');
const multer = require('multer');
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
router.get('/vehicule_dispo', charroiController.getVehiculeDispo)
router.get('/vehicule_occupe', charroiController.getVehiculeOccupe)

router.put('/vehicule/rend_dispo', charroiController.rendreVehiculeDispo)

router.get('/vehicule/one', charroiController.getVehiculeOne)
router.post('/vehicule', upload.array('img', 10), charroiController.postVehicule)
router.put('/vehicule', charroiController.putVehicule);
router.put('/vehicule_estSupprime', charroiController.deleteVehicule);
router.put('/vehicule_falcon', charroiController.putRelierVehiculeFalcon)

//Site vehicule
router.post('/site_vehicule', charroiController.postSiteVehicule)

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

//Controle technique
router.get('/controle_technique', charroiController.getControleTechnique)
router.post('/controle_technique', charroiController.postControlTechnique)

//Type de reparation
router.get('/type_reparation', charroiController.getTypeReparation)
router.post('/type_reparation', charroiController.postTypeReparation)

//Statut véhicule
router.get('/statut_vehicule', charroiController.getStatutVehicule)


//Type de reparation
router.get('/reparation', charroiController.getReparation)
router.get('/reparationOneV', charroiController.getReparationOneV)
router.get('/reparationOne', charroiController.getReparationOne)
router.post('/reparation', charroiController.postReparation)
router.post('/delete_reparation', charroiController.deleteReparation)
router.put('/reparation', charroiController.putReparation)


//Reparation image
router.get('/reparation_image', charroiController.getReparationImage)
router.post('/reparation_image', upload.any(), charroiController.postReparationImage)

//Carateristique Rep
router.get('/carateristique_rep', charroiController.getCarateristiqueRep)

//Inspection generale
router.post('/inspection_gens', charroiController.getInspectionGen)
router.get('/inspection_gen_resume', charroiController.getInspectionResume)
router.post('/inspection_gen', upload.any(), charroiController.postInspectionGen)
router.post('/put_inspection_gen_image', upload.any(), charroiController.putInspectionImage)

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
router.put('/suivi_reparation', charroiController.putSuiviReparation)

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