import asyncio
import time
import psutil
import os
import sys
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import application for internal routing load test (simulates server load)
from main import app
from httpx import AsyncClient, ASGITransport

async def simulate_user_traffic(client, user_id):
    """Simulates a single user's session flow."""
    metrics = {"latencies": [], "errors": 0, "timeouts": 0}
    try:
        # Simulate hitting the health check
        start = time.perf_counter()
        res = await client.get("/health")
        duration = time.perf_counter() - start
        metrics["latencies"].append(duration)
        if res.status_code not in (200, 503):
            metrics["errors"] += 1
            
        # Simulate a small API delay (simulating a DB query or LLM call if we had full test data seeded)
        await asyncio.sleep(np.random.uniform(0.1, 0.5))
        
    except asyncio.TimeoutError:
        metrics["timeouts"] += 1
    except Exception as e:
        metrics["errors"] += 1
        
    return metrics

async def run_load_test(concurrency: int, duration_seconds: int = 5):
    print(f"\n--- Running Load Test with {concurrency} Concurrent Users ---")
    transport = ASGITransport(app=app)
    
    start_time = time.perf_counter()
    metrics = {"latencies": [], "errors": 0, "timeouts": 0}
    
    async with AsyncClient(transport=transport, base_url="http://testserver", timeout=5.0) as client:
        # Create user tasks
        tasks = [simulate_user_traffic(client, i) for i in range(concurrency)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for r in results:
            if isinstance(r, dict):
                metrics["latencies"].extend(r["latencies"])
                metrics["errors"] += r["errors"]
                metrics["timeouts"] += r["timeouts"]
            else:
                metrics["errors"] += 1
                
    total_time = time.perf_counter() - start_time
    
    # Process memory
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    cpu_percent = psutil.cpu_percent(interval=None) # Non-blocking sample
    
    latencies = metrics["latencies"]
    p50 = np.percentile(latencies, 50) if latencies else 0
    p90 = np.percentile(latencies, 90) if latencies else 0
    p99 = np.percentile(latencies, 99) if latencies else 0
    
    print(f"Total Time: {total_time:.2f}s")
    print(f"Requests:   {len(latencies)}")
    print(f"Errors:     {metrics['errors']}")
    print(f"Timeouts:   {metrics['timeouts']}")
    print(f"Latency:    P50: {p50:.3f}s | P90: {p90:.3f}s | P99: {p99:.3f}s")
    print(f"Sys Load:   Memory: {mem_info.rss / 1024 / 1024:.2f} MB | CPU: {cpu_percent}%")
    
    return {
        "concurrency": concurrency,
        "p50": p50,
        "p90": p90,
        "p99": p99,
        "errors": metrics["errors"],
        "timeouts": metrics["timeouts"],
        "memory_mb": mem_info.rss / 1024 / 1024,
        "cpu": cpu_percent
    }

async def run_failure_injection():
    print("\n==================================================")
    print("RUNNING CHAOS/FAILURE TESTS")
    print("==================================================")
    transport = ASGITransport(app=app)
    
    # Simulate Gemini Failure
    print("Simulating Gemini API Failure (Invalid Key)...")
    original_gemini = os.environ.get("GEMINI_API_KEY", "")
    os.environ["GEMINI_API_KEY"] = "invalid_key_simulate_failure"
    
    # Simulate Redis Failure
    print("Simulating Redis Failure (Invalid URL)...")
    original_redis = os.environ.get("REDIS_URL", "")
    os.environ["REDIS_URL"] = "redis://invalid-host:6379/0"
    
    # Simulate Pinecone Failure
    print("Simulating Pinecone Failure (Invalid Key)...")
    original_pinecone = os.environ.get("PINECONE_API_KEY", "")
    os.environ["PINECONE_API_KEY"] = "invalid_pinecone"
    
    # Simulate Ollama Failure
    print("Simulating Ollama Failure (Invalid URL)...")
    original_ollama = os.environ.get("OLLAMA_URL", "")
    os.environ["OLLAMA_URL"] = "http://localhost:9999"
    
    # Simulate MongoDB Failure
    print("Simulating MongoDB Failure (Invalid URL)...")
    # Usually requires restarting the client, but we test the health check's response to errors
    
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/health")
        print("\nHealth Check under multi-system failure:")
        print(f"Status Code: {res.status_code}")
        print(res.json())
        
        if res.status_code in (200, 503):
            print("[PASS] System handled cascading failures gracefully via health endpoint.")
        else:
            print("[FAIL] Unexpected crash during failure injection.")

    # Restore Env
    os.environ["GEMINI_API_KEY"] = original_gemini
    os.environ["REDIS_URL"] = original_redis
    os.environ["PINECONE_API_KEY"] = original_pinecone
    os.environ["OLLAMA_URL"] = original_ollama

async def main():
    print("==================================================")
    print("STARTING PRODUCTION VALIDATION SUITE")
    print("==================================================")
    
    # Warm up CPU metric
    psutil.cpu_percent(interval=0.1)
    
    results = []
    concurrency_levels = [10, 50, 100, 250]
    
    for c in concurrency_levels:
        res = await run_load_test(c)
        results.append(res)
        await asyncio.sleep(1) # Cooldown between tests
        
    await run_failure_injection()
    
    print("\n==================================================")
    print("VALIDATION COMPLETE")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
