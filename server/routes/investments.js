const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const ic = require('../controllers/investmentController');

const investmentSchema = Joi.object({
  fundName: Joi.string().min(1).required(),
  folioNumber: Joi.string().allow('').optional(),
  type: Joi.string().valid('SIP', 'lumpsum').required(),
  amountInvested: Joi.number().positive().required(),
  units: Joi.number().positive().required(),
  NAVatPurchase: Joi.number().positive().required(),
  purchaseDate: Joi.date().required(),
  currentNAV: Joi.number().positive().allow(null).optional(),
  sipDate: Joi.number().min(1).max(31).allow(null).optional(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'yearly').allow(null).optional()
});

router.use(auth);

router.get('/', ic.list);
router.get('/summary', ic.summary);
router.post('/', validate(investmentSchema), ic.create);
router.put('/:id', validate(investmentSchema), ic.update);
router.delete('/:id', ic.remove);

module.exports = router;
