"""
Environment Canada Weather Alerts Ingestor
Fetches severe weather alerts and warnings
"""

import requests
import logging
from datetime import datetime
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import xml.etree.ElementTree as ET

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EnvironmentCanadaIngestor:
    """Fetch and process Environment Canada weather alerts"""
    
    # Environment Canada CAP (Common Alerting Protocol) feed
    BASE_URL = "https://dd.weather.gc.ca/alerts/cap"
    
    # Province codes
    PROVINCES = [
        'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 
        'ON', 'PE', 'QC', 'SK', 'YT'
    ]
    
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
    
    def fetch_province_alerts(self, province: str) -> List[Dict]:
        """
        Fetch alerts for a specific province
        
        Args:
            province: Two-letter province code
            
        Returns:
            List of alert data
        """
        url = f"{self.BASE_URL}/{province.lower()}.xml"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            
            # Define namespaces
            namespaces = {
                'atom': 'http://www.w3.org/2005/Atom',
                'cap': 'urn:oasis:names:tc:emergency:cap:1.2'
            }
            
            alerts = []
            
            # Parse each entry (alert)
            for entry in root.findall('atom:entry', namespaces):
                try:
                    alert_data = self.parse_alert_entry(entry, namespaces, province)
                    if alert_data:
                        alerts.append(alert_data)
                except Exception as e:
                    logger.error(f"Error parsing alert entry: {e}")
                    continue
            
            logger.info(f"Fetched {len(alerts)} alerts for {province}")
            return alerts
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching alerts for {province}: {e}")
            return []
    
    def parse_alert_entry(self, entry, namespaces, province) -> Optional[Dict]:
        """
        Parse a single alert entry from XML
        
        Args:
            entry: XML entry element
            namespaces: XML namespaces
            province: Province code
            
        Returns:
            Parsed alert data
        """
        # Get basic info
        alert_id = entry.find('atom:id', namespaces)
        title = entry.find('atom:title', namespaces)
        summary = entry.find('atom:summary', namespaces)
        updated = entry.find('atom:updated', namespaces)
        
        if not all([alert_id, title]):
            return None
        
        alert_id_text = alert_id.text
        title_text = title.text
        summary_text = summary.text if summary is not None else ""
        
        # Parse timestamp
        if updated is not None:
            try:
                event_time = datetime.fromisoformat(updated.text.replace('Z', '+00:00'))
            except:
                event_time = datetime.now()
        else:
            event_time = datetime.now()
        
        # Determine disaster type and severity from title
        disaster_type, severity = self.classify_alert(title_text)
        
        # Extract location information
        # Environment Canada doesn't always provide coordinates in the feed
        # We'll store it as metadata and can geocode later if needed
        
        return {
            'alert_id': alert_id_text,
            'title': title_text,
            'summary': summary_text,
            'province': province,
            'event_time': event_time,
            'disaster_type': disaster_type,
            'severity': severity
        }
    
    def classify_alert(self, title: str) -> tuple:
        """
        Classify alert into disaster type and severity
        
        Args:
            title: Alert title
            
        Returns:
            Tuple of (disaster_type, severity)
        """
        title_lower = title.lower()
        
        # Determine disaster type
        if any(word in title_lower for word in ['tornado', 'funnel cloud']):
            disaster_type = 'tornado'
        elif any(word in title_lower for word in ['flood', 'flooding', 'high water']):
            disaster_type = 'flood'
        elif any(word in title_lower for word in ['winter storm', 'blizzard', 'snow', 'ice storm']):
            disaster_type = 'winter_storm'
        elif any(word in title_lower for word in ['hurricane', 'tropical storm']):
            disaster_type = 'hurricane'
        elif any(word in title_lower for word in ['thunderstorm', 'severe thunderstorm', 'lightning']):
            disaster_type = 'severe_weather'
        elif any(word in title_lower for word in ['heat', 'extreme heat']):
            disaster_type = 'severe_weather'
        elif any(word in title_lower for word in ['wind', 'high wind', 'gale']):
            disaster_type = 'severe_weather'
        elif any(word in title_lower for word in ['rain', 'rainfall']):
            disaster_type = 'severe_weather'
        else:
            disaster_type = 'severe_weather'
        
        # Determine severity
        if 'warning' in title_lower:
            severity = 'severe'
        elif 'watch' in title_lower:
            severity = 'moderate'
        elif 'statement' in title_lower or 'advisory' in title_lower:
            severity = 'minor'
        else:
            severity = 'moderate'
        
        return disaster_type, severity
    
    def fetch_all_alerts(self) -> List[Dict]:
        """
        Fetch alerts from all provinces
        
        Returns:
            Combined list of all alerts
        """
        all_alerts = []
        
        for province in self.PROVINCES:
            try:
                alerts = self.fetch_province_alerts(province)
                all_alerts.extend(alerts)
            except Exception as e:
                logger.error(f"Failed to fetch alerts for {province}: {e}")
                continue
        
        logger.info(f"Total alerts fetched: {len(all_alerts)}")
        return all_alerts
    
    def transform_alert(self, alert: Dict) -> Dict:
        """
        Transform alert to disaster schema
        
        Args:
            alert: Raw alert data
            
        Returns:
            Transformed disaster data
        """
        # For now, we'll create a point at the province capital
        # In production, you'd want to geocode the actual location
        province_coords = {
            'AB': (-114.0719, 51.0447),  # Calgary
            'BC': (-123.1207, 49.2827),  # Vancouver
            'MB': (-97.1384, 49.8951),   # Winnipeg
            'NB': (-66.6431, 45.9636),   # Fredericton
            'NL': (-52.7126, 47.5615),   # St. John's
            'NS': (-63.5752, 44.6488),   # Halifax
            'NT': (-114.3718, 62.4540),  # Yellowknife
            'NU': (-68.5170, 63.7467),   # Iqaluit
            'ON': (-79.3832, 43.6532),   # Toronto
            'PE': (-63.1311, 46.2382),   # Charlottetown
            'QC': (-71.2080, 46.8139),   # Quebec City
            'SK': (-104.6189, 50.4452),  # Regina
            'YT': (-135.0568, 60.7212)   # Whitehorse
        }
        
        coords = province_coords.get(alert['province'], (-95.0, 56.0))
        geometry_wkt = f"POINT({coords[0]} {coords[1]})"
        
        return {
            'disaster_id': f"envcan_{alert['alert_id']}",
            'type': alert['disaster_type'],
            'name': alert['title'],
            'severity': alert['severity'],
            'geometry': geometry_wkt,
            'start_time': alert['event_time'],
            'end_time': None,  # Alerts don't have end times
            'is_active': True,
            'source_api': 'Environment_Canada',
            'metadata': {
                'alert_id': alert['alert_id'],
                'province': alert['province'],
                'summary': alert['summary'],
                'country': 'Canada'
            }
        }
    
    def load_alerts(self, alerts: List[Dict]) -> int:
        """
        Load alerts into database
        
        Args:
            alerts: List of transformed alert data
            
        Returns:
            Number of alerts inserted/updated
        """
        if not alerts:
            logger.info("No alerts to load")
            return 0
        
        cursor = self.conn.cursor()
        
        query = """
            INSERT INTO disasters (
                disaster_id, type, name, severity, geometry, 
                start_time, end_time, is_active, 
                source_api, metadata
            ) VALUES %s
            ON CONFLICT (disaster_id) 
            DO UPDATE SET
                name = EXCLUDED.name,
                severity = EXCLUDED.severity,
                is_active = EXCLUDED.is_active,
                updated_at = NOW(),
                metadata = EXCLUDED.metadata
        """
        
        values = [
            (
                alert['disaster_id'],
                alert['type'],
                alert['name'],
                alert['severity'],
                f"ST_GeomFromText('{alert['geometry']}', 4326)",
                alert['start_time'],
                alert['end_time'],
                alert['is_active'],
                alert['source_api'],
                psycopg2.extras.Json(alert['metadata'])
            )
            for alert in alerts
        ]
        
        try:
            execute_values(
                cursor,
                query.replace('%s', '%s'),
                values,
                template="""(
                    %s, %s, %s, %s,
                    ST_GeomFromText(%s, 4326),
                    %s, %s, %s, %s, %s
                )""",
                page_size=50
            )
            
            self.conn.commit()
            count = len(alerts)
            logger.info(f"Successfully loaded {count} weather alerts")
            return count
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error loading alerts: {e}")
            raise
        finally:
            cursor.close()
    
    def run(self):
        """Main execution method"""
        try:
            logger.info("Starting Environment Canada alert ingestion")
            
            # Connect to database
            self.connect_db()
            
            # Fetch alerts from all provinces
            raw_alerts = self.fetch_all_alerts()
            
            if not raw_alerts:
                logger.warning("No alerts fetched")
                return
            
            # Transform alerts
            alerts = []
            for alert in raw_alerts:
                try:
                    transformed = self.transform_alert(alert)
                    alerts.append(transformed)
                except Exception as e:
                    logger.error(f"Error transforming alert: {e}")
                    continue
            
            # Load into database
            count = self.load_alerts(alerts)
            
            logger.info(f"Environment Canada ingestion complete: {count} alerts processed")
            
        except Exception as e:
            logger.error(f"Environment Canada ingestion failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()
                logger.info("Database connection closed")


if __name__ == "__main__":
    ingestor = EnvironmentCanadaIngestor()
    ingestor.run()