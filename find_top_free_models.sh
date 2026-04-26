#!/bin/bash
# Find top free models on OpenRouter by benchmark performance
# Requirements: curl, jq, bc
# macOS compatible

# Force C locale for numeric formatting
export LC_NUMERIC=C
export LC_ALL=C

BASE_URL="https://openrouter.ai/api"
CACHE_DIR="${HOME}/.cache/openrouter-benchmarks"
mkdir -p "$CACHE_DIR"

# Check dependencies
for cmd in curl jq bc; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '$cmd' is required but not installed."
        echo "Install via Homebrew: brew install $cmd"
        exit 1
    fi
done

# Detect OS for stat command (macOS vs Linux)
if stat -f %m /dev/null &>/dev/null; then
    file_mtime() { stat -f %m "$1"; }   # macOS
else
    file_mtime() { stat -c %Y "$1"; }   # Linux
fi

urlencode() {
    local LC_ALL=C
    local length="${#1}"
    local encoded=""
    local pos c o
    for (( pos=0 ; pos<length ; pos++ )); do
        c="${1:$pos:1}"
        case "$c" in
            [-_.~a-zA-Z0-9]) o="$c" ;;
            *) printf -v o '%%%02X' "'$c"
        esac
        encoded+="$o"
    done
    echo "$encoded"
}

# Normalize value to 0-1 range
# Values > 1 are assumed to be on 0-100 scale
normalize() {
    local val="$1"
    # Guard: empty or non-numeric → return 0
    if [[ -z "$val" || ! "$val" =~ ^-?[0-9]*\.?[0-9]+$ ]]; then
        echo "0"
        return
    fi
    if (( $(echo "$val > 1" | bc -l) )); then
        echo "scale=8; $val / 100" | bc -l
    else
        echo "$val"
    fi
}

# Compute weighted composite score using only metrics with non-zero data
# This avoids penalizing models that simply lack agentic/scicode data
composite_score() {
    local int_n="$1" code_n="$2" agent_n="$3"
    local gpqa_n="$4" ifb_n="$5" scid_n="$6" term_n="$7"

    local sum="0"
    local total_w="0"

    add_metric() {
        local val="$1" weight="$2"
        if (( $(echo "$val > 0" | bc -l) )); then
            sum=$(echo "scale=8; $sum + $val * $weight" | bc -l)
            total_w=$(echo "scale=8; $total_w + $weight" | bc -l)
        fi
    }

    add_metric "$int_n"   0.30
    add_metric "$code_n"  0.20
    add_metric "$agent_n" 0.20
    add_metric "$gpqa_n"  0.10
    add_metric "$ifb_n"   0.10
    add_metric "$scid_n"  0.05
    add_metric "$term_n"  0.05

    if (( $(echo "$total_w > 0" | bc -l) )); then
        echo "scale=8; $sum / $total_w" | bc -l
    else
        echo "0"
    fi
}

echo "Fetching free model list from OpenRouter..."
response=$(curl -s --max-time 30 "$BASE_URL/frontend/models")

if [[ -z "$response" ]]; then
    echo "Error: Failed to fetch model list. Check your internet connection."
    exit 1
fi

total=$(echo "$response" | jq -r '.data | length')
echo "Total models in catalog: $total"

