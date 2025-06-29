const express = require("express");
const { menusAll, permissions, putPermission, menusAllOne, getPermissionTache, postPermissionTache, getPermissionVille, getPermissionVilleOne, postPermissionVille, getPermissionDepartementOne, postPermissionDepartement, getPermissionDeclarationVilleOne, postPermissionDeclarationVille, getPermissionDeclaration, postPermissionDeclaration, getPermissionDeclarationClientOne, postPermissionDeclarationClient, getPermissionProjet, postPermissionProjet} = require("../controllers/permission.controller");
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
router.get('/permission_declaration_ville', getPermissionDeclarationVilleOne)
router.post('/permission_declaration_ville', postPermissionDeclarationVille)

//Permission declaration Client
router.get('/permission_declaration_client', getPermissionDeclarationClientOne)
router.post('/permission_declaration_client', postPermissionDeclarationClient)

//Permission declaration
router.get('/permission_declaration', getPermissionDeclaration)
router.post('/permission_declaration', postPermissionDeclaration)

//Permission projet
router.get('/permission_projet', getPermissionProjet)
router.post('/permission_projet', postPermissionProjet)

module.exports = router;