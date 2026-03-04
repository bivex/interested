import json
import sys

"""
TechEmpower ph.json Schema Overview:
-----------------------------------
{
    "duration": 15,                 # Duration of each test in seconds
    "frameworks": ["name1", ...],   # List of all tested framework names
    "rawData": {
        "json": {                   # Test Type (json, fortune, query, db, update, plaintext)
            "framework-name": [     # Framework implementation name
                {
                    "latencyAvg": "548.55us",
                    "latencyMax": "8.88ms",
                    "totalRequests": 460345,
                    "startTime": 1738263075,
                    "concurrency": 16        # Note: Index in list matches concurrency level
                },
                ... (one object for each concurrency level: 16, 32, 64, 128, 256, 512)
            ]
        }
    }
}

Test Types:
- PLAINTEXT: Raw HTTP response (No DB, No Logic)
- JSON: JSON serialization (No DB)
- DB: Single database query (1 row)
- QUERY: Multiple database queries (variable rows)
- FORTUNE: DB query + Templates/HTML rendering (Closest to Real-world)
- UPDATE: Database Read-Modify-Write (Heavy I/O)
"""

def parse_benchmarks(file_path, search_term=None):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading file: {e}")
        return

    duration = data.get("duration", 15)
    raw_data = data.get("rawData", {})

    results_summary = {}

    for test_type, frameworks in raw_data.items():
        if test_type in ["commitCounts", "slocCounts"]:
            continue
            
        test_results = []
        for framework_name, results in frameworks.items():
            if not isinstance(results, list) or not results:
                continue
            
            if search_term and search_term.lower() not in framework_name.lower():
                continue

            # Find the best result (max requests) across all concurrency levels
            max_requests = 0
            best_latency = ""
            
            for res in results:
                reqs = res.get("totalRequests", 0)
                if reqs > max_requests:
                    max_requests = reqs
                    best_latency = res.get("latencyAvg", "N/A")
            
            rps = max_requests / duration
            test_results.append({
                "framework": framework_name,
                "rps": rps,
                "latency": best_latency
            })
        
        # Sort by RPS descending
        test_results.sort(key=lambda x: x["rps"], reverse=True)
        results_summary[test_type] = test_results[:15]  # Top 15

    # Print summary
    title = f"--- Benchmark Results Summary (Duration: {duration}s) ---"
    if search_term:
        title += f" [Filter: {search_term}]"
    print(title)

    # Focus on production-like tests
    target_tests = ["fortune", "query", "db", "update"]
    
    for test_type in target_tests:
        if test_type not in results_summary:
            continue
            
        top_frameworks = results_summary[test_type]
        print(f"\nTest Type: {test_type.upper()} (Production-like)")
        print(f"{'Framework':<40} | {'RPS':<15} | {'Latency':<10}")
        print("-" * 70)
        for f in top_frameworks:
            print(f"{f['framework']:<40} | {f['rps']:>14.2f} | {f['latency']:<10}")

if __name__ == "__main__":
    path = "ph.json"
    search = None
    if len(sys.argv) > 1:
        path = sys.argv[1]
    if len(sys.argv) > 2:
        search = sys.argv[2]
    parse_benchmarks(path, search)

