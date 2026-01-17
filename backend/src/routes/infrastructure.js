const express = require('express');
const router = express.Router();
const infrastructureController = require('../controllers/infrastructureController');

/**
 * @route   GET /api/infrastructure
 * @desc    Get all infrastructure with optional filters
 * @query   type, operational, bounds
 * @access  Public
 */
router.get('/', infrastructureController.getInfrastructure);

/**
 * @route   GET /api/infrastructure/:id
 * @desc    Get single infrastructure by ID
 * @access  Public
 */
router.get('/:id', infrastructureController.getInfrastructureById);

/**
 * @route   GET /api/infrastructure/nearest/:lat/:lng
 * @desc    Find nearest infrastructure to a point
 * @query   type, limit
 * @access  Public
 */
router.get('/nearest/:lat/:lng', infrastructureController.findNearest);

/**
 * @route   GET /api/infrastructure/type/:type
 * @desc    Get infrastructure by type
 * @access  Public
 */
router.get('/type/:type', infrastructureController.getByType);

module.exports = router;