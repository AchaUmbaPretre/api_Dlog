const express = require("express");
const { menusAll, permissions, putPermission, menusAllOne, getPermissionTache, postPermissionTache, getPermissionVille, getPermissionVilleOne, postPermissionVille, getPermissionDepartementOne, postPermissionDepartement} = require("../controllers/permission.controller");
const router = express.Router();

router.get('/addOne', menusAllOne)
router.get('/add', menusAll)
router.get('/one', permissions)
router.put('/update/:userId/permissions/add/:optionId', putPermission)

//Permission tache
router.get('/permission_tache', getPermissionTache)
router.post('/permission_tache', postPermissionTache)

//Permission Ville
router.get('/permission_ville', getPermissionVilleOne)
router.post('/permission_ville', postPermissionVille)

//Permission departement
router.get('/permission_departement', getPermissionDepartementOne)
router.post('/permission_departement', postPermissionDepartement)

//Permission declaration ville


module.exports = router;