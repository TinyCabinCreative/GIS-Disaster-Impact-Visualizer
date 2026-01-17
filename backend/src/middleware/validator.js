const Joi = require('joi');

/**
 * Validation middleware using Joi
 */

const validateDisasterQuery = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid(
      'wildfire', 'earthquake', 'flood', 'hurricane', 
      'tornado', 'severe_weather', 'drought', 'winter_storm'
    ),
    severity: Joi.string().valid('minor', 'moderate', 'severe', 'extreme'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    isActive: Joi.string().valid('true', 'false'),
    limit: Joi.number().integer().min(1).max(1000),
    offset: Joi.number().integer().min(0)
  });

  const { error } = schema.validate(req.query);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }

  next();
};

const validateBoundsQuery = (req, res, next) => {
  const schema = Joi.object({
    north: Joi.number().min(-90).max(90).required(),
    south: Joi.number().min(-90).max(90).required(),
    east: Joi.number().min(-180).max(180).required(),
    west: Joi.number().min(-180).max(180).required(),
    types: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
  });

  const { error } = schema.validate(req.query);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }

  next();
};

module.exports = {
  validateDisasterQuery,
  validateBoundsQuery
};