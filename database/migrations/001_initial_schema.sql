-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create custom types
CREATE TYPE disaster_type AS ENUM (
    'wildfire',
    'earthquake',
    'flood',
    'hurricane',
    'tornado',
    'severe_weather',
    'drought',
    'winter_storm'
);

CREATE TYPE severity_level AS ENUM (
    'minor',
    'moderate',
    'severe',
    'extreme'
);

CREATE TYPE infrastructure_type AS ENUM (
    'hospital',
    'emergency_shelter',
    'fire_station',
    'police_station',
    'power_station',
    'water_treatment',
    'school',
    'airport',
    'bridge'
);

-- Disasters table with spatial geometry
CREATE TABLE disasters (
    id SERIAL PRIMARY KEY,
    disaster_id VARCHAR(100) UNIQUE NOT NULL, -- External API ID
    type disaster_type NOT NULL,
    name VARCHAR(255),
    severity severity_level,
    geometry GEOMETRY(Geometry, 4326) NOT NULL, -- Point, Polygon, or MultiPolygon
    centroid GEOMETRY(Point, 4326), -- Computed centroid for quick lookups
    area_sq_km DECIMAL(10, 2), -- For polygon disasters
    perimeter_km DECIMAL(10, 2),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    source_api VARCHAR(100) NOT NULL,
    magnitude DECIMAL(4, 2), -- For earthquakes
    temperature_celsius DECIMAL(5, 1), -- For wildfires
    wind_speed_kmh DECIMAL(5, 1), -- For hurricanes, tornadoes
    metadata JSONB, -- Flexible storage for API-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Infrastructure locations
CREATE TABLE infrastructure (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type infrastructure_type NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province_state VARCHAR(100),
    country VARCHAR(50) NOT NULL DEFAULT 'Canada',
    capacity INTEGER, -- Beds for hospitals, people for shelters
    operational_status BOOLEAN DEFAULT true,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Census/Population blocks
CREATE TABLE census_blocks (
    id SERIAL PRIMARY KEY,
    block_id VARCHAR(50) UNIQUE NOT NULL, -- Census tract ID
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    centroid GEOMETRY(Point, 4326),
    population INTEGER NOT NULL,
    households INTEGER,
    median_income DECIMAL(10, 2),
    median_age DECIMAL(4, 1),
    population_density DECIMAL(10, 2), -- per sq km
    -- Vulnerable populations
    elderly_population INTEGER, -- 65+
    children_population INTEGER, -- Under 18
    disabled_population INTEGER,
    low_income_population INTEGER,
    province_state VARCHAR(100),
    country VARCHAR(50) NOT NULL DEFAULT 'Canada',
    data_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Disaster impact assessment (computed from spatial analysis)
CREATE TABLE impact_assessments (
    id SERIAL PRIMARY KEY,
    disaster_id INTEGER REFERENCES disasters(id) ON DELETE CASCADE,
    assessment_time TIMESTAMP DEFAULT NOW(),
    
    -- Population impact
    affected_population INTEGER,
    affected_households INTEGER,
    vulnerable_population INTEGER,
    
    -- Infrastructure impact
    affected_hospitals INTEGER,
    affected_shelters INTEGER,
    affected_critical_infrastructure INTEGER,
    
    -- Economic impact
    estimated_economic_loss DECIMAL(15, 2),
    affected_area_sq_km DECIMAL(10, 2),
    
    -- Evacuation zones
    evacuation_zone_1km GEOMETRY(Polygon, 4326), -- Immediate danger
    evacuation_zone_5km GEOMETRY(Polygon, 4326), -- High risk
    evacuation_zone_10km GEOMETRY(Polygon, 4326), -- Moderate risk
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Real-time alerts
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    disaster_id INTEGER REFERENCES disasters(id) ON DELETE CASCADE,
    alert_level severity_level NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    affected_area GEOMETRY(Polygon, 4326),
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for spatial queries (critical for performance)
CREATE INDEX idx_disasters_geometry ON disasters USING GIST(geometry);
CREATE INDEX idx_disasters_centroid ON disasters USING GIST(centroid);
CREATE INDEX idx_disasters_type ON disasters(type);
CREATE INDEX idx_disasters_active ON disasters(is_active);
CREATE INDEX idx_disasters_start_time ON disasters(start_time DESC);

CREATE INDEX idx_infrastructure_location ON infrastructure USING GIST(location);
CREATE INDEX idx_infrastructure_type ON infrastructure(type);
CREATE INDEX idx_infrastructure_operational ON infrastructure(operational_status);

CREATE INDEX idx_census_geometry ON census_blocks USING GIST(geometry);
CREATE INDEX idx_census_centroid ON census_blocks USING GIST(centroid);
CREATE INDEX idx_census_population ON census_blocks(population);

CREATE INDEX idx_impact_disaster ON impact_assessments(disaster_id);
CREATE INDEX idx_impact_time ON impact_assessments(assessment_time DESC);

CREATE INDEX idx_alerts_disaster ON alerts(disaster_id);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alerts_area ON alerts USING GIST(affected_area);

-- Trigger to update centroid automatically
CREATE OR REPLACE FUNCTION update_disaster_centroid()
RETURNS TRIGGER AS $$
BEGIN
    NEW.centroid := ST_Centroid(NEW.geometry);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_disaster_centroid
    BEFORE INSERT OR UPDATE ON disasters
    FOR EACH ROW
    EXECUTE FUNCTION update_disaster_centroid();

-- Trigger to update census block centroid
CREATE OR REPLACE FUNCTION update_census_centroid()
RETURNS TRIGGER AS $$
BEGIN
    NEW.centroid := ST_Centroid(NEW.geometry);
    NEW.population_density := NEW.population / (ST_Area(NEW.geometry::geography) / 1000000); -- per sq km
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_census_centroid
    BEFORE INSERT OR UPDATE ON census_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_census_centroid();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_disasters_updated_at
    BEFORE UPDATE ON disasters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_infrastructure_updated_at
    BEFORE UPDATE ON infrastructure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE disasters IS 'Stores disaster events with spatial geometries from various APIs';
COMMENT ON TABLE infrastructure IS 'Critical infrastructure locations for impact assessment';
COMMENT ON TABLE census_blocks IS 'Population and demographic data for affected area calculations';
COMMENT ON TABLE impact_assessments IS 'Computed impact analysis for each disaster event';
COMMENT ON COLUMN disasters.geometry IS 'Spatial representation of disaster (Point for earthquakes, Polygon for fires)';
COMMENT ON COLUMN disasters.centroid IS 'Auto-computed centroid for quick distance queries';