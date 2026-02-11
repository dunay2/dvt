#!/bin/bash

# DVT Development Helper Script
# Provides common development tasks and quality checks

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_header() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo ""
}

# Function: Run all quality checks
run_all_checks() {
    print_header "Running All Quality Checks"

    print_warning "1/6 TypeScript Type Check..."
    npm run type-check && print_success "Type check passed" || { print_error "Type check failed"; exit 1; }

    print_warning "2/6 ESLint..."
    npm run lint && print_success "ESLint passed" || { print_error "ESLint failed"; exit 1; }

    print_warning "3/6 Prettier..."
    npm run format:check && print_success "Prettier passed" || { print_error "Prettier failed"; exit 1; }

    print_warning "4/6 Markdown Lint..."
    npm run lint:md && print_success "Markdown lint passed" || { print_error "Markdown lint failed"; exit 1; }

    print_warning "5/6 Tests..."
    npm test && print_success "Tests passed" || { print_error "Tests failed"; exit 1; }

    print_warning "6/6 Build..."
    npm run build && print_success "Build passed" || { print_error "Build failed"; exit 1; }

    print_header "✅ All Quality Checks Passed!"
}

# Function: Fix all auto-fixable issues
run_auto_fix() {
    print_header "Auto-fixing Issues"

    print_warning "Fixing ESLint issues..."
    npm run lint:fix && print_success "ESLint auto-fix complete"

    print_warning "Fixing Prettier formatting..."
    npm run format && print_success "Prettier formatting complete"

    print_header "✅ Auto-fix Complete"
}

# Function: Run tests with coverage
run_tests_coverage() {
    print_header "Running Tests with Coverage"
    npm run test:coverage
    print_success "Coverage report generated in ./coverage/"
}

# Function: Setup development environment
setup_dev() {
    print_header "Setting up Development Environment"

    print_warning "Installing dependencies..."
    npm install

    print_warning "Setting up Git hooks..."
    npm run prepare

    print_warning "Running initial type check..."
    npm run type-check

    print_header "✅ Development Environment Ready"
    echo ""
    echo "Quick commands:"
    echo "  npm test          - Run tests"
    echo "  npm run lint      - Lint code"
    echo "  npm run build     - Build project"
    echo "  ./dev.sh check    - Run all quality checks"
    echo ""
}

# Function: Show help
show_help() {
    echo "DVT Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  check       Run all quality checks (type-check, lint, format, test, build)"
    echo "  fix         Auto-fix ESLint and Prettier issues"
    echo "  test        Run tests with coverage report"
    echo "  setup       Setup development environment"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh check         # Pre-commit validation"
    echo "  ./dev.sh fix           # Fix formatting issues"
    echo "  ./dev.sh test          # Run tests with coverage"
    echo ""
}

# Main script logic
case "${1:-help}" in
    check)
        run_all_checks
        ;;
    fix)
        run_auto_fix
        ;;
    test)
        run_tests_coverage
        ;;
    setup)
        setup_dev
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
