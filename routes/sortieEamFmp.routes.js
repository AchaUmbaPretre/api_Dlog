const express = require("express");
const router = express.Router();
const sortieEamFmpController = require('./../controllers/sortieEamFmp.controller');

router.get('/eam', sortieEamFmpController.getSortieEam);
router.get('/by_smr_eam', sortieEamFmpController.getSortieEamBySmr);
router.put('/put_eam', sortieEamFmpController.putSortieEam);
router.get('/fmp', sortieEamFmpController.getSortieFmp);
router.get('/by_smr_fmp', sortieEamFmpController.getSortieFmpBySmr);
router.put('/put_fmp', sortieEamFmpController.putSortieFMP);
router.get('/smr', sortieEamFmpController.getSMR);
router.get('/part_item', sortieEamFmpController.getPartItem);
router.get('/reconciliation', sortieEamFmpController.getReconciliation);

router.post('/eam_post', sortieEamFmpController.postEamDocPhysique);
router.post('/fmp_post', sortieEamFmpController.postFmpDocPhysique);

module.exports = router;
