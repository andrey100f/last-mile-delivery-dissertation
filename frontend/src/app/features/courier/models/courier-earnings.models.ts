import { PageDto } from '@core/services/enum/delivery.types';

export interface CourierEarningsQueryParams {
  from?: string;
  to?: string;
}

export interface CourierEarningsWindowDto {
  from: string;
  to: string;
  toExclusive?: string;
  timezone: string;
  maxRangeDays: number;
}

export interface CourierEarningsTrendDto {
  previousPeriodTotal: number;
  deltaAmount: number;
  deltaPercent: number | null;
}

export interface CourierEarningsChartPointDto {
  bucketStart: string;
  bucketEnd: string;
  total: number;
}

export interface CourierEarningsSummaryDto {
  currency: string;
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  customRangeTotal: number;
  trend: CourierEarningsTrendDto;
  window: CourierEarningsWindowDto;
  chartPoints: CourierEarningsChartPointDto[];
}

export interface CourierEarningsEntryDto {
  deliveryId: string;
  trackingCode: string | null;
  amount: number;
  currency: string;
  status: string;
  earnedAt: string;
  category: string | null;
  note: string | null;
}

export type CourierEarningsEntriesPage = PageDto<CourierEarningsEntryDto>;

export interface CourierEarningsEntriesQuery extends CourierEarningsQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface CourierEarningsUiError {
  status: number;
  detail: string | null;
}
