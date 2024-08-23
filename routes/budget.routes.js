const express = require("express");
const router = express.Router();
const  budgetController = require('./../controllers/budget.controller');

router.get('/count', budgetController.getBudgetCount)
router.get('/', budgetController.getBudget)
router.get('/one', budgetController.getBudgetOne)
router.post('/', budgetController.postBudget)
router.delete('/:id', budgetController.deleteBudget)
module.exports = router;