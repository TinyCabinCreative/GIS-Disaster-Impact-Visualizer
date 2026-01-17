const db = require('../config/database');
const logger = require('../utils/logger');

class AnalyticsController {
  /**
   * Get overview statistics
   */
  async getOverview(req, res, next) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_disasters,
          COUNT(*) FILTER (WHERE is_active = true) as active_disasters,
          COUNT(DISTINCT type) as disaster_types,
          MIN(start_time) as earliest_disaster,
          MAX(start_time) as latest_disaster
        FROM disasters
      `;

      const result = await db.query(query);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching overview:', error);
      next(error);
    }
  }

  /**
   * Get disaster trends over time
   */
  async getTrends(req, res, next) {
    try {
      const { startDate, endDate, type } = req.query;

      let query = `
        SELECT 
          DATE_TRUNC('month', start_time) as month,
          type,
          COUNT(*) as count,
          AVG(CASE 
            WHEN magnitude IS NOT NULL THEN magnitude 
            ELSE NULL 
          END) as avg_magnitude
        FROM disasters
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (startDate) {
        query += ` AND start_time >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND start_time <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }

      if (type) {
        query += ` AND type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      query += `
        GROUP BY DATE_TRUNC('month', start_time), type
        ORDER BY month DESC, type
        LIMIT 100
      `;

      const result = await db.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching trends:', error);
      next(error);
    }
  }

  /**
   * Get statistics by disaster type
   */
  async getByType(req, res, next) {
    try {
      const query = `
        SELECT 
          type,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          AVG(CASE 
            WHEN area_sq_km IS NOT NULL THEN area_sq_km 
            ELSE NULL 
          END) as avg_area_sq_km,
          MAX(start_time) as most_recent
        FROM disasters
        GROUP BY type
        ORDER BY total_count DESC
      `;

      const result = await db.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching by type:', error);
      next(error);
    }
  }

  /**
   * Get severity distribution
   */
  async getSeverityDistribution(req, res, next) {
    try {
      const query = `
        SELECT 
          severity,
          type,
          COUNT(*) as count
        FROM disasters
        WHERE severity IS NOT NULL
        GROUP BY severity, type
        ORDER BY severity, type
      `;

      const result = await db.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching severity distribution:', error);
      next(error);
    }
  }
}

module.exports = new AnalyticsController();