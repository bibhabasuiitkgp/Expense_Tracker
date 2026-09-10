const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const cc = require('../controllers/categoryController');

const categorySchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  icon: Joi.string().max(10).optional(),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
  monthlyBudget: Joi.number().positive().allow(null).optional(),
  keywords: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

router.use(auth);

router.get('/', cc.list);
router.post('/', validate(categorySchema), cc.create);
router.put('/:id', validate(categorySchema), cc.update);
router.delete('/:id', cc.remove);

module.exports = router;
