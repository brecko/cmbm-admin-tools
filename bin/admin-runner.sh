#!/bin/bash
# Production Admin Script Runner
# Runs admin commands securely inside Docker network

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo -e "${BLUE}Production Admin Script Runner${NC}"
    echo ""
    echo "Usage: $0 [environment] [script] [args...]"
    echo ""
    echo "Environments:"
    echo "  dev     - Development (uses localhost connection)"
    echo "  prod    - Production (uses admin container)"
    echo ""
    echo "Examples:"
    echo "  $0 dev create --username admin --email admin@example.com --password 'SecurePass123!'"
    echo "  $0 prod create --username admin --email admin@example.com --password 'SecurePass123!'"
    echo "  $0 prod update-password --username admin --password 'NewSecurePass456!'"
    echo "  $0 prod verify"
    echo ""
}

run_dev() {
    echo -e "${GREEN}🔧 Running in DEVELOPMENT mode${NC}"
    echo -e "${YELLOW}⚠️  Using localhost MongoDB connection${NC}"
    export NODE_ENV=development
    node scripts/manage-site-admin.js "$@"
}

run_prod() {
    echo -e "${GREEN}🔒 Running in PRODUCTION mode${NC}"
    echo -e "${BLUE}📦 Using Docker admin container${NC}"
    
        # Ensure cmbm-admin-cli container is built
    if ! docker ps -a | grep -q cmbm-admin-cli; then
        echo "Building cmbm-admin-cli container..."
        docker compose -f docker-compose.yml -f docker-compose.prod.yml build cmbm-admin-cli
    fi

    # Ensure cmbm-admin-cli container is running
    if ! docker ps | grep -q cmbm-admin-cli; then
        echo "Starting cmbm-admin-cli container..."
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d cmbm-admin-cli
    fi

    # Execute admin script in container
    docker exec -it cmbm-admin-cli node scripts/manage-site-admin.js "$@"
}

run_verify() {
    case "$1" in
        dev)
            echo -e "${GREEN}🔧 Verifying DEVELOPMENT admin users${NC}"
            export NODE_ENV=development
            node scripts/verify-admin.js
            ;;
        prod)
            echo -e "${GREEN}🔒 Verifying PRODUCTION admin users${NC}"
            docker exec -it cmbm-admin-cli node scripts/verify-admin.js
            ;;
    esac
}

# Main script logic
if [ $# -lt 1 ]; then
    print_usage
    exit 1
fi

ENV="$1"
shift

case "$ENV" in
    dev)
        if [ $# -lt 1 ]; then
            print_usage
            exit 1
        fi
        COMMAND="$1"
        shift
        
        if [ "$COMMAND" = "verify" ]; then
            run_verify dev
        else
            run_dev "$COMMAND" "$@"
        fi
        ;;
    prod)
        if [ $# -lt 1 ]; then
            print_usage
            exit 1
        fi
        COMMAND="$1"
        shift
        
        if [ "$COMMAND" = "verify" ]; then
            run_verify prod
        else
            run_prod "$COMMAND" "$@"
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENV${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
