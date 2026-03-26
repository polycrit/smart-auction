import asyncio
import signal
import sys
import redis
from rq import Worker, Queue
from rq.job import Job

from app import jobs
from app.config import settings

conn = redis.from_url(settings.redis_url)


class AsyncWorker(Worker):

    def execute_job(self, job: Job, queue: Queue):
        try:
            loop = asyncio.get_event_loop()

            if asyncio.iscoroutinefunction(job.func):
                loop.run_until_complete(job.func(*job.args, **job.kwargs))
            else:
                job.func(*job.args, **job.kwargs)
        except Exception as e:
            print(f"[WORKER ERROR] {e}")
            raise


def main():
    queues = [Queue("scheduler", connection=conn)]
    worker = AsyncWorker(queues, connection=conn)
    print(f"🚀 Async RQ worker started on queues: {[q.name for q in queues]}")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        worker.work(with_scheduler=True)
    finally:
        loop.close()


def shutdown(sig, frame):
    print("\n🛑 Worker shutting down...")
    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

if __name__ == "__main__":
    main()
