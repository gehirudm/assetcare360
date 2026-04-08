<?php

class DomainEvents {
    public const ASSET_MACHINE_CREATED = 'ASSET_MACHINE_CREATED';
    public const ASSET_VEHICLE_CREATED = 'ASSET_VEHICLE_CREATED';
    public const FAULT_TICKET_CREATED = 'FAULT_TICKET_CREATED';
    public const FAULT_TICKET_ASSIGNED = 'FAULT_TICKET_ASSIGNED';
    public const BUDGET_REPORT_CREATED = 'BUDGET_REPORT_CREATED';
    public const BUDGET_REPORT_REVIEWED = 'BUDGET_REPORT_REVIEWED';
    public const SPARE_PART_REQUEST_CREATED = 'SPARE_PART_REQUEST_CREATED';
    public const SPARE_PART_REQUEST_APPROVED = 'SPARE_PART_REQUEST_APPROVED';
    public const SPARE_PART_REQUEST_REJECTED = 'SPARE_PART_REQUEST_REJECTED';
    public const ASSET_SERVICE_DUE_SOON = 'ASSET_SERVICE_DUE_SOON';

    public static function all(): array {
        return [
            self::ASSET_MACHINE_CREATED,
            self::ASSET_VEHICLE_CREATED,
            self::FAULT_TICKET_CREATED,
            self::FAULT_TICKET_ASSIGNED,
            self::BUDGET_REPORT_CREATED,
            self::BUDGET_REPORT_REVIEWED,
            self::SPARE_PART_REQUEST_CREATED,
            self::SPARE_PART_REQUEST_APPROVED,
            self::SPARE_PART_REQUEST_REJECTED,
            self::ASSET_SERVICE_DUE_SOON,
        ];
    }
}
