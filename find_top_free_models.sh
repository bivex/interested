#!/bin/bash
# Find top free models on OpenRouter by benchmark performance
# Requirements: curl, jq, bc

# Force C locale for numeric formatting
export LC_NUMERIC=C

BASE_URL="https://openrouter.ai/api"
CACHE_DIR="${HOME}/.cache/openrouter-benchmarks"
mkdir -p "$CACHE_DIR"

# Check dependencies
for cmd in curl jq bc; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: '$cmd' is required but not installed."
        exit 1
    fi
done

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

echo "Fetching free model list from OpenRouter..."
response=$(curl -s --max-time 30 "$BASE_URL/frontend/models")

total=$(echo "$response" | jq -r '.data | length')
echo "Total models in catalog: $total"

# Get free model list
free_list=$(echo "$response" | jq -r '
  .data[]
  | select(.endpoint.is_free == true)
  | "\(.slug)|\(.name)|\(.author)"
')

# Count free models
count=$(echo "$free_list" | grep -c .)
echo "Found $count free models"
echo ""
echo "Fetching benchmark data (cached for 1 day)..."
echo ""

# Temporary file for results
results_file=$(mktemp)
trap 'rm -f "$results_file"' EXIT

# Process each model
counter=0
while IFS='|' read -r slug name provider; do
    [ -z "$slug" ] && continue
    counter=$((counter + 1))

    printf "[%2d/%d] %-45s ... " "$counter" "$count" "$name"

    cache_file="$CACHE_DIR/$(urlencode "$slug").json"

    if [ -f "$cache_file" ] && [ $(($(date +%s) - $(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null))) -lt 86400 ]; then
        bench_response=$(cat "$cache_file")
    else
        bench_response=$(curl -s --max-time 10 "$BASE_URL/internal/v1/artificial-analysis-benchmarks?slug=$(urlencode "$slug")")
        echo "$bench_response" > "$cache_file"
    fi

    if echo "$bench_response" | jq -e '.data[0].benchmark_data.evaluations' >/dev/null 2>&1; then
        eval_str=$(echo "$bench_response" | jq -r '.data[0].benchmark_data.evaluations')
        pct_str=$(echo "$bench_response" | jq -r '.data[0].percentiles')

        int_idx=$(echo "$eval_str" | jq -r '.artificial_analysis_intelligence_index // 0')
        code_idx=$(echo "$eval_str" | jq -r '.artificial_analysis_coding_index // 0')
        agent_idx=$(echo "$eval_str" | jq -r '.artificial_analysis_agentic_index // 0')
        gpqa=$(echo "$eval_str" | jq -r '.gpqa // 0')
        ifbench=$(echo "$eval_str" | jq -r '.ifbench // 0')
        scicode=$(echo "$eval_str" | jq -r '.scicode // 0')
        termbench=$(echo "$eval_str" | jq -r '.terminalbench_hard // 0')

        int_pct=$(echo "$pct_str" | jq -r '.intelligence_percentile // "N/A"')
        code_pct=$(echo "$pct_str" | jq -r '.coding_percentile // "N/A"')

        normalize() {
            local val=$1
            if [ "$(echo "$val > 1" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
                echo "scale=8; $val / 100" | bc -l 2>/dev/null || echo "$val"
            else
                echo "$val"
            fi
        }

        int_n=$(normalize $int_idx)
        code_n=$(normalize $code_idx)
        agent_n=$(normalize $agent_idx)
        gpqa_n=$(normalize $gpqa)
        ifb_n=$(normalize $ifbench)
        scid_n=$(normalize $scicode)
        term_n=$(normalize $termbench)

        composite=$(echo "scale=8; \
          $int_n*0.30 + $code_n*0.20 + $agent_n*0.20 + \
          $gpqa_n*0.10 + $ifb_n*0.10 + $scid_n*0.05 + $term_n*0.05" | bc -l)

        printf "OK (score: %.4f)\n" "$composite"
        echo "$composite|$name|$provider|$int_idx|$code_idx|$int_pct|$code_pct|$gpqa|$ifbench|$slug" >> "$results_file"
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
    [ -z "$score" ] && continue
    [ $rank -gt 20 ] && break
    # Handle empty/missing values
    int_pct_display=${int_pct:-"N/A"}
    code_pct_display=${code_pct:-"N/A"}
    gpqa_display=${gpqa:-0}
    ifb_display=${ifbench:-0}
    printf "%-4s %-38s %-15s %-8.4f %-6s %-6s %-7.3f %-6.3f\n" \
      "$rank" "$(echo "$name" | cut -c1-37)" "$(echo "$provider" | cut -c1-14)" \
      "$score" "$int_pct_display" "$code_pct_display" "$gpqa_display" "$ifb_display"
    rank=$((rank + 1))
done < <(sort -t'|' -nr "$results_file")

echo "=================================================="
total_with_bench=$(wc -l < "$results_file" | tr -d ' ')
total_no_bench=$((count - total_with_bench))
echo ""
echo "Summary:"
echo "  Total free models: $count"
echo "  With benchmarks:  $total_with_bench"
echo "  Without benchmarks: $total_no_bench"
echo ""
echo "Metrics:"
echo "  Score      Composite weighted score (higher is better)"
echo "  Int%       Intelligence percentile vs all models"
echo "  Code%      Coding percentile vs all models"
echo "  GPQA       Graduate-level scientific reasoning (0-1)"
echo "  IFB        Instruction-Following Benchmark (0-1)"
echo ""

# Generate JSON
if [ $total_with_bench -gt 0 ]; then
    json_output="["
    first=1
    rank=1
    while IFS='|' read -r score name provider int_idx code_idx int_pct code_pct gpqa ifbench slug; do
        [ $rank -gt 20 ] && break
        if [ $first -eq 1 ]; then
            first=0
        else
            json_output+=","
        fi
        json_output+=$(jq -n \
          --arg rank "$rank" \
          --arg name "$name" \
          --arg provider "$provider" \
          --arg score "$score" \
          --arg int_idx "$int_idx" \
          --arg code_idx "$code_idx" \
          --arg int_pct "$int_pct" \
          --arg code_pct "$code_pct" \
          --arg gpqa "$gpqa" \
          --arg ifbench "$ifbench" \
          --arg slug "$slug" \
          '{rank:($rank|tonumber), name:$name, provider:$provider, composite_score:($score|tonumber), intelligence_index:($int_idx|tonumber), coding_index:($code_idx|tonumber), intelligence_percentile:($int_pct | if test("^[0-9]+$") then tonumber else null end), coding_percentile:($code_pct | if test("^[0-9]+$") then tonumber else null end), gpqa:($gpqa|tonumber), ifbench:($ifbench|tonumber), slug:$slug}')
        rank=$((rank + 1))
    done < <(sort -t'|' -nr "$results_file")
    json_output+="]"

    echo "$json_output" | jq '.' > top_free_models.json
    echo "Results saved to top_free_models.json"
fi
