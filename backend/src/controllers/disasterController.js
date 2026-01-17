const db = require('../config/database');
const spatialAnalysis = require('../services/spatialAnalysis');
const logger = require('../utils/logger');

/**
 * Disaster Controller
 * Handles all disaster-related HTTP requests
 */

class DisasterController {
    /**
     * Get all disasters with filters
     */
    async getDisasters(req, res, next) {
        try {
            const {
                type,
                severity,
                startDate,
                endDate,
                isActive,
                limit = 100,
                offset = 0
            } = req.query;

            let query = `
        SELECT 
          id,
          disaster_id,
          type,
          name,
          severity,
          ST_AsGeoJSON(geometry)::json as geometry,
          ST_AsGeoJSON(centroid)::json as centroid,
          area_sq_km,
          start_time,
          end_time,
          is_active,
          magnitude,
          temperature_celsius,
          wind_speed_kmh,
          source_api,
          metadata
        FROM disasters
        WHERE 1=1
      `;

            const params = [];
            let paramCount = 1;

            if (type) {
                query += ` AND type = $${paramCount}`;
                params.push(type);
                paramCount++;
            }

            if (severity) {
                query += ` AND severity = $${paramCount}`;
                params.push(severity);
                paramCount++;
            }

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

            if (isActive !== undefined) {
                query += ` AND is_active = $${paramCount}`;
                params.push(isActive === 'true');
                paramCount++;
            }

            query += ` ORDER BY start_time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (error) {
            logger.error('Error fetching disasters:', error);
            next(error);
        }
    }

    /**
     * Get single disaster by ID
     */
    async getDisasterById(req, res, next) {
        try {
            const { id } = req.params;

            const query = `
        SELECT 
          d.*,
          ST_AsGeoJSON(d.geometry)::json as geometry,
          ST_AsGeoJSON(d.centroid)::json as centroid,
          COUNT(ia.id) as impact_assessment_count
        FROM disasters d
        LEFT JOIN impact_assessments ia ON ia.disaster_id = d.id
        WHERE d.id = $1
        GROUP BY d.id
      `;

            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Disaster not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            logger.error('Error fetching disaster:', error);
            next(error);
        }
    }

    /**
     * Get full impact assessment for a disaster
     */
    async getDisasterImpact(req, res, next) {
        try {
            const { id } = req.params;

            // Check if disaster exists
            const disasterCheck = await db.query(
                'SELECT id FROM disasters WHERE id = $1',
                [id]
            );

            if (disasterCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Disaster not found'
                });
            }

            // Get comprehensive impact summary
            const impactSummary = await spatialAnalysis.getDisasterImpactSummary(id);

            res.json({
                success: true,
                data: impactSummary
            });
        } catch (error) {
            logger.error('Error fetching disaster impact:', error);
            next(error);
        }
    }

    /**
     * Get disasters within map bounds
     */
    async getDisastersInBounds(req, res, next) {
        try {
            const { north, south, east, west, types } = req.query;

            if (!north || !south || !east || !west) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required bounds parameters: north, south, east, west'
                });
            }

            const bounds = {
                north: parseFloat(north),
                south: parseFloat(south),
                east: parseFloat(east),
                west: parseFloat(west)
            };

            const typeArray = types ? (Array.isArray(types) ? types : [types]) : null;

            const disasters = await spatialAnalysis.findDisastersInBounds(bounds, typeArray);

            res.json({
                success: true,
                count: disasters.length,
                data: disasters
            });
        } catch (error) {
            logger.error('Error fetching disasters in bounds:', error);
            next(error);
        }
    }

    /**
     * Get all active disasters
     */
    async getActiveDisasters(req, res, next) {
        try {
            const query = `
        SELECT 
          id,
          disaster_id,
          type,
          name,
          severity,
          ST_AsGeoJSON(geometry)::json as geometry,
          ST_AsGeoJSON(centroid)::json as centroid,
          start_time,
          magnitude,
          temperature_celsius,
          wind_speed_kmh
        FROM disasters
        WHERE is_active = true
        ORDER BY start_time DESC
      `;

            const result = await db.query(query);

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (error) {
            logger.error('Error fetching active disasters:', error);
            next(error);
        }
    }

    /**
     * Get disasters by type
     */
    async getDisastersByType(req, res, next) {
        try {
            const { type } = req.params;
            const { limit = 50 } = req.query;

            const query = `
        SELECT 
          id,
          disaster_id,
          type,
          name,
          severity,
          ST_AsGeoJSON(centroid)::json as centroid,
          start_time,
          is_active
        FROM disasters
        WHERE type = $1
        ORDER BY start_time DESC
        LIMIT $2
      `;

            const result = await db.query(query, [type, limit]);

            res.json({
                success: true,
                count: result.rows.length,
                data: result.rows
            });
        } catch (error) {
            logger.error('Error fetching disasters by type:', error);
            next(error);
        }
    }

    /**
     * Get infrastructure near a disaster
     */
    async getNearbyInfrastructure(req, res, next) {
        try {
            const { id } = req.params;
            const { radius = 10 } = req.query;

            const infrastructure = await spatialAnalysis.findAffectedInfrastructure(
                id,
                parseFloat(radius)
            );

            res.json({
                success: true,
                count: infrastructure.length,
                data: infrastructure
            });
        } catch (error) {
            logger.error('Error fetching nearby infrastructure:', error);
            next(error);
        }
    }
}

module.exports = new DisasterController();