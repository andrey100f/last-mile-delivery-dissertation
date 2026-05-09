export interface PageDto<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface DeliverySummaryDto {
  id: string;
  trackingCode?: string | null;
  courierName?: string | null;
  status: string;
  deliveryType: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  pickupLine1: string;
  destinationLine1: string;
}

export interface DeliveryListQuery {
  page?: number;
  size?: number;
  sort?: string;
  status?: string;
}

export interface CourierAvailableDeliveriesQuery {
  page?: number;
  size?: number;
  sort?: string;
  deliveryType?: DeliveryType;
}

export interface CourierAvailableDeliveryDto {
  id: string;
  trackingCode?: string | null;
  status: string;
  deliveryType: DeliveryType;
  pickupLine1: string;
  destinationLine1: string;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export interface DeliveryAddressDto {
  line1: string;
  contactName: string;
  contactPhone: string;
}

export interface DeliveryPackageDto {
  description?: string | null;
  weightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  fragile?: boolean | null;
  specialInstructions?: string | null;
}

export interface DeliveryCourierDto {
  id: string;
  fullName: string;
  phone?: string | null;
}

export interface DeliveryStatusHistoryItemDto {
  status: string;
  recordedAt: string;
}

export interface DeliveryDetailDto {
  id: string;
  trackingCode?: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  pickup: DeliveryAddressDto;
  destination: DeliveryAddressDto;
  package: DeliveryPackageDto;
  specialInstructions?: string | null;
  deliveryType: string;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  courier?: DeliveryCourierDto | null;
  timeline: DeliveryStatusHistoryItemDto[];
}

export type DeliveryStatusValue =
  | 'CREATED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type DeliveryStatusAction = 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';

export interface UpdateDeliveryStatusRequest {
  targetStatus?: DeliveryStatusValue;
  action?: DeliveryStatusAction;
}

export type DeliveryType = 'STANDARD' | 'EXPRESS';

export interface AddressContactRequest {
  line1: string;
  contactName: string;
  contactPhone: string;
}

export interface PackageRequest {
  weightKg: number;
  description: string;
}

export interface CreateDeliveryRequest {
  pickup: AddressContactRequest;
  destination: AddressContactRequest;
  package: PackageRequest;
  deliveryType: DeliveryType;
  specialInstructions?: string;
  pricing: {
    baseAmount: number;
    feeAmount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
  };
}

export interface DeliveryCreatedResponse {
  id: string;
  trackingCode: string;
  status: string;
  deliveryType: DeliveryType;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}
