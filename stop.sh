#!/usr/bin/env bash
set -euo pipefail

RUNTIME_DIR="/tmp/assetcare360-services"
SERVICES=(backend frontend audit-consumer notification-consumer service-due-producer)

usage() {
    cat <<USAGE
Usage:
  ./stop.sh <service-name|all>
  ./stop.sh --gui
  ./stop.sh --list

Services:
  backend
  frontend
  audit-consumer
  notification-consumer
  service-due-producer
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

stop_service() {
    local service="$1"
    local file
    file="$(pid_file "$service")"

    if [[ ! -f "$file" ]]; then
        echo "$service is not running (no PID file)"
        return 0
    fi

    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -z "$pid" ]]; then
        rm -f "$file"
        echo "$service PID file was empty; cleaned up"
        return 0
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$file"
        echo "$service is not running (stale PID $pid removed)"
        return 0
    fi

    kill "$pid"

    for _ in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
            rm -f "$file"
            echo "Stopped $service (PID $pid)"
            return 0
        fi
        sleep 1
    done

    echo "$service did not stop gracefully; sending SIGKILL"
    kill -9 "$pid"
    rm -f "$file"
    echo "Force stopped $service (PID $pid)"
}

stop_all() {
    local failed=0
    for service in "${SERVICES[@]}"; do
        if ! stop_service "$service"; then
            failed=1
        fi
    done
    return "$failed"
}

run_gui() {
    if command -v whiptail >/dev/null 2>&1; then
        local selection
        selection=$(whiptail --title "AssetCare360 Service Stopper" \
            --menu "Select service to stop" 20 80 8 \
            all "Stop all services" \
            backend "Stop backend API server" \
            frontend "Stop frontend server" \
            audit-consumer "Stop audit consumer" \
            notification-consumer "Stop notification consumer" \
            service-due-producer "Stop service-due producer loop" \
            3>&1 1>&2 2>&3) || exit 0

        if [[ "$selection" == "all" ]]; then
            stop_all
        else
            stop_service "$selection"
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
        1) stop_all ;;
        2) stop_service backend ;;
        3) stop_service frontend ;;
        4) stop_service audit-consumer ;;
        5) stop_service notification-consumer ;;
        6) stop_service service-due-producer ;;
        *) echo "Invalid selection"; exit 1 ;;
    esac
}

case "${1:-}" in
    --list)
        printf '%s\n' "${SERVICES[@]}"
        ;;
    --gui)
        run_gui
        ;;
    all)
        stop_all
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
        stop_service "$1"
        ;;
esac
