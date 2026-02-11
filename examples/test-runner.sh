#!/usr/bin/env bash
#
# Golden Paths Test Runner
#
# Validates and executes all golden path examples.
# This script is used in CI/CD pipelines to ensure contract compliance.
#
# Usage:
#   bash examples/test-runner.sh
#
# Environment Variables:
#   ENGINE_URL       - Engine API endpoint (default: http://localhost:8080)
#   DATABASE_URL     - PostgreSQL connection string (optional)
#   TIMEOUT_MS       - Maximum execution time per plan (default: 60000)
#   SKIP_EXECUTION   - Skip actual plan execution (default: false)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_URL="${ENGINE_URL:-http://localhost:8080}"
TIMEOUT_MS="${TIMEOUT_MS:-60000}"
SKIP_EXECUTION="${SKIP_EXECUTION:-true}"

# Golden paths to validate
GOLDEN_PATHS=(
  "plan-minimal"
  "plan-parallel"
  "plan-cancel-and-resume"
)

# Counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Functions
print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_skip() {
  echo -e "${YELLOW}⊘ $1${NC}"
}

# Validate JSON files
validate_json() {
  local file="$1"

  if [ ! -f "$file" ]; then
    print_error "File not found: $file"
    return 1
  fi

  if ! node "$SCRIPT_DIR/validate-json.js" "$file" > /dev/null 2>&1; then
    print_error "Invalid JSON: $file"
    return 1
  fi

  return 0
}

# Validate a golden path
validate_golden_path() {
  local path_name="$1"
  local path_dir="$SCRIPT_DIR/$path_name"

  print_section "Validating: $path_name"

  # Check directory exists
  if [ ! -d "$path_dir" ]; then
    print_error "Directory not found: $path_dir"
    return 1
  fi

  # Validate required files exist
  local required_files=(
    "plan.v1.1.json"
    "validation-report.json"
    "expected-events.jsonl"
    "README.md"
  )

  for file in "${required_files[@]}"; do
    if [ ! -f "$path_dir/$file" ]; then
      print_error "Missing required file: $file"
      return 1
    fi
  done

  print_success "All required files present"

  # Validate JSON files
  if ! validate_json "$path_dir/plan.v1.1.json"; then
    return 1
  fi
  print_success "plan.v1.1.json is valid JSON"

  if ! validate_json "$path_dir/validation-report.json"; then
    return 1
  fi
  print_success "validation-report.json is valid JSON"

  # Validate JSONL format (each line should be valid JSON)
  local line_num=0
  while IFS= read -r line; do
    line_num=$((line_num + 1))
    if [ -n "$line" ]; then
      # Write line to temp file and validate
      local temp_json="$path_dir/.temp_line_$line_num.json"
      echo "$line" > "$temp_json"
      if ! node "$SCRIPT_DIR/validate-json.js" "$temp_json" > /dev/null 2>&1; then
        rm -f "$temp_json"
        print_error "Invalid JSON at line $line_num in expected-events.jsonl"
        return 1
      fi
      rm -f "$temp_json"
    fi
  done < "$path_dir/expected-events.jsonl"
  print_success "expected-events.jsonl is valid JSONL ($line_num lines)"

  # Validate plan schema version
  local schema_version
  schema_version=$(node "$SCRIPT_DIR/extract-json-value.js" "$path_dir/plan.v1.1.json" "schemaVersion" 2>/dev/null || echo "")
  if [ "$schema_version" != "v1.1" ]; then
    print_error "Invalid schema version: $schema_version (expected: v1.1)"
    return 1
  fi
  print_success "Schema version is v1.1"

  # Validate validation report status
  local validation_status
  validation_status=$(node "$SCRIPT_DIR/extract-json-value.js" "$path_dir/validation-report.json" "status" 2>/dev/null || echo "")
  if [ "$validation_status" != "VALID" ]; then
    print_error "Validation status is not VALID: $validation_status"
    return 1
  fi
  print_success "Validation status is VALID"

  print_success "Golden path validation passed: $path_name"
  return 0
}

# Execute a golden path (placeholder)
execute_golden_path() {
  local path_name="$1"

  if [ "$SKIP_EXECUTION" = "true" ]; then
    print_skip "Execution skipped (SKIP_EXECUTION=true)"
    return 2  # Return 2 to indicate skipped
  fi

  print_section "Executing: $path_name"

  # TODO: Implement actual plan execution when engine is available
  # This would:
  # 1. Submit plan to engine via API
  # 2. Monitor execution
  # 3. Collect event log
  # 4. Compare against expected-events.jsonl

  print_skip "Execution not yet implemented (blocked by issue #5, #6)"
  return 2  # Return 2 to indicate skipped
}

# Main execution
main() {
  print_header "DVT Golden Paths Test Runner"

  echo ""
  echo "Configuration:"
  echo "  Script Directory:  $SCRIPT_DIR"
  echo "  Engine URL:        $ENGINE_URL"
  echo "  Timeout:           ${TIMEOUT_MS}ms"
  echo "  Skip Execution:    $SKIP_EXECUTION"
  echo ""

  # Process each golden path
  for path in "${GOLDEN_PATHS[@]}"; do
    TOTAL=$((TOTAL + 1))

    if validate_golden_path "$path"; then
      # Try to execute
      if execute_golden_path "$path"; then
        PASSED=$((PASSED + 1))
      else
        exit_code=$?
        if [ $exit_code -eq 2 ]; then
          SKIPPED=$((SKIPPED + 1))
        else
          FAILED=$((FAILED + 1))
        fi
      fi
    else
      FAILED=$((FAILED + 1))
    fi

    echo ""
  done

  # Summary
  print_header "Summary"
  echo ""
  echo "Total Golden Paths:  $TOTAL"
  echo "Validated:           $PASSED"
  echo "Failed:              $FAILED"
  echo "Skipped:             $SKIPPED"
  echo ""

  if [ $FAILED -gt 0 ]; then
    print_error "Some golden paths failed validation"
    exit 1
  fi

  if [ $SKIPPED -eq $TOTAL ]; then
    print_skip "All golden paths validation passed, execution skipped"
    exit 0
  fi

  print_success "All golden paths passed!"
  exit 0
}

# Run main
main "$@"
