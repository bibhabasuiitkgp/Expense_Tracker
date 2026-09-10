const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const bc = require('../controllers/budgetController');

const budgetSchema = Joi.object({
  category: Joi.string().required(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  limit: Joi.number().positive().required()
});

router.use(auth);

router.get('/', bc.list);
router.post('/', validate(budgetSchema), bc.upsert);
router.put('/', validate(budgetSchema), bc.upsert);
router.delete('/:id', bc.remove);

module.exports = router;
