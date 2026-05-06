export interface PageDto<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface DeliverySummaryDto {
  id: string;
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
  status?: string;
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
