#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="/tmp/assetcare360-services"
mkdir -p "$RUNTIME_DIR"

SERVICES=(backend frontend audit-consumer notification-consumer service-due-producer)

usage() {
    cat <<USAGE
Usage:
  ./start.sh <service-name|all>
  ./start.sh --gui
  ./start.sh --list

Services:
  backend               PHP API server on http://127.0.0.1:8000
  frontend              Static frontend server on http://127.0.0.1:3000
  audit-consumer        RabbitMQ audit consumer
  notification-consumer RabbitMQ notification consumer
  service-due-producer  Service-due publisher loop (runs every 10 minutes)
USAGE
}

service_exists() {
    local target="$1"
    for svc in "${SERVICES[@]}"; do
        if [[ "$svc" == "$target" ]]; then
            return 0
        fi
    done
    return 1
}

pid_file() {
    local service="$1"
    echo "$RUNTIME_DIR/${service}.pid"
}

log_file() {
    local service="$1"
    echo "$RUNTIME_DIR/${service}.log"
}

is_running() {
    local service="$1"
    local file
    file="$(pid_file "$service")"

    if [[ ! -f "$file" ]]; then
        return 1
    fi

    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -z "$pid" ]]; then
        rm -f "$file"
        return 1
    fi

    if kill -0 "$pid" 2>/dev/null; then
        return 0
    fi

    rm -f "$file"
    return 1
}

command_for_service() {
    local service="$1"
    case "$service" in
        backend)
            echo "php -S 127.0.0.1:8000 -t '$ROOT_DIR/public'"
            ;;
        frontend)
            echo "php -S 127.0.0.1:3000 -t '$ROOT_DIR/pages'"
            ;;
        audit-consumer)
            echo "php '$ROOT_DIR/services/consume_audit_events.php'"
            ;;
        notification-consumer)
            echo "php '$ROOT_DIR/services/consume_notification_events.php'"
            ;;
        service-due-producer)
            echo "while true; do php '$ROOT_DIR/services/check_service_due.php'; sleep 600; done"
            ;;
        *)
            return 1
            ;;
    esac
}

start_service() {
    local service="$1"

    if is_running "$service"; then
        echo "$service is already running (PID $(cat "$(pid_file "$service")"))"
        return 0
    fi

    local command
    command="$(command_for_service "$service")"
    local logfile
    logfile="$(log_file "$service")"

    nohup bash -c "$command" >>"$logfile" 2>&1 &
    local pid=$!
    echo "$pid" >"$(pid_file "$service")"

    sleep 1
    if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$(pid_file "$service")"
        echo "Failed to start $service. Check log: $logfile"
        return 1
    fi

    echo "Started $service (PID $pid). Log: $logfile"
}

start_all() {
    local failed=0
    for service in "${SERVICES[@]}"; do
        if ! start_service "$service"; then
            failed=1
        fi
    done
    return "$failed"
}

run_gui() {
    if command -v whiptail >/dev/null 2>&1; then
        local selection
        selection=$(whiptail --title "AssetCare360 Service Starter" \
            --menu "Select service to start" 20 80 8 \
            all "Start all services" \
            backend "Start backend API server" \
            frontend "Start frontend server" \
            audit-consumer "Start audit consumer" \
            notification-consumer "Start notification consumer" \
            service-due-producer "Start service-due producer loop" \
            3>&1 1>&2 2>&3) || exit 0

        if [[ "$selection" == "all" ]]; then
            start_all
        else
            start_service "$selection"
        fi
        return
    fi

    echo "whiptail not found; using terminal menu."
    echo "1) all"
    echo "2) backend"
    echo "3) frontend"
    echo "4) audit-consumer"
    echo "5) notification-consumer"
    echo "6) service-due-producer"
    read -r -p "Select option [1-6]: " choice

    case "$choice" in
        1) start_all ;;
        2) start_service backend ;;
        3) start_service frontend ;;
        4) start_service audit-consumer ;;
        5) start_service notification-consumer ;;
        6) start_service service-due-producer ;;
        *) echo "Invalid selection"; exit 1 ;;
    esac
}

if ! command -v php >/dev/null 2>&1; then
    echo "php is required but not found in PATH"
    exit 1
fi

case "${1:-}" in
    --list)
        printf '%s\n' "${SERVICES[@]}"
        ;;
    --gui)
        run_gui
        ;;
    all)
        start_all
        ;;
    "")
        usage
        exit 1
        ;;
    *)
        if ! service_exists "$1"; then
            echo "Unknown service: $1"
            usage
            exit 1
        fi
        start_service "$1"
        ;;
esac
