"""
Canadian Wildland Fire Information System (CWFIS) Ingestor
Fetches active wildfire data from Natural Resources Canada
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CWFISIngestor:
    """Fetch and process Canadian wildfire data"""
    
    # CWFIS Active Fire Data API
    BASE_URL = "https://cwfis.cfs.nrcan.gc.ca/downloads/activefires"
    
    def __init__(self):
        self.db_url = os.getenv('DATABASE_URL')
        self.conn = None
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(self.db_url)
            logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def fetch_active_fires(self) -> Optional[List[Dict]]:
        """
        Fetch active fires from CWFIS
        
        Returns:
            List of fire data
        """
        # CWFIS provides daily CSV/JSON files
        # Format: activefires_YYYY-MM-DD.json
        today = datetime.now().strftime('%Y-%m-%d')
        url = f"{self.BASE_URL}/activefires_{today}.json"
        
        try:
            logger.info(f"Fetching Canadian wildfires from CWFIS: {url}")
            response = requests.get(url, timeout=30)
            
            # If today's data not available, try yesterday
            if response.status_code == 404:
                yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
                url = f"{self.BASE_URL}/activefires_{yesterday}.json"
                logger.info(f"Today's data unavailable, trying yesterday: {url}")
                response = requests.get(url, timeout=30)
            
            response.raise_for_status()
            
            data = response.json()
            features = data.get('features', [])
            
            logger.info(f"Fetched {len(features)} Canadian fire detections")
            return features
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching CWFIS data: {e}")
            
            # Fallback: try to get data from alternative endpoint
            try:
                logger.info("Trying alternative CWFIS endpoint...")
                alt_url = "https://cwfis.cfs.nrcan.gc.ca/datamart/activefires/active_fires.json"
                response = requests.get(alt_url, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                features = data.get('features', [])
                logger.info(f"Fetched {len(features)} fires from alternative endpoint")
                return features
                
            except Exception as alt_error:
                logger.error(f"Alternative endpoint also failed: {alt_error}")
                return None
    
    def transform_fire(self, feature: Dict) -> Dict:
        """
        Transform CWFIS fire data to our schema
        
        Args:
            feature: CWFIS GeoJSON feature
            
        Returns:
            Transformed fire data
        """
        properties = feature.get('properties', {})
        geometry = feature.get('geometry', {})
        coords = geometry.get('coordinates', [])
        
        # Extract data
        fire_id = properties.get('FIRE_ID', properties.get('id', ''))
        fire_number = properties.get('FIRE_NUMBER', 'Unknown')
        fire_name = properties.get('FIRE_NAME', properties.get('name', f"Fire {fire_number}"))
        province = properties.get('PROVINCE', properties.get('province', 'Unknown'))
        agency = properties.get('AGENCY', 'CWFIS')
        size_ha = properties.get('SIZE_HA', properties.get('size', 0))
        fire_type = properties.get('FIRE_TYPE', 'Unknown')
        stage_of_control = properties.get('STAGE_OF_CONTROL', 'Unknown')
        
        # Get fire detection date
        rep_date = properties.get('REP_DATE', properties.get('report_date', ''))
        if rep_date:
            try:
                # Format: YYYY-MM-DD or YYYYMMDD
                if '-' in rep_date:
                    event_time = datetime.strptime(rep_date, '%Y-%m-%d')
                else:
                    event_time = datetime.strptime(rep_date, '%Y%m%d')
            except:
                event_time = datetime.now()
        else:
            event_time = datetime.now()
        
        # Determine severity based on size and control status
        if size_ha < 10:
            severity = 'minor'
        elif size_ha < 100:
            severity = 'moderate'
        elif size_ha < 1000:
            severity = 'severe'
        else:
            severity = 'extreme'
        
        # Increase severity if out of control
        if stage_of_control in ['OC', 'OUT_OF_CONTROL', 'Out of Control']:
            if severity == 'minor':
                severity = 'moderate'
            elif severity == 'moderate':
                severity = 'severe'
        
        # Create geometry
        if geometry.get('type') == 'Point' and len(coords) >= 2:
            lng, lat = coords[0], coords[1]
            geometry_wkt = f"POINT({lng} {lat})"
        elif geometry.get('type') == 'Polygon':
            # Convert polygon coordinates
            poly_coords = coords[0] if len(coords) > 0 else []
            if poly_coords:
                coord_str = ', '.join([f"{c[0]} {c[1]}" for c in poly_coords])
                geometry_wkt = f"POLYGON(({coord_str}))"
            else:
                geometry_wkt = None
        else:
            geometry_wkt = None
        
        # Determine if fire is active
        is_active = stage_of_control not in ['UC', 'UNDER_CONTROL', 'Under Control', 'EX', 'EXTINGUISHED']
        
        return {
            'disaster_id': f"cwfis_{fire_id}",
            'type': 'wildfire',
            'name': f"{fire_name} - {province}",
            'severity': severity,
            'geometry': geometry_wkt,
            'area_sq_km': size_ha / 100 if size_ha else None,  # Convert hectares to sq km
            'start_time': event_time,
            'end_time': None if is_active else event_time,
            'is_active': is_active,
            'source_api': 'CWFIS',
            'metadata': {
                'fire_id': fire_id,
                'fire_number': fire_number,
                'province': province,
                'agency': agency,
                'size_ha': size_ha,
                'fire_type': fire_type,
                'stage_of_control': stage_of_control,
                'country': 'Canada'
            }
        }
    
    def load_fires(self, fires: List[Dict]) -> int:
        """
        Load fires into database
        
        Args:
            fires: List of transformed fire data
            
        Returns:
            Number of fires inserted/updated
        """
        if not fires:
            logger.info("No fires to load")
            return 0
        
        cursor = self.conn.cursor()
        
        query = """
            INSERT INTO disasters (
                disaster_id, type, name, severity, geometry, 
                area_sq_km, start_time, end_time, is_active, 
                source_api, metadata
            ) VALUES %s
            ON CONFLICT (disaster_id) 
            DO UPDATE SET
                name = EXCLUDED.name,
                severity = EXCLUDED.severity,
                geometry = EXCLUDED.geometry,
                area_sq_km = EXCLUDED.area_sq_km,
                is_active = EXCLUDED.is_active,
                updated_at = NOW(),
                metadata = EXCLUDED.metadata
        """
        
        values = [
            (
                fire['disaster_id'],
                fire['type'],
                fire['name'],
                fire['severity'],
                f"ST_GeomFromText('{fire['geometry']}', 4326)" if fire['geometry'] else None,
                fire['area_sq_km'],
                fire['start_time'],
                fire['end_time'],
                fire['is_active'],
                fire['source_api'],
                psycopg2.extras.Json(fire['metadata'])
            )
            for fire in fires
        ]
        
        try:
            execute_values(
                cursor,
                query.replace('%s', '%s'),
                values,
                template="""(
                    %s, %s, %s, %s,
                    ST_GeomFromText(%s, 4326),
                    %s, %s, %s, %s, %s, %s
                )""",
                page_size=50
            )
            
            self.conn.commit()
            count = len(fires)
            logger.info(f"Successfully loaded {count} Canadian wildfires")
            return count
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error loading fires: {e}")
            raise
        finally:
            cursor.close()
    
    def run(self):
        """Main execution method"""
        try:
            logger.info("Starting CWFIS wildfire ingestion")
            
            # Connect to database
            self.connect_db()
            
            # Fetch fires
            features = self.fetch_active_fires()
            
            if not features:
                logger.warning("No CWFIS fire data fetched")
                return
            
            # Transform fires
            fires = []
            for feature in features:
                try:
                    fire = self.transform_fire(feature)
                    if fire['geometry']:  # Only add if we have valid geometry
                        fires.append(fire)
                except Exception as e:
                    logger.error(f"Error transforming fire: {e}")
                    continue
            
            # Load into database
            count = self.load_fires(fires)
            
            logger.info(f"CWFIS ingestion complete: {count} fires processed")
            
        except Exception as e:
            logger.error(f"CWFIS ingestion failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()
                logger.info("Database connection closed")


if __name__ == "__main__":
    ingestor = CWFISIngestor()
    ingestor.run()