const db = require('../config/database');
const spatialAnalysis = require('./spatialAnalysis');
const logger = require('../utils/logger');

/**
 * Impact Calculation Service
 * Handles economic and comprehensive impact assessments
 */

class ImpactCalculationService {
  /**
   * Calculate full impact and store in database
   * @param {number} disasterId - Disaster ID
   * @returns {Object} Complete impact assessment
   */
  async calculateFullImpact(disasterId) {
    try {
      // Get comprehensive impact data
      const impactSummary = await spatialAnalysis.getDisasterImpactSummary(disasterId);
      
      // Calculate economic impact
      const economicLoss = await this.estimateEconomicLoss(
        disasterId,
        impactSummary.population.total
      );

      // Prepare data for database
      const assessment = {
        disaster_id: disasterId,
        affected_population: impactSummary.population.total,
        affected_households: impactSummary.population.households,
        vulnerable_population: 
          impactSummary.population.vulnerable.elderly +
          impactSummary.population.vulnerable.children +
          impactSummary.population.vulnerable.disabled,
        affected_hospitals: impactSummary.infrastructure.by_type.hospital || 0,
        affected_shelters: impactSummary.infrastructure.by_type.emergency_shelter || 0,
        affected_critical_infrastructure: impactSummary.infrastructure.total,
        estimated_economic_loss: economicLoss,
        affected_area_sq_km: impactSummary.evacuation_zones.area_10km_sq_km
      };

      // Store in database
      const insertQuery = `
        INSERT INTO impact_assessments (
          disaster_id,
          affected_population,
          affected_households,
          vulnerable_population,
          affected_hospitals,
          affected_shelters,
          affected_critical_infrastructure,
          estimated_economic_loss,
          affected_area_sq_km,
          evacuation_zone_1km,
          evacuation_zone_5km,
          evacuation_zone_10km
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 
                  ST_GeomFromGeoJSON($10),
                  ST_GeomFromGeoJSON($11),
                  ST_GeomFromGeoJSON($12))
        RETURNING id, assessment_time
      `;

      const result = await db.query(insertQuery, [
        assessment.disaster_id,
        assessment.affected_population,
        assessment.affected_households,
        assessment.vulnerable_population,
        assessment.affected_hospitals,
        assessment.affected_shelters,
        assessment.affected_critical_infrastructure,
        assessment.estimated_economic_loss,
        assessment.affected_area_sq_km,
        JSON.stringify(impactSummary.evacuation_zones.zone_1km),
        JSON.stringify(impactSummary.evacuation_zones.zone_5km),
        JSON.stringify(impactSummary.evacuation_zones.zone_10km)
      ]);

      return {
        ...assessment,
        assessment_id: result.rows[0].id,
        assessment_time: result.rows[0].assessment_time,
        infrastructure_details: impactSummary.infrastructure.details,
        vulnerable_breakdown: impactSummary.population.vulnerable
      };
    } catch (error) {
      logger.error('Error calculating full impact:', error);
      throw error;
    }
  }

  /**
   * Estimate economic loss based on affected population and property values
   * @param {number} disasterId - Disaster ID
   * @param {number} affectedPopulation - Number of affected people
   * @returns {number} Estimated economic loss in dollars
   */
  async estimateEconomicLoss(disasterId, affectedPopulation) {
    try {
      // Get disaster details
      const disasterQuery = `
        SELECT type, severity, area_sq_km
        FROM disasters
        WHERE id = $1
      `;
      
      const disaster = await db.query(disasterQuery, [disasterId]);
      
      if (disaster.rows.length === 0) {
        throw new Error('Disaster not found');
      }

      const { type, severity, area_sq_km } = disaster.rows[0];

      // Base loss per person (simplified model)
      const basePerPersonLoss = {
        minor: 5000,
        moderate: 15000,
        severe: 40000,
        extreme: 100000
      };

      // Type multipliers
      const typeMultipliers = {
        wildfire: 1.5,
        earthquake: 2.0,
        flood: 1.2,
        hurricane: 1.8,
        tornado: 1.6,
        severe_weather: 0.8,
        drought: 1.0,
        winter_storm: 0.9
      };

      const perPersonLoss = basePerPersonLoss[severity] || 10000;
      const typeMultiplier = typeMultipliers[type] || 1.0;

      // Calculate total loss
      const estimatedLoss = affectedPopulation * perPersonLoss * typeMultiplier;

      // Add area-based infrastructure damage estimate
      const areaLoss = (area_sq_km || 0) * 500000; // $500k per sq km

      return Math.round(estimatedLoss + areaLoss);
    } catch (error) {
      logger.error('Error estimating economic loss:', error);
      return 0;
    }
  }

  /**
   * Get vulnerability score for an area
   * @param {Object} demographics - Census block demographics
   * @returns {number} Vulnerability score (0-100)
   */
  calculateVulnerabilityScore(demographics) {
    const {
      elderly_population = 0,
      children_population = 0,
      disabled_population = 0,
      low_income_population = 0,
      population = 1
    } = demographics;

    // Calculate percentages
    const elderlyPct = (elderly_population / population) * 100;
    const childrenPct = (children_population / population) * 100;
    const disabledPct = (disabled_population / population) * 100;
    const lowIncomePct = (low_income_population / population) * 100;

    // Weighted vulnerability score
    const score = 
      (elderlyPct * 0.3) +
      (childrenPct * 0.2) +
      (disabledPct * 0.3) +
      (lowIncomePct * 0.2);

    return Math.min(100, Math.round(score));
  }
}

module.exports = new ImpactCalculationService();