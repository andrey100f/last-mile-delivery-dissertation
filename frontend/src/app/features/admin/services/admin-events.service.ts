import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { map, Observable } from 'rxjs';
import {
  AdminEventsQueryParams,
  AdminEventsUiError,
  AdminSystemEventDto,
  AdminSystemEventsPageDto,
} from '../models/admin-events.models';

type UnknownRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AdminEventsService extends BaseService {
  getEvents(params: AdminEventsQueryParams): Observable<AdminSystemEventsPageDto> {
    return this.httpClient
      .get<unknown>(`${this.baseUrl}/admin/events`, {
        params: this.toQueryParams(params),
      })
      .pipe(map((response) => this.normalizePage(response)));
  }

  toUiError(error: unknown): AdminEventsUiError {
    if (!(error instanceof HttpErrorResponse)) {
      return { status: 0, detail: null };
    }
    return {
      status: error.status,
      detail: this.extractErrorDetail(error),
    };
  }

  private toQueryParams(params: AdminEventsQueryParams): HttpParams {
    let query = new HttpParams()
      .set('page', String(params.page))
      .set('size', String(params.size));
    for (const type of params.type) {
      if (type.trim()) {
        query = query.append('type', type.trim());
      }
    }
    if (params.from) {
      query = query.set('from', params.from);
    }
    if (params.to) {
      query = query.set('to', params.to);
    }
    return query;
  }

  private normalizePage(response: unknown): AdminSystemEventsPageDto {
    const candidate = this.asRecord(response);
    const items = this.normalizeArray(candidate['items']).map((entry) =>
      this.normalizeEvent(entry),
    );
    return {
      items,
      page: this.toNonNegativeInt(candidate['page']),
      size: this.toPositiveInt(candidate['size'], 20),
      totalElements: this.toNonNegativeInt(candidate['totalElements']),
      totalPages: this.toNonNegativeInt(candidate['totalPages']),
      hasNext: Boolean(candidate['hasNext']),
      hasPrevious: Boolean(candidate['hasPrevious']),
    };
  }

  private normalizeEvent(rawEvent: unknown): AdminSystemEventDto {
    const candidate = this.asRecord(rawEvent);
    return {
      id: this.toText(candidate['id']) ?? '',
      type: this.toText(candidate['type']) ?? 'UNKNOWN',
      actorType: this.toText(candidate['actorType']) ?? 'UNKNOWN',
      actorId: this.toText(candidate['actorId']),
      targetType: this.toText(candidate['targetType']) ?? 'UNKNOWN',
      targetId: this.toText(candidate['targetId']),
      metadata: this.toObject(candidate['metadata']),
      createdAt: this.toIsoDate(candidate['createdAt']) ?? new Date().toISOString(),
    };
  }

  private extractErrorDetail(error: HttpErrorResponse): string | null {
    const body = this.asRecord(error.error);
    const direct =
      this.toText(body['detail']) ??
      this.toText(body['message']) ??
      this.toText(body['title']) ??
      this.toText(body['error']);
    if (direct) {
      return direct;
    }

    const errors = body['errors'];
    if (!errors || typeof errors !== 'object') {
      return null;
    }
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
    return null;
  }

  private asRecord(value: unknown): UnknownRecord {
    return value && typeof value === 'object' ? (value as UnknownRecord) : {};
  }

  private normalizeArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private toObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private toText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

  private toNonNegativeInt(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
    return 0;
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    const parsed = this.toNonNegativeInt(value);
    return parsed > 0 ? parsed : fallback;
  }
}
