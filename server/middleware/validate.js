// Joi validation middleware factory
// Usage: validate(schema) where schema is a Joi schema for req.body
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: {
          message: error.details.map(d => d.message).join('. '),
          code: 'VALIDATION_ERROR'
        }
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
