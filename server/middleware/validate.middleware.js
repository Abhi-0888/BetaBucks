import Joi from 'joi';

// Validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string().min(2).max(50).required()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required',
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required',
      }),
    password: Joi.string().min(8).required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required',
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required',
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    avatar: Joi.string().uri().optional().allow(null),
  }),

  // Trade schemas
  tradeOrder: Joi.object({
    symbol: Joi.string().uppercase().trim().required()
      .messages({
        'any.required': 'Stock symbol is required',
      }),
    quantity: Joi.number().integer().min(1).max(10000).required()
      .messages({
        'number.integer': 'Quantity must be a whole number',
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Quantity cannot exceed 10,000',
        'any.required': 'Quantity is required',
      }),
    orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP_LOSS').optional(),
    targetPrice: Joi.number().positive().optional().allow(null),
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),

  // Stock search schema
  search: Joi.object({
    q: Joi.string().min(1).max(50).required(),
  }),

  // Date range schema
  dateRange: Joi.object({
    days: Joi.number().integer().min(1).max(365).optional(),
  }),
};

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    next();
  };
};

// Query params validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: messages,
      });
    }

    next();
  };
};

export default { validate, validateQuery, schemas };