# Get free model list (guard against null author)
free_list=$(echo "$response" | jq -r '
  .data[]
  | select(.endpoint.is_free == true)
  | "\(.slug)|\(.name)|\(.author // "unknown")"
')

count=$(echo "$free_list" | grep -c .)
echo "Found $count free models"
echo ""
echo "Fetching benchmark data (cached for 1 day)..."
echo ""

# Temporary file for results
results_file=$(mktemp)
trap 'rm -f "$results_file"' EXIT

counter=0
while IFS='|' read -r slug name provider; do
    [[ -z "$slug" ]] && continue
    counter=$((counter + 1))

    printf "[%2d/%d] %-45s ... " "$counter" "$count" "$name"

    cache_file="$CACHE_DIR/$(urlencode "$slug").json"

    # Check cache (valid for 24h); skip stale error-cached files
    use_cache=0
    if [[ -f "$cache_file" ]]; then
        age=$(( $(date +%s) - $(file_mtime "$cache_file") ))
        # Invalidate if file is stale OR contains an error response
        if (( age < 86400 )) && jq -e '.data[0]' "$cache_file" &>/dev/null; then
            use_cache=1
        fi
    fi

    if (( use_cache )); then
        bench_response=$(cat "$cache_file")
    else
        bench_response=$(curl -s --max-time 10 \
            "$BASE_URL/internal/v1/artificial-analysis-benchmarks?slug=$(urlencode "$slug")")
        # Only cache valid responses
        if echo "$bench_response" | jq -e '.data[0]' &>/dev/null; then
            echo "$bench_response" > "$cache_file"
        fi
    fi

    if echo "$bench_response" | jq -e '.data[0].benchmark_data.evaluations' &>/dev/null; then
        eval_str=$(echo "$bench_response" | jq -r '.data[0].benchmark_data.evaluations')
        pct_str=$(echo "$bench_response"  | jq -r '.data[0].percentiles')

        int_idx=$(echo "$eval_str"  | jq -r '.artificial_analysis_intelligence_index // 0')
        code_idx=$(echo "$eval_str" | jq -r '.artificial_analysis_coding_index // 0')
        agent_idx=$(echo "$eval_str"| jq -r '.artificial_analysis_agentic_index // 0')
        gpqa=$(echo "$eval_str"     | jq -r '.gpqa // 0')
        ifbench=$(echo "$eval_str"  | jq -r '.ifbench // 0')
        scicode=$(echo "$eval_str"  | jq -r '.scicode // 0')
        termbench=$(echo "$eval_str"| jq -r '.terminalbench_hard // 0')

        int_pct=$(echo "$pct_str"   | jq -r '.intelligence_percentile // "N/A"')
        code_pct=$(echo "$pct_str"  | jq -r '.coding_percentile // "N/A"')

        int_n=$(normalize "$int_idx")
        code_n=$(normalize "$code_idx")
        agent_n=$(normalize "$agent_idx")
        gpqa_n=$(normalize "$gpqa")
        ifb_n=$(normalize "$ifbench")
        scid_n=$(normalize "$scicode")
        term_n=$(normalize "$termbench")

        composite=$(composite_score \
            "$int_n" "$code_n" "$agent_n" \
            "$gpqa_n" "$ifb_n" "$scid_n" "$term_n")

        printf "OK (score: %.4f)\n" "$composite"
        echo "$composite|$name|$provider|$int_idx|$code_idx|$int_pct|$code_pct|$gpqa|$ifbench|$slug" \
            >> "$results_file"
    else
        printf "no benchmarks\n"
    fi
done <<< "$free_list"

echo ""
echo "=================================================="
echo "TOP FREE MODELS BY BENCHMARK PERFORMANCE"
echo "=================================================="
printf "%-4s %-38s %-15s %-8s %-6s %-6s %-7s %-6s\n" \
  "Rank" "Model" "Provider" "Score" "Int%" "Code%" "GPQA" "IFB"
echo "--------------------------------------------------"

rank=1
while IFS='|' read -r score name provider int_idx code_idx int_pct code_pct gpqa ifbench slug; do
    [[ -z "$score" ]] && continue
    (( rank > 20 )) && break
    printf "%-4s %-38s %-15s %-8.4f %-6s %-6s %-7.3f %-6.3f\n" \
        "$rank" \
        "$(echo "$name"     | cut -c1-37)" \
        "$(echo "$provider" | cut -c1-14)" \
        "$score" \
        "${int_pct:-N/A}" \
        "${code_pct:-N/A}" \
        "${gpqa:-0}" \
        "${ifbench:-0}"
    rank=$((rank + 1))
done < <(sort -t'|' -nr "$results_file")

echo "=================================================="
total_with_bench=$(wc -l < "$results_file" | tr -d ' ')
total_no_bench=$(( count - total_with_bench ))

echo ""
echo "Summary:"
echo "  Total free models:   $count"
echo "  With benchmarks:     $total_with_bench"
echo "  Without benchmarks:  $total_no_bench"
echo ""
echo "Metrics:"
echo "  Score   Composite weighted score, normalized per available data (higher is better)"
echo "  Int%    Intelligence percentile vs all models"
echo "  Code%   Coding percentile vs all models"
echo "  GPQA    Graduate-level scientific reasoning (0-1)"
echo "  IFB     Instruction-Following Benchmark (0-1)"
echo ""

# Generate JSON output
if (( total_with_bench > 0 )); then
    rank=1
    sort -t'|' -nr "$results_file" | head -20 | while IFS='|' read -r score name provider \
        int_idx code_idx int_pct code_pct gpqa ifbench slug; do
        jq -n \
            --argjson rank    "$rank" \
            --arg     name    "$name" \
            --arg     provider "$provider" \
            --argjson score   "$score" \
            --argjson int_idx "$int_idx" \
            --argjson code_idx "$code_idx" \
            --arg     int_pct "$int_pct" \
            --arg     code_pct "$code_pct" \
            --argjson gpqa    "$gpqa" \
            --argjson ifbench "$ifbench" \
            --arg     slug    "$slug" \
            '{
                rank: $rank,
                name: $name,
                provider: $provider,
                composite_score: $score,
                intelligence_index: $int_idx,
                coding_index: $code_idx,
                intelligence_percentile: ($int_pct | if test("^[0-9]+$") then tonumber else null end),
                coding_percentile:       ($code_pct | if test("^[0-9]+$") then tonumber else null end),
                gpqa: $gpqa,
                ifbench: $ifbench,
                slug: $slug
            }'
        rank=$((rank + 1))
    done | jq -s '.' > top_free_models.json

    echo "Results saved to top_free_models.json"
fi
