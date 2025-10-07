import asyncio
import signal
import sys
import redis
from rq import Worker, Queue, Connection
from rq.job import Job

# --- Import your job definitions here ---
from app import jobs

# --- Redis connection ---
REDIS_URL = "redis://localhost:6379/0"  # or use os.getenv("REDIS_URL")
conn = redis.from_url(REDIS_URL)


# --- Custom Worker that supports asyncio jobs ---
class AsyncWorker(Worker):
    """RQ Worker that supports asyncio jobs seamlessly."""

    async def handle_job_async(self, job: Job, queue: Queue):
        """Handle async jobs properly."""
        try:
            if asyncio.iscoroutinefunction(job.func):
                await job.func(*job.args, **job.kwargs)
            else:
                job.func(*job.args, **job.kwargs)
        except Exception as e:
            print(f"[WORKER ERROR] {e}")
            raise

    def execute_job(self, job: Job, queue: Queue):
        """Override default execute_job to support async."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.handle_job_async(job, queue))
        finally:
            loop.close()


def main():
    with Connection(conn):
        queues = ["scheduler"]  # match your queue name in main.py
        worker = AsyncWorker(queues)
        print(f"🚀 Async RQ worker started on queues: {queues}")
        worker.work(with_scheduler=True)


# Graceful shutdown on Ctrl+C
def shutdown(sig, frame):
    print("\n🛑 Worker shutting down...")
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == "__main__":
    main()
