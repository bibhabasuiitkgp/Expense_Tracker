const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const ic = require('../controllers/investmentController');

const investmentSchema = Joi.object({
  fundName: Joi.string().min(1).required(),
  folioNumber: Joi.string().allow('').optional(),
  type: Joi.string().valid('SIP', 'lumpsum', 'emergency_fund').required(),
  amountInvested: Joi.number().positive().required(),
  units: Joi.number().positive().allow(null).optional(),
  NAVatPurchase: Joi.number().positive().allow(null).optional(),
  purchaseDate: Joi.date().required(),
  currentNAV: Joi.number().positive().allow(null).optional(),
  sipDate: Joi.number().min(1).max(31).allow(null).optional(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'yearly').allow(null).optional(),
  targetAmount: Joi.number().positive().allow(null).optional()
}).custom((value, helpers) => {
  // For SIP and lumpsum, units and NAVatPurchase are required
  if (value.type !== 'emergency_fund') {
    if (!value.units || value.units <= 0) {
      return helpers.error('any.custom', { message: 'Units are required for SIP/lumpsum investments' });
    }
    if (!value.NAVatPurchase || value.NAVatPurchase <= 0) {
      return helpers.error('any.custom', { message: 'NAV at purchase is required for SIP/lumpsum investments' });
    }
  }
  return value;
});

const contributionSchema = Joi.object({
  amount: Joi.number().positive().required(),
  date: Joi.date().optional(),
  note: Joi.string().allow('').optional()
});

router.use(auth);

router.get('/', ic.list);
router.get('/summary', ic.summary);
router.post('/', validate(investmentSchema), ic.create);
router.put('/:id', validate(investmentSchema), ic.update);
router.delete('/:id', ic.remove);

// Contribution endpoints
router.post('/:id/contribute', validate(contributionSchema), ic.addContribution);
router.get('/:id/contributions', ic.getContributions);

module.exports = router;
