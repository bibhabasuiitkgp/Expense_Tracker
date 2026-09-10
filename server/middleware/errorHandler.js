// Centralized error handler
// Consistent JSON error shape: { error: { message, code } }
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: {
        message: messages.join('. '),
        code: 'VALIDATION_ERROR'
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: {
        message: `Duplicate value for ${field}.`,
        code: 'DUPLICATE_KEY'
      }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        message: `Invalid ${err.path}: ${err.value}`,
        code: 'CAST_ERROR'
      }
    });
  }

  // Joi validation error
  if (err.isJoi) {
    return res.status(400).json({
      error: {
        message: err.details.map(d => d.message).join('. '),
        code: 'VALIDATION_ERROR'
      }
    });
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR'
      }
    });
  }

  // Default server error
  res.status(500).json({
    error: {
      message: 'Internal server error.',
      code: 'INTERNAL_ERROR'
    }
  });
};

module.exports = errorHandler;
