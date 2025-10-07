import redis
from rq import Queue
from datetime import datetime, timedelta
from app.jobs import activate_auction

r = redis.Redis(host="localhost", port=6379)
q = Queue("scheduler", connection=r)


@app.post("/admin/auctions/{auction_id}/schedule")
async def schedule_auction_start(auction_id: str, start_time: datetime):
    delay = (start_time - datetime.utcnow()).total_seconds()
    if delay < 0:
        delay = 0  # start immediately if time already passed

    job = q.enqueue_in(timedelta(seconds=delay), activate_auction, auction_id)
    return {"scheduled_in_seconds": delay, "job_id": job.id}
