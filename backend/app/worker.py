import asyncio
import signal
import sys
import redis
from rq import Worker, Queue
from rq.job import Job

# --- Import your job definitions here ---
from app import jobs
from app.config import settings

# --- Redis connection ---
conn = redis.from_url(settings.redis_url)


# --- Custom Worker that supports asyncio jobs ---
class AsyncWorker(Worker):
    """RQ Worker that supports asyncio jobs seamlessly."""

    def execute_job(self, job: Job, queue: Queue):
        """Override default execute_job to support async functions."""
        try:
            # Get the running event loop (created by asyncio.run in main())
            loop = asyncio.get_event_loop()

            # If the job function is async, await it
            if asyncio.iscoroutinefunction(job.func):
                loop.run_until_complete(job.func(*job.args, **job.kwargs))
            else:
                # For sync functions, just call them normally
                job.func(*job.args, **job.kwargs)
        except Exception as e:
            print(f"[WORKER ERROR] {e}")
            raise


def main():
    """Main worker entry point."""
    queues = [Queue("scheduler", connection=conn)]
    worker = AsyncWorker(queues, connection=conn)
    print(f"🚀 Async RQ worker started on queues: {[q.name for q in queues]}")

    # Create event loop for the worker
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        worker.work(with_scheduler=True)
    finally:
        loop.close()


# Graceful shutdown on Ctrl+C
def shutdown(sig, frame):
    print("\n🛑 Worker shutting down...")
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == "__main__":
    main()
