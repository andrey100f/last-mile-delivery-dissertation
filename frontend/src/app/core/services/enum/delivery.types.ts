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
