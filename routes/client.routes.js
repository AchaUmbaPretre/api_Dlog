const express = require("express");
const router = express.Router();
const  clientController = require('./../controllers/client.controller.js');

router.get('/clientId', clientController.getClientId)
router.get('/count', clientController.getClientCount)
router.get('/', clientController.getClients)
router.get('/clientOne', clientController.getClientOne)
router.post('/', clientController.postClient)
router.put('/est_supprime', clientController.deleteUpdatedClient)
router.put('/', clientController.putClient)

router.delete('/:id', clientController.deleteClient)

//Client
router.get('/province', clientController.getProvince)
router.get('/provinceOne', clientController.getProvinceOne)
router.get('/provinceClientOne', clientController.getProvinceClientOne)
router.get('/type_client', clientController.getClientType)
 
module.exports = router;