export interface NotificationTypePresentation {
  label: string;
  icon: string;
  iconClass: string;
  categoryClass: string;
}

const DEFAULT_PRESENTATION: NotificationTypePresentation = {
  label: 'Notification',
  icon: 'pi pi-bell',
  iconClass: 'text-slate-600',
  categoryClass: 'bg-slate-100 text-slate-700',
};

const NOTIFICATION_TYPE_PRESENTATIONS: Readonly<
  Record<string, NotificationTypePresentation>
> = {
  DELIVERY_ASSIGNED: {
    label: 'Delivery assigned',
    icon: 'pi pi-user-plus',
    iconClass: 'text-blue-600',
    categoryClass: 'bg-blue-100 text-blue-700',
  },
  STATUS_UPDATED: {
    label: 'Status updated',
    icon: 'pi pi-send',
    iconClass: 'text-cyan-600',
    categoryClass: 'bg-cyan-100 text-cyan-700',
  },
  EXCEPTION_REPORTED: {
    label: 'Issue reported',
    icon: 'pi pi-exclamation-triangle',
    iconClass: 'text-amber-600',
    categoryClass: 'bg-amber-100 text-amber-700',
  },
  DELIVERY_CREATED: {
    label: 'Delivery created',
    icon: 'pi pi-plus-circle',
    iconClass: 'text-emerald-600',
    categoryClass: 'bg-emerald-100 text-emerald-700',
  },
  DELIVERY_CANCELLED: {
    label: 'Delivery cancelled',
    icon: 'pi pi-times-circle',
    iconClass: 'text-rose-600',
    categoryClass: 'bg-rose-100 text-rose-700',
  },
  SYSTEM_ANNOUNCEMENT: {
    label: 'System update',
    icon: 'pi pi-megaphone',
    iconClass: 'text-violet-600',
    categoryClass: 'bg-violet-100 text-violet-700',
  },
};

export function resolveNotificationTypePresentation(
  notificationType: string | null | undefined,
): NotificationTypePresentation {
  if (!notificationType) {
    return DEFAULT_PRESENTATION;
  }
  return NOTIFICATION_TYPE_PRESENTATIONS[notificationType] ?? DEFAULT_PRESENTATION;
}
