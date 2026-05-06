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
  pickupCity: string;
  destinationCity: string;
}

export interface DeliveryListQuery {
  page?: number;
  size?: number;
  status?: string;
}

export type DeliveryType = 'STANDARD' | 'EXPRESS';

export interface AddressContactRequest {
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  contactName: string;
  contactPhone: string;
}

export interface PackageRequest {
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  description?: string;
  fragile?: boolean;
}

export interface CreateDeliveryRequest {
  pickup: AddressContactRequest;
  destination: AddressContactRequest;
  package: PackageRequest;
  deliveryType: DeliveryType;
  specialInstructions?: string;
}

export interface DeliveryCreatedResponse {
  id: string;
  trackingCode: string;
  status: string;
  deliveryType: DeliveryType;
  pickup: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
    contactName: string;
    contactPhone: string;
  };
  destination: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
    contactName: string;
    contactPhone: string;
  };
  packageWeightKg: number;
  packageLengthCm?: number;
  packageWidthCm?: number;
  packageHeightCm?: number;
  packageDescription?: string;
  packageFragile: boolean;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}
