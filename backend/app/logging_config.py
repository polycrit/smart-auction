"""
Logging configuration for the auction application.
"""
import logging
import sys
from app.config import settings


def setup_logging():
    """Configure application logging."""
    log_level = logging.DEBUG if settings.debug else logging.INFO

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )

    # Set specific loggers
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.debug else logging.WARNING
    )
    logging.getLogger("socketio").setLevel(logging.INFO)
    logging.getLogger("engineio").setLevel(logging.INFO)


# Create application logger
logger = logging.getLogger("auction")
