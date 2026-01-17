const db = require('../config/database');
const spatialAnalysis = require('../services/spatialAnalysis');
const impactCalculation = require('../services/impactCalculation');
const logger = require('../utils/logger');

class ImpactController {
  /**
   * Get affected population for a disaster
   */
  async getAffectedPopulation(req, res, next) {
    try {
      const { disasterId } = req.params;

      const population = await spatialAnalysis.calculateAffectedPopulation(disasterId);

      res.json({
        success: true,
        data: population
      });
    } catch (error) {
      logger.error('Error calculating affected population:', error);
      next(error);
    }
  }

  /**
   * Get evacuation zones for a disaster
   */
  async getEvacuationZones(req, res, next) {
    try {
      const { disasterId } = req.params;

      const zones = await spatialAnalysis.createEvacuationZones(disasterId);

      res.json({
        success: true,
        data: zones
      });
    } catch (error) {
      logger.error('Error creating evacuation zones:', error);
      next(error);
    }
  }

  /**
   * Get disaster hotspots
   */
  async getDisasterHotspots(req, res, next) {
    try {
      const { disasterType } = req.params;
      const { clusters = 5 } = req.query;

      const hotspots = await spatialAnalysis.calculateDisasterHotspots(
        disasterType,
        parseInt(clusters)
      );

      res.json({
        success: true,
        count: hotspots.length,
        data: hotspots
      });
    } catch (error) {
      logger.error('Error calculating disaster hotspots:', error);
      next(error);
    }
  }

  /**
   * Trigger full impact assessment calculation
   */
  async calculateImpact(req, res, next) {
    try {
      const { disasterId } = req.params;

      // Check if disaster exists
      const disasterCheck = await db.query(
        'SELECT id FROM disasters WHERE id = $1',
        [disasterId]
      );

      if (disasterCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Disaster not found'
        });
      }

      // Calculate comprehensive impact
      const impact = await impactCalculation.calculateFullImpact(disasterId);

      res.json({
        success: true,
        data: impact
      });
    } catch (error) {
      logger.error('Error calculating impact:', error);
      next(error);
    }
  }
}

module.exports = new ImpactController();