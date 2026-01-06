const express = require("express");
const router = express.Router();
const sortieEamFmpController = require('./../controllers/sortieEamFmp.controller');

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

router.get('/eam', sortieEamFmpController.getSortieEam);
router.get('/by_smr_eam', sortieEamFmpController.getSortieEamBySmr);
router.put('/put_eam', sortieEamFmpController.putSortieEam);
router.put('/put_eam_smr', sortieEamFmpController.putSortieEamSmr);
router.get('/fmp', sortieEamFmpController.getSortieFmp);
router.get('/by_smr_fmp', sortieEamFmpController.getSortieFmpBySmr);
router.put('/put_fmp', sortieEamFmpController.putSortieFMP);
router.put('/put_fmp_smr', sortieEamFmpController.putSortieFMPSmr);
router.get('/smr', sortieEamFmpController.getSMR);
router.get('/part_item', sortieEamFmpController.getPartItem);
router.get('/reconciliation', sortieEamFmpController.getReconciliation);
router.get('/itemCode', sortieEamFmpController.getItemCodeTotals);
router.get('/global_item', sortieEamFmpController.getGlobalItemsReconciliation);

router.post('/eam_post', sortieEamFmpController.postEamDocPhysique);
router.post('/fmp_post', sortieEamFmpController.postFmpDocPhysique);

//EXPORT EXCEL
router.post('/fmp_excel', upload.array('chemin_document', 10), sortieEamFmpController.postSortiefmpExcel);
router.post('/eam_excel', upload.array('chemin_document', 10), sortieEamFmpController.postEamExcel);

module.exports = router;
