import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable } from 'rxjs';
import {
  AdminDashboardDto,
  AdminDashboardQueryParams,
  AdminDashboardSeriesPointDto,
  AdminDashboardUiError,
  AdminDashboardWindowDto,
} from '../models/admin-dashboard.models';

type UnknownRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService extends BaseService {
  getDashboard(params: AdminDashboardQueryParams): Observable<AdminDashboardDto> {
    const queryParams = this.toQueryParams(params);
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/admin/dashboard`, { params: queryParams })
      .pipe(map((response) => this.normalizeDashboardResponse(response)));
  }

  toUiError(error: unknown): AdminDashboardUiError {
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

  private toQueryParams(params: AdminDashboardQueryParams): HttpParams {
    let queryParams = new HttpParams();
    if (params.from) {
      queryParams = queryParams.set('from', params.from);
    }
    if (params.to) {
      queryParams = queryParams.set('to', params.to);
    }
    return queryParams;
  }

  private normalizeDashboardResponse(response: unknown): AdminDashboardDto {
    const candidate = this.asRecord(response);
    const nowIso = new Date().toISOString();

    return {
      activeDeliveriesCount: this.toNonNegativeNumber(candidate['activeDeliveriesCount']),
      couriersOnlineCount: this.toNonNegativeNumber(candidate['couriersOnlineCount']),
      revenueTotal: this.toFiniteNumber(candidate['revenueTotal']),
      revenueCurrency: this.toCurrency(candidate['revenueCurrency']),
      exceptionBacklogCount: this.toNonNegativeNumber(candidate['exceptionBacklogCount']),
      generatedAt: this.toIsoDate(candidate['generatedAt']) ?? nowIso,
      window: this.normalizeWindow(candidate['window'], nowIso),
      deliveryVolumeSeries: this.normalizeSeriesArray(
        candidate['deliveryVolumeSeries'] ??
          candidate['timeSeries'] ??
          candidate['trendSeries'] ??
          candidate['deliveryTrendSeries'],
      ),
      statusDistributionSeries: this.normalizeSeriesArray(
        candidate['statusDistributionSeries'] ??
          candidate['distributionSeries'] ??
          candidate['statusBreakdown'] ??
          candidate['statusSeries'],
      ),
    };
  }

  private normalizeWindow(rawWindow: unknown, nowIso: string): AdminDashboardWindowDto {
    const candidate = this.asRecord(rawWindow);
    return {
      from: this.toIsoDate(candidate['from']) ?? nowIso,
      to: this.toIsoDate(candidate['to']) ?? nowIso,
      timezone: this.toText(candidate['timezone']) ?? 'UTC',
    };
  }

  private normalizeSeriesArray(raw: unknown): AdminDashboardSeriesPointDto[] | null {
    if (!Array.isArray(raw)) {
      return null;
    }

    const normalized = raw
      .map((item) => this.normalizeSeriesPoint(item))
      .filter((item): item is AdminDashboardSeriesPointDto => item !== null);

    return normalized.length > 0 ? normalized : null;
  }

  private normalizeSeriesPoint(raw: unknown): AdminDashboardSeriesPointDto | null {
    const candidate = this.asRecord(raw);
    const label =
      this.toText(candidate['label']) ??
      this.toText(candidate['name']) ??
      this.toText(candidate['period']) ??
      this.toText(candidate['status']);
    if (!label) {
      return null;
    }

    const value = this.toFiniteNumber(
      candidate['value'] ?? candidate['count'] ?? candidate['total'] ?? candidate['amount'],
    );
    return {
      label,
      value,
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
    if (Array.isArray(errors)) {
      const firstError = errors.find((entry) => this.toText(entry));
      return this.toText(firstError) ?? null;
    }
    if (errors && typeof errors === 'object') {
      const errorMap = errors as Record<string, unknown>;
      for (const fieldName of Object.keys(errorMap)) {
        const entry = errorMap[fieldName];
        if (Array.isArray(entry)) {
          const firstEntry = entry.find((item) => this.toText(item));
          const message = this.toText(firstEntry);
          if (message) {
            return `${fieldName}: ${message}`;
          }
        }
        const singleMessage = this.toText(entry);
        if (singleMessage) {
          return `${fieldName}: ${singleMessage}`;
        }
      }
    }
    return null;
  }

  private asRecord(value: unknown): UnknownRecord {
    return value && typeof value === 'object' ? (value as UnknownRecord) : {};
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
