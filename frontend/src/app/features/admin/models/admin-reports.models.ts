export type ReportGranularity = 'day' | 'week';
export type AdminReportType = 'deliveries' | 'revenue';
export type ReportsViewMode = 'chart' | 'table';

export interface ReportWindowDto {
  from: string;
  to: string;
  timezone: string;
  granularity: ReportGranularity;
  maxRangeDays: number;
}

export interface ReportStatusBucketDto {
  bucketStart: string;
  bucketEnd: string;
  countsByStatus: Record<string, number>;
  total: number;
}

export interface AdminDeliveriesByStatusReportDto {
  window: ReportWindowDto;
  totalStatusEvents: number;
  statuses: string[];
  buckets: ReportStatusBucketDto[];
}

export interface ReportRevenueBucketDto {
  bucketStart: string;
  bucketEnd: string;
  deliveredCount: number;
  revenue: number;
}

export interface AdminRevenueReportDto {
  window: ReportWindowDto;
  totalRevenue: number;
  currency: string;
  deliveredCount: number;
  buckets: ReportRevenueBucketDto[];
}

export interface ReportExceptionBucketDto {
  bucketStart: string;
  bucketEnd: string;
  countsByType: Record<string, number>;
  total: number;
}

export interface AdminExceptionsReportDto {
  window: ReportWindowDto;
  totalExceptions: number;
  exceptionTypes: string[];
  buckets: ReportExceptionBucketDto[];
}

export interface AdminReportsQueryParams {
  from: string;
  to: string;
  granularity: ReportGranularity;
}

export interface AdminReportsUiError {
  status: number;
  detail: string | null;
}
