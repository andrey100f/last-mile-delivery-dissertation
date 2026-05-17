import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable } from 'rxjs';
import {
  AdminDeliveriesByStatusReportDto,
  AdminExceptionsReportDto,
  AdminReportType,
  AdminReportsQueryParams,
  AdminReportsUiError,
  AdminRevenueReportDto,
  ReportExceptionBucketDto,
  ReportGranularity,
  ReportRevenueBucketDto,
  ReportStatusBucketDto,
  ReportWindowDto,
} from '../models/admin-reports.models';

type UnknownRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AdminReportsService extends BaseService {
  getDeliveriesByStatus(
    params: AdminReportsQueryParams,
  ): Observable<AdminDeliveriesByStatusReportDto> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/admin/reports/deliveries-by-status`, {
        params: this.toQueryParams(params),
      })
      .pipe(map((response) => this.normalizeDeliveriesReport(response)));
  }

  getRevenueReport(params: AdminReportsQueryParams): Observable<AdminRevenueReportDto> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/admin/reports/revenue`, {
        params: this.toQueryParams(params),
      })
      .pipe(map((response) => this.normalizeRevenueReport(response)));
  }

  getExceptionsReport(
    params: AdminReportsQueryParams,
  ): Observable<AdminExceptionsReportDto> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/admin/reports/exceptions`, {
        params: this.toQueryParams(params),
      })
      .pipe(map((response) => this.normalizeExceptionsReport(response)));
  }

  buildExportUrl(reportType: AdminReportType, params: AdminReportsQueryParams): string {
    const query = this.toQueryParams(params).toString();
    const path = reportType === 'deliveries' ? 'deliveries-by-status/export' : 'revenue/export';
    return `${this.baseUrl}/admin/reports/${path}?${query}`;
  }

  toUiError(error: unknown): AdminReportsUiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 0,
        detail: null,
      };
    }
    return {
      status: error.status,
      detail: this.extractErrorDetail(error),
    };
  }

  private toQueryParams(params: AdminReportsQueryParams): HttpParams {
    return new HttpParams()
      .set('from', params.from)
      .set('to', params.to)
      .set('granularity', params.granularity);
  }

  private normalizeDeliveriesReport(response: unknown): AdminDeliveriesByStatusReportDto {
    const candidate = this.asRecord(response);
    const window = this.normalizeWindow(candidate['window']);
    const statuses = this.normalizeStringArray(candidate['statuses']);

    const buckets = this.normalizeArray(candidate['buckets']).map((entry) =>
      this.normalizeStatusBucket(entry, statuses),
    );

    return {
      window,
      totalStatusEvents: this.toNonNegativeNumber(candidate['totalStatusEvents']),
      statuses,
      buckets,
    };
  }

  private normalizeRevenueReport(response: unknown): AdminRevenueReportDto {
    const candidate = this.asRecord(response);
    const buckets = this.normalizeArray(candidate['buckets']).map((entry) =>
      this.normalizeRevenueBucket(entry),
    );
    return {
      window: this.normalizeWindow(candidate['window']),
      totalRevenue: this.toFiniteNumber(candidate['totalRevenue']),
      currency: this.toCurrency(candidate['currency']),
      deliveredCount: this.toNonNegativeNumber(candidate['deliveredCount']),
      buckets,
    };
  }

  private normalizeExceptionsReport(response: unknown): AdminExceptionsReportDto {
    const candidate = this.asRecord(response);
    const exceptionTypes = this.normalizeStringArray(candidate['exceptionTypes']);
    const buckets = this.normalizeArray(candidate['buckets']).map((entry) =>
      this.normalizeExceptionBucket(entry, exceptionTypes),
    );
    return {
      window: this.normalizeWindow(candidate['window']),
      totalExceptions: this.toNonNegativeNumber(candidate['totalExceptions']),
      exceptionTypes,
      buckets,
    };
  }

  private normalizeWindow(rawWindow: unknown): ReportWindowDto {
    const nowIso = new Date().toISOString();
    const candidate = this.asRecord(rawWindow);
    return {
      from: this.toIsoDate(candidate['from']) ?? nowIso,
      to: this.toIsoDate(candidate['to']) ?? nowIso,
      timezone: this.toText(candidate['timezone']) ?? 'UTC',
      granularity: this.toGranularity(candidate['granularity']),
      maxRangeDays: this.toPositiveInt(candidate['maxRangeDays'], 180),
    };
  }

  private normalizeStatusBucket(
    rawBucket: unknown,
    statuses: string[],
  ): ReportStatusBucketDto {
    const candidate = this.asRecord(rawBucket);
    const countsByStatus = this.toNumberRecord(candidate['countsByStatus']);
    const normalizedCounts: Record<string, number> = {};
    for (const status of statuses) {
      normalizedCounts[status] = Math.max(0, countsByStatus[status] ?? 0);
    }
    return {
      bucketStart: this.toIsoDate(candidate['bucketStart']) ?? new Date().toISOString(),
      bucketEnd: this.toIsoDate(candidate['bucketEnd']) ?? new Date().toISOString(),
      countsByStatus: normalizedCounts,
      total: this.toNonNegativeNumber(candidate['total']),
    };
  }

  private normalizeRevenueBucket(rawBucket: unknown): ReportRevenueBucketDto {
    const candidate = this.asRecord(rawBucket);
    return {
      bucketStart: this.toIsoDate(candidate['bucketStart']) ?? new Date().toISOString(),
      bucketEnd: this.toIsoDate(candidate['bucketEnd']) ?? new Date().toISOString(),
      deliveredCount: this.toNonNegativeNumber(candidate['deliveredCount']),
      revenue: this.toFiniteNumber(candidate['revenue']),
    };
  }

  private normalizeExceptionBucket(
    rawBucket: unknown,
    types: string[],
  ): ReportExceptionBucketDto {
    const candidate = this.asRecord(rawBucket);
    const countsByType = this.toNumberRecord(candidate['countsByType']);
    const normalizedCounts: Record<string, number> = {};
    for (const type of types) {
      normalizedCounts[type] = Math.max(0, countsByType[type] ?? 0);
    }
    return {
      bucketStart: this.toIsoDate(candidate['bucketStart']) ?? new Date().toISOString(),
      bucketEnd: this.toIsoDate(candidate['bucketEnd']) ?? new Date().toISOString(),
      countsByType: normalizedCounts,
      total: this.toNonNegativeNumber(candidate['total']),
    };
  }

  private extractErrorDetail(error: HttpErrorResponse): string | null {
    const body = this.asRecord(error.error);
    const detail =
      this.toText(body['detail']) ??
      this.toText(body['message']) ??
      this.toText(body['title']) ??
      this.toText(body['error']);
    if (detail) {
      return detail;
    }

    const errors = body['errors'];
    if (errors && typeof errors === 'object') {
      for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          const first = value.find((entry) => this.toText(entry));
          const message = this.toText(first);
          if (message) {
            return `${field}: ${message}`;
          }
          continue;
        }
        const single = this.toText(value);
        if (single) {
          return `${field}: ${single}`;
        }
      }
    }
    return null;
  }

  private asRecord(value: unknown): UnknownRecord {
    return value && typeof value === 'object' ? (value as UnknownRecord) : {};
  }

  private normalizeArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized = value
      .map((entry) => this.toText(entry))
      .filter((entry): entry is string => entry !== null);
    return Array.from(new Set(normalized));
  }

  private toNumberRecord(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const source = value as Record<string, unknown>;
    const target: Record<string, number> = {};
    for (const [key, raw] of Object.entries(source)) {
      target[key] = this.toNonNegativeNumber(raw);
    }
    return target;
  }

  private toGranularity(value: unknown): ReportGranularity {
    const normalized = this.toText(value)?.toLowerCase();
    return normalized === 'week' ? 'week' : 'day';
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    const parsed = this.toNonNegativeNumber(value);
    return parsed > 0 ? parsed : fallback;
  }

  private toFiniteNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toNonNegativeNumber(value: unknown): number {
    return Math.max(0, this.toFiniteNumber(value));
  }

  private toIsoDate(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return new Date(parsed).toISOString();
  }

  private toCurrency(value: unknown): string {
    const normalized = this.toText(value);
    return normalized ? normalized.toUpperCase() : 'RON';
  }

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
