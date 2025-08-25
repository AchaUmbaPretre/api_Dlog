const express = require("express");
const router = express.Router();
const besoinsController = require('./../controllers/besoins.controller');

router.get('/count', besoinsController.getBesoinCount)
router.get('/', besoinsController.getBesoin)
router.get('/one', besoinsController.getBesoinOne)
router.get('/besoin-inactif', besoinsController.getBesoinInactif)
router.post('/', besoinsController.postBesoins)
/* router.post('/besoin_client', besoinsController.postBesoinsClient)
 */router.delete('/:id', besoinsController.deleteBesoins)
module.exports = router;