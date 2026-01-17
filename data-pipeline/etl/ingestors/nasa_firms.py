"""
NASA FIRMS Wildfire Data Ingestor
Fetches active fire data from NASA Fire Information for Resource Management System
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
from shapely.geometry import Point, MultiPoint
from shapely import wkt
import geopandas as gpd

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NASAFIRMSIngestor:
    """Fetch and process NASA FIRMS wildfire data"""
    
    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    
    def __init__(self):
        self.api_key = os.getenv('NASA_FIRMS_API_KEY')
        self.db_url = os.getenv('DATABASE_URL')
        self.conn = None
        
        if not self.api_key:
            raise ValueError("NASA_FIRMS_API_KEY not set in environment")
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(self.db_url)
            logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def fetch_fires(self, 
                    region: str = "north_america",
                    days: int = 1,
                    source: str = "VIIRS_NOAA20_NRT") -> Optional[List[Dict]]:
        """
        Fetch active fires from NASA FIRMS
        
        Args:
            region: Geographic region or bounding box
            days: Number of days to look back (1-10)
            source: Data source (VIIRS_NOAA20_NRT, MODIS_NRT)
        
        Returns:
            List of fire detections
        """
        # North America bounding box
        if region == "north_america":
            # Format: west,south,east,north
            bbox = "-170,15,-50,75"  # Covers USA and Canada
        else:
            bbox = region
        
        url = f"{self.BASE_URL}/{self.api_key}/{source}/{bbox}/{days}"
        
        try:
            logger.info(f"Fetching fires from NASA FIRMS: {source}, {days} days")
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            # Parse CSV response
            lines = response.text.strip().split('\n')
            if len(lines) < 2:
                logger.warning("No fire data in response")
                return []
            
            headers = lines[0].split(',')
            fires = []
            
            for line in lines[1:]:
                values = line.split(',')
                fire = dict(zip(headers, values))
                fires.append(fire)
            
            logger.info(f"Fetched {len(fires)} fire detections")
            return fires
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching NASA FIRMS data: {e}")
            return None
    
    def cluster_fires(self, fires: List[Dict], distance_km: float = 5.0) -> List[List[Dict]]:
        """
        Cluster nearby fire detections into wildfires
        
        Args:
            fires: List of fire detections
            distance_km: Distance threshold for clustering (km)
            
        Returns:
            List of fire clusters (each cluster is a wildfire)
        """
        if not fires:
            return []
        
        # Create GeoDataFrame
        points = []
        for fire in fires:
            try:
                lat = float(fire.get('latitude', 0))
                lon = float(fire.get('longitude', 0))
                points.append(Point(lon, lat))
            except (ValueError, TypeError):
                continue
        
        if not points:
            return []
        
        gdf = gpd.GeoDataFrame(fires, geometry=points, crs='EPSG:4326')
        
        # Project to meters for clustering
        gdf_projected = gdf.to_crs('EPSG:3857')
        
        # Simple distance-based clustering
        clusters = []
        unclustered = gdf_projected.copy()
        
        while len(unclustered) > 0:
            # Start new cluster with first point
            cluster = [unclustered.iloc[0]]
            unclustered = unclustered.iloc[1:]
            
            # Add nearby points to cluster
            changed = True
            while changed and len(unclustered) > 0:
                changed = False
                cluster_geom = MultiPoint([p.geometry for p in cluster])
                
                # Find points within distance of cluster
                nearby = unclustered[
                    unclustered.geometry.distance(cluster_geom.centroid) < distance_km * 1000
                ]
                
                if len(nearby) > 0:
                    cluster.extend([nearby.iloc[i] for i in range(len(nearby))])
                    unclustered = unclustered[~unclustered.index.isin(nearby.index)]
                    changed = True
            
            clusters.append(cluster)
        
        logger.info(f"Clustered {len(fires)} fires into {len(clusters)} wildfires")
        return clusters
    
    def transform_wildfire(self, fire_cluster: List[Dict], cluster_id: int) -> Dict:
        """
        Transform fire cluster to wildfire disaster
        
        Args:
            fire_cluster: List of fire detections in cluster
            cluster_id: Unique cluster identifier
            
        Returns:
            Transformed wildfire data
        """
        # Get representative fire (highest brightness)
        fires_sorted = sorted(
            fire_cluster,
            key=lambda x: float(x.get('bright_ti4', 0) or 0),
            reverse=True
        )
        hottest = fires_sorted[0]
        
        # Calculate statistics
        avg_brightness = sum(float(f.get('bright_ti4', 0) or 0) for f in fire_cluster) / len(fire_cluster)
        max_frp = max(float(f.get('frp', 0) or 0) for f in fire_cluster)
        
        # Get time of most recent detection
        times = []
        for f in fire_cluster:
            try:
                acq_date = f.get('acq_date', '')
                acq_time = f.get('acq_time', '0000')
                dt_str = f"{acq_date} {acq_time.zfill(4)}"
                dt = datetime.strptime(dt_str, '%Y-%m-%d %H%M')
                times.append(dt)
            except:
                continue
        
        event_time = max(times) if times else datetime.now()
        
        # Create geometry from fire points
        points = []
        for f in fire_cluster:
            try:
                lat = float(f.get('latitude', 0))
                lon = float(f.get('longitude', 0))
                points.append(f"({lon} {lat})")
            except:
                continue
        
        if len(points) == 1:
            geometry_wkt = f"POINT{points[0]}"
        else:
            # Create MultiPoint for cluster
            geometry_wkt = f"MULTIPOINT({', '.join(points)})"
        
        # Determine severity based on FRP (Fire Radiative Power)
        if max_frp < 10:
            severity = 'minor'
        elif max_frp < 50:
            severity = 'moderate'
        elif max_frp < 100:
            severity = 'severe'
        else:
            severity = 'extreme'
        
        # Generate name based on location
        satellite = hottest.get('satellite', 'Unknown')
        confidence = hottest.get('confidence', 'nominal')
        
        return {
            'disaster_id': f"firms_{event_time.strftime('%Y%m%d')}_{cluster_id}",
            'type': 'wildfire',
            'name': f"Wildfire cluster {cluster_id}",
            'severity': severity,
            'geometry': geometry_wkt,
            'temperature_celsius': avg_brightness,
            'start_time': event_time,
            'end_time': None,  # Ongoing
            'is_active': True,
            'source_api': 'NASA_FIRMS',
            'metadata': {
                'fire_count': len(fire_cluster),
                'max_frp': max_frp,
                'avg_brightness': avg_brightness,
                'satellite': satellite,
                'confidence': confidence,
                'cluster_id': cluster_id
            }
        }
    
    def load_wildfires(self, wildfires: List[Dict]) -> int:
        """Load wildfires into database"""
        if not wildfires:
            return 0
        
        cursor = self.conn.cursor()
        
        query = """
            INSERT INTO disasters (
                disaster_id, type, name, severity, geometry, 
                temperature_celsius, start_time, end_time, is_active, 
                source_api, metadata
            ) VALUES %s
            ON CONFLICT (disaster_id) 
            DO UPDATE SET
                severity = EXCLUDED.severity,
                temperature_celsius = EXCLUDED.temperature_celsius,
                geometry = EXCLUDED.geometry,
                updated_at = NOW(),
                metadata = EXCLUDED.metadata
        """
        
        values = [
            (
                wf['disaster_id'],
                wf['type'],
                wf['name'],
                wf['severity'],
                f"ST_GeomFromText('{wf['geometry']}', 4326)" if wf['geometry'] else None,
                wf['temperature_celsius'],
                wf['start_time'],
                wf['end_time'],
                wf['is_active'],
                wf['source_api'],
                psycopg2.extras.Json(wf['metadata'])
            )
            for wf in wildfires
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
            logger.info(f"Loaded {len(wildfires)} wildfires")
            return len(wildfires)
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error loading wildfires: {e}")
            raise
        finally:
            cursor.close()
    
    def run(self, days: int = 1):
        """Main execution"""
        try:
            logger.info("Starting NASA FIRMS wildfire ingestion")
            
            self.connect_db()
            
            # Fetch fire detections
            fires = self.fetch_fires(days=days)
            
            if not fires:
                logger.warning("No fire data fetched")
                return
            
            # Cluster fires into wildfires
            clusters = self.cluster_fires(fires, distance_km=5.0)
            
            # Transform clusters
            wildfires = []
            for idx, cluster in enumerate(clusters):
                try:
                    wf = self.transform_wildfire(cluster, idx)
                    wildfires.append(wf)
                except Exception as e:
                    logger.error(f"Error transforming wildfire cluster: {e}")
                    continue
            
            # Load into database
            count = self.load_wildfires(wildfires)
            
            logger.info(f"NASA FIRMS ingestion complete: {count} wildfires")
            
        except Exception as e:
            logger.error(f"NASA FIRMS ingestion failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()


if __name__ == "__main__":
    ingestor = NASAFIRMSIngestor()
    ingestor.run(days=1)