const db = require('../config/database');
const spatialAnalysis = require('../services/spatialAnalysis');
const logger = require('../utils/logger');

class InfrastructureController {
  /**
   * Get all infrastructure with filters
   */
  async getInfrastructure(req, res, next) {
    try {
      const { type, operational, limit = 100, offset = 0 } = req.query;

      let query = `
        SELECT 
          id,
          name,
          type,
          ST_AsGeoJSON(location)::json as location,
          address,
          city,
          province_state,
          country,
          capacity,
          operational_status,
          contact_phone,
          contact_email
        FROM infrastructure
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (type) {
        query += ` AND type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      if (operational !== undefined) {
        query += ` AND operational_status = $${paramCount}`;
        params.push(operational === 'true');
        paramCount++;
      }

      query += ` ORDER BY name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching infrastructure:', error);
      next(error);
    }
  }

  /**
   * Get single infrastructure by ID
   */
  async getInfrastructureById(req, res, next) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          *,
          ST_AsGeoJSON(location)::json as location
        FROM infrastructure
        WHERE id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Infrastructure not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching infrastructure:', error);
      next(error);
    }
  }

  /**
   * Find nearest infrastructure to a point
   */
  async findNearest(req, res, next) {
    try {
      const { lat, lng } = req.params;
      const { type, limit = 5 } = req.query;

      const point = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Infrastructure type is required'
        });
      }

      const nearest = await spatialAnalysis.findNearestInfrastructure(
        point,
        type,
        parseInt(limit)
      );

      res.json({
        success: true,
        count: nearest.length,
        data: nearest
      });
    } catch (error) {
      logger.error('Error finding nearest infrastructure:', error);
      next(error);
    }
  }

  /**
   * Get infrastructure by type
   */
  async getByType(req, res, next) {
    try {
      const { type } = req.params;

      const query = `
        SELECT 
          id,
          name,
          ST_AsGeoJSON(location)::json as location,
          city,
          province_state,
          capacity,
          operational_status
        FROM infrastructure
        WHERE type = $1
        ORDER BY name
      `;

      const result = await db.query(query, [type]);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching infrastructure by type:', error);
      next(error);
    }
  }
}

module.exports = new InfrastructureController();