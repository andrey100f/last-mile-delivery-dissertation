import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BaseService } from '@core/services/base.service';
import {
  CreateDeliveryRequest,
  DeliveryCreatedResponse,
  DeliveryListQuery,
  DeliverySummaryDto,
  PageDto,
} from '@core/services/enum/delivery.types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService extends BaseService {
  create(
    payload: CreateDeliveryRequest,
  ): Observable<DeliveryCreatedResponse> {
    return this.httpClient.post<DeliveryCreatedResponse>(
      `${this.baseUrl}/deliveries`,
      payload,
    );
  }

  listForCurrentCustomer(
    query: DeliveryListQuery = {},
  ): Observable<PageDto<DeliverySummaryDto>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.status !== undefined && query.status.length > 0) {
      params = params.set('status', query.status);
    }

    return this.httpClient.get<PageDto<DeliverySummaryDto>>(
      `${this.baseUrl}/deliveries`,
      {
        params,
      },
    );
  }

  applyValidationErrors(
    form: FormGroup,
    error: HttpErrorResponse,
  ): boolean {
    if (error.status !== 400 || !error.error) {
      return false;
    }

    const fieldErrors = this.extractFieldErrors(error.error);
    if (fieldErrors.length === 0) {
      return false;
    }

    let applied = false;
    for (const [rawField, message] of fieldErrors) {
      const controlPath = this.normalizeControlPath(rawField);
      const control = form.get(controlPath);
      if (!control) {
        continue;
      }
      control.setErrors({
        ...(control.errors ?? {}),
        server: message,
      });
      control.markAsTouched();
      applied = true;
    }

    return applied;
  }

  private extractFieldErrors(errorBody: unknown): Array<[string, string]> {
    if (typeof errorBody !== 'object' || errorBody === null) {
      return [];
    }

    const candidates: Array<[string, string]> = [];
    const body = errorBody as {
      errors?: Record<string, unknown>;
      violations?: unknown[];
    };

    if (body.errors && typeof body.errors === 'object') {
      for (const [field, value] of Object.entries(body.errors)) {
        if (Array.isArray(value) && value.length > 0) {
          candidates.push([field, String(value[0])]);
          continue;
        }
        if (typeof value === 'string' && value.length > 0) {
          candidates.push([field, value]);
        }
      }
    }

    if (Array.isArray(body.violations)) {
      for (const violation of body.violations) {
        if (!violation || typeof violation !== 'object') {
          continue;
        }
        const item = violation as { field?: unknown; message?: unknown };
        if (
          typeof item.field === 'string' &&
          item.field.length > 0 &&
          typeof item.message === 'string' &&
          item.message.length > 0
        ) {
          candidates.push([item.field, item.message]);
        }
      }
    }

    return candidates;
  }

  private normalizeControlPath(serverField: string): string {
    return serverField
      .replaceAll('[', '.')
      .replaceAll(']', '')
      .replace(/^packageDetails(\.|$)/, 'package$1');
  }
}
