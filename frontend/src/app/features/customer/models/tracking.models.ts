import { DeliveryStatus } from '@shared/ui/public-api';

export type TrackingConnectionState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline';

export interface DeliveryStatusSnapshotDto {
  status: string;
  etaMinutes: number | null;
  updatedAt: string;
  progressPercent: number | null;
}

export interface TrackingSocketEvent {
  eventVersion: number;
  deliveryId: string;
  status: string;
  updatedAt: string;
  etaMinutes: number | null;
  progressPercent: number | null;
}

export interface TrackingViewModel {
  deliveryId: string;
  status: string | DeliveryStatus;
  updatedAt: string;
  etaMinutes: number | null;
  progressPercent: number;
}
