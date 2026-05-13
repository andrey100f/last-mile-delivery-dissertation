import { PageDto } from '@core/services/enum/delivery.types';

export type NotificationType =
  | 'DELIVERY_ASSIGNED'
  | 'STATUS_UPDATED'
  | 'EXCEPTION_REPORTED'
  | 'DELIVERY_CREATED'
  | 'DELIVERY_CANCELLED'
  | 'SYSTEM_ANNOUNCEMENT';

export interface CustomerNotificationDto {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  deliveryId: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

export interface NotificationListQuery {
  page?: number;
  size?: number;
  sort?: string;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface MarkAllReadResponse {
  updatedCount: number;
}

export type CustomerNotificationPage = PageDto<CustomerNotificationDto>;
