const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const tc = require('../controllers/transactionController');

const transactionSchema = Joi.object({
  date: Joi.date().required(),
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('expense', 'income').required(),
  category: Joi.string().required(),
  subcategory: Joi.string().allow('').optional(),
  paymentMethod: Joi.string().valid('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking').optional(),
  description: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  recurringRuleId: Joi.string().allow(null).optional()
});

const updateSchema = Joi.object({
  date: Joi.date().optional(),
  amount: Joi.number().positive().optional(),
  type: Joi.string().valid('expense', 'income').optional(),
  category: Joi.string().optional(),
  subcategory: Joi.string().allow('').optional(),
  paymentMethod: Joi.string().valid('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking').optional(),
  description: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

router.use(auth);

router.post('/', validate(transactionSchema), tc.create);
router.get('/', tc.list);
router.get('/:id', tc.get);
router.put('/:id', validate(updateSchema), tc.update);
router.delete('/:id', tc.remove);

module.exports = router;
