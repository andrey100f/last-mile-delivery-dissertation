import { isDevMode } from '@angular/core';

export type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

export enum DeliveryStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export interface StatusPresentation {
  label: string;
  severity: TagSeverity;
  icon?: string;
}

export const DELIVERY_STATUS_MAP: Readonly<Record<DeliveryStatus, StatusPresentation>> =
  {
    [DeliveryStatus.CREATED]: {
      label: 'Pending',
      severity: 'warn',
      icon: 'pi pi-plus-circle',
    },
    [DeliveryStatus.ASSIGNED]: {
      label: 'In Progress',
      severity: 'info',
      icon: 'pi pi-user-plus',
    },
    [DeliveryStatus.PICKED_UP]: {
      label: 'In Progress',
      severity: 'info',
      icon: 'pi pi-box',
    },
    [DeliveryStatus.IN_TRANSIT]: {
      label: 'In Progress',
      severity: 'info',
      icon: 'pi pi-send',
    },
    [DeliveryStatus.DELIVERED]: {
      label: 'Delivered',
      severity: 'success',
      icon: 'pi pi-check-circle',
    },
    [DeliveryStatus.CANCELLED]: {
      label: 'Cancelled',
      severity: 'danger',
      icon: 'pi pi-times-circle',
    },
    [DeliveryStatus.FAILED]: {
      label: 'Failed',
      severity: 'danger',
      icon: 'pi pi-exclamation-triangle',
    },
  };

const warnedUnknownStatuses = new Set<string>();

const UNKNOWN_STATUS_PRESENTATION: StatusPresentation = {
  label: 'UNKNOWN',
  severity: 'info',
  icon: 'pi pi-question-circle',
};

function normalizeStatus(status: string | DeliveryStatus): string {
  return status.trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
}

export function resolveDeliveryStatusPresentation(
  status: string | DeliveryStatus,
  severityOverride?: TagSeverity,
): StatusPresentation {
  const normalizedStatus = normalizeStatus(status);
  const mapped = DELIVERY_STATUS_MAP[normalizedStatus as DeliveryStatus];

  if (mapped) {
    return {
      ...mapped,
      severity: severityOverride ?? mapped.severity,
    };
  }

  if (isDevMode() && !warnedUnknownStatuses.has(normalizedStatus)) {
    warnedUnknownStatuses.add(normalizedStatus);
    console.warn(
      `[StatusTagComponent] Unknown delivery status "${status}" was received. Falling back to UNKNOWN/info.`,
    );
  }

  return {
    ...UNKNOWN_STATUS_PRESENTATION,
    severity: severityOverride ?? UNKNOWN_STATUS_PRESENTATION.severity,
  };
}
