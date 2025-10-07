# File: app/custom_json.py

import json
import datetime
from decimal import Decimal
from uuid import UUID


class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle types the default encoder can't:
    - datetime objects
    - Decimal objects
    - UUID objects
    """

    def default(self, o):
        if isinstance(o, (datetime.datetime, datetime.date, datetime.time)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return str(o)
        if isinstance(o, UUID):
            return str(o)
        return super().default(o)
