const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const gc = require('../controllers/goalController');

const goalSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  targetAmount: Joi.number().positive().required(),
  targetDate: Joi.date().required(),
  linkedCategory: Joi.string().allow(null, '').optional(),
  linkedInvestment: Joi.string().allow(null, '').optional()
});

router.use(auth);

router.get('/', gc.list);
router.post('/', validate(goalSchema), gc.create);
router.put('/:id', validate(goalSchema), gc.update);
router.delete('/:id', gc.remove);

module.exports = router;
