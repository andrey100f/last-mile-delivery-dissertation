import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseService } from '@core/services/base.service';
import { Observable } from 'rxjs';
import {
  AdminCourierSummaryDto,
  AdminManagedUserDto,
  AdminManagedUsersPageDto,
  AdminManagedUsersQuery,
  AdminManagementApiError,
  CreateAdminCourierRequestDto,
} from '../models/admin-user-management.models';

interface ValidationViolationLike {
  field?: unknown;
  message?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AdminCouriersService extends BaseService {
  list(query: AdminManagedUsersQuery): Observable<AdminManagedUsersPageDto> {
    return this.httpClient.get<AdminManagedUsersPageDto>(
      `${this.baseUrl}/admin/couriers`,
      {
        params: this.toQueryParams(query),
      },
    );
  }

  create(payload: CreateAdminCourierRequestDto): Observable<AdminManagedUserDto> {
    return this.httpClient.post<AdminManagedUserDto>(
      `${this.baseUrl}/admin/couriers`,
      payload,
    );
  }

  getSummary(): Observable<AdminCourierSummaryDto> {
    return this.httpClient.get<AdminCourierSummaryDto>(
      `${this.baseUrl}/admin/couriers/summary`,
    );
  }

  toUiError(error: unknown): AdminManagementApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 0,
        detail: null,
        fieldErrors: {},
      };
    }

    return {
      status: error.status,
      detail: this.extractDetail(error.error),
      fieldErrors: this.extractFieldErrors(error.error),
    };
  }

  private toQueryParams(query: AdminManagedUsersQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);

    if (query.searchTerm && query.searchTerm.trim().length > 0) {
      params = params.set('q', query.searchTerm.trim());
    }

    if (query.availability) {
      params = params.set('availability', query.availability);
    }

    if (query.sortField) {
      const direction = query.sortDirection ?? 'desc';
      params = params.set('sort', `${query.sortField},${direction}`);
    }

    return params;
  }

  private extractFieldErrors(errorBody: unknown): Record<string, string> {
    if (!errorBody || typeof errorBody !== 'object') {
      return {};
    }

    const body = errorBody as {
      fieldErrors?: Record<string, unknown>;
      errors?: Record<string, unknown>;
      violations?: unknown[];
    };

    const extracted: Record<string, string> = {};
    this.appendFieldErrorsFromMap(extracted, body.fieldErrors);
    this.appendFieldErrorsFromMap(extracted, body.errors);

    if (Array.isArray(body.violations)) {
      for (const item of body.violations) {
        const violation = item as ValidationViolationLike;
        if (
          typeof violation.field === 'string' &&
          violation.field.trim().length > 0 &&
          typeof violation.message === 'string' &&
          violation.message.trim().length > 0 &&
          !extracted[violation.field]
        ) {
          extracted[violation.field] = violation.message.trim();
        }
      }
    }

    return extracted;
  }

  private appendFieldErrorsFromMap(
    target: Record<string, string>,
    source: Record<string, unknown> | undefined,
  ): void {
    if (!source || typeof source !== 'object') {
      return;
    }

    for (const [field, value] of Object.entries(source)) {
      if (target[field]) {
        continue;
      }

      if (Array.isArray(value)) {
        const first = value.find(
          (entry): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0,
        );
        if (first) {
          target[field] = first.trim();
        }
        continue;
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        target[field] = value.trim();
      }
    }
  }

  private extractDetail(errorBody: unknown): string | null {
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const body = errorBody as Record<string, unknown>;
    const detailCandidates = [
      body['detail'],
      body['message'],
      body['title'],
      body['error'],
    ];

    for (const candidate of detailCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    return null;
  }
}
