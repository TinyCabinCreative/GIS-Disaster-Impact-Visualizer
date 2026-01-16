const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * PostGIS Spatial Analysis Service
 * Handles all geospatial queries and calculations
 */

class SpatialAnalysisService {
    /**
     * Calculate affected population within a disaster zone
     * @param {number} disasterId - Disaster ID
     * @returns {Object} Population impact statistics
     */
    async calculateAffectedPopulation(disasterId) {
        const query = `
      SELECT 
        SUM(cb.population) as total_population,
        SUM(cb.households) as total_households,
        SUM(cb.elderly_population) as elderly_population,
        SUM(cb.children_population) as children_population,
        SUM(cb.disabled_population) as disabled_population,
        COUNT(cb.id) as affected_census_blocks
      FROM census_blocks cb
      INNER JOIN disasters d ON d.id = $1
      WHERE ST_Intersects(cb.geometry, d.geometry)
    `;

        try {
            const result = await db.query(query, [disasterId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error calculating affected population:', error);
            throw error;
        }
    }

    /**
     * Find infrastructure within disaster impact zone
     * @param {number} disasterId - Disaster ID
     * @param {number} bufferKm - Buffer distance in kilometers
     * @returns {Array} Affected infrastructure
     */
    async findAffectedInfrastructure(disasterId, bufferKm = 0) {
        const query = `
      SELECT 
        i.id,
        i.name,
        i.type,
        i.capacity,
        i.operational_status,
        ST_AsGeoJSON(i.location)::json as location,
        ST_Distance(
          i.location::geography,
          d.centroid::geography
        ) / 1000 as distance_km
      FROM infrastructure i
      INNER JOIN disasters d ON d.id = $1
      WHERE ST_DWithin(
        i.location::geography,
        d.geometry::geography,
        $2 * 1000  -- Convert km to meters
      )
      ORDER BY distance_km ASC
    `;

        try {
            const result = await db.query(query, [disasterId, bufferKm]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding affected infrastructure:', error);
            throw error;
        }
    }

    /**
     * Create evacuation buffer zones around disaster
     * @param {number} disasterId - Disaster ID
     * @returns {Object} Evacuation zones at different distances
     */
    async createEvacuationZones(disasterId) {
        const query = `
      SELECT 
        ST_AsGeoJSON(ST_Buffer(geometry::geography, 1000))::json as zone_1km,
        ST_AsGeoJSON(ST_Buffer(geometry::geography, 5000))::json as zone_5km,
        ST_AsGeoJSON(ST_Buffer(geometry::geography, 10000))::json as zone_10km,
        ST_Area(ST_Buffer(geometry::geography, 1000)) / 1000000 as area_1km_sq_km,
        ST_Area(ST_Buffer(geometry::geography, 5000)) / 1000000 as area_5km_sq_km,
        ST_Area(ST_Buffer(geometry::geography, 10000)) / 1000000 as area_10km_sq_km
      FROM disasters
      WHERE id = $1
    `;

        try {
            const result = await db.query(query, [disasterId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating evacuation zones:', error);
            throw error;
        }
    }

    /**
     * Find disasters within a bounding box
     * @param {Object} bounds - {north, south, east, west}
     * @param {Array} types - Filter by disaster types
     * @returns {Array} Disasters within bounds
     */
    async findDisastersInBounds(bounds, types = null) {
        const { north, south, east, west } = bounds;

        let query = `
      SELECT 
        id,
        disaster_id,
        type,
        name,
        severity,
        ST_AsGeoJSON(geometry)::json as geometry,
        ST_AsGeoJSON(centroid)::json as centroid,
        start_time,
        end_time,
        is_active,
        magnitude,
        temperature_celsius,
        wind_speed_kmh
      FROM disasters
      WHERE ST_Intersects(
        geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `;

        const params = [west, south, east, north];

        if (types && types.length > 0) {
            query += ` AND type = ANY($5::disaster_type[])`;
            params.push(types);
        }

        query += ` ORDER BY start_time DESC LIMIT 1000`;

        try {
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error finding disasters in bounds:', error);
            throw error;
        }
    }

    /**
     * Calculate distance between two points
     * @param {Object} point1 - {lat, lng}
     * @param {Object} point2 - {lat, lng}
     * @returns {number} Distance in kilometers
     */
    async calculateDistance(point1, point2) {
        const query = `
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
      ) / 1000 as distance_km
    `;

        try {
            const result = await db.query(query, [
                point1.lng, point1.lat,
                point2.lng, point2.lat
            ]);
            return result.rows[0].distance_km;
        } catch (error) {
            logger.error('Error calculating distance:', error);
            throw error;
        }
    }

    /**
     * Find nearest infrastructure to a point
     * @param {Object} point - {lat, lng}
     * @param {string} infrastructureType - Type of infrastructure
     * @param {number} limit - Number of results
     * @returns {Array} Nearest infrastructure
     */
    async findNearestInfrastructure(point, infrastructureType, limit = 5) {
        const query = `
      SELECT 
        id,
        name,
        type,
        ST_AsGeoJSON(location)::json as location,
        address,
        capacity,
        operational_status,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km
      FROM infrastructure
      WHERE type = $3
        AND operational_status = true
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT $4
    `;

        try {
            const result = await db.query(query, [
                point.lng, point.lat,
                infrastructureType,
                limit
            ]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding nearest infrastructure:', error);
            throw error;
        }
    }

    /**
     * Calculate disaster clustering hotspots
     * Uses ST_ClusterKMeans for spatial clustering
     * @param {string} disasterType - Type of disaster
     * @param {number} clusters - Number of clusters
     * @returns {Array} Cluster centers with disaster counts
     */
    async calculateDisasterHotspots(disasterType, clusters = 5) {
        const query = `
      WITH clustered AS (
        SELECT 
          centroid,
          ST_ClusterKMeans(centroid, $2) OVER() as cluster_id
        FROM disasters
        WHERE type = $1
          AND start_time > NOW() - INTERVAL '5 years'
      )
      SELECT 
        cluster_id,
        COUNT(*) as disaster_count,
        ST_AsGeoJSON(ST_Centroid(ST_Collect(centroid)))::json as cluster_center
      FROM clustered
      GROUP BY cluster_id
      ORDER BY disaster_count DESC
    `;

        try {
            const result = await db.query(query, [disasterType, clusters]);
            return result.rows;
        } catch (error) {
            logger.error('Error calculating disaster hotspots:', error);
            throw error;
        }
    }

    /**
     * Get disaster impact summary with all spatial calculations
     * @param {number} disasterId - Disaster ID
     * @returns {Object} Complete impact assessment
     */
    async getDisasterImpactSummary(disasterId) {
        try {
            const [population, infrastructure, zones] = await Promise.all([
                this.calculateAffectedPopulation(disasterId),
                this.findAffectedInfrastructure(disasterId, 10),
                this.createEvacuationZones(disasterId)
            ]);

            // Group infrastructure by type
            const infrastructureByType = infrastructure.reduce((acc, item) => {
                acc[item.type] = (acc[item.type] || 0) + 1;
                return acc;
            }, {});

            return {
                population: {
                    total: parseInt(population.total_population) || 0,
                    households: parseInt(population.total_households) || 0,
                    vulnerable: {
                        elderly: parseInt(population.elderly_population) || 0,
                        children: parseInt(population.children_population) || 0,
                        disabled: parseInt(population.disabled_population) || 0
                    },
                    affected_census_blocks: parseInt(population.affected_census_blocks) || 0
                },
                infrastructure: {
                    total: infrastructure.length,
                    by_type: infrastructureByType,
                    details: infrastructure.slice(0, 10) // Top 10 closest
                },
                evacuation_zones: zones,
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error generating impact summary:', error);
            throw error;
        }
    }
}

module.exports = new SpatialAnalysisService();