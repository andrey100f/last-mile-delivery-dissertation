import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable } from 'rxjs';
import {
  CourierEarningsEntriesPage,
  CourierEarningsEntriesQuery,
  CourierEarningsEntryDto,
  CourierEarningsQueryParams,
  CourierEarningsSummaryDto,
  CourierEarningsUiError,
} from '../models/courier-earnings.models';

type UnknownRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class CourierEarningsService extends BaseService {
  getSummary(params: CourierEarningsQueryParams): Observable<CourierEarningsSummaryDto> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/couriers/me/earnings/summary`, {
        params: this.toRangeParams(params),
      })
      .pipe(map((response) => this.normalizeSummary(response)));
  }

  getEntries(params: CourierEarningsEntriesQuery): Observable<CourierEarningsEntriesPage> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/couriers/me/earnings/entries`, {
        params: this.toEntriesParams(params),
      })
      .pipe(map((response) => this.normalizeEntriesPage(response)));
  }

  toUiError(error: unknown): CourierEarningsUiError {
    if (!(error instanceof HttpErrorResponse)) {
      return { status: 0, detail: null };
    }
    return {
      status: error.status,
      detail: this.extractErrorDetail(error),
    };
  }

  private toEntriesParams(params: CourierEarningsEntriesQuery): HttpParams {
    let query = this.toRangeParams(params);
    if (params.page !== undefined) {
      query = query.set('page', params.page);
    }
    if (params.size !== undefined) {
      query = query.set('size', params.size);
    }
    if (params.sort && params.sort.trim().length > 0) {
      query = query.set('sort', params.sort.trim());
    }
    return query;
  }

  private toRangeParams(params: CourierEarningsQueryParams): HttpParams {
    let query = new HttpParams();
    const from = this.toText(params.from);
    const to = this.toText(params.to);
    if (from) {
      query = query.set('from', from);
    }
    if (to) {
      query = query.set('to', to);
    }
    return query;
  }

  private normalizeSummary(response: unknown): CourierEarningsSummaryDto {
    const candidate = this.asRecord(response);
    const trend = this.asRecord(candidate['trend']);
    const window = this.asRecord(candidate['window']);
    const chartPoints = this.toArray(candidate['chartPoints']).map((entry) =>
      this.normalizeChartPoint(entry),
    );
    return {
      currency: this.toCurrency(candidate['currency']),
      todayTotal: this.toFiniteNumber(candidate['todayTotal']),
      weekTotal: this.toFiniteNumber(candidate['weekTotal']),
      monthTotal: this.toFiniteNumber(candidate['monthTotal']),
      customRangeTotal: this.toFiniteNumber(candidate['customRangeTotal']),
      trend: {
        previousPeriodTotal: this.toFiniteNumber(trend['previousPeriodTotal']),
        deltaAmount: this.toFiniteNumber(trend['deltaAmount']),
        deltaPercent: this.toNullableFiniteNumber(trend['deltaPercent']),
      },
      window: {
        from: this.toIsoDate(window['from']) ?? new Date().toISOString(),
        to: this.toIsoDate(window['to']) ?? new Date().toISOString(),
        timezone: this.toText(window['timezone']) ?? 'UTC',
        maxRangeDays: this.toPositiveInt(window['maxRangeDays'], 180),
      },
      chartPoints,
    };
  }

  private normalizeEntriesPage(response: unknown): CourierEarningsEntriesPage {
    const candidate = this.asRecord(response);
    const content = this.toArray(candidate['content']).map((entry) =>
      this.normalizeEntry(entry),
    );
    return {
      content,
      totalElements: this.toNonNegativeInt(candidate['totalElements']),
      totalPages: this.toNonNegativeInt(candidate['totalPages']),
      size: this.toNonNegativeInt(candidate['size']),
      number: this.toNonNegativeInt(candidate['number']),
    };
  }

  private normalizeChartPoint(value: unknown) {
    const candidate = this.asRecord(value);
    return {
      bucketStart: this.toIsoDate(candidate['bucketStart']) ?? new Date().toISOString(),
      bucketEnd: this.toIsoDate(candidate['bucketEnd']) ?? new Date().toISOString(),
      total: this.toFiniteNumber(candidate['total']),
    };
  }

  private normalizeEntry(value: unknown): CourierEarningsEntryDto {
    const candidate = this.asRecord(value);
    return {
      deliveryId: this.toText(candidate['deliveryId']) ?? '',
      trackingCode: this.toText(candidate['trackingCode']),
      amount: this.toFiniteNumber(candidate['amount']),
      currency: this.toCurrency(candidate['currency']),
      status: this.toText(candidate['status']) ?? 'DELIVERED',
      earnedAt: this.toIsoDate(candidate['earnedAt']) ?? new Date().toISOString(),
      category: this.toText(candidate['category']),
      note: this.toText(candidate['note']),
    };
  }

  private extractErrorDetail(error: HttpErrorResponse): string | null {
    const body = this.asRecord(error.error);
    return (
      this.toText(body['detail']) ??
      this.toText(body['message']) ??
      this.toText(body['title']) ??
      this.toText(body['error'])
    );
  }

  private asRecord(value: unknown): UnknownRecord {
    return value && typeof value === 'object' ? (value as UnknownRecord) : {};
  }

  private toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
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

  private toNullableFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return this.toFiniteNumber(value);
  }

  private toNonNegativeInt(value: unknown): number {
    const parsed = Math.floor(this.toFiniteNumber(value));
    return parsed >= 0 ? parsed : 0;
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    const parsed = this.toNonNegativeInt(value);
    return parsed > 0 ? parsed : fallback;
  }

  private toCurrency(value: unknown): string {
    const normalized = this.toText(value);
    return normalized ? normalized.toUpperCase() : 'RON';
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

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
