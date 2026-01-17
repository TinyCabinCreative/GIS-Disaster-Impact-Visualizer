const express = require('express');
const router = express.Router();
const disasterController = require('../controllers/disasterController');
const { validateDisasterQuery } = require('../middleware/validator');

/**
 * @route   GET /api/disasters
 * @desc    Get all disasters with optional filters
 * @query   type, severity, startDate, endDate, bounds, isActive
 * @access  Public
 */
router.get('/', validateDisasterQuery, disasterController.getDisasters);

/**
 * @route   GET /api/disasters/:id
 * @desc    Get single disaster by ID
 * @access  Public
 */
router.get('/:id', disasterController.getDisasterById);

/**
 * @route   GET /api/disasters/:id/impact
 * @desc    Get full impact assessment for a disaster
 * @access  Public
 */
router.get('/:id/impact', disasterController.getDisasterImpact);

/**
 * @route   GET /api/disasters/bounds
 * @desc    Get disasters within map bounds
 * @query   north, south, east, west, types[]
 * @access  Public
 */
router.get('/search/bounds', disasterController.getDisastersInBounds);

/**
 * @route   GET /api/disasters/active/all
 * @desc    Get all currently active disasters
 * @access  Public
 */
router.get('/active/all', disasterController.getActiveDisasters);

/**
 * @route   GET /api/disasters/type/:type
 * @desc    Get disasters by type
 * @access  Public
 */
router.get('/type/:type', disasterController.getDisastersByType);

/**
 * @route   GET /api/disasters/:id/nearby-infrastructure
 * @desc    Get infrastructure near a disaster
 * @query   radius (in km)
 * @access  Public
 */
router.get('/:id/nearby-infrastructure', disasterController.getNearbyInfrastructure);

module.exports = router;