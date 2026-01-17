"""
Scheduled Data Ingestion Jobs
Runs ETL processes on a schedule
"""

import schedule
import time
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.ingestors.usgs_earthquakes import USGSEarthquakeIngestor
from etl.ingestors.nasa_firms import NASAFIRMSIngestor

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DisasterDataScheduler:
    """Manages scheduled data ingestion jobs"""
    
    def __init__(self):
        self.fetch_interval = int(os.getenv('FETCH_INTERVAL_MINUTES', 5))
        self.usgs_ingestor = USGSEarthquakeIngestor()
        self.nasa_ingestor = NASAFIRMSIngestor()
    
    def job_fetch_earthquakes(self):
        """Scheduled job: Fetch earthquake data"""
        try:
            logger.info("=" * 60)
            logger.info("Starting scheduled earthquake fetch")
            logger.info("=" * 60)
            
            self.usgs_ingestor.run(timeframe='1.0_day')
            
            logger.info("Earthquake fetch completed successfully")
            
        except Exception as e:
            logger.error(f"Earthquake fetch job failed: {e}", exc_info=True)
    
    def job_fetch_wildfires(self):
        """Scheduled job: Fetch wildfire data"""
        try:
            logger.info("=" * 60)
            logger.info("Starting scheduled wildfire fetch")
            logger.info("=" * 60)
            
            self.nasa_ingestor.run(days=1)
            
            logger.info("Wildfire fetch completed successfully")
            
        except Exception as e:
            logger.error(f"Wildfire fetch job failed: {e}", exc_info=True)
    
    def job_fetch_all(self):
        """Scheduled job: Fetch all disaster types"""
        logger.info("=" * 60)
        logger.info(f"Starting full disaster data fetch at {datetime.now()}")
        logger.info("=" * 60)
        
        # Run all ingestors
        self.job_fetch_earthquakes()
        self.job_fetch_wildfires()
        
        logger.info("=" * 60)
        logger.info("Full disaster data fetch completed")
        logger.info("=" * 60)
    
    def run_initial_load(self):
        """Run initial data load on startup"""
        logger.info("Running initial data load...")
        self.job_fetch_all()
    
    def start(self):
        """Start the scheduler"""
        logger.info("=" * 60)
        logger.info("DISASTER DATA SCHEDULER STARTED")
        logger.info("=" * 60)
        logger.info(f"Fetch interval: {self.fetch_interval} minutes")
        
        # Run initial load
        self.run_initial_load()
        
        # Schedule jobs
        logger.info("\nScheduling jobs:")
        
        # Earthquakes: every interval
        schedule.every(self.fetch_interval).minutes.do(self.job_fetch_earthquakes)
        logger.info(f"- Earthquakes: every {self.fetch_interval} minutes")
        
        # Wildfires: every interval
        schedule.every(self.fetch_interval).minutes.do(self.job_fetch_wildfires)
        logger.info(f"- Wildfires: every {self.fetch_interval} minutes")
        
        logger.info("\nScheduler running. Press Ctrl+C to stop.")
        logger.info("=" * 60)
        
        # Keep running
        try:
            while True:
                schedule.run_pending()
                time.sleep(30)  # Check every 30 seconds
                
        except KeyboardInterrupt:
            logger.info("\nScheduler stopped by user")
        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)


def main():
    """Main entry point"""
    try:
        scheduler = DisasterDataScheduler()
        scheduler.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()