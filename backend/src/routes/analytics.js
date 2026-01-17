const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

/**
 * @route   GET /api/analytics/overview
 * @desc    Get disaster overview statistics
 * @access  Public
 */
router.get('/overview', analyticsController.getOverview);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get disaster trends over time
 * @query   startDate, endDate, type
 * @access  Public
 */
router.get('/trends', analyticsController.getTrends);

/**
 * @route   GET /api/analytics/by-type
 * @desc    Get disaster statistics by type
 * @access  Public
 */
router.get('/by-type', analyticsController.getByType);

/**
 * @route   GET /api/analytics/severity-distribution
 * @desc    Get severity distribution
 * @access  Public
 */
router.get('/severity-distribution', analyticsController.getSeverityDistribution);

module.exports = router;